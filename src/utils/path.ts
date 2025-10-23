/**
 * 路径处理工具
 * 支持 ~ 展开、XDG 规范、相对路径解析
 */

import * as os from 'os';
import * as path from 'path';

/**
 * 展开 ~ 为用户主目录
 * @param filePath 可能包含 ~ 的路径
 * @returns 展开后的绝对路径
 */
export function expandHome(filePath: string): string {
  if (!filePath) {
    return filePath;
  }

  // 处理 ~ 开头的路径
  if (filePath.startsWith('~/') || filePath === '~') {
    const homeDir = os.homedir();
    return path.join(homeDir, filePath.slice(2));
  }

  // 处理 ~user/ 形式（Unix-like 系统）
  if (filePath.startsWith('~') && filePath.length > 1 && filePath[1] !== '/') {
    // 这种情况比较复杂，需要查询系统用户信息
    // 为简化，我们只支持当前用户的 ~
    throw new Error('Only current user home directory (~/) is supported');
  }

  return filePath;
}

/**
 * 解析缓存路径
 * 优先使用 XDG_CACHE_HOME，其次使用 ~/.cache
 * @param configPath 用户配置的路径（可能包含 ~）
 * @param defaultSubPath 默认子路径（如 'turbo-ai-rules'）
 * @returns 展开后的绝对路径
 */
export function resolveCachePath(
  configPath?: string,
  defaultSubPath: string = 'turbo-ai-rules',
): string {
  // 如果用户提供了路径，优先使用
  if (configPath) {
    const expanded = expandHome(configPath);
    return path.resolve(expanded);
  }

  // 使用 XDG 规范
  const xdgCacheHome = process.env.XDG_CACHE_HOME;
  if (xdgCacheHome) {
    return path.join(xdgCacheHome, defaultSubPath);
  }

  // 默认使用 ~/.cache/turbo-ai-rules
  const homeDir = os.homedir();
  return path.join(homeDir, '.cache', defaultSubPath);
}

/**
 * 解析配置文件路径
 * 优先使用 XDG_CONFIG_HOME，其次使用 ~/.config 或 Windows AppData
 * @param configPath 用户配置的路径（可能包含 ~）
 * @param defaultSubPath 默认子路径（如 'turbo-ai-rules'）
 * @returns 展开后的绝对路径
 */
export function resolveConfigPath(
  configPath?: string,
  defaultSubPath: string = 'turbo-ai-rules',
): string {
  // 如果用户提供了路径，优先使用
  if (configPath) {
    const expanded = expandHome(configPath);
    return path.resolve(expanded);
  }

  // 使用 XDG 规范（Linux/Unix）
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  if (xdgConfigHome) {
    return path.join(xdgConfigHome, defaultSubPath);
  }

  const homeDir = os.homedir();

  // Windows：使用 AppData/Local
  if (process.platform === 'win32') {
    const appData = process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local');
    return path.join(appData, defaultSubPath);
  }

  // macOS 和 Linux：使用 ~/.config
  return path.join(homeDir, '.config', defaultSubPath);
}

/**
 * 规范化路径
 * 处理 .、..、多余的斜杠等
 * @param filePath 原始路径
 * @returns 规范化后的路径
 */
export function normalizePath(filePath: string): string {
  const expanded = expandHome(filePath);
  return path.normalize(expanded);
}

/**
 * 验证路径是否在允许的范围内（安全检查）
 * @param targetPath 目标路径
 * @param allowedBase 允许的基础路径
 * @returns 是否在允许范围内
 */
export function isPathWithinBase(targetPath: string, allowedBase: string): boolean {
  const normalizedTarget = path.resolve(normalizePath(targetPath));
  const normalizedBase = path.resolve(normalizePath(allowedBase));

  return normalizedTarget.startsWith(normalizedBase);
}
