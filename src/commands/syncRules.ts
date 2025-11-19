/**
 * 同步规则命令
 */

import * as path from 'path';
import * as vscode from 'vscode';

import { MdcParser } from '../parsers/MdcParser';
import { RulesValidator } from '../parsers/RulesValidator';
import { StatusBarProvider } from '../providers/StatusBarProvider';
import { ConfigManager } from '../services/ConfigManager';
import { FileGenerator } from '../services/FileGenerator';
import { GitManager } from '../services/GitManager';
import { RulesManager } from '../services/RulesManager';
import { SelectionStateManager } from '../services/SelectionStateManager';
import { WorkspaceDataManager } from '../services/WorkspaceDataManager';
import { WorkspaceStateManager } from '../services/WorkspaceStateManager';
import type { RuleSource } from '../types/config';
import type { ParsedRule } from '../types/rules';
import { Logger } from '../utils/logger';
import { notify } from '../utils/notifications';

/**
 * 按仓库分组源，确保同一仓库的不同分支/目录串行处理
 */
interface RepositoryGroup {
  gitUrl: string;
  sources: RuleSource[];
}

function groupSourcesByRepository(sources: RuleSource[]): RepositoryGroup[] {
  const groupMap = new Map<string, RuleSource[]>();

  for (const source of sources) {
    const existing = groupMap.get(source.gitUrl) || [];
    existing.push(source);
    groupMap.set(source.gitUrl, existing);
  }

  return Array.from(groupMap.entries()).map(([gitUrl, sources]) => ({
    gitUrl,
    sources,
  }));
}

/**
 * 同步规则命令处理器
 * @param sourceId 规则源 ID（可选，如果提供则只同步指定源）
 */
