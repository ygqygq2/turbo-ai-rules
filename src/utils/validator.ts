/**
 * 输入验证工具
 */

import * as path from 'path';

import { BRANCH_NAME_REGEX, GIT_URL_REGEX, RULE_ID_REGEX } from './constants';

/**
 * 验证 Git URL
 */
export function validateGitUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  return GIT_URL_REGEX.test(url.trim());
}

/**
 * 验证分支名
 */
export function validateBranchName(branch: string): boolean {
  if (!branch || typeof branch !== 'string') {
    return false;
  }
  return BRANCH_NAME_REGEX.test(branch.trim());
}

/**
 * 验证 Rule ID
 * @param id - 规则ID,支持 string 或 number 类型
 */
export function validateRuleId(id: string | number): boolean {
  if (id === undefined || id === null) {
    return false;
  }
  // 转换为字符串进行验证
  const idStr = String(id).trim();
  if (!idStr) {
    return false;
  }
  return RULE_ID_REGEX.test(idStr);
}

/**
 * 验证路径安全性（防目录遍历）
 */
export function validatePath(userPath: string, basePath: string): boolean {
  try {
    const normalized = path.normalize(userPath);
    const resolved = path.resolve(basePath, normalized);
    const baseResolved = path.resolve(basePath);
    return resolved.startsWith(baseResolved);
  } catch (_error) {
    return false;
  }
}

/**
 * 验证同步间隔
 */
export function validateSyncInterval(interval: number): boolean {
  return Number.isInteger(interval) && interval >= 0 && interval <= 1440; // 最大 24 小时
}

/**
 * 验证 Source ID（kebab-case）
 */
export function validateSourceId(id: string): boolean {
  return validateRuleId(id);
}

/**
 * 清理并验证子路径
 */
export function sanitizeSubPath(subPath: string): string | undefined {
  if (!subPath) {
    return undefined;
  }

  // 移除开头和结尾的斜杠
  const cleaned = subPath.trim().replace(/^\/+|\/+$/g, '');

  // 检查是否包含 .. （目录遍历）
  if (cleaned.includes('..')) {
    throw new Error('Invalid sub path: contains directory traversal');
  }

  return cleaned || undefined;
}

/**
 * 验证 URL 是否为 HTTPS
 */
export function isHttpsUrl(url: string): boolean {
  return url.startsWith('https://');
}

/**
 * 验证 URL 是否为 SSH
 */
export function isSshUrl(url: string): boolean {
  return url.startsWith('git@');
}

/**
 * 验证配置对象的完整性
 */
export function validateConfig(config: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    errors.push('Configuration is null or undefined');
    return { valid: false, errors };
  }

  const cfg = config as Record<string, unknown>;

  // 验证 sources
  if (!Array.isArray(cfg.sources)) {
    errors.push('sources must be an array');
  }

  // 验证 storage
  if (!cfg.storage || typeof cfg.storage !== 'object') {
    errors.push('storage configuration is missing');
  } else {
    const storage = cfg.storage as Record<string, unknown>;
    if (typeof storage.autoGitignore !== 'boolean') {
      errors.push('storage.autoGitignore must be a boolean');
    }
  }

  // 验证 sync
  if (!cfg.sync || typeof cfg.sync !== 'object') {
    errors.push('sync configuration is missing');
  } else {
    const sync = cfg.sync as Record<string, unknown>;
    if (typeof sync.auto !== 'boolean') {
      errors.push('sync.auto must be a boolean');
    }
    if (!validateSyncInterval(sync.interval as number)) {
      errors.push('sync.interval must be a valid number');
    }
    if (typeof sync.onStartup !== 'boolean') {
      errors.push('sync.onStartup must be a boolean');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
