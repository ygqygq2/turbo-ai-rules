/**
 * SharedSelectionManager 单元测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SharedSelectionManager } from '@/services/SharedSelectionManager';

// Mock 模块
vi.mock('@/utils/logger');
vi.mock('@/utils/fileSystem');
vi.mock('@/utils/gitignore');

// Mock vscode
vi.mock('vscode', () => {
  const mockGetConfiguration = vi.fn();
  return {
    workspace: {
      workspaceFolders: [
        {
          uri: { fsPath: '/test/workspace' },
          name: 'test-workspace',
          index: 0,
        },
      ],
      getConfiguration: mockGetConfiguration,
    },
  };
});

describe('SharedSelectionManager 单元测试', () => {
  let sharedManager: SharedSelectionManager;
  let mockFileSystem: any;
  let mockGitignore: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock fileSystem
    mockFileSystem = await import('@/utils/fileSystem');
    mockFileSystem.pathExists = vi.fn().mockResolvedValue(false);
    mockFileSystem.safeReadFile = vi.fn().mockResolvedValue('{}');
    mockFileSystem.safeWriteFile = vi.fn().mockResolvedValue(undefined);
    mockFileSystem.ensureDir = vi.fn().mockResolvedValue(undefined);

    // Mock gitignore
    mockGitignore = await import('@/utils/gitignore');
    mockGitignore.ensureIgnored = vi.fn().mockResolvedValue(undefined);
    mockGitignore.removeIgnored = vi.fn().mockResolvedValue(undefined);

    // Mock vscode configuration (默认禁用共享选择)
    const vscode = await import('vscode');
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((key: string, defaultValue?: any) => {
        if (key === 'enableSharedSelection') {
          return false;
        }
        if (key === 'selectionFilePath') {
          return '.turbo-ai-rules/selections.json';
        }
        if (key === 'storage.autoGitignore') {
          return true;
        }
        return defaultValue;
      }),
    } as any);

    // 重置单例
    (SharedSelectionManager as any).instance = undefined;
    sharedManager = SharedSelectionManager.getInstance();
  });

  describe('配置检查', () => {
    it('应该正确检查共享选择是否启用', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
        get: vi.fn((key: string) => {
          if (key === 'enableSharedSelection') {
            return true;
          }
          return false;
        }),
      } as any);

      const enabled = sharedManager.isEnabled();
      expect(enabled).toBe(true);
    });

    it('应该在未启用时返回 false', () => {
      const enabled = sharedManager.isEnabled();
      expect(enabled).toBe(false);
    });
  });

  describe('文件路径', () => {
    it('应该返回正确的共享选择文件路径', () => {
      const filePath = sharedManager.getFilePath('/test/workspace');
      expect(filePath).toBe('/test/workspace/.turbo-ai-rules/selections.json');
    });

    it('应该支持自定义文件路径', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
        get: vi.fn((key: string) => {
          if (key === 'selectionFilePath') {
            return 'custom/path/selections.json';
          }
          return undefined;
        }),
      } as any);

      const filePath = sharedManager.getFilePath('/test/workspace');
      expect(filePath).toBe('/test/workspace/custom/path/selections.json');
    });
  });

  describe('加载共享选择', () => {
    it('应该在文件不存在时返回 null', async () => {
      mockFileSystem.pathExists.mockResolvedValue(false);

      const result = await sharedManager.load('/test/workspace');
      expect(result).toBeNull();
    });

    it('应该成功加载共享选择文件', async () => {
      const mockData = {
        version: 1,
        workspacePath: '/test/workspace',
        lastUpdated: '2025-12-24T10:00:00.000Z',
        selections: {
          'source-1': {
            paths: ['rule1.md', 'rule2.md'],
          },
        },
      };

      mockFileSystem.pathExists.mockResolvedValue(true);
      mockFileSystem.safeReadFile.mockResolvedValue(JSON.stringify(mockData));

      const result = await sharedManager.load('/test/workspace');
      expect(result).toEqual(mockData);
    });

    it('应该处理文件读取错误', async () => {
      mockFileSystem.pathExists.mockResolvedValue(true);
      mockFileSystem.safeReadFile.mockRejectedValue(new Error('Read failed'));

      const { Logger } = await import('@/utils/logger');

      const result = await sharedManager.load('/test/workspace');
      expect(result).toBeNull();
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('保存共享选择', () => {
    it('应该成功保存共享选择', async () => {
      const selections = new Map([
        ['source-1', new Set(['rule1.md', 'rule2.md'])],
        ['source-2', new Set(['rule3.md'])],
      ]);

      await sharedManager.save('/test/workspace', selections);

      expect(mockFileSystem.ensureDir).toHaveBeenCalledWith('/test/workspace/.turbo-ai-rules');
      expect(mockFileSystem.safeWriteFile).toHaveBeenCalledWith(
        '/test/workspace/.turbo-ai-rules/selections.json',
        expect.stringContaining('"source-1"'),
      );
    });

    it('应该保存正确的数据格式', async () => {
      const selections = new Map([['source-1', new Set(['rule1.md'])]]);

      await sharedManager.save('/test/workspace', selections);

      const savedData = JSON.parse((mockFileSystem.safeWriteFile as any).mock.calls[0][1]);

      expect(savedData).toMatchObject({
        version: 1,
        workspacePath: '/test/workspace',
        selections: {
          'source-1': {
            paths: ['rule1.md'],
          },
        },
      });
      expect(savedData.lastUpdated).toBeDefined();
    });

    it('应该处理保存错误', async () => {
      mockFileSystem.safeWriteFile.mockRejectedValue(new Error('Write failed'));

      const { Logger } = await import('@/utils/logger');
      const selections = new Map([['source-1', new Set(['rule1.md'])]]);

      await expect(sharedManager.save('/test/workspace', selections)).rejects.toThrow(
        'Write failed',
      );
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('导入共享选择', () => {
    it('应该在文件不存在时返回当前选择', async () => {
      mockFileSystem.pathExists.mockResolvedValue(false);

      const currentSelections = new Map([['source-1', new Set(['rule1.md'])]]);
      const result = await sharedManager.import('/test/workspace', currentSelections);

      expect(result).toEqual(currentSelections);
    });

    it('应该在 replace 模式下替换当前选择', async () => {
      const mockData = {
        version: 1,
        workspacePath: '/test/workspace',
        lastUpdated: '2025-12-24T10:00:00.000Z',
        selections: {
          'source-1': {
            paths: ['rule2.md', 'rule3.md'],
          },
        },
      };

      mockFileSystem.pathExists.mockResolvedValue(true);
      mockFileSystem.safeReadFile.mockResolvedValue(JSON.stringify(mockData));

      const currentSelections = new Map([['source-1', new Set(['rule1.md'])]]);
      const result = await sharedManager.import('/test/workspace', currentSelections, 'replace');

      expect(result.get('source-1')).toEqual(new Set(['rule2.md', 'rule3.md']));
    });

    it('应该在 merge 模式下合并选择', async () => {
      const mockData = {
        version: 1,
        workspacePath: '/test/workspace',
        lastUpdated: '2025-12-24T10:00:00.000Z',
        selections: {
          'source-1': {
            paths: ['rule2.md', 'rule3.md'],
          },
        },
      };

      mockFileSystem.pathExists.mockResolvedValue(true);
      mockFileSystem.safeReadFile.mockResolvedValue(JSON.stringify(mockData));

      const currentSelections = new Map([['source-1', new Set(['rule1.md'])]]);
      const result = await sharedManager.import('/test/workspace', currentSelections, 'merge');

      expect(result.get('source-1')).toEqual(new Set(['rule1.md', 'rule2.md', 'rule3.md']));
    });
  });

  describe('初始化', () => {
    it('应该在文件已存在时跳过初始化', async () => {
      mockFileSystem.pathExists.mockResolvedValue(true);

      const { Logger } = await import('@/utils/logger');
      const selections = new Map();

      await sharedManager.initialize('/test/workspace', selections);

      expect(mockFileSystem.safeWriteFile).not.toHaveBeenCalled();
      expect(Logger.info).toHaveBeenCalledWith(
        expect.stringContaining('already exists'),
        expect.any(Object),
      );
    });

    it('应该在文件不存在时创建新文件', async () => {
      mockFileSystem.pathExists.mockResolvedValue(false);

      const selections = new Map([['source-1', new Set(['rule1.md'])]]);

      await sharedManager.initialize('/test/workspace', selections);

      expect(mockFileSystem.safeWriteFile).toHaveBeenCalled();
    });
  });

  describe('.gitignore 管理', () => {
    it('应该在启用共享选择时从 .gitignore 移除', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
        get: vi.fn((key: string) => {
          if (key === 'enableSharedSelection') {
            return true;
          }
          if (key === 'selectionFilePath') {
            return '.turbo-ai-rules/selections.json';
          }
          if (key === 'storage.autoGitignore') {
            return true;
          }
          return undefined;
        }),
      } as any);

      const selections = new Map();
      await sharedManager.save('/test/workspace', selections);

      expect(mockGitignore.removeIgnored).toHaveBeenCalledWith('/test/workspace', [
        '.turbo-ai-rules/selections.json',
      ]);
    });

    it('应该在禁用共享选择且 autoGitignore=true 时从 .gitignore 移除', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
        get: vi.fn((key: string) => {
          if (key === 'enableSharedSelection') {
            return false;
          }
          if (key === 'selectionFilePath') {
            return '.turbo-ai-rules/selections.json';
          }
          if (key === 'storage.autoGitignore') {
            return true;
          }
          return undefined;
        }),
      } as any);

      const selections = new Map();
      await sharedManager.save('/test/workspace', selections);

      // 禁用共享选择且 autoGitignore=true 时，应该从 .gitignore 移除
      expect(mockGitignore.removeIgnored).toHaveBeenCalledWith('/test/workspace', [
        '.turbo-ai-rules/selections.json',
      ]);
    });

    it('应该在禁用共享选择且 autoGitignore=false 时添加到 .gitignore', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
        get: vi.fn((key: string) => {
          if (key === 'enableSharedSelection') {
            return false;
          }
          if (key === 'selectionFilePath') {
            return '.turbo-ai-rules/selections.json';
          }
          if (key === 'storage.autoGitignore') {
            return false;
          }
          return undefined;
        }),
      } as any);

      const selections = new Map();
      await sharedManager.save('/test/workspace', selections);

      // 禁用共享选择且 autoGitignore=false 时，应该添加到 .gitignore
      expect(mockGitignore.ensureIgnored).toHaveBeenCalledWith('/test/workspace', [
        '.turbo-ai-rules/selections.json',
      ]);
    });
  });
});
