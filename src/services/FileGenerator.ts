/**
 * 文件生成服务
 * 负责编排适配器，生成不同 AI 工具的配置文件
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import type { AIToolAdapter, GeneratedConfig } from '../adapters';
import {
  ContinueAdapter,
  CopilotAdapter,
  CursorAdapter,
  CustomAdapter,
  PRESET_ADAPTERS,
  PresetAdapter,
} from '../adapters';
import type { AdaptersConfig, CustomAdapterConfig } from '../types/config';
import { GenerateError, SystemError } from '../types/errors';
import type { PartialUpdateOptions } from '../types/ruleMarker';
import type { ConflictStrategy, ParsedRule } from '../types/rules';
import { CONFIG_KEYS, CONFIG_PREFIX } from '../utils/constants';
import { ensureDir, pathExists, readDir, safeReadFile, safeWriteFile } from '../utils/fileSystem';
import { ensureIgnored } from '../utils/gitignore';
import { Logger } from '../utils/logger';
import { partialUpdate } from '../utils/ruleMarkerMerger';
import type { UserRulesProtectionConfig } from '../utils/userRulesProtection';
import { extractUserContent, isUserDefinedFile, mergeContent } from '../utils/userRulesProtection';
import { GitManager } from './GitManager';

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
    const config = vscode.workspace.getConfiguration(CONFIG_PREFIX);
    return {
      enabled: config.get<boolean>(CONFIG_KEYS.PROTECT_USER_RULES, true),
      userPrefixRange: config.get(CONFIG_KEYS.USER_PREFIX_RANGE, { min: 80000, max: 99999 }),
      blockMarkers: config.get(CONFIG_KEYS.BLOCK_MARKERS),
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

    // 注册预设适配器（配置驱动）
    for (const presetConfig of PRESET_ADAPTERS) {
      const enabled =
        (config as Record<string, { enabled?: boolean }>)[presetConfig.id]?.enabled ?? false;
      if (enabled) {
        const adapter = new PresetAdapter(presetConfig, true);
        this.adapters.set(presetConfig.id, adapter);
        Logger.debug(`Registered preset adapter: ${presetConfig.id} (${presetConfig.name})`);
      }
    }

    // 兼容旧的独立适配器类（待废弃）
    // TODO: 在下一个主版本中移除这些独立类
    if (config.cursor?.enabled && !this.adapters.has('cursor')) {
      this.adapters.set('cursor', new CursorAdapter(true));
      Logger.warn('Using legacy CursorAdapter, please update to PresetAdapter');
    }
    if (config.copilot?.enabled && !this.adapters.has('copilot')) {
      this.adapters.set('copilot', new CopilotAdapter(true));
      Logger.warn('Using legacy CopilotAdapter, please update to PresetAdapter');
    }
    if (config.continue?.enabled && !this.adapters.has('continue')) {
      this.adapters.set('continue', new ContinueAdapter(true));
      Logger.warn('Using legacy ContinueAdapter, please update to PresetAdapter');
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

    // 即使没有规则，也要生成空配置以清空之前的内容
    if (rules.length === 0) {
      Logger.info('No rules selected, generating empty configurations to clear previous content');
    }

    // 为每个适配器生成配置
    for (const [name, adapter] of this.adapters.entries()) {
      try {
        // 检查是否为 skills 适配器（isRuleType=false 表示非规则类型，即 skills 类型）
        let adapterRules = rules;
        if (adapter instanceof CustomAdapter) {
          const customConfig = adapter.config;
          if (!customConfig.isRuleType && customConfig.sourceId) {
            // Skills 适配器：从指定源路径读取文件作为规则
            adapterRules = await this.getSkillsRules(customConfig);
            Logger.debug(`Loaded skills for adapter: ${name}`, {
              sourceId: customConfig.sourceId,
              subPath: customConfig.subPath,
              skillsCount: adapterRules.length,
            });
          }
        }

        const config = await this.generateForAdapter(adapter, adapterRules, workspaceRoot);
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
   * @description 从源仓库读取技能文件作为规则
   * @return default {Promise<ParsedRule[]>}
   * @param config {CustomAdapterConfig}
   */
  private async getSkillsRules(config: CustomAdapterConfig): Promise<ParsedRule[]> {
    const gitManager = GitManager.getInstance();
    const sourceId = config.sourceId!;
    const subPath = config.subPath || '/';

    // 获取源仓库路径
    const repoPath = gitManager.getSourcePath(sourceId);
    const skillsPath = path.join(repoPath, subPath);

    Logger.debug(`Reading skills from: ${skillsPath}`, {
      sourceId,
      subPath,
      repoPath,
    });

    // 检查路径是否存在
    if (!(await pathExists(skillsPath))) {
      Logger.warn(`Skills path does not exist: ${skillsPath}`);
      return [];
    }

    // 读取所有文件（递归）
    const fileExtensions = config.fileExtensions || ['.md', '.mdc'];
    const skillFiles = await this.readSkillsFiles(skillsPath, fileExtensions);

    Logger.info(`Found ${skillFiles.length} skill files`, {
      sourceId,
      subPath,
    });

    // 将文件转换为 ParsedRule 格式
    const rules: ParsedRule[] = [];
    for (const filePath of skillFiles) {
      try {
        const content = await safeReadFile(filePath);
        const relativePath = path.relative(repoPath, filePath);
        const fileName = path.basename(filePath, path.extname(filePath));

        // 创建简单的规则对象（skills 不需要解析 frontmatter）
        const rule: ParsedRule = {
          id: fileName,
          title: fileName,
          content: content,
          rawContent: content,
          sourceId: sourceId,
          filePath: relativePath,
          metadata: {},
        };

        rules.push(rule);
        Logger.debug(`Loaded skill file: ${relativePath}`);
      } catch (error) {
        Logger.warn(
          `Failed to read skill file: ${filePath}`,
          error instanceof Error
            ? { error: error.message, stack: error.stack }
            : { error: String(error) },
        );
      }
    }

    return rules;
  }

  /**
   * @description 递归读取技能文件
   * @return default {Promise<string[]>}
   * @param dirPath {string}
   * @param extensions {string[]}
   */
  private async readSkillsFiles(dirPath: string, extensions: string[]): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await readDir(dirPath);

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        const stat = await fs.promises.stat(fullPath);

        if (stat.isDirectory()) {
          // 递归读取子目录
          const subFiles = await this.readSkillsFiles(fullPath, extensions);
          files.push(...subFiles);
        } else if (stat.isFile()) {
          // 检查文件扩展名
          const ext = path.extname(entry);
          if (extensions.length === 0 || extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      Logger.warn(
        `Failed to read directory: ${dirPath}`,
        error instanceof Error
          ? { error: error.message, stack: error.stack }
          : { error: String(error) },
      );
    }

    return files;
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
          'File "{0}" is in user-defined range (80000-99999). Skipped to protect your custom rules.',
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
      // 检查是否已经有块标记（说明之前已被此扩展管理）
      const markers = this.protectionConfig.blockMarkers || {
        begin: '<!-- TURBO-AI-RULES:BEGIN -->',
        end: '<!-- TURBO-AI-RULES:END -->',
      };
      const hasBlockMarkers = existingContent.includes(markers.begin);

      let userContent = '';
      if (hasBlockMarkers) {
        // 已有块标记：提取块外内容作为用户规则
        const extracted = extractUserContent(existingContent, this.protectionConfig);
        userContent = extracted.userContent;
        Logger.debug('Extracted user content from existing file (with markers)', {
          userContentLength: userContent.length,
          filePath,
        });
      } else {
        // 第一次使用扩展且文件已存在：将整个现有内容视为用户规则
        userContent = existingContent;
        Logger.info('First-time protection: treating entire existing file as user rules', {
          existingContentLength: existingContent.length,
          filePath,
        });
      }

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
   * 确保生成的文件在 .gitignore 中（动态管理）
   * @param workspaceRoot 工作区根目录
   */
  private async ensureGitIgnore(workspaceRoot: string): Promise<void> {
    try {
      const patterns: string[] = [];

      // 收集所有已启用适配器的文件路径
      for (const adapter of this.adapters.values()) {
        patterns.push(adapter.getFilePath());
      }

      if (patterns.length > 0) {
        await ensureIgnored(workspaceRoot, patterns);
        Logger.debug('Updated .gitignore with enabled adapters', {
          patterns,
          count: patterns.length,
        });
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
   * 部分更新：只更新指定规则源的规则
   * @param rules 新规则列表
   * @param workspaceRoot 工作区根目录
   * @param targetSourceIds 目标规则源 ID 列表
   * @param adapterIds 目标适配器 ID 列表（可选，默认全部）
   * @returns 生成结果
   */
  public async partialUpdate(
    rules: ParsedRule[],
    workspaceRoot: string,
    targetSourceIds: string[],
    adapterIds?: string[],
  ): Promise<GenerateResult> {
    Logger.debug('Partial update started', {
      ruleCount: rules.length,
      targetSourceIds,
      adapterIds,
    });

    const result: GenerateResult = {
      success: [],
      failures: [],
    };

    // 确定要更新的适配器
    const adaptersToUpdate = adapterIds
      ? Array.from(this.adapters.entries()).filter(([id]) => adapterIds.includes(id))
      : Array.from(this.adapters.entries());

    for (const [name, adapter] of adaptersToUpdate) {
      try {
        // 只对单文件适配器执行部分更新
        if (this.isDirectoryOutput(adapter)) {
          // 目录模式：直接覆盖对应文件
          const config = await this.generateForAdapter(adapter, rules, workspaceRoot);
          result.success.push(config);
        } else {
          // 单文件模式：使用部分更新逻辑
          const config = await this.partialUpdateSingleFile(
            adapter,
            rules,
            workspaceRoot,
            targetSourceIds,
          );
          result.success.push(config);
        }

        Logger.debug(`Partial update completed for ${name}`, {
          targetSourceIds,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.failures.push({ adapter: name, error: errorMessage });
        Logger.error(
          `Failed to partial update for ${name}`,
          error instanceof Error ? error : undefined,
        );
      }
    }

    return result;
  }

  /**
   * 对单文件适配器执行部分更新
   */
  private async partialUpdateSingleFile(
    adapter: AIToolAdapter,
    rules: ParsedRule[],
    workspaceRoot: string,
    targetSourceIds: string[],
  ): Promise<GeneratedConfig> {
    const filePath = path.join(workspaceRoot, adapter.getFilePath());

    // 读取现有文件内容
    let existingContent = '';
    try {
      if (fs.existsSync(filePath)) {
        existingContent = fs.readFileSync(filePath, 'utf-8');
      }
    } catch (_error) {
      Logger.warn('Failed to read existing file for partial update', { filePath });
    }

    // 只获取目标规则源的规则
    const targetRules = rules.filter((rule) => targetSourceIds.includes(rule.sourceId));

    // 生成新内容（仅用于验证适配器能够处理这些规则）
    await adapter.generate(targetRules);

    // 提取头部内容（不含元数据，用于部分更新）
    const headerContent = this.extractHeaderContent(adapter);

    // 执行部分更新
    const options: PartialUpdateOptions = {
      targetSourceIds,
      preserveUserContent: true,
      preserveOtherSources: true,
    };

    const updateResult = partialUpdate(existingContent, targetRules, headerContent, options);

    // 写入文件
    await ensureDir(path.dirname(filePath));
    await safeWriteFile(filePath, updateResult.content);

    Logger.info('Partial update completed', {
      filePath: adapter.getFilePath(),
      isPartialUpdate: updateResult.isPartialUpdate,
      updatedSources: updateResult.updatedSources,
      preservedSources: updateResult.preservedSources,
    });

    return {
      filePath: adapter.getFilePath(),
      content: updateResult.content,
      generatedAt: new Date(),
      ruleCount: targetRules.length,
    };
  }

  /**
   * 提取适配器的头部内容（不含元数据）
   */
  private extractHeaderContent(adapter: AIToolAdapter): string {
    // 根据适配器类型返回对应的头部内容
    if (adapter.name === 'GitHub Copilot') {
      return (
        '# GitHub Copilot Instructions\n\n' +
        '> This file provides coding guidelines and rules for GitHub Copilot.\n' +
        '> Generated by Turbo AI Rules extension.\n\n'
      );
    } else if (adapter.name === 'Cursor') {
      return (
        '# Cursor Rules\n\n' +
        '> This file provides coding rules for Cursor IDE.\n' +
        '> Generated by Turbo AI Rules extension.\n\n'
      );
    } else if (adapter.name === 'Continue') {
      return (
        '# Continue Rules\n\n' +
        '> This file provides coding rules for Continue extension.\n' +
        '> Generated by Turbo AI Rules extension.\n\n'
      );
    }

    // 自定义适配器
    return `# ${adapter.name} Rules\n\n> Generated by Turbo AI Rules extension.\n\n`;
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
