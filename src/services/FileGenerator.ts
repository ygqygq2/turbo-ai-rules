/**
 * 文件生成服务
 * 负责编排适配器，生成不同 AI 工具的配置文件
 */

import * as path from 'path';
import * as vscode from 'vscode';

import type { AIToolAdapter, GeneratedConfig } from '../adapters';
import { ContinueAdapter, CopilotAdapter, CursorAdapter } from '../adapters';
import { RulesAdapter } from '../adapters/RulesAdapter';
import type { AdaptersConfig } from '../types/config';
import { GenerateError, SystemError } from '../types/errors';
import type { ConflictStrategy, ParsedRule } from '../types/rules';
import { ensureDir, safeWriteFile } from '../utils/fileSystem';
import { ensureIgnored } from '../utils/gitignore';
import { Logger } from '../utils/logger';

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

  private constructor() {
    this.adapters = new Map();
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
    Logger.info('Initializing adapters', config);

    this.adapters.clear();

    // 注册启用的适配器
    if (config.cursor) {
      this.adapters.set('cursor', new CursorAdapter(true));
    }

    if (config.copilot) {
      this.adapters.set('copilot', new CopilotAdapter(true));
    }

    if (config.continue) {
      this.adapters.set('continue', new ContinueAdapter(true));
    }

    // 始终启用通用规则适配器
    this.adapters.set('rules', new RulesAdapter());

    Logger.info('Adapters initialized', {
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
    Logger.info('Generating all config files', {
      ruleCount: rules.length,
      adapterCount: this.adapters.size,
      strategy,
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

        Logger.info(`Generated config for ${name}`, {
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

    Logger.info('Generation complete', {
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

    // 写入文件
    const fullPath = path.join(workspaceRoot, config.filePath);
    await this.writeConfigFile(fullPath, config.content);

    return config;
  }

  /**
   * 写入配置文件
   * @param filePath 文件路径
   * @param content 文件内容
   */
  private async writeConfigFile(filePath: string, content: string): Promise<void> {
    try {
      // 确保目录存在
      const dir = path.dirname(filePath);
      await ensureDir(dir);

      // 写入文件
      await safeWriteFile(filePath, content);

      Logger.debug('Config file written', { filePath });
    } catch (error) {
      throw new SystemError(
        `Failed to write config file: ${filePath}`,
        'TAI-5003',
        error instanceof Error ? error : undefined,
      );
    }
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
    if (result.success.length > 0 && result.failures.length === 0) {
      // 全部成功
      vscode.window.showInformationMessage(
        `Successfully generated ${result.success.length} config file(s)`,
      );
    } else if (result.success.length > 0 && result.failures.length > 0) {
      // 部分成功
      const message = `Generated ${result.success.length} config file(s), ${result.failures.length} failed`;
      const action = await vscode.window.showWarningMessage(message, 'Show Details');

      if (action === 'Show Details') {
        this.showGenerationDetails(result);
      }
    } else if (result.failures.length > 0) {
      // 全部失败
      const action = await vscode.window.showErrorMessage(
        `Failed to generate config files`,
        'Show Details',
      );

      if (action === 'Show Details') {
        this.showGenerationDetails(result);
      }
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
