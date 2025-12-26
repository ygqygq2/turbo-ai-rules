/**
 * 用户规则工具函数
 * 处理用户自定义规则的读取和验证
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { MdcParser } from '../parsers/MdcParser';
import type { ParsedRule } from '../types/rules';
import { RULE_FILE_EXTENSIONS } from './constants';
import { Logger } from './logger';

/**
 * 用户规则特殊 sourceId
 */
export const USER_RULES_SOURCE_ID = 'user-rules';

/**
 * @description 获取用户规则目录的绝对路径
 * @return default {string | null}
 * @param directory {string} 用户规则目录（相对路径，可选，默认从配置读取）
 */
export function getUserRulesDirectory(directory?: string): string | null {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    Logger.warn('No workspace folder found');
    return null;
  }

  // 如果没有传入目录，从配置读取（向后兼容）
  const dir =
    directory ||
    vscode.workspace
      .getConfiguration('turbo-ai-rules.userRules')
      .get<string>('directory', 'ai-rules');

  const absolutePath = path.join(workspaceFolder.uri.fsPath, dir);

  // 安全检查：确保路径在工作区内
  const workspaceRoot = workspaceFolder.uri.fsPath;
  const resolvedPath = path.resolve(absolutePath);
  if (!resolvedPath.startsWith(workspaceRoot)) {
    Logger.error(
      'User rules directory is outside workspace',
      new Error('Path traversal detected'),
      {
        directory: dir,
        resolvedPath,
        workspaceRoot,
      },
    );
    return null;
  }

  return absolutePath;
}

/**
 * @description 检查用户规则功能是否启用
 * @return default {boolean}
 */
export function isUserRulesEnabled(): boolean {
  const config = vscode.workspace.getConfiguration('turbo-ai-rules.userRules');
  return config.get<boolean>('enabled', true);
}

/**
 * @description 扫描用户规则目录，返回所有规则文件路径
 * @return default {Promise<string[]>}
 * @param directory {string}
 */
async function scanUserRulesDirectory(directory: string): Promise<string[]> {
  const files: string[] = [];

  try {
    if (!(await fs.pathExists(directory))) {
      Logger.debug('User rules directory does not exist', { directory });
      return files;
    }

    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (RULE_FILE_EXTENSIONS.includes(ext)) {
          files.push(fullPath);
        }
      } else if (entry.isDirectory()) {
        // 递归扫描子目录
        const subFiles = await scanUserRulesDirectory(fullPath);
        files.push(...subFiles);
      }
    }
  } catch (error) {
    Logger.error('Failed to scan user rules directory', error as Error, { directory });
  }

  return files;
}

/**
 * @description 加载所有用户规则
 * @return default {Promise<ParsedRule[]>}
 */
export async function loadUserRules(): Promise<ParsedRule[]> {
  const directory = getUserRulesDirectory();
  if (!directory) {
    return [];
  }

  Logger.info('Loading user rules', { directory });

  try {
    // 扫描目录
    const filePaths = await scanUserRulesDirectory(directory);
    Logger.debug('Found user rule files', { count: filePaths.length });

    if (filePaths.length === 0) {
      return [];
    }

    // 解析所有规则文件
    const parser = new MdcParser();
    const rules: ParsedRule[] = [];

    for (const filePath of filePaths) {
      try {
        const rule = await parser.parseMdcFile(filePath, USER_RULES_SOURCE_ID);
        rules.push(rule);
        Logger.debug('Parsed user rule', { filePath, ruleId: rule.id });
      } catch (error) {
        Logger.warn('Failed to parse user rule file', {
          filePath,
          error: error instanceof Error ? error.message : String(error),
        });
        // 继续处理其他文件
      }
    }

    Logger.info('User rules loaded', { totalFiles: filePaths.length, validRules: rules.length });

    return rules;
  } catch (error) {
    Logger.error('Failed to load user rules', error as Error, { directory });
    return [];
  }
}

/**
 * @description 判断规则是否为用户规则
 * @return default {boolean}
 * @param rule {ParsedRule}
 */
export function isUserRule(rule: ParsedRule): boolean {
  return rule.sourceId === USER_RULES_SOURCE_ID;
}
