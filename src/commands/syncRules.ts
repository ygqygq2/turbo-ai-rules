/**
 * 同步规则命令
 */

import * as vscode from 'vscode';

import { MdcParser } from '../parsers/MdcParser';
import { RulesValidator } from '../parsers/RulesValidator';
import { StatusBarProvider } from '../providers/StatusBarProvider';
import { ConfigManager } from '../services/ConfigManager';
import { FileGenerator } from '../services/FileGenerator';
import { GitManager } from '../services/GitManager';
import { RulesManager } from '../services/RulesManager';
import { SelectionStateManager } from '../services/SelectionStateManager';
import { WorkspaceContextManager } from '../services/WorkspaceContextManager';
import { WorkspaceDataManager } from '../services/WorkspaceDataManager';
import { WorkspaceStateManager } from '../services/WorkspaceStateManager';
import type { RuleSource } from '../types/config';
import type { ConflictStrategy, ParsedRule } from '../types/rules';
import { t } from '../utils/i18n';
import { Logger } from '../utils/logger';
import { notify } from '../utils/notifications';
import { ProgressManager } from '../utils/progressManager';
import { syncAndParseSource } from '../utils/ruleLoader';
import { toRelativePath } from '../utils/rulePath';

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
 * 同步选项
 */
export interface SyncRulesOptions {
  /** 规则源 ID（可选，如果提供则只同步指定源） */
  sourceId?: string;
  /** 目标适配器列表（可选，如果提供则只为这些适配器生成配置） */
  targetAdapters?: string[];
}

/**
 * 同步规则命令处理器
 * @param options 同步选项（可选）
 */
