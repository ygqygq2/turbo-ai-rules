/**
 * 同步规则命令
 */

import * as path from 'path';
import * as vscode from 'vscode';

import { MdcParser } from '../parsers/MdcParser';
import { RulesValidator } from '../parsers/RulesValidator';
import { ConfigManager } from '../services/ConfigManager';
import { FileGenerator } from '../services/FileGenerator';
import { GitManager } from '../services/GitManager';
import { RulesManager } from '../services/RulesManager';
import type { RuleSource } from '../types/config';
import type { ParsedRule } from '../types/rules';
import { GLOBAL_CACHE_DIR } from '../utils/constants';
import { Logger } from '../utils/logger';

/**
 * 同步规则命令处理器
 * @param sourceId 规则源 ID（可选，如果提供则只同步指定源）
 */
export async function syncRulesCommand(sourceId?: string): Promise<void> {
  Logger.info('Executing syncRules command', { sourceId });

  try {
    const configManager = ConfigManager.getInstance();
    const gitManager = GitManager.getInstance();
    const rulesManager = RulesManager.getInstance();
    const parser = new MdcParser();
    const validator = new RulesValidator();
    const fileGenerator = FileGenerator.getInstance();

    // 1. 获取工作区根目录
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder opened');
      return;
    }

    const workspaceRoot = workspaceFolder.uri.fsPath;

    // 2. 获取配置
    const config = await configManager.getConfig();
    const sources = sourceId
      ? (await configManager.getSources()).filter((s) => s.id === sourceId)
      : await configManager.getSources();

    // 过滤启用的源
    const enabledSources = sources.filter((s) => s.enabled);

    if (enabledSources.length === 0) {
      vscode.window.showInformationMessage('No enabled sources to sync');
      return;
    }

    // 3. 显示进度
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Syncing AI Rules',
        cancellable: false,
      },
      async (progress) => {
        let totalRules = 0;
        let successCount = 0;
        let failureCount = 0;

        // 4. 初始化适配器
        fileGenerator.initializeAdapters(config.adapters);

        // 5. 为每个源同步规则
        for (let i = 0; i < enabledSources.length; i++) {
          const source = enabledSources[i];
          const sourceName = source.name || source.gitUrl;

          progress.report({
            message: `Syncing ${sourceName} (${i + 1}/${enabledSources.length})`,
            increment: (100 / enabledSources.length) * 0.5,
          });

          try {
            // 同步单个源
            const rules = await syncSingleSource(source, gitManager, parser, validator);

            // 添加到规则管理器
            rulesManager.addRules(source.id, rules);

            totalRules += rules.length;
            successCount++;

            Logger.info(`Source synced successfully`, {
              sourceId: source.id,
              ruleCount: rules.length,
            });
          } catch (error) {
            failureCount++;
            Logger.error(
              `Failed to sync source ${source.id}`,
              error instanceof Error ? error : undefined,
            );
          }

          progress.report({
            increment: (100 / enabledSources.length) * 0.5,
          });
        }

        // 6. 生成配置文件
        progress.report({
          message: 'Generating config files...',
        });

        const allRules = rulesManager.getAllRules();
        const mergedRules = rulesManager.mergeRules(config.sync.conflictStrategy || 'priority');

        const generateResult = await fileGenerator.generateAll(
          mergedRules,
          workspaceRoot,
          config.sync.conflictStrategy || 'priority',
        );

        // 7. 显示结果
        Logger.info('Sync complete', {
          sources: successCount,
          totalRules,
          generatedFiles: generateResult.success.length,
        });

        // 显示通知
        if (successCount === enabledSources.length && generateResult.failures.length === 0) {
          vscode.window.showInformationMessage(
            `Successfully synced ${totalRules} rules from ${successCount} source(s) and generated ${generateResult.success.length} config file(s)`,
          );
        } else {
          const message = `Synced ${successCount}/${enabledSources.length} source(s), ${totalRules} rules, generated ${generateResult.success.length} config file(s)`;
          const action = await vscode.window.showWarningMessage(message, 'Show Details');

          if (action === 'Show Details') {
            await fileGenerator.showGenerationNotification(generateResult);
          }
        }
      },
    );
  } catch (error) {
    Logger.error('Failed to sync rules', error instanceof Error ? error : undefined);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(`Failed to sync rules: ${errorMessage}`);
  }
}

/**
 * 同步单个源
 */
async function syncSingleSource(
  source: RuleSource,
  gitManager: GitManager,
  parser: MdcParser,
  validator: RulesValidator,
): Promise<ParsedRule[]> {
  // 1. 克隆或拉取仓库
  const exists = await gitManager.repositoryExists(source.id);

  if (!exists) {
    Logger.info('Cloning repository', { sourceId: source.id });
    await gitManager.cloneRepository(source);
  } else {
    Logger.info('Pulling updates', { sourceId: source.id });
    await gitManager.pullUpdates(source.id, source.branch);
  }

  // 2. 获取本地仓库路径
  const localPath = gitManager.getSourcePath(source.id);

  // 3. 验证 subPath（必须以 / 开头）
  let subPath = source.subPath || '/';
  if (!subPath.startsWith('/')) {
    Logger.warn('subPath does not start with /, prepending /', {
      sourceId: source.id,
      originalSubPath: subPath,
    });
    subPath = '/' + subPath;
  }

  // 4. 构建规则目录路径
  const rulesPath = subPath === '/' ? localPath : path.join(localPath, subPath.substring(1)); // 移除开头的 /

  Logger.info('Parsing rules directory', {
    sourceId: source.id,
    rulesPath,
    subPath,
  });

  // 5. 解析规则（默认递归）
  const parsedRules = await parser.parseDirectory(rulesPath, source.id, {
    recursive: true, // 默认递归
    maxDepth: 6,
    maxFiles: 500,
  });

  // 6. 为规则添加 sourceId
  const rulesWithSource = parsedRules.map((rule) => ({
    ...rule,
    sourceId: source.id,
  }));

  // 7. 验证规则
  const validationResults = validator.validateRules(rulesWithSource);

  // 检查是否有验证错误
  const invalidCount = Array.from(validationResults.values()).filter((r) => !r.valid).length;

  if (invalidCount > 0) {
    Logger.warn('Some rules are invalid', {
      sourceId: source.id,
      invalidCount,
    });
  }

  // 8. 返回有效的规则
  return validator.getValidRules(rulesWithSource);
}
