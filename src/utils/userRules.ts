/**
 * 用户规则工具函数
 * 处理用户自定义规则的读取和验证
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { MdcParser } from '../parsers/MdcParser';
import type { BlockMarkers } from '../types/config';
import type { ParsedRule } from '../types/rules';
import { RULE_FILE_EXTENSIONS } from './constants';
import { Logger } from './logger';

/**
 * 用户规则特殊 sourceId（虚拟规则源，避免与用户真实规则源冲突）
 */
export const USER_RULES_SOURCE_ID = '__turbo-ai-rules-internal-user-rules__';

/**
 * 用户技能特殊 sourceId（虚拟规则源，避免与用户真实规则源冲突）
 */
export const USER_SKILLS_SOURCE_ID = '__turbo-ai-rules-internal-user-skills__';

/**
 * @description 获取用户规则目录的绝对路径
 * @return default {string | null}
 * @param directory {string} 用户规则目录（相对路径，可选，默认从配置读取）
 * @param workspaceUri {vscode.Uri} 工作区 URI（可选，默认使用 WorkspaceContextManager 的当前工作区）
 */
export function getUserRulesDirectory(
  directory?: string,
  workspaceUri?: vscode.Uri,
): string | null {
  // 优先使用传入的 workspaceUri，否则尝试获取当前工作区
  let workspaceFolder: vscode.WorkspaceFolder | undefined;

  if (workspaceUri) {
    workspaceFolder = vscode.workspace.getWorkspaceFolder(workspaceUri);
  }

  if (!workspaceFolder) {
    // 尝试从 WorkspaceContextManager 获取当前工作区
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { WorkspaceContextManager } = require('../services/WorkspaceContextManager');
      workspaceFolder = WorkspaceContextManager.getInstance().getCurrentWorkspaceFolder();
    } catch (_error) {
      // Fallback: 使用第一个工作区
      workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    }
  }

  if (!workspaceFolder) {
    Logger.warn('No workspace folder found');
    return null;
  }

  if (process.env.TEST_DEBUG === 'true') {
    console.log(`[getUserRulesDirectory] Using workspace:`, workspaceFolder.name);
  }

  // 从 userRules 配置读取目录
  const config = vscode.workspace.getConfiguration('turbo-ai-rules');
  const userRulesConfig = config.get<{ directory?: string }>('userRules', {});
  const dir = directory || userRulesConfig.directory || 'ai-rules';

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
 * @description 获取用户规则的 markers 配置
 * @return default {BlockMarkers}
 */
export function getMarkers(): BlockMarkers {
  const config = vscode.workspace.getConfiguration('turbo-ai-rules');
  const userRulesConfig = config.get<{ markers?: BlockMarkers }>('userRules');
  const markers = userRulesConfig?.markers;

  return (
    markers || {
      begin: '<!-- USER-RULES:BEGIN -->',
      end: '<!-- USER-RULES:END -->',
    }
  );
}

/**
 * @description 获取全局块标记配置
 * @return default {BlockMarkers}
 */
