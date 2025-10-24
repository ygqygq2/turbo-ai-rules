/**
 * .gitignore 管理工具
 */

import * as path from 'path';
import * as vscode from 'vscode';

import { GITIGNORE_MARKER } from './constants';
import { pathExists, safeReadFile, safeWriteFile } from './fileSystem';
import { Logger } from './logger';

/**
 * 确保指定的模式已添加到 .gitignore
 * @param workspacePath 工作区路径
 * @param patterns 要忽略的模式列表
 */
export async function ensureIgnored(workspacePath: string, patterns: string[]): Promise<void> {
  try {
    const gitignorePath = path.join(workspacePath, '.gitignore');
    let content = '';

    // 读取现有的 .gitignore 文件
    if (await pathExists(gitignorePath)) {
      content = await safeReadFile(gitignorePath);
    }

    // 检查是否已经包含我们的标记
    const hasMarker = content.includes(GITIGNORE_MARKER);

    if (hasMarker) {
      Logger.debug('.gitignore already contains turbo-ai-rules patterns');
      return;
    }

    // 检查哪些模式还未添加
    const linesToAdd: string[] = [];
    const existingLines = content.split('\n').map((line) => line.trim());

    for (const pattern of patterns) {
      if (!existingLines.includes(pattern)) {
        linesToAdd.push(pattern);
      }
    }

    // 如果没有需要添加的模式，直接返回
    if (linesToAdd.length === 0) {
      Logger.debug('All patterns already in .gitignore');
      return;
    }

    // 添加新的模式
    const newContent = [content.trimEnd(), '', GITIGNORE_MARKER, ...linesToAdd, ''].join('\n');

    await safeWriteFile(gitignorePath, newContent);

    Logger.info('Updated .gitignore with turbo-ai-rules patterns', {
      patternsAdded: linesToAdd.length,
    });

    // 显示通知
    vscode.window.showInformationMessage(
      `✓ Updated .gitignore to exclude AI rules cache (${linesToAdd.length} patterns added)`,
    );
  } catch (error) {
    Logger.error('Failed to update .gitignore', error as Error, {
      workspacePath,
    });
    vscode.window.showWarningMessage(
      'Failed to update .gitignore. Please manually add the AI rules cache directory to your .gitignore file.',
    );
  }
}

/**
 * 从 .gitignore 中移除 turbo-ai-rules 的模式
 * @param workspacePath 工作区路径
 */
export async function removeIgnorePatterns(workspacePath: string): Promise<void> {
  try {
    const gitignorePath = path.join(workspacePath, '.gitignore');

    if (!(await pathExists(gitignorePath))) {
      return;
    }

    const content = await safeReadFile(gitignorePath);
    const lines = content.split('\n');

    // 找到标记的位置
    const markerIndex = lines.findIndex((line) => line.includes(GITIGNORE_MARKER));

    if (markerIndex === -1) {
      Logger.debug('No turbo-ai-rules patterns found in .gitignore');
      return;
    }

    // 移除标记和后续的模式（直到遇到空行或文件结束）
    const newLines: string[] = [];
    let skip = false;

    for (let i = 0; i < lines.length; i++) {
      if (i === markerIndex) {
        skip = true;
        continue;
      }

      if (skip && lines[i].trim() === '') {
        skip = false;
        continue;
      }

      if (!skip) {
        newLines.push(lines[i]);
      }
    }

    const newContent = newLines.join('\n');
    await safeWriteFile(gitignorePath, newContent);

    Logger.info('Removed turbo-ai-rules patterns from .gitignore');
  } catch (error) {
    Logger.error('Failed to remove patterns from .gitignore', error as Error, {
      workspacePath,
    });
  }
}

/**
 * 检查 .gitignore 是否包含指定的模式
 * @param workspacePath 工作区路径
 * @param pattern 要检查的模式
 * @returns 是否包含
 */
export async function isPatternIgnored(workspacePath: string, pattern: string): Promise<boolean> {
  try {
    const gitignorePath = path.join(workspacePath, '.gitignore');

    if (!(await pathExists(gitignorePath))) {
      return false;
    }

    const content = await safeReadFile(gitignorePath);
    const lines = content.split('\n').map((line) => line.trim());

    return lines.includes(pattern);
  } catch (_error) {
    Logger.warn('Failed to check .gitignore pattern', { workspacePath, pattern });
    return false;
  }
}