export async function syncRulesCommand(sourceId?: string): Promise<void> {
  Logger.info('Executing syncRules command', { sourceId });

  // 获取状态栏提供者实例
  const statusBarProvider = StatusBarProvider.getInstance();

  try {
    const configManager = ConfigManager.getInstance();
    const gitManager = GitManager.getInstance();
    const rulesManager = RulesManager.getInstance();
    const selectionStateManager = SelectionStateManager.getInstance();
    const parser = new MdcParser();
    const validator = new RulesValidator();
    const fileGenerator = FileGenerator.getInstance();

    // 1. 获取工作区根目录
    // 优先使用活动编辑器所在的 workspace folder，如果没有则使用第一个
    const allWorkspaceFolders = vscode.workspace.workspaceFolders;

    if (!allWorkspaceFolders || allWorkspaceFolders.length === 0) {
      notify(vscode.l10n.t('No workspace folder opened'), 'error');
      return;
    }

    let workspaceFolder = allWorkspaceFolders[0];

    // 尝试获取活动编辑器的 workspace folder
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      const activeWorkspaceFolder = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri);
      if (activeWorkspaceFolder) {
        workspaceFolder = activeWorkspaceFolder;
      }
    }

    Logger.debug('Using workspace folder', {
      name: workspaceFolder.name,
      path: workspaceFolder.uri.fsPath,
    });

    const workspaceRoot = workspaceFolder.uri.fsPath;

    // 2. 获取配置（传递 workspace folder URI）
    const config = await configManager.getConfig(workspaceFolder.uri);
    const sources = sourceId
      ? configManager.getSources(workspaceFolder.uri).filter((s) => s.id === sourceId)
      : configManager.getSources(workspaceFolder.uri);

    // 过滤启用的源
    const enabledSources = sources.filter((s) => s.enabled);

    Logger.debug('Sources filtered', {
      enabled: enabledSources.length,
      total: sources.length,
    });

    if (enabledSources.length === 0) {
      notify(vscode.l10n.t('No enabled sources to sync'), 'info');
      statusBarProvider.setSyncStatus('idle');
      return;
    }

    // 设置同步状态
    statusBarProvider.setSyncStatus('syncing', {
      completed: 0,
      total: enabledSources.length,
    });

    // 3. 显示进度
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: vscode.l10n.t('Syncing rules from {0} source(s)...', enabledSources.length),
        cancellable: false,
      },
      async (progress) => {
        let totalRules = 0;
        let successCount = 0;
        let currentProgress = 0;

        /**
         * @description 报告进度增量并更新当前进度
         * @return default {void}
         * @param increment {number}
         * @param message {string}
         */
        const reportProgress = (increment: number, message?: string) => {
          currentProgress += increment;
          progress.report({
            message,
            increment,
          });
        };

        // 4. 初始化适配器
        fileGenerator.initializeAdapters(config.adapters);
        reportProgress(5, 'Initializing adapters...');

        // 5. 按仓库分组，确保同一仓库的不同分支/目录串行处理
        const sourcesByRepo = groupSourcesByRepository(enabledSources);
        const totalGroups = sourcesByRepo.length;

        Logger.debug('Grouped sources by repository', {
          totalSources: enabledSources.length,
          repositories: totalGroups,
        });

        // 进度分配：75% 用于同步源，10% 用于保存索引，10% 用于生成配置
        const syncProgressTotal = 75;
        const saveIndexProgress = 10;
        const generateConfigProgress = 10;
        // 已使用: 5%, 剩余: 95%

        // 计算每个源的进度增量
        const progressPerSource =
          enabledSources.length > 0 ? syncProgressTotal / enabledSources.length : 0;

        // 6. 为每个仓库组同步规则（同一仓库串行，不同仓库可并行）
        for (let groupIndex = 0; groupIndex < sourcesByRepo.length; groupIndex++) {
          const repoGroup = sourcesByRepo[groupIndex];
          const repoName = repoGroup.gitUrl;

          Logger.debug(`Processing repository group ${groupIndex + 1}/${totalGroups}`, {
            gitUrl: repoName,
            sourceCount: repoGroup.sources.length,
          });

          // 同一仓库的源按顺序处理，避免 git 操作冲突
          for (let i = 0; i < repoGroup.sources.length; i++) {
            const source = repoGroup.sources[i];
            const sourceName = source.name || source.gitUrl;
            const currentIndex = successCount + 1;

            reportProgress(
              progressPerSource * 0.3,
              vscode.l10n.t('Syncing', `${sourceName} (${currentIndex}/${enabledSources.length})`),
            );

            try {
              // 同步单个源
              const allRules = await syncSingleSource(source, gitManager, parser, validator);

              reportProgress(progressPerSource * 0.3);

              // 初始化选择状态（从磁盘加载）
              // 如果是新源，使用所有规则路径初始化为全选
              const allRulePaths = allRules.map((r) => r.filePath).filter((p) => p) as string[];
              await selectionStateManager.initializeState(source.id, allRules.length, allRulePaths);

              // 添加所有规则到规则管理器（树视图需要显示所有规则供用户选择）
              rulesManager.addRules(source.id, allRules);

              // 获取用户选择的规则路径（用于统计和生成配置）
              const selectedPaths = selectionStateManager.getSelection(source.id);
              const selectedCount =
                selectedPaths.length === 0 ? allRules.length : selectedPaths.length;

              Logger.debug('Rules synced', {
                sourceId: source.id,
                totalRules: allRules.length,
                selectedRules: selectedCount,
              });

              totalRules += selectedCount;
              successCount++;

              // 更新状态栏进度
              statusBarProvider.setSyncStatus('syncing', {
                completed: successCount,
                total: enabledSources.length,
                currentSource: sourceName,
                operation: 'Syncing rules',
              });

              Logger.debug(`Source synced successfully`, {
                sourceId: source.id,
                branch: source.branch || 'default',
                subPath: source.subPath || '/',
                totalRulesInSource: allRules.length,
                selectedRules: selectedCount,
              });

              reportProgress(progressPerSource * 0.4);
            } catch (error) {
              Logger.error(
                `Failed to sync source ${source.id}`,
                error instanceof Error ? error : undefined,
              );
              // 即使失败也要增加进度
              reportProgress(progressPerSource * 0.7);
            }
          }
        }

        // 确保同步阶段进度达到预期值
        const syncProgressUsed = currentProgress - 5; // 减去初始化的5%
        if (syncProgressUsed < syncProgressTotal) {
          reportProgress(syncProgressTotal - syncProgressUsed);
        }

        // 6. 持久化规则索引到磁盘
        const workspaceDataManager = WorkspaceDataManager.getInstance();
        const allRules = rulesManager.getAllRules();

        reportProgress(2, 'Saving rules index...');

        try {
          await workspaceDataManager.writeRulesIndex(workspaceRoot, allRules);
          Logger.debug('Rules index saved to disk', {
            workspaceRoot,
            totalRules: allRules.length,
          });
        } catch (error) {
          Logger.error('Failed to save rules index', error instanceof Error ? error : undefined);
          // 不阻断流程，继续生成配置文件
        }

        reportProgress(saveIndexProgress - 2);

        // 7. 根据选择状态过滤规则（生成配置时只使用选中的规则）
        reportProgress(2, 'Filtering selected rules...');

        const selectedRules: ParsedRule[] = [];

        for (const rule of allRules) {
          const selectedPaths = selectionStateManager.getSelection(rule.sourceId);

          // 空数组表示全选
          if (selectedPaths.length === 0 || selectedPaths.includes(rule.filePath)) {
            selectedRules.push(rule);
          }
        }

        Logger.debug('Rules filtered by selection', {
          totalRules: allRules.length,
          selectedRules: selectedRules.length,
        });

        // 8. 合并规则并生成配置文件
        // 创建临时 RulesManager 实例用于合并选中的规则
        const tempRulesManager = RulesManager.getInstance();
        const sourceRulesMap = new Map<string, ParsedRule[]>();

        // 按源分组
        for (const rule of selectedRules) {
          const rules = sourceRulesMap.get(rule.sourceId) || [];
          rules.push(rule);
          sourceRulesMap.set(rule.sourceId, rules);
        }

        // 添加到临时管理器
        for (const [sourceId, rules] of sourceRulesMap.entries()) {
          tempRulesManager.addRules(sourceId, rules);
        }

        const mergedRules = tempRulesManager.mergeRules(config.sync.conflictStrategy || 'priority');

        Logger.debug('Rules merged for generation', {
          totalRules: mergedRules.length,
          conflictStrategy: config.sync.conflictStrategy || 'priority',
        });

        const generateResult = await fileGenerator.generateAll(
          mergedRules,
          workspaceRoot,
          config.sync.conflictStrategy || 'priority',
        );

        reportProgress(generateConfigProgress - 2);

        // 确保进度达到100%
        const remaining = 100 - currentProgress;
        if (remaining > 0) {
          reportProgress(remaining, 'Completing...');
        }

        Logger.debug('Progress tracking completed', {
          finalProgress: currentProgress + remaining,
          sources: successCount,
          totalRules,
        });

        // 8. 显示结果
        Logger.info('Sync complete', {
          sources: successCount,
          totalRules,
          generatedFiles: generateResult.success.length,
        });

        // 持久化同步时间到 workspaceState
        const workspaceStateManager = WorkspaceStateManager.getInstance();
        const syncTime = new Date().toISOString();
        for (const source of enabledSources) {
          await workspaceStateManager.setLastSyncTime(source.id, syncTime);
        }

        // 持久化规则统计信息到 workspaceState（用于状态栏显示）
        await workspaceStateManager.setRulesStats({
          totalRules: totalRules,
          sourceCount: sources.length,
          enabledSourceCount: enabledSources.length,
        });

        Logger.debug('Sync metadata persisted to workspace state', {
          syncTime,
          sourceCount: enabledSources.length,
          totalRules,
        });

        // 更新状态栏为成功
        statusBarProvider.setSyncStatus('success');

        // 显示通知
        if (successCount === enabledSources.length && generateResult.failures.length === 0) {
          notify(
            vscode.l10n.t(
              'Successfully synced {0} rule(s) from {1} source(s)',
              totalRules,
              successCount,
            ),
            'info',
          );
        } else {
          const message = vscode.l10n.t('Sync completed with errors');
          notify(message, 'warning');
          await fileGenerator.showGenerationNotification(generateResult);
        }
      },
    );
  } catch (error) {
    Logger.error('Failed to sync rules', error instanceof Error ? error : undefined);

    // 更新状态栏为错误
    statusBarProvider.setSyncStatus('error');

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    notify(vscode.l10n.t('Failed to sync rules', errorMessage), 'error');
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
    Logger.debug('Cloning repository', { sourceId: source.id });
    await gitManager.cloneRepository(source);
  } else {
    Logger.debug('Pulling updates', { sourceId: source.id });
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

  Logger.debug('Parsing rules directory', {
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
