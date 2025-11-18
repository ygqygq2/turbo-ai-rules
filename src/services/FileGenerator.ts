/**
 * 文件生成服务
 * 负责编排适配器，生成不同 AI 工具的配置文件
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import type { AIToolAdapter, GeneratedConfig } from '../adapters';
import { ContinueAdapter, CopilotAdapter, CursorAdapter, CustomAdapter } from '../adapters';
import type { AdaptersConfig } from '../types/config';
import { GenerateError, SystemError } from '../types/errors';
import type { ConflictStrategy, ParsedRule } from '../types/rules';
import { ensureDir, safeWriteFile } from '../utils/fileSystem';
import { ensureIgnored } from '../utils/gitignore';
import { Logger } from '../utils/logger';
import type { UserRulesProtectionConfig } from '../utils/userRulesProtection';
import { extractUserContent, isUserDefinedFile, mergeContent } from '../utils/userRulesProtection';

/**
 * 生成结果
 */
export interface GenerateResult {
  /** 成功生成的文件列表 */
  success: GeneratedConfig[];
  /** 失败的适配器列表 */
  failures: Array<{ adapter: string; error: string }>;
}

/**
 * 文件生成服务
 */
export class FileGenerator {
  private static instance: FileGenerator;
  private adapters: Map<string, AIToolAdapter>;
  private protectionConfig: UserRulesProtectionConfig;

  private constructor() {
    this.adapters = new Map();
    this.protectionConfig = this.loadProtectionConfig();
  }

  /**
   * 加载用户规则保护配置
   */
  private loadProtectionConfig(): UserRulesProtectionConfig {
    const config = vscode.workspace.getConfiguration('turboAIRules');
    return {
      enabled: config.get<boolean>('protectUserRules', false),
      userPrefixRange: config.get('userPrefixRange', { min: 800, max: 999 }),
      blockMarkers: config.get('blockMarkers'),
    };
  }

  /**
   * 获取 FileGenerator 实例
   */
  public static getInstance(): FileGenerator {
    if (!FileGenerator.instance) {
      FileGenerator.instance = new FileGenerator();
    }
    return FileGenerator.instance;
  }

  /**
   * 初始化适配器
   * @param config 适配器配置
   */
  public initializeAdapters(config: AdaptersConfig): void {
    Logger.debug('Initializing adapters', config as Record<string, unknown>);

    this.adapters.clear();

    // 注册内置适配器
    if (config.cursor?.enabled) {
      this.adapters.set('cursor', new CursorAdapter(true));
    }

    if (config.copilot?.enabled) {
      this.adapters.set('copilot', new CopilotAdapter(true));
    }

    if (config.continue?.enabled) {
      this.adapters.set('continue', new ContinueAdapter(true));
    }

    // 注册自定义适配器
    if (config.custom && Array.isArray(config.custom)) {
      for (const customConfig of config.custom) {
        if (customConfig.enabled) {
          const adapter = new CustomAdapter(customConfig);
          this.adapters.set(`custom-${customConfig.id}`, adapter);
          Logger.debug(
            `Registered custom adapter: ${customConfig.id}`,
            customConfig as unknown as Record<string, unknown>,
          );
        }
      }
    }

    Logger.debug('Adapters initialized', {
      count: this.adapters.size,
      adapters: Array.from(this.adapters.keys()),
    });
  }

