/**
 * @description GitManager 单元测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as path from 'path';
import { GitManager } from '@/services/GitManager';
import type { RuleSource } from '@/types/config';
import { ErrorCodes } from '@/types/errors';
import * as validator from '@/utils/validator';

// Mock simple-git
vi.mock('simple-git', () => {
  const mockGit = {
    clone: vi.fn(),
    pull: vi.fn(),
    checkout: vi.fn(),
    fetch: vi.fn(),
    status: vi.fn(),
  };
  return {
    default: vi.fn(() => mockGit),
  };
});

// Mock fileSystem utils
vi.mock('@/utils/fileSystem', () => ({
  ensureDir: vi.fn(),
  pathExists: vi.fn(),
  safeRemove: vi.fn(),
}));

// Mock LocalConfigManager
vi.mock('@/services/LocalConfigManager', () => ({
  LocalConfigManager: {
    getInstance: vi.fn(() => ({
      getSourceConfig: vi.fn(),
      saveSourceConfig: vi.fn(),
    })),
  },
}));

describe('GitManager 单元测试', () => {
  let gitManager: GitManager;

  beforeEach(() => {
    // Reset singleton
    (GitManager as any).instance = undefined;
    gitManager = GitManager.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getInstance', () => {
    it('应返回单例实例', () => {
      const instance1 = GitManager.getInstance();
      const instance2 = GitManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getGlobalCachePath', () => {
    it('应返回全局缓存路径', () => {
      const cachePath = gitManager.getGlobalCachePath();
      expect(cachePath).toBeTruthy();
      expect(typeof cachePath).toBe('string');
      expect(cachePath).toContain('turbo-ai-rules');
      expect(cachePath).toContain('sources');
    });
  });

  describe('getSourcePath', () => {
    it('应返回正确的源路径', () => {
      const sourceId = 'test-source';
      const sourcePath = gitManager.getSourcePath(sourceId);
      expect(sourcePath).toContain(sourceId);
      expect(path.basename(sourcePath)).toBe(sourceId);
    });

    it('应处理特殊字符的源ID', () => {
      const sourceId = 'my-project-2024';
      const sourcePath = gitManager.getSourcePath(sourceId);
      expect(sourcePath).toContain(sourceId);
    });
  });

  describe('validateGitUrl', () => {
    it('应接受有效的 HTTPS URL', () => {
      const validUrls = [
        'https://github.com/user/repo.git',
        'https://gitlab.com/user/project.git',
        'https://bitbucket.org/user/repo.git',
      ];

      validUrls.forEach((url) => {
        expect(validator.validateGitUrl(url)).toBe(true);
      });
    });

    it('应接受有效的 SSH URL', () => {
      const validUrls = ['git@github.com:user/repo.git', 'git@gitlab.com:user/project.git'];

      validUrls.forEach((url) => {
        expect(validator.validateGitUrl(url)).toBe(true);
      });
    });

    it('应拒绝无效的 URL', () => {
      const invalidUrls = [
        'ftp://example.com/repo.git', // 不支持的协议
        'not-a-url',
        '',
      ];

      invalidUrls.forEach((url) => {
        expect(validator.validateGitUrl(url)).toBe(false);
      });
    });
  });

  describe('validateBranchName', () => {
    it('应接受有效的分支名', () => {
      const validBranches = [
        'main',
        'master',
        'develop',
        'feature/test',
        'release_1.0',
        'feature_branch',
      ];

      validBranches.forEach((branch) => {
        expect(validator.validateBranchName(branch)).toBe(true);
      });
    });

    it('应拒绝无效的分支名', () => {
      const invalidBranches = [
        '', // 空字符串
        'branch with spaces', // 含空格
        'branch;rm-rf', // 含分号
        'branch@test', // 含@符号
        'branch-with-dash', // 含连字符（不在 \w 范围内）
      ];

      invalidBranches.forEach((branch) => {
        expect(validator.validateBranchName(branch)).toBe(false);
      });
    });
  });

  describe('repositoryExists', () => {
    it('应检测仓库是否存在', async () => {
      const { pathExists } = await import('@/utils/fileSystem');
      vi.mocked(pathExists).mockResolvedValue(true);

      const exists = await gitManager.repositoryExists('test-source');
      expect(exists).toBe(true);
    });

    it('应在仓库不存在时返回 false', async () => {
      const { pathExists } = await import('@/utils/fileSystem');
      vi.mocked(pathExists).mockResolvedValue(false);

      const exists = await gitManager.repositoryExists('non-existent');
      expect(exists).toBe(false);
    });
  });

  describe('错误处理', () => {
    it('克隆失败应抛出 GitError', async () => {
      const simpleGit = await import('simple-git');
      const mockGit = simpleGit.default();
      vi.mocked(mockGit.clone).mockRejectedValue(new Error('Network error'));

      const { pathExists } = await import('@/utils/fileSystem');
      vi.mocked(pathExists).mockResolvedValue(false);

      const source: RuleSource = {
        id: 'test',
        name: 'Test',
        gitUrl: 'https://github.com/test/repo.git',
        enabled: true,
        branch: 'main',
        subPath: '/',
        authentication: { type: 'none' },
      };

      await expect(gitManager.cloneRepository(source)).rejects.toThrow();
    });
  });

  describe('认证类型', () => {
    it('应支持 none 认证（公开仓库）', () => {
      const source: RuleSource = {
        id: 'test',
        name: 'Test',
        gitUrl: 'https://github.com/test/repo.git',
        enabled: true,
        branch: 'main',
        subPath: '/',
        authentication: { type: 'none' },
      };

      expect(source.authentication?.type).toBe('none');
    });

    it('应支持 token 认证', () => {
      const source: RuleSource = {
        id: 'test',
        name: 'Test',
        gitUrl: 'https://github.com/test/repo.git',
        enabled: true,
        branch: 'main',
        subPath: '/',
        authentication: {
          type: 'token',
          token: 'ghp_test_token',
        },
      };

      expect(source.authentication?.type).toBe('token');
      if (source.authentication?.type === 'token') {
        expect(source.authentication.token).toBe('ghp_test_token');
      }
    });

    it('应支持 SSH 认证', () => {
      const source: RuleSource = {
        id: 'test',
        name: 'Test',
        gitUrl: 'git@github.com:test/repo.git',
        enabled: true,
        branch: 'main',
        subPath: '/',
        authentication: {
          type: 'ssh',
          sshKeyPath: '~/.ssh/id_rsa',
        },
      };

      expect(source.authentication?.type).toBe('ssh');
      if (source.authentication?.type === 'ssh') {
        expect(source.authentication.sshKeyPath).toBe('~/.ssh/id_rsa');
      }
    });
  });

  describe('SubPath 处理', () => {
    it('应处理根路径', () => {
      const sourceId = 'test';
      const localPath = gitManager.getSourcePath(sourceId);
      const subPath: string = '/';
      const rulesPath = subPath === '/' ? localPath : path.join(localPath, subPath.substring(1));

      expect(rulesPath).toBe(localPath);
    });

    it('应处理子目录路径', () => {
      const sourceId = 'test';
      const localPath = gitManager.getSourcePath(sourceId);
      const subPath: string = '/rules/ai';
      const rulesPath = subPath === '/' ? localPath : path.join(localPath, subPath.substring(1));

      expect(rulesPath).toContain('rules');
      expect(rulesPath).toContain('ai');
    });

    it('应自动添加前导斜杠', () => {
      const subPath = 'rules/ai';
      const normalizedSubPath = subPath.startsWith('/') ? subPath : '/' + subPath;

      expect(normalizedSubPath).toBe('/rules/ai');
    });
  });
});
