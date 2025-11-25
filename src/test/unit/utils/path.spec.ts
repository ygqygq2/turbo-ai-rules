/**
 * path 工具函数单元测试
 */

import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  expandHome,
  isPathWithinBase,
  normalizePath,
  resolveCachePath,
  resolveConfigPath,
} from '@/utils/path';

describe('path 单元测试', () => {
  const originalEnv = process.env;
  const originalPlatform = process.platform;

  beforeEach(() => {
    // 重置环境变量
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // 恢复环境变量
    process.env = originalEnv;
    // 恢复平台
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
    });
  });

  describe('expandHome', () => {
    it('应该展开 ~ 为用户主目录', () => {
      const homeDir = os.homedir();
      expect(expandHome('~/Documents')).toBe(path.join(homeDir, 'Documents'));
      expect(expandHome('~')).toBe(homeDir);
      expect(expandHome('~/')).toBe(homeDir);
    });

    it('应该保持非 ~ 路径不变', () => {
      expect(expandHome('/abs/path')).toBe('/abs/path');
      expect(expandHome('relative/path')).toBe('relative/path');
      expect(expandHome('./current/path')).toBe('./current/path');
    });

    it('应该处理空字符串', () => {
      expect(expandHome('')).toBe('');
      expect(expandHome(null as any)).toBe(null);
      expect(expandHome(undefined as any)).toBe(undefined);
    });

    it('应该拒绝 ~user 格式', () => {
      expect(() => expandHome('~otheruser/Documents')).toThrow('Only current user home directory');
    });
  });

  describe('resolveCachePath', () => {
    it('应该优先使用用户配置路径', () => {
      const userPath = '~/my-cache';
      const result = resolveCachePath(userPath);
      expect(result).toBe(path.resolve(expandHome(userPath)));
    });

    it('应该使用 XDG_CACHE_HOME 环境变量', () => {
      process.env.XDG_CACHE_HOME = '/custom/cache';
      const result = resolveCachePath(undefined, 'test-app');
      expect(result).toBe('/custom/cache/test-app');
    });

    it('应该在 macOS 上使用 ~/Library/Caches', () => {
      delete process.env.XDG_CACHE_HOME;
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      const result = resolveCachePath(undefined, 'test-app');
      const expected = path.join(os.homedir(), 'Library', 'Caches', 'test-app');
      expect(result).toBe(expected);
    });

    it('应该在 Windows 上使用 %LOCALAPPDATA%', () => {
      delete process.env.XDG_CACHE_HOME;
      Object.defineProperty(process, 'platform', { value: 'win32' });
      process.env.LOCALAPPDATA = 'C:\\Users\\Test\\AppData\\Local';

      const result = resolveCachePath(undefined, 'test-app');
      // path.join 会使用正确的分隔符
      expect(result.replace(/\\/g, '/')).toBe('C:/Users/Test/AppData/Local/test-app');
    });

    it('应该在 Linux 上使用 ~/.cache', () => {
      delete process.env.XDG_CACHE_HOME;
      Object.defineProperty(process, 'platform', { value: 'linux' });

      const result = resolveCachePath(undefined, 'test-app');
      const expected = path.join(os.homedir(), '.cache', 'test-app');
      expect(result).toBe(expected);
    });

    it('应该使用默认子路径', () => {
      delete process.env.XDG_CACHE_HOME;
      Object.defineProperty(process, 'platform', { value: 'linux' });

      const result = resolveCachePath();
      const expected = path.join(os.homedir(), '.cache', '.turbo-ai-rules');
      expect(result).toBe(expected);
    });
  });

  describe('resolveConfigPath', () => {
    it('应该优先使用用户配置路径', () => {
      const userPath = '~/my-config';
      const result = resolveConfigPath(userPath);
      expect(result).toBe(path.resolve(expandHome(userPath)));
    });

    it('应该使用 XDG_CONFIG_HOME 环境变量', () => {
      process.env.XDG_CONFIG_HOME = '/custom/config';
      const result = resolveConfigPath(undefined, 'test-app');
      expect(result).toBe('/custom/config/test-app');
    });

    it('应该在 macOS 上使用 ~/Library/Application Support', () => {
      delete process.env.XDG_CONFIG_HOME;
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      const result = resolveConfigPath(undefined, 'test-app');
      const expected = path.join(os.homedir(), 'Library', 'Application Support', 'test-app');
      expect(result).toBe(expected);
    });

    it('应该在 Windows 上使用 %LOCALAPPDATA%', () => {
      delete process.env.XDG_CONFIG_HOME;
      Object.defineProperty(process, 'platform', { value: 'win32' });
      process.env.LOCALAPPDATA = 'C:\\Users\\Test\\AppData\\Local';

      const result = resolveConfigPath(undefined, 'test-app');
      // path.join 会使用正确的分隔符
      expect(result.replace(/\\/g, '/')).toBe('C:/Users/Test/AppData/Local/test-app');
    });

    it('应该在 Linux 上使用 ~/.config', () => {
      delete process.env.XDG_CONFIG_HOME;
      Object.defineProperty(process, 'platform', { value: 'linux' });

      const result = resolveConfigPath(undefined, 'test-app');
      const expected = path.join(os.homedir(), '.config', 'test-app');
      expect(result).toBe(expected);
    });
  });

  describe('normalizePath', () => {
    it('应该规范化路径', () => {
      expect(normalizePath('a/./b')).toBe(path.normalize('a/./b'));
      expect(normalizePath('a/b/../c')).toBe(path.normalize('a/c'));
      expect(normalizePath('a//b///c')).toBe(path.normalize('a/b/c'));
    });

    it('应该展开 ~ 并规范化', () => {
      const homeDir = os.homedir();
      const result = normalizePath('~/Documents/./file.txt');
      const expected = path.normalize(path.join(homeDir, 'Documents/file.txt'));
      expect(result).toBe(expected);
    });

    it('应该处理绝对路径', () => {
      const result = normalizePath('/abs/path/./file');
      expect(result).toBe(path.normalize('/abs/path/file'));
    });
  });

  describe('isPathWithinBase', () => {
    it('应该确认路径在基础路径内', () => {
      const base = '/base/path';
      expect(isPathWithinBase('/base/path/subdir', base)).toBe(true);
      expect(isPathWithinBase('/base/path/subdir/file.txt', base)).toBe(true);
      expect(isPathWithinBase(path.join(base, 'subdir'), base)).toBe(true);
    });

    it('应该检测目录遍历攻击', () => {
      const base = '/base/path';
      expect(isPathWithinBase('/base/other', base)).toBe(false);
      expect(isPathWithinBase('/etc/passwd', base)).toBe(false);
      expect(isPathWithinBase('../outside', base)).toBe(false);
    });

    it('应该处理 ~ 路径', () => {
      const _homeDir = os.homedir();
      const base = '~/project';
      const target = '~/project/src';

      expect(isPathWithinBase(target, base)).toBe(true);
    });

    it('应该处理相对路径', () => {
      const base = 'relative/base';
      const target = 'relative/base/sub';

      expect(isPathWithinBase(target, base)).toBe(true);
    });

    it('应该处理相同路径', () => {
      const base = '/base/path';
      expect(isPathWithinBase('/base/path', base)).toBe(true);
    });

    it('应该拒绝包含 .. 的路径遍历', () => {
      const base = '/base/path';
      // 注意: 这些路径在 normalize 后可能合法,需要基于实际行为测试
      const traversal = '/base/path/subdir/../../etc';
      const normalized = path.resolve(normalizePath(traversal));
      expect(normalized.startsWith(path.resolve(normalizePath(base)))).toBe(false);
    });
  });

  describe('跨平台兼容性', () => {
    it('应该在不同平台上正确处理路径', () => {
      // 这个测试依赖于实际平台
      const homeDir = os.homedir();
      const expanded = expandHome('~/test');

      if (process.platform === 'win32') {
        expect(expanded).toContain(homeDir);
      } else {
        expect(expanded).toBe(path.join(homeDir, 'test'));
      }
    });
  });
});
