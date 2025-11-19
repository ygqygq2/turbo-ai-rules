/**
 * MDC 文件解析器
 * 解析 frontmatter (YAML) + Markdown 格式的规则文件
 */

import * as fs from 'fs-extra';
import matter from 'gray-matter';
import * as path from 'path';
import * as vscode from 'vscode';

import { ErrorCodes, ParseError } from '../types/errors';
import type { ParsedRule, RuleMetadata } from '../types/rules';
import { MAX_PARSE_DEPTH, MAX_PARSE_FILES, RULE_FILE_EXTENSIONS } from '../utils/constants';
import { safeReadFile } from '../utils/fileSystem';
import { Logger } from '../utils/logger';
import { validateRuleId } from '../utils/validator';

/**
 * 解析选项
 */
interface ParseDirectoryOptions {
  /** 是否递归解析子目录 */
  recursive?: boolean;
  /** 最大递归深度（默认：MAX_PARSE_DEPTH） */
  maxDepth?: number;
  /** 最大文件数（默认：MAX_PARSE_FILES） */
  maxFiles?: number;
  /** 文件扩展名过滤（默认：RULE_FILE_EXTENSIONS） */
  extensions?: string[];
}

/**
 * MDC 解析器
 */
export class MdcParser {
  /**
   * 获取解析器配置
   */
  private getParserConfig(): {
    strictMode: boolean;
    requireFrontmatter: boolean;
    excludeFiles: string[];
  } {
    const config = vscode.workspace.getConfiguration('turbo-ai-rules.parser');
    return {
      strictMode: config.get<boolean>('strictMode', false),
      requireFrontmatter: config.get<boolean>('requireFrontmatter', false),
      excludeFiles: config.get<string[]>('excludeFiles', ['README.md', 'readme.md', 'README.MD']),
    };
  }

  /**
   * 解析 MDC 文件
   * @param filePath 文件路径
   * @param sourceId 规则源 ID
   * @returns 解析后的规则
   */
  public async parseMdcFile(filePath: string, sourceId: string): Promise<ParsedRule> {
    try {
      Logger.debug('Parsing MDC file', { filePath, sourceId });

      const { strictMode, requireFrontmatter } = this.getParserConfig();

      // 读取文件内容
      const content = await safeReadFile(filePath);

      // 解析 frontmatter
      const parsed = matter(content);

      // 检查是否要求 frontmatter
      const hasFrontmatter = parsed.data && Object.keys(parsed.data).length > 0;
      if (requireFrontmatter && !hasFrontmatter) {
        throw new ParseError(
          'Missing required YAML frontmatter',
          ErrorCodes.PARSE_MISSING_METADATA,
          filePath,
        );
      }

      // 验证内容不为空
      const trimmedContent = parsed.content.trim();
      if (!trimmedContent) {
        throw new ParseError('Rule content is empty', ErrorCodes.PARSE_VALIDATION_FAILED, filePath);
      }

      // 提取元数据
      const metadata = parsed.data as RuleMetadata;

      // 严格模式：必须有 id 和 title
      if (strictMode) {
        if (!metadata.id) {
          throw new ParseError(
            'Strict mode: id field required in frontmatter',
            ErrorCodes.PARSE_MISSING_METADATA,
            filePath,
          );
        }

        if (!metadata.title) {
          throw new ParseError(
            'Strict mode: title field required in frontmatter',
            ErrorCodes.PARSE_MISSING_METADATA,
            filePath,
          );
        }

        // 验证 ID 格式
        if (!validateRuleId(metadata.id)) {
          throw new ParseError(
            `Invalid rule ID format: ${metadata.id} (must be kebab-case)`,
            ErrorCodes.PARSE_VALIDATION_FAILED,
            filePath,
          );
        }
      }

      // 提取或生成 id 和 title（宽松模式下总是尝试生成）
      let id = metadata.id;
      let title = metadata.title;

      // 如果没有 id，从文件名生成
      if (!id) {
        id = this.extractIdFromFilename(filePath);
        Logger.debug('Generated ID from filename', { filePath, id });
      }

      // 验证生成的 ID 格式
      if (!validateRuleId(id)) {
        // ID 格式无效，强制使用文件名生成
        const fallbackId = this.extractIdFromFilename(filePath);
        Logger.warn('Invalid rule ID format, using filename-based ID', {
          filePath,
          invalidId: id,
          fallbackId,
        });
        id = fallbackId;
      }

      // 如果没有 title，尝试从内容或文件名提取
      if (!title) {
        title = this.extractTitleFromContent(parsed.content, filePath);
        Logger.debug('Generated title from content/filename', { filePath, title });
      }

      // 将 ID 统一转换为字符串用于存储和比较
      const normalizedId = String(id);

      const rule: ParsedRule = {
        id: normalizedId,
        title,
        content: trimmedContent,
        metadata: {
          ...metadata,
          id: normalizedId,
          title,
        },
        sourceId,
        filePath,
      };

      Logger.debug('MDC file parsed successfully', { filePath, ruleId: id, strictMode });

      return rule;
    } catch (error) {
      if (error instanceof ParseError) {
        throw error;
      }

      Logger.error('Failed to parse MDC file', error as Error, { filePath });

      throw new ParseError(
        `Failed to parse MDC file: ${filePath}`,
        ErrorCodes.PARSE_INVALID_FORMAT,
        filePath,
        error as Error,
      );
    }
  }

