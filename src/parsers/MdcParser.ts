/**
 * MDC 文件解析器
 * 解析 frontmatter (YAML) + Markdown 格式的规则文件
 */

import * as fs from 'fs-extra';
import matter from 'gray-matter';
import * as path from 'path';

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
   * 解析 MDC 文件
   * @param filePath 文件路径
   * @param sourceId 规则源 ID
   * @returns 解析后的规则
   */
  public async parseMdcFile(filePath: string, sourceId: string): Promise<ParsedRule> {
    try {
      Logger.debug('Parsing MDC file', { filePath, sourceId });

      // 读取文件内容
      const content = await safeReadFile(filePath);

      // 解析 frontmatter
      const parsed = matter(content);

      // 验证必需字段
      const metadata = parsed.data as RuleMetadata;
      const id = metadata.id || this.extractIdFromFilename(filePath);
      const title = metadata.title || this.extractTitleFromContent(parsed.content);

      if (!id) {
        throw new ParseError(
          'Missing required field: id',
          ErrorCodes.PARSE_MISSING_METADATA,
          filePath,
        );
      }

      if (!title) {
        throw new ParseError(
          'Missing required field: title',
          ErrorCodes.PARSE_MISSING_METADATA,
          filePath,
        );
      }

      // 验证 ID 格式
      if (!validateRuleId(id)) {
        throw new ParseError(
          `Invalid rule ID format: ${id} (must be kebab-case)`,
          ErrorCodes.PARSE_VALIDATION_FAILED,
          filePath,
        );
      }

      // 验证内容不为空
      const trimmedContent = parsed.content.trim();
      if (!trimmedContent) {
        throw new ParseError('Rule content is empty', ErrorCodes.PARSE_VALIDATION_FAILED, filePath);
      }

      const rule: ParsedRule = {
        id,
        title,
        content: trimmedContent,
        metadata: {
          ...metadata,
          id,
          title,
        },
        sourceId,
        filePath,
      };

      Logger.debug('MDC file parsed successfully', { filePath, ruleId: id });

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
   * @returns 标题
   */
  private extractTitleFromContent(content: string): string {
    // 尝试从第一个 # 标题提取
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : '';
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
      Logger.info('Parsing directory', {
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

      Logger.info('Directory parsing complete', {
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

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isFile()) {
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
    try {
      const parsed = matter(content);

      // 必须有 frontmatter
      if (!parsed.data || Object.keys(parsed.data).length === 0) {
        return false;
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