  /**
   * 生成所有配置文件
   * @param rules 规则列表
   * @param workspaceRoot 工作区根目录
   * @param strategy 冲突解决策略
   * @returns 生成结果
   */
  public async generateAll(
    rules: ParsedRule[],
    workspaceRoot: string,
    strategy: ConflictStrategy = 'priority',
  ): Promise<GenerateResult> {
    Logger.debug('Generating all config files', {
      ruleCount: rules.length,
      adapterCount: this.adapters.size,
      conflictStrategy: strategy,
    });
    const result: GenerateResult = {
      success: [],
      failures: [],
    };

    // 如果没有启用的适配器
    if (this.adapters.size === 0) {
      Logger.warn('No adapters enabled');
      throw new GenerateError(
        'No adapters enabled. Please enable at least one adapter in settings.',
        'TAI-4001',
      );
    }

    // 如果没有规则
    if (rules.length === 0) {
      Logger.warn('No rules to generate');
      // 不抛出错误，但返回空结果
      return result;
    }

    // 为每个适配器生成配置
    for (const [name, adapter] of this.adapters.entries()) {
      try {
        const config = await this.generateForAdapter(adapter, rules, workspaceRoot);
        result.success.push(config);

        Logger.debug(`Generated config for ${name}`, {
          filePath: config.filePath,
          ruleCount: config.ruleCount,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.failures.push({ adapter: name, error: errorMessage });

        Logger.error(
          `Failed to generate config for ${name}`,
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }

    // 确保生成的文件被 .gitignore
    await this.ensureGitIgnore(workspaceRoot);

    Logger.debug('Generation complete', {
      successCount: result.success.length,
      failureCount: result.failures.length,
    });

    return result;
  }

  /**
   * 为单个适配器生成配置
   * @param adapter 适配器
   * @param rules 规则列表
   * @param workspaceRoot 工作区根目录
   * @returns 生成的配置
   */
  private async generateForAdapter(
    adapter: AIToolAdapter,
    rules: ParsedRule[],
    workspaceRoot: string,
  ): Promise<GeneratedConfig> {
    // 生成配置内容
    const config = await adapter.generate(rules);

    // 验证内容
    if (!adapter.validate(config.content)) {
      throw new GenerateError(`Generated content for ${adapter.name} is invalid`, 'TAI-4002');
    }

    // 写入文件（传递 adapter 用于判断输出类型）
    const fullPath = path.join(workspaceRoot, config.filePath);
    await this.writeConfigFile(fullPath, config.content, adapter);

    return config;
  }

  /**
   * 写入配置文件（支持用户规则保护）
   * @param filePath 文件路径
   * @param content 文件内容
   * @param adapter 适配器实例（用于判断输出类型）
   */
  private async writeConfigFile(
    filePath: string,
    content: string,
    adapter?: AIToolAdapter,
  ): Promise<void> {
    try {
      // 确保目录存在
      const dir = path.dirname(filePath);
      await ensureDir(dir);

      // 如果没有启用保护，直接写入
      if (!this.protectionConfig.enabled) {
        await safeWriteFile(filePath, content);
        Logger.debug('Config file written (protection disabled)', { filePath });
        return;
      }

      // 判断是目录模式还是文件模式
      const isDirectoryMode = adapter && this.isDirectoryOutput(adapter);

      if (isDirectoryMode) {
        // 目录模式：检查文件前缀
        await this.writeDirectoryModeFile(dir, filePath, content);
      } else {
        // 单文件模式：合并块内容
        await this.writeSingleFileMode(filePath, content);
      }

      Logger.debug('Config file written (with protection)', { filePath, isDirectoryMode });
    } catch (error) {
      throw new SystemError(
        `Failed to write config file: ${filePath}`,
        'TAI-5003',
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 判断是否为目录输出模式
   */
  private isDirectoryOutput(adapter: AIToolAdapter): boolean {
    // 对于 CustomAdapter，检查其配置
    if ('config' in adapter && adapter.config) {
      const customConfig = adapter.config as { outputType?: string };
      return customConfig.outputType === 'directory';
    }

    // 对于内置适配器，都是单文件模式
    return false;
  }

  /**
   * 目录模式写入（前缀保护）
   */
  private async writeDirectoryModeFile(
    dir: string,
    filePath: string,
    content: string,
  ): Promise<void> {
    const filename = path.basename(filePath);

    // 检查是否为用户自定义文件
    if (isUserDefinedFile(filename, this.protectionConfig)) {
      Logger.warn('Skipping user-defined file', { filename });
      vscode.window.showWarningMessage(
        vscode.l10n.t(
          'File "{0}" is in user-defined range (800-999). Skipped to protect your custom rules.',
          filename,
        ),
      );
      return;
    }

    // 扫描目录，检查冲突
    try {
      if (fs.existsSync(dir)) {
        fs.readdirSync(dir).map((f) => path.join(dir, f));
      }
    } catch (error) {
      Logger.warn('Failed to read directory for conflict detection', { dir, error });
    }

    // 写入文件
    await safeWriteFile(filePath, content);
  }

  /**
   * 单文件模式写入（块标记保护）
   */
  private async writeSingleFileMode(filePath: string, newContent: string): Promise<void> {
    let existingContent = '';

    // 读取现有文件
    try {
      if (fs.existsSync(filePath)) {
        existingContent = fs.readFileSync(filePath, 'utf-8');
      }
    } catch (error) {
      Logger.warn('Failed to read existing file', { filePath, error });
    }

    // 如果文件存在，提取用户内容
    let mergedContent = newContent;
    if (existingContent) {
      const { userContent } = extractUserContent(existingContent, this.protectionConfig);
      mergedContent = mergeContent(newContent, userContent, this.protectionConfig);
      Logger.debug('Merged user content with generated content', {
        userContentLength: userContent.length,
        filePath,
      });
    } else {
      // 首次生成，添加用户区域模板
      mergedContent = mergeContent(newContent, '', this.protectionConfig);
    }

    await safeWriteFile(filePath, mergedContent);
  }

  /**
   * 确保生成的文件在 .gitignore 中
   * @param workspaceRoot 工作区根目录
   */
  private async ensureGitIgnore(workspaceRoot: string): Promise<void> {
    try {
      const patterns: string[] = [];

      // 收集所有适配器的文件路径
      for (const adapter of this.adapters.values()) {
        patterns.push(adapter.getFilePath());
      }

      if (patterns.length > 0) {
        await ensureIgnored(workspaceRoot, patterns);
        Logger.debug('Updated .gitignore', { patterns });
      }
    } catch (error) {
      // .gitignore 失败不影响主流程
      Logger.warn('Failed to update .gitignore', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 预览生成的内容（不写入文件）
   * @param adapter 适配器名称
   * @param rules 规则列表
   * @returns 生成的配置
   */
  public async preview(adapter: string, rules: ParsedRule[]): Promise<GeneratedConfig> {
    const adapterInstance = this.adapters.get(adapter);

    if (!adapterInstance) {
      throw new GenerateError(`Adapter not found or not enabled: ${adapter}`, 'TAI-4003');
    }

    return await adapterInstance.generate(rules);
  }

  /**
   * 获取启用的适配器列表
   * @returns 适配器名称列表
   */
  public getEnabledAdapters(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * 显示生成结果通知
   * @param result 生成结果
   */
  public async showGenerationNotification(result: GenerateResult): Promise<void> {
    const { notify } = await import('../utils/notifications');
    if (result.success.length > 0 && result.failures.length === 0) {
      // 全部成功（瞬时提示）
      notify(`Generated ${result.success.length} config file(s)`, 'info');
    } else if (result.success.length > 0 && result.failures.length > 0) {
      // 部分成功（瞬时提示 + 日志详情）
      const message = `Generated ${result.success.length} file(s), ${result.failures.length} failed`;
      notify(message, 'warning');
      this.showGenerationDetails(result);
    } else if (result.failures.length > 0) {
      // 全部失败（瞬时提示 + 日志详情）
      notify('Failed to generate config files', 'error');
      this.showGenerationDetails(result);
    }
  }

  /**
   * 显示生成详情
   * @param result 生成结果
   */
  private showGenerationDetails(result: GenerateResult): void {
    const lines: string[] = [];

    if (result.success.length > 0) {
      lines.push('✅ Successfully generated:');
      for (const config of result.success) {
        lines.push(`  - ${config.filePath} (${config.ruleCount} rules)`);
      }
      lines.push('');
    }

    if (result.failures.length > 0) {
      lines.push('❌ Failed to generate:');
      for (const failure of result.failures) {
        lines.push(`  - ${failure.adapter}: ${failure.error}`);
      }
    }

    const content = lines.join('\n');

    // 在日志中输出详情
    Logger.info('Generation Report:\n' + content);
  }
}