  /**
   * 从文件名提取 ID
   * @param filePath 文件路径
   * @returns 规则 ID
   */
  private extractIdFromFilename(filePath: string): string {
    const filename = path.basename(filePath, path.extname(filePath));
    // 转换为 kebab-case
    return filename
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * 从内容中提取标题（如果 frontmatter 中没有）
   * @param content Markdown 内容
   * @param filePath 文件路径（用于生成后备标题）
   * @returns 标题
   */
  private extractTitleFromContent(content: string, filePath?: string): string {
    // 尝试从第一个 # 标题提取
    const match = content.match(/^#\s+(.+)$/m);
    if (match) {
      return match[1].trim();
    }

    // 宽松模式：如果没有标题，使用文件名
    if (filePath) {
      const filename = path.basename(filePath, path.extname(filePath));
      // 转换 kebab-case 为标题格式
      return filename
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    return '';
  }

  /**
   * 批量解析目录下的所有 MDC 文件
   * @param dirPath 目录路径
   * @param sourceId 规则源 ID
   * @param options 解析选项
   * @returns 解析后的规则列表
   */
  public async parseDirectory(
    dirPath: string,
    sourceId: string,
    options?: ParseDirectoryOptions,
  ): Promise<ParsedRule[]> {
    const opts: Required<ParseDirectoryOptions> = {
      recursive: options?.recursive ?? true,
      maxDepth: options?.maxDepth ?? MAX_PARSE_DEPTH,
      maxFiles: options?.maxFiles ?? MAX_PARSE_FILES,
      extensions: options?.extensions ?? RULE_FILE_EXTENSIONS,
    };

    try {
      Logger.debug('Parsing directory', {
        dirPath,
        sourceId,
        recursive: opts.recursive,
        maxDepth: opts.maxDepth,
      });

      const rules: ParsedRule[] = [];
      const errors: Array<{ filePath: string; error: Error }> = [];
      const state = { filesProcessed: 0 };

      // 递归或非递归解析
      if (opts.recursive) {
        await this.parseDirectoryRecursive(
          dirPath,
          sourceId,
          opts,
          rules,
          errors,
          state,
          0, // 当前深度
        );
      } else {
        // 非递归：只解析当前目录
        const files = await this.findRuleFiles(dirPath, opts.extensions, false);
        for (const filePath of files) {
          if (state.filesProcessed >= opts.maxFiles) {
            Logger.warn('Max files limit reached, stopping parsing', {
              maxFiles: opts.maxFiles,
            });
            break;
          }
          await this.parseFile(filePath, sourceId, rules, errors, state);
        }
      }

      Logger.debug('Directory parsing complete', {
        dirPath,
        totalFiles: state.filesProcessed,
        successCount: rules.length,
        errorCount: errors.length,
      });

      // 如果所有文件都解析失败，抛出错误
      if (rules.length === 0 && errors.length > 0) {
        throw new ParseError(
          `Failed to parse any MDC files in directory: ${dirPath}`,
          ErrorCodes.PARSE_INVALID_FORMAT,
          dirPath,
        );
      }

      return rules;
    } catch (error) {
      if (error instanceof ParseError) {
        throw error;
      }

      Logger.error('Failed to parse directory', error as Error, { dirPath });

      throw new ParseError(
        `Failed to parse directory: ${dirPath}`,
        ErrorCodes.PARSE_INVALID_FORMAT,
        dirPath,
        error as Error,
      );
    }
  }

  /**
   * 递归解析目录
   */
  private async parseDirectoryRecursive(
    dirPath: string,
    sourceId: string,
    options: Required<ParseDirectoryOptions>,
    rules: ParsedRule[],
    errors: Array<{ filePath: string; error: Error }>,
    state: { filesProcessed: number },
    currentDepth: number,
  ): Promise<void> {
    // 检查深度限制
    if (currentDepth >= options.maxDepth) {
      Logger.debug('Max depth reached, skipping directory', {
        dirPath,
        currentDepth,
        maxDepth: options.maxDepth,
      });
      return;
    }

    // 检查文件数限制
    if (state.filesProcessed >= options.maxFiles) {
      Logger.warn('Max files limit reached, stopping parsing', {
        maxFiles: options.maxFiles,
      });
      return;
    }

    // 解析当前目录的文件
    const files = await this.findRuleFiles(dirPath, options.extensions, false);
    for (const filePath of files) {
      if (state.filesProcessed >= options.maxFiles) {
        break;
      }
      await this.parseFile(filePath, sourceId, rules, errors, state);
    }

    // 递归解析子目录
    const subdirs = await this.findSubdirectories(dirPath);
    for (const subdir of subdirs) {
      if (state.filesProcessed >= options.maxFiles) {
        break;
      }
      await this.parseDirectoryRecursive(
        subdir,
        sourceId,
        options,
        rules,
        errors,
        state,
        currentDepth + 1,
      );
    }
  }

  /**
   * 查找规则文件
   */
  private async findRuleFiles(
    dirPath: string,
    extensions: string[],
    recursive: boolean,
  ): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const { excludeFiles } = this.getParserConfig();

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isFile()) {
        // 检查是否在排除列表中
        if (excludeFiles.includes(entry.name)) {
          Logger.debug('Skipping excluded file', { filePath: fullPath });
          continue;
        }

        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      } else if (recursive && entry.isDirectory()) {
        const subFiles = await this.findRuleFiles(fullPath, extensions, true);
        files.push(...subFiles);
      }
    }

    return files;
  }