export async function syncRulesCommand(options?: string | SyncRulesOptions): Promise<void> {
  // 兼容旧的 sourceId 参数格式
  const syncOptions: SyncRulesOptions =
    typeof options === 'string' ? { sourceId: options } : options || {};
  const { sourceId, targetAdapters } = syncOptions;

  Logger.info('Executing syncRules command', { sourceId, targetAdapters });

  // 检查多工作空间环境，如果用户取消则中断操作
  const { checkMultiRootWorkspaceForOperation } = await import('../utils/workspace');
  const shouldContinue = await checkMultiRootWorkspaceForOperation();
  if (!shouldContinue) {
    Logger.info('Sync operation cancelled by user due to multi-root workspace');
    return;
  }

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
    // 使用 WorkspaceContextManager 获取当前工作空间
    // 即使切换到 Webview 也能正确获取用户上次使用的工作空间
    const workspaceContextManager = WorkspaceContextManager.getInstance();
    const workspaceFolder = workspaceContextManager.getCurrentWorkspaceFolder();

    if (!workspaceFolder) {
      notify(t('No workspace folder opened'), 'error');
      return;
    }

    Logger.debug('Using workspace folder', {
      name: workspaceFolder.name,
      path: workspaceFolder.uri.fsPath,
    });

    const workspaceRoot = workspaceFolder.uri.fsPath;

    // 2. 获取配置和源（避免重复调用 getSources）
    const config = await configManager.getConfig(workspaceFolder.uri);

    // 复用 config 中已获取的 sources，避免再次调用 getSources
    const sources = sourceId ? config.sources.filter((s) => s.id === sourceId) : config.sources;

    // 过滤启用的源
    const enabledSources = sources.filter((s) => s.enabled);

    Logger.debug('Sources filtered', {
      enabled: enabledSources.length,
      total: sources.length,
    });

    if (enabledSources.length === 0) {
      notify(t('No enabled sources to sync'), 'info');
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
        title: t('Syncing rules from {0} source(s)...', enabledSources.length),
        cancellable: false,
      },
      async (progress) => {
        const pm = new ProgressManager({ progress, verbose: false });
        let totalRules = 0;
        let successCount = 0;

        // 4. 初始化适配器
        fileGenerator.initializeAdapters(config.adapters);
        pm.report(5, 'Initializing adapters...');

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

            pm.report(
              progressPerSource * 0.3,
              t('Syncing', `${sourceName} (${currentIndex}/${enabledSources.length})`),
            );

            try {
              // 同步单个源
              const allRules = await syncSingleSource(source, gitManager, parser, validator);

              pm.report(progressPerSource * 0.3);

              // 初始化选择状态（从磁盘加载）
              // 如果是新源，默认全不选（传入空数组）
              await selectionStateManager.initializeState(source.id, allRules.length, []);

              // 添加所有规则到规则管理器（树视图需要显示所有规则供用户选择）
              rulesManager.addRules(source.id, allRules);

              // 获取用户选择的规则路径（用于统计和生成配置）
              const selectedPaths = selectionStateManager.getSelection(source.id);
              const selectedCount = selectedPaths.length;

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

              pm.report(progressPerSource * 0.4);
            } catch (error) {
              Logger.error(
                `Failed to sync source ${source.id}`,
                error instanceof Error ? error : undefined,
              );

              // 标记同步失败
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              await WorkspaceStateManager.getInstance().setSourceSyncStats(source.id, {
                lastSyncTime: new Date().toISOString(),
                syncedRulesCount: 0,
                syncedRulePaths: [],
                syncStatus: 'failed',
                errorMessage,
              });

              // 即使失败也要增加进度
              pm.report(progressPerSource * 0.7);
            }
          }
        }

        // 确保同步阶段进度达到预期值
        const syncProgressUsed = pm.getCurrentProgress() - 5; // 减去初始化的5%
        if (syncProgressUsed < syncProgressTotal) {
          pm.report(syncProgressTotal - syncProgressUsed);
        }

        // 6. 持久化规则索引到磁盘
        const workspaceDataManager = WorkspaceDataManager.getInstance();
        // 获取所有规则用于保存索引和保护判断
        const allRulesForIndex = rulesManager.getAllRules();

        pm.report(2, 'Saving rules index...');

        try {
          await workspaceDataManager.writeRulesIndex(workspaceRoot, allRulesForIndex);
          Logger.debug('Rules index saved to disk', {
            workspaceRoot,
            totalRules: allRulesForIndex.length,
          });
        } catch (error) {
          Logger.error('Failed to save rules index', error instanceof Error ? error : undefined);
          // 不阻断流程，继续生成配置文件
        }

        pm.report(saveIndexProgress - 2);

        // 7. 根据选择状态过滤规则（生成配置时只使用选中的规则）
        pm.report(2, 'Filtering selected rules...');

        const selectedRules: ParsedRule[] = [];

        for (const rule of allRulesForIndex) {
          const selectedPaths = selectionStateManager.getSelection(rule.sourceId);

          // 只包含用户主动勾选的规则（空数组 = 全不选）
          // 将 rule.filePath 转为相对路径后比较（SelectionStateManager 存储相对路径）
          const relativeFilePath = toRelativePath(rule.filePath, rule.sourceId);
          if (selectedPaths.length > 0 && selectedPaths.includes(relativeFilePath)) {
            selectedRules.push(rule);
          }
        }

        Logger.debug('Rules filtered by selection', {
          totalRules: allRulesForIndex.length,
          selectedRules: selectedRules.length,
        });

        // 8. 合并规则并生成配置文件
        // 对选中的规则进行合并（使用本地变量，不影响 rulesManager 中存储的所有规则）
        const mergedRules = mergeSelectedRules(
          selectedRules,
          config.sync.conflictStrategy || 'priority',
        );

        Logger.debug('Rules merged for generation', {
          totalRules: mergedRules.length,
          conflictStrategy: config.sync.conflictStrategy || 'priority',
        });

        // 使用之前获取的 allRulesForIndex 用于保护判断
        const generateResult = await fileGenerator.generateAll(
          mergedRules,
          workspaceRoot,
          config.sync.conflictStrategy || 'priority',
          targetAdapters, // ✅ 传递目标适配器列表
          allRulesForIndex, // ✅ 传递所有规则用于保护判断
        );

        pm.report(generateConfigProgress - 4, 'Saving metadata...');

        // 8. 持久化同步时间和统计信息到 workspaceState（在进度条完成前）
        const workspaceStateManager = WorkspaceStateManager.getInstance();
        const syncTime = new Date().toISOString();

        // 为每个成功同步的源保存同步快照
        for (const source of enabledSources) {
          await workspaceStateManager.setLastSyncTime(source.id, syncTime);

          // 获取该源实际选中的规则数量
          const selectedPaths = selectionStateManager.getSelection(source.id);

          // 保存该源的同步快照
          await workspaceStateManager.setSourceSyncStats(source.id, {
            lastSyncTime: syncTime,
            syncedRulesCount: selectedPaths.length,
            syncedRulePaths: selectedPaths,
            syncStatus: 'success',
          });
        }

        pm.report(2, 'Calculating stats...');

        // 聚合统计：计算所有源的已同步规则总数
        const allSourceSyncStats = await workspaceStateManager.getAllSourceSyncStats();
        let totalSyncedRules = 0;
        let syncedSourceCount = 0;

        for (const sourceId of Object.keys(allSourceSyncStats)) {
          const stats = allSourceSyncStats[sourceId];
          if (stats.syncStatus === 'success') {
            totalSyncedRules += stats.syncedRulesCount;
            syncedSourceCount++;
          }
        }

        // 持久化聚合统计信息到 workspaceState（用于状态栏显示）
        await workspaceStateManager.setRulesStats({
          totalRules: allRulesForIndex.length,
          totalSyncedRules,
          sourceCount: sources.length,
          enabledSourceCount: enabledSources.length,
          syncedSourceCount,
        });

        Logger.debug('Sync metadata persisted to workspace state', {
          syncTime,
          sourceCount: enabledSources.length,
          totalRules: allRulesForIndex.length,
          totalSyncedRules,
          syncedSourceCount,
        });

        // 确保进度达到100%（所有操作完成后）
        await pm.ensureComplete('Sync complete!');

        Logger.debug('Progress tracking completed', {
          finalProgress: pm.getCurrentProgress(),
          sources: successCount,
          totalRules,
        });

        // 9. 显示结果（进度条完成后）
        Logger.info('Sync complete', {
          sources: successCount,
          totalRules,
          generatedFiles: generateResult.success.length,
        });

        // 更新状态栏为成功
        statusBarProvider.setSyncStatus('success');

        // 显示通知
        if (successCount === enabledSources.length && generateResult.failures.length === 0) {
          notify(
            t('Successfully synced {0} rule(s) from {1} source(s)', totalSyncedRules, successCount),
            'info',
          );
        } else {
          const message = t('Sync completed with errors');
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
    notify(t('Failed to sync rules', errorMessage), 'error');
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
  // 使用共享的同步和解析函数
  const result = await syncAndParseSource(source, gitManager, parser, validator);
  return result.rules;
}

