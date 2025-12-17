/**
 * .gitignore 管理工具
 */

import * as path from 'path';

import { GITIGNORE_MARKER } from './constants';
import { pathExists, safeReadFile, safeWriteFile } from './fileSystem';
import { Logger } from './logger';
import { notify } from './notifications';

/**
 * 确保指定的模式已添加到 .gitignore（动态管理）
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

    const lines = content.split('\n');
    const markerIndex = lines.findIndex((line) => line.includes(GITIGNORE_MARKER));

    let newLines: string[];
    const existingPatterns: string[] = [];

    if (markerIndex !== -1) {
      // 找到标记，提取当前管理的模式
      newLines = lines.slice(0, markerIndex);
      for (let i = markerIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '') break; // 遇到空行停止
        existingPatterns.push(line);
      }
      // 保留空行后的内容
      const emptyLineIndex = lines.slice(markerIndex + 1).findIndex((l) => l.trim() === '');
      if (emptyLineIndex !== -1) {
        newLines.push(...lines.slice(markerIndex + 1 + emptyLineIndex + 1));
      }
    } else {
      // 没有标记，初始化
      newLines = [...lines];
    }

    // 计算需要添加和删除的模式
    const patternsToAdd = patterns.filter((p) => !existingPatterns.includes(p));
    const patternsToRemove = existingPatterns.filter((p) => !patterns.includes(p));

    // 如果没有变化，直接返回
    if (patternsToAdd.length === 0 && patternsToRemove.length === 0) {
      Logger.debug('.gitignore patterns are up to date');
      return;
    }

    // 重新构建内容：原有内容 + 标记 + 新模式列表
    const finalLines = [
      ...newLines.map((l) => l.trimEnd()).filter((_, i, arr) => i < arr.length - 1 || _ !== ''),
      '',
      GITIGNORE_MARKER,
      ...patterns,
      '',
    ];

    await safeWriteFile(gitignorePath, finalLines.join('\n'));

    Logger.info('Updated .gitignore with turbo-ai-rules patterns', {
      patternsAdded: patternsToAdd.length,
      patternsRemoved: patternsToRemove.length,
      totalPatterns: patterns.length,
    });

    // 显示瞬时通知（仅在有变化时）
    if (patternsToAdd.length > 0 || patternsToRemove.length > 0) {
      const message = [];
      if (patternsToAdd.length > 0) message.push(`+${patternsToAdd.length}`);
      if (patternsToRemove.length > 0) message.push(`-${patternsToRemove.length}`);
      notify(`Updated .gitignore (${message.join(', ')} patterns)`, 'info');
    }
  } catch (error) {
    Logger.error('Failed to update .gitignore', error as Error, {
      workspacePath,
    });
    notify(
      'Failed to update .gitignore. Please manually add the AI rules cache directory to your .gitignore file.',
      'warning',
    );
  }
}

/**
 * 从 .gitignore 中移除 turbo-ai-rules 的所有模式
 * @param workspacePath 工作区路径
 */
export async function removeAllIgnorePatterns(workspacePath: string): Promise<void> {
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

    Logger.info('Removed all turbo-ai-rules patterns from .gitignore');
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

/**
 * 从 .gitignore 中移除指定的模式（保留其他 turbo-ai-rules 管理的模式）
 * @param workspacePath 工作区路径
 * @param patterns 要移除的模式列表
 */
export async function removeIgnored(workspacePath: string, patterns: string[]): Promise<void> {
  try {
    const gitignorePath = path.join(workspacePath, '.gitignore');

    if (!(await pathExists(gitignorePath))) {
      return;
    }

    const content = await safeReadFile(gitignorePath);
    const lines = content.split('\n');
    const markerIndex = lines.findIndex((line) => line.includes(GITIGNORE_MARKER));

    if (markerIndex === -1) {
      Logger.debug('No turbo-ai-rules patterns found in .gitignore');
      return;
    }

    // 提取当前管理的模式
    const existingPatterns: string[] = [];
    const newLines = lines.slice(0, markerIndex);

    for (let i = markerIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '') break; // 遇到空行停止
      existingPatterns.push(line);
    }

    // 保留空行后的内容
    const emptyLineIndex = lines.slice(markerIndex + 1).findIndex((l) => l.trim() === '');
    if (emptyLineIndex !== -1) {
      newLines.push(...lines.slice(markerIndex + 1 + emptyLineIndex + 1));
    }

    // 过滤掉要移除的模式
    const remainingPatterns = existingPatterns.filter((p) => !patterns.includes(p));

    // 如果没有剩余模式，移除整个标记块
    if (remainingPatterns.length === 0) {
      await safeWriteFile(gitignorePath, newLines.join('\n'));
      Logger.info('Removed all specified patterns from .gitignore', { patterns });
      return;
    }

    // 重新构建内容
    const finalLines = [
      ...newLines.map((l) => l.trimEnd()).filter((_, i, arr) => i < arr.length - 1 || _ !== ''),
      '',
      GITIGNORE_MARKER,
      ...remainingPatterns,
      '',
    ];

    await safeWriteFile(gitignorePath, finalLines.join('\n'));

    Logger.info('Removed specified patterns from .gitignore', {
      patternsRemoved: patterns.filter((p) => existingPatterns.includes(p)).length,
      remainingPatterns: remainingPatterns.length,
    });
  } catch (error) {
    Logger.error('Failed to remove patterns from .gitignore', error as Error, {
      workspacePath,
      patterns,
    });
  }
}