  /**
   * 查找子目录
   */
  private async findSubdirectories(dirPath: string): Promise<string[]> {
    const subdirs: string[] = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        subdirs.push(path.join(dirPath, entry.name));
      }
    }

    return subdirs;
  }

  /**
   * 解析单个文件
   */
  private async parseFile(
    filePath: string,
    sourceId: string,
    rules: ParsedRule[],
    errors: Array<{ filePath: string; error: Error }>,
    state: { filesProcessed: number },
  ): Promise<void> {
    try {
      const rule = await this.parseMdcFile(filePath, sourceId);
      rules.push(rule);
      state.filesProcessed++;
    } catch (error) {
      Logger.warn('Failed to parse MDC file, skipping', {
        filePath,
        error: (error as Error).message,
      });
      errors.push({ filePath, error: error as Error });
      state.filesProcessed++;
    }
  }

  /**
   * 验证 MDC 文件格式
   * @param content 文件内容
   * @returns 是否有效
   */
  public validateMdcContent(content: string): boolean {
    const { requireFrontmatter } = this.getParserConfig();

    try {
      const parsed = matter(content);

      // 如果要求 frontmatter，检查是否存在
      if (requireFrontmatter) {
        if (!parsed.data || Object.keys(parsed.data).length === 0) {
          return false;
        }
      }

      // 必须有内容
      if (!parsed.content || parsed.content.trim() === '') {
        return false;
      }

      return true;
    } catch (_error) {
      return false;
    }
  }
}
