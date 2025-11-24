/**
 * 规则源详情页面消息处理器
 * 处理所有来自 Webview 的消息逻辑
 */

import * as path from 'path';
import * as vscode from 'vscode';

import { MdcParser } from '../../parsers/MdcParser';
import { RulesValidator } from '../../parsers/RulesValidator';
import { ConfigManager } from '../../services/ConfigManager';
import { FileGenerator } from '../../services/FileGenerator';
import { GitManager } from '../../services/GitManager';
import { RulesManager } from '../../services/RulesManager';
import type { GitAuthentication, RuleSource } from '../../types';
import { Logger } from '../../utils/logger';
import { validateBranchName, validateGitUrl } from '../../utils/validator';

/**
 * 消息发送器接口
 */
export interface MessageSender {
  send(type: string, payload?: any): void;
}

/**
 * 规则源详情消息处理器
 */
export class SourceDetailMessageHandler {
  constructor(
    private context: vscode.ExtensionContext,
    private messageSender: MessageSender,
    private getCurrentSourceId: () => string | undefined,
    private setCurrentSourceId: (id: string) => void,
    private loadAndSendData: () => Promise<void>,
  ) {}

  /**
   * 测试 Git 连接
   */
  async handleTestConnection(payload: any): Promise<void> {
    try {
      if (!payload?.gitUrl || !validateGitUrl(payload.gitUrl)) {
        this.messageSender.send('testConnectionResult', {
          success: false,
          error: 'Invalid Git URL',
        });
        return;
      }

      let authentication: GitAuthentication | undefined;
      if (payload.authType === 'token' && payload.token) {
        authentication = { type: 'token', token: payload.token };
      } else if (payload.authType === 'ssh' && payload.sshKeyPath) {
        authentication = {
          type: 'ssh',
          sshKeyPath: payload.sshKeyPath,
          sshPassphrase: payload.sshPassphrase,
        };
      }

      const gitManager = GitManager.getInstance();

      this.messageSender.send('addSourceStatus', {
        status: 'testing',
        message: 'Testing Git connection...',
      });

      const result = await gitManager.testConnection(payload.gitUrl, authentication, 10000);

      this.messageSender.send('testConnectionResult', {
        success: result.success,
        error: result.error,
      });
    } catch (error) {
      this.messageSender.send('testConnectionResult', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 处理添加规则源
   */
  async handleAddSource(payload: any): Promise<void> {
    try {
      if (!payload || !payload.name || !payload.gitUrl) {
        throw new Error('Source name and Git URL are required');
      }

      if (!validateGitUrl(payload.gitUrl)) {
        throw new Error('Invalid Git URL format');
      }

      if (payload.branch && !validateBranchName(payload.branch)) {
        throw new Error('Invalid branch name');
      }

      const sourceId = this.generateSourceId(payload.gitUrl);
      const configManager = ConfigManager.getInstance(this.context);
      const existingSource = configManager.getSourceById(sourceId);

      if (existingSource) {
        throw new Error(
          `A source with this repository URL already exists: "${existingSource.name}" (ID: ${sourceId}).`,
        );
      }

      let authentication: GitAuthentication | undefined;
      if (payload.authType === 'token' && payload.token) {
        authentication = { type: 'token', token: payload.token };
      } else if (payload.authType === 'ssh' && payload.sshKeyPath) {
        authentication = {
          type: 'ssh',
          sshKeyPath: payload.sshKeyPath,
          sshPassphrase: payload.sshPassphrase,
        };
      }

      const source: RuleSource = {
        id: sourceId,
        name: payload.name,
        gitUrl: payload.gitUrl,
        branch: payload.branch || 'main',
        subPath: payload.subPath || '/',
        enabled: true,
        syncInterval: 0,
      };

      // 测试连接
      this.messageSender.send('addSourceStatus', {
        status: 'testing',
        message: 'Testing Git connection...',
      });

      const gitManager = GitManager.getInstance();
      const testResult = await gitManager.testConnection(source.gitUrl, authentication, 10000);

      if (!testResult.success) {
        throw new Error(`Connection test failed: ${testResult.error || 'Unknown error'}`);
      }

      // 克隆仓库
      this.messageSender.send('addSourceStatus', {
        status: 'cloning',
        message: 'Cloning repository...',
      });

      if (authentication) {
        await this.context.secrets.store(
          `turboAiRules.auth.${sourceId}`,
          JSON.stringify(authentication),
        );
      }

      await gitManager.cloneRepository(source);

      // 解析规则
      this.messageSender.send('addSourceStatus', {
        status: 'parsing',
        message: 'Parsing rules...',
      });

      const validRules = await this.parseAndValidateRules(gitManager, source, sourceId);

      const rulesManager = RulesManager.getInstance();
      rulesManager.addRules(sourceId, validRules);

      source.lastSync = new Date().toISOString();
      await configManager.addSource(source);

      // 生成配置文件
      this.messageSender.send('addSourceStatus', {
        status: 'generating',
        message: 'Generating config files...',
      });

      await this.generateConfigFiles(configManager);

      this.messageSender.send('addSourceStatus', {
        status: 'success',
        message: 'Source added successfully',
        sourceId,
      });

      try {
        const { notify } = await import('../../utils/notifications');
        notify(`Successfully added source: ${source.name} (${validRules.length} rules)`, 'info');
      } catch {
        // 静默处理
      }

      await vscode.commands.executeCommand('turbo-ai-rules.refresh');
      this.setCurrentSourceId(sourceId);
      await this.loadAndSendData();

      Logger.info('Source added successfully', {
        sourceId,
        name: source.name,
        ruleCount: validRules.length,
      });
    } catch (error) {
      Logger.error('Failed to add source');
      this.messageSender.send('addSourceStatus', {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 处理加载源数据（编辑模式）
   */
  async handleLoadSourceData(sourceId: string): Promise<void> {
    try {
      if (!sourceId) {
        throw new Error('Source ID is required');
      }

      const configManager = ConfigManager.getInstance(this.context);
      const sources = await configManager.getSources();
      const source = sources.find((s) => s.id === sourceId);

      if (!source) {
        throw new Error(`Source not found: ${sourceId}`);
      }

      let authentication: GitAuthentication | undefined;
      try {
        const authData = await this.context.secrets.get(`turboAiRules.auth.${sourceId}`);
        if (authData) {
          authentication = JSON.parse(authData);
        }
      } catch {
        Logger.warn('Failed to load authentication data');
      }

      this.messageSender.send('sourceData', { source, authentication });
      Logger.debug('Source data loaded for editing', { sourceId });
    } catch (error) {
      Logger.error('Failed to load source data');
      this.messageSender.send('error', {
        message: error instanceof Error ? error.message : 'Failed to load source data',
      });
    }
  }

  /**
   * 处理更新规则源（编辑模式）
   */
  async handleUpdateSource(payload: any): Promise<void> {
    try {
      if (!payload || !payload.sourceId || !payload.name) {
        throw new Error('Source ID and name are required');
      }

      const { sourceId } = payload;
      const configManager = ConfigManager.getInstance(this.context);
      const existingSource = configManager.getSourceById(sourceId);

      if (!existingSource) {
        throw new Error(`Source not found: ${sourceId}`);
      }

      if (payload.branch && !validateBranchName(payload.branch)) {
        throw new Error('Invalid branch name');
      }

      const updates: Partial<RuleSource> = {
        name: payload.name,
        branch: payload.branch || 'main',
        subPath: payload.subPath || '/',
        enabled: payload.enabled !== undefined ? payload.enabled : true,
      };

      // 更新认证信息
      if (payload.authType === 'token' && payload.token) {
        await this.context.secrets.store(
          `turboAiRules.auth.${sourceId}`,
          JSON.stringify({ type: 'token', token: payload.token }),
        );
      } else if (payload.authType === 'ssh' && payload.sshKeyPath) {
        await this.context.secrets.store(
          `turboAiRules.auth.${sourceId}`,
          JSON.stringify({
            type: 'ssh',
            sshKeyPath: payload.sshKeyPath,
            sshPassphrase: payload.sshPassphrase,
          }),
        );
      }

      this.messageSender.send('updateSourceStatus', {
        status: 'updating',
        message: 'Updating source configuration...',
      });

      // 检查是否需要重新同步
      const needsResync =
        updates.branch !== existingSource.branch || updates.subPath !== existingSource.subPath;

      if (needsResync) {
        await this.resyncSource(sourceId, updates, configManager);
      }

      await configManager.updateSource(sourceId, updates);

      this.messageSender.send('updateSourceStatus', {
        status: 'success',
        message: 'Source updated successfully',
      });

      try {
        const { notify } = await import('../../utils/notifications');
        notify(`Successfully updated source: ${updates.name}`, 'info');
      } catch {
        // 静默处理
      }

      await vscode.commands.executeCommand('turbo-ai-rules.refresh');
      this.setCurrentSourceId(sourceId);
      await this.loadAndSendData();

      Logger.info('Source updated successfully', { sourceId, name: updates.name, needsResync });
    } catch (error) {
      Logger.error('Failed to update source');
      this.messageSender.send('updateSourceStatus', {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 处理同步规则源
   */
  async handleSyncSource(sourceId: string): Promise<void> {
    if (!sourceId) return;

    try {
      this.messageSender.send('syncStatus', { status: 'syncing' });
      await vscode.commands.executeCommand('turbo-ai-rules.syncRules', sourceId);
      await this.loadAndSendData();

      this.messageSender.send('syncStatus', {
        status: 'success',
        message: 'Rules synced successfully',
      });

      vscode.window.showInformationMessage('Rules synced successfully');
    } catch (error) {
      this.messageSender.send('syncStatus', {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to sync rules',
      });

      vscode.window.showErrorMessage(
        `Failed to sync rules: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * 处理编辑规则源（切换到编辑模式）
   */
  async handleEditSource(sourceId: string): Promise<void> {
    Logger.info('handleEditSource called', { sourceId });

    if (!sourceId) {
      Logger.warn('handleEditSource: sourceId is empty');
      return;
    }

    try {
      // 关闭当前详情页，打开编辑表单
      const { SourceDetailWebviewProvider } = await import('./SourceDetailWebviewProvider');
      const provider = SourceDetailWebviewProvider.getInstance(this.context);
      Logger.info('Switching to edit form', { sourceId });
      await provider.showSourceForm(sourceId);
    } catch (error) {
      Logger.error('Failed to switch to edit mode', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * 处理启用/禁用规则源
   */
  async handleToggleSource(sourceId: string): Promise<void> {
    if (!sourceId) return;

    try {
      const configManager = ConfigManager.getInstance(this.context);
      const sources = await configManager.getSources();
      const source = sources.find((s) => s.id === sourceId);

      if (!source) {
        throw new Error('Source not found');
      }

      await configManager.updateSource(sourceId, { enabled: !source.enabled });
      await this.loadAndSendData();

      vscode.window.showInformationMessage(
        `Source ${source.enabled ? 'disabled' : 'enabled'}: ${source.name || source.gitUrl}`,
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to toggle source: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * 处理删除规则源
   */
  async handleDeleteSource(sourceId: string, disposeFn: () => void): Promise<void> {
    if (!sourceId) return;

    const confirm = await vscode.window.showWarningMessage(
      'Are you sure you want to delete this source?',
      { modal: true },
      'Delete',
    );

    if (confirm === 'Delete') {
      try {
        await vscode.commands.executeCommand('turbo-ai-rules.removeSource', sourceId);
        disposeFn();
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to delete source: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
  }

  /**
   * 处理查看规则详情
   */
  async handleViewRule(rulePath: string): Promise<void> {
    if (!rulePath) return;

    try {
      const uri = vscode.Uri.file(rulePath);
      await vscode.window.showTextDocument(uri);
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to open rule: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // === 私有辅助方法 ===

  /**
   * 解析并验证规则
   */
  private async parseAndValidateRules(
    gitManager: GitManager,
    source: RuleSource,
    sourceId: string,
  ) {
    const localPath = gitManager.getSourcePath(sourceId);
    let subPath = source.subPath || '/';
    if (!subPath.startsWith('/')) {
      subPath = '/' + subPath;
    }
    const rulesPath = subPath === '/' ? localPath : path.join(localPath, subPath.substring(1));

    const parser = new MdcParser();
    const validator = new RulesValidator();
    const parsedRules = await parser.parseDirectory(rulesPath, sourceId, {
      recursive: true,
      maxDepth: 6,
      maxFiles: 500,
    });

    const rulesWithSource = parsedRules.map((rule) => ({ ...rule, sourceId }));
    return validator.getValidRules(rulesWithSource);
  }

  /**
   * 生成配置文件
   */
  private async generateConfigFiles(configManager: ConfigManager) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return;

    const workspaceRoot = workspaceFolder.uri.fsPath;
    const config = await configManager.getConfig(workspaceFolder.uri);

    const fileGenerator = FileGenerator.getInstance();
    fileGenerator.initializeAdapters(config.adapters);

    const rulesManager = RulesManager.getInstance();
    const mergedRules = rulesManager.mergeRules(config.sync.conflictStrategy || 'priority');
    await fileGenerator.generateAll(
      mergedRules,
      workspaceRoot,
      config.sync.conflictStrategy || 'priority',
    );
  }

  /**
   * 重新同步源
   */
  private async resyncSource(
    sourceId: string,
    updates: Partial<RuleSource>,
    configManager: ConfigManager,
  ) {
    this.messageSender.send('updateSourceStatus', {
      status: 'syncing',
      message: 'Branch or subPath changed, re-syncing...',
    });

    const gitManager = GitManager.getInstance();
    await gitManager.pullUpdates(sourceId, updates.branch);

    this.messageSender.send('updateSourceStatus', {
      status: 'parsing',
      message: 'Re-parsing rules...',
    });

    const validRules = await this.parseAndValidateRules(
      gitManager,
      { ...updates, id: sourceId } as RuleSource,
      sourceId,
    );

    const rulesManager = RulesManager.getInstance();
    rulesManager.addRules(sourceId, validRules);

    this.messageSender.send('updateSourceStatus', {
      status: 'generating',
      message: 'Re-generating config files...',
    });

    await this.generateConfigFiles(configManager);
    updates.lastSync = new Date().toISOString();
  }

  /**
   * 生成源 ID
   */
  private generateSourceId(gitUrl: string): string {
    const normalizedUrl = gitUrl
      .toLowerCase()
      .replace(/\.git$/, '')
      .replace(/\/$/, '');

    const match = normalizedUrl.match(/\/([^/]+?)$/);
    const repoName = match ? match[1] : 'source';
    const hash = this.hashCode(normalizedUrl);
    return `${repoName}-${hash}`;
  }

  /**
   * 简单哈希函数
   */
  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }
}
