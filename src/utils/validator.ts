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
 */
export function validateRuleId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  return RULE_ID_REGEX.test(id.trim());
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
  } catch (error) {
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
export function validateConfig(config: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config) {
    errors.push('Configuration is null or undefined');
    return { valid: false, errors };
  }

  // 验证 sources
  if (!Array.isArray(config.sources)) {
    errors.push('sources must be an array');
  }

  // 验证 storage
  if (!config.storage) {
    errors.push('storage configuration is missing');
  } else {
    if (typeof config.storage.useGlobalCache !== 'boolean') {
      errors.push('storage.useGlobalCache must be a boolean');
    }
    if (typeof config.storage.projectLocalDir !== 'string') {
      errors.push('storage.projectLocalDir must be a string');
    }
    if (typeof config.storage.autoGitignore !== 'boolean') {
      errors.push('storage.autoGitignore must be a boolean');
    }
  }

  // 验证 sync
  if (!config.sync) {
    errors.push('sync configuration is missing');
  } else {
    if (typeof config.sync.auto !== 'boolean') {
      errors.push('sync.auto must be a boolean');
    }
    if (!validateSyncInterval(config.sync.interval)) {
      errors.push('sync.interval must be a valid number');
    }
    if (typeof config.sync.onStartup !== 'boolean') {
      errors.push('sync.onStartup must be a boolean');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