/**
 * @description 合并选中的规则（不影响全局 RulesManager）
 * @return {ParsedRule[]}
 * @param selectedRules {ParsedRule[]}
 * @param strategy {ConflictStrategy}
 */
function mergeSelectedRules(selectedRules: ParsedRule[], strategy: ConflictStrategy): ParsedRule[] {
  if (strategy === 'skip-duplicates') {
    // 跳过重复，只保留第一个
    const seen = new Set<string>();
    return selectedRules.filter((rule) => {
      if (seen.has(rule.id)) {
        return false;
      }
      seen.add(rule.id);
      return true;
    });
  }

  if (strategy === 'priority' || strategy === 'merge') {
    // 按优先级保留（merge 和 priority 处理相同）
    const groupedById = new Map<string, ParsedRule[]>();
    for (const rule of selectedRules) {
      const existing = groupedById.get(rule.id) || [];
      existing.push(rule);
      groupedById.set(rule.id, existing);
    }

    const merged: ParsedRule[] = [];
    for (const rules of groupedById.values()) {
      if (rules.length === 1) {
        merged.push(rules[0]);
      } else {
        // 选择优先级最高的
        const sortedByPriority = sortByPriority(rules);
        merged.push(sortedByPriority[0]);
      }
    }

    return merged;
  }

  // 默认返回所有规则
  return selectedRules;
}

/**
 * @description 按优先级排序规则
 * @return {ParsedRule[]}
 * @param rules {ParsedRule[]}
 */
function sortByPriority(rules: ParsedRule[]): ParsedRule[] {
  const priorityOrder: Record<string, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  return rules.sort((a, b) => {
    const aPriority = priorityOrder[a.metadata.priority || 'medium'] || 2;
    const bPriority = priorityOrder[b.metadata.priority || 'medium'] || 2;
    return bPriority - aPriority; // 降序
  });
}