export function getBlockMarkers(): BlockMarkers {
  const config = vscode.workspace.getConfiguration('turbo-ai-rules');
  const blockMarkers = config.get<BlockMarkers>('blockMarkers');

  return (
    blockMarkers || {
      begin: '<!-- TURBO-AI-RULES:BEGIN -->',
      end: '<!-- TURBO-AI-RULES:END -->',
    }
  );
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
  if (process.env.TEST_DEBUG === 'true') {
    console.log(`[userRules] loadUserRules: directory =`, directory);
  }
  if (!directory) {
    if (process.env.TEST_DEBUG === 'true') {
      console.log(`[userRules] No user rules directory configured`);
    }
    return [];
  }

  // 获取相对路径用于日志显示
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const relativeDir =
    workspaceFolders && workspaceFolders[0]
      ? path.relative(workspaceFolders[0].uri.fsPath, directory)
      : directory;

  Logger.debug('Loading user rules', { directory: relativeDir });

  try {
    // 扫描目录
    const filePaths = await scanUserRulesDirectory(directory);
    if (process.env.TEST_DEBUG === 'true') {
      console.log(`[userRules] Found`, filePaths.length, 'user rule files');
    }
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

    Logger.debug('User rules loaded', { totalFiles: filePaths.length, validRules: rules.length });

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

/**
 * @description 获取用户技能目录的绝对路径
 * @return default {string | null}
 * @param directory {string} 用户技能目录（相对路径，可选，默认从配置读取）
 * @param workspaceUri {vscode.Uri} 工作区 URI（可选，默认使用 WorkspaceContextManager 的当前工作区）
 */
export function getUserSkillsDirectory(
  directory?: string,
  workspaceUri?: vscode.Uri,
): string | null {
  // 优先使用传入的 workspaceUri，否则尝试获取当前工作区
  let workspaceFolder: vscode.WorkspaceFolder | undefined;

  if (workspaceUri) {
    workspaceFolder = vscode.workspace.getWorkspaceFolder(workspaceUri);
  }

  if (!workspaceFolder) {
    // 尝试从 WorkspaceContextManager 获取当前工作区
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { WorkspaceContextManager } = require('../services/WorkspaceContextManager');
      workspaceFolder = WorkspaceContextManager.getInstance().getCurrentWorkspaceFolder();
    } catch (_error) {
      // Fallback: 使用第一个工作区
      workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    }
  }

  if (!workspaceFolder) {
    Logger.warn('No workspace folder found');
    return null;
  }

  if (process.env.TEST_DEBUG === 'true') {
    console.log(`[getUserSkillsDirectory] Using workspace:`, workspaceFolder.name);
  }

  // 从 userSkills 配置读取目录
  const config = vscode.workspace.getConfiguration('turbo-ai-rules');
  const userSkillsConfig = config.get<{ directory?: string }>('userSkills', {});
  const dir = directory || userSkillsConfig.directory || 'ai-skills';

  const absolutePath = path.join(workspaceFolder.uri.fsPath, dir);

  // 安全检查：确保路径在工作区内
  const workspaceRoot = workspaceFolder.uri.fsPath;
  const resolvedPath = path.resolve(absolutePath);
  if (!resolvedPath.startsWith(workspaceRoot)) {
    Logger.error(
      'User skills directory is outside workspace',
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
 * @description 加载所有用户技能
 * @return default {Promise<ParsedRule[]>}
 */
export async function loadUserSkills(): Promise<ParsedRule[]> {
  const directory = getUserSkillsDirectory();
  if (process.env.TEST_DEBUG === 'true') {
    console.log(`[userRules] loadUserSkills: directory =`, directory);
  }
  if (!directory) {
    if (process.env.TEST_DEBUG === 'true') {
      console.log(`[userRules] No user skills directory configured`);
    }
    return [];
  }

  // 获取相对路径用于日志显示
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const relativeDir =
    workspaceFolders && workspaceFolders[0]
      ? path.relative(workspaceFolders[0].uri.fsPath, directory)
      : directory;

  Logger.debug('Loading user skills', { directory: relativeDir });

  try {
    // 扫描目录
    const filePaths = await scanUserRulesDirectory(directory);
    if (process.env.TEST_DEBUG === 'true') {
      console.log(`[userRules] Found`, filePaths.length, 'user skill files');
    }
    Logger.debug('Found user skill files', { count: filePaths.length });

    if (filePaths.length === 0) {
      return [];
    }

    // 解析所有技能文件
    const parser = new MdcParser();
    const skills: ParsedRule[] = [];

    for (const filePath of filePaths) {
      try {
        const skill = await parser.parseMdcFile(filePath, USER_SKILLS_SOURCE_ID);
        skills.push(skill);
        Logger.debug('Parsed user skill', { filePath, skillId: skill.id });
      } catch (error) {
        Logger.warn('Failed to parse user skill file', {
          filePath,
          error: error instanceof Error ? error.message : String(error),
        });
        // 继续处理其他文件
      }
    }

    Logger.debug('User skills loaded', {
      totalFiles: filePaths.length,
      validSkills: skills.length,
    });

    return skills;
  } catch (error) {
    Logger.error('Failed to load user skills', error as Error, { directory });
    return [];
  }
}

/**
 * @description 判断规则是否为用户技能
 * @return default {boolean}
 * @param rule {ParsedRule}
 */
export function isUserSkill(rule: ParsedRule): boolean {
  return rule.sourceId === USER_SKILLS_SOURCE_ID;
}

/**
 * @description 过滤技能规则，处理 skill.md 的特殊逻辑
 * 当目录下有多个 .md 文件时，只保留 skill.md，忽略其它 .md 文件
 * @return {ParsedRule[]}
 * @param skills {ParsedRule[]} 原始技能列表
 */
export function filterSkillRules(skills: ParsedRule[]): ParsedRule[] {
  if (skills.length === 0) {
    return skills;
  }

  // 按目录分组
  const groupedByDir = new Map<string, ParsedRule[]>();
  for (const skill of skills) {
    const dir = path.dirname(skill.filePath);
    if (!groupedByDir.has(dir)) {
      groupedByDir.set(dir, []);
    }
    groupedByDir.get(dir)!.push(skill);
  }

  // 过滤规则
  const filtered: ParsedRule[] = [];
  for (const [dir, skillsInDir] of groupedByDir) {
    // 如果目录下只有一个 .md 文件，直接保留
    if (skillsInDir.length === 1) {
      filtered.push(...skillsInDir);
      continue;
    }

    // 如果目录下有多个 .md 文件，查找 skill.md
    const skillMdFile = skillsInDir.find((s) => path.basename(s.filePath) === 'skill.md');
    if (skillMdFile) {
      // 只保留 skill.md
      filtered.push(skillMdFile);
      Logger.debug('Filtered skill.md from directory with multiple .md files', {
        directory: path.relative(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', dir),
        totalFiles: skillsInDir.length,
        keptFile: 'skill.md',
      });
    } else {
      // 目录下没有 skill.md，保留所有文件
      filtered.push(...skillsInDir);
    }
  }

  return filtered;
}
