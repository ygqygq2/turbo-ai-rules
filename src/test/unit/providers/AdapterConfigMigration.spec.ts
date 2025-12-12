/**
 * 配置迁移单元测试
 * 测试旧配置格式到新格式的自动迁移功能
 *
 * @deprecated 此测试将在 v2.0.5 删除（与迁移功能一起移除）
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import vscode from 'vscode';

// Mock ConfigManager
vi.mock('../../../services/ConfigManager', () => ({
  ConfigManager: {
    getInstance: vi.fn(() => ({
      getConfig: vi.fn(() => ({
        adapters: {},
      })),
    })),
  },
}));

// Mock notify
vi.mock('../../../utils/notifications', () => ({
  notify: vi.fn(),
}));

// Mock Logger
vi.mock('../../../utils/logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { AdapterManagerWebviewProvider } from '../../../providers/AdapterManagerWebviewProvider';
import { notify } from '../../../utils/notifications';

// Mock context
const mockContext = {
  globalState: {
    get: vi.fn().mockReturnValue(false),
    update: vi.fn().mockResolvedValue(undefined),
  },
  workspaceState: {},
  extensionPath: '',
  extensionUri: {} as any,
  subscriptions: [],
} as any;

describe('Config Migration Unit Tests', () => {
  let provider: AdapterManagerWebviewProvider;
  let mockWorkspaceConfig: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh mock for each test
    mockWorkspaceConfig = {
      get: vi.fn(),
      inspect: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    };

    // Mock workspace.getConfiguration to return our mock
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockWorkspaceConfig);

    provider = AdapterManagerWebviewProvider.getInstance(mockContext);
  });

  describe('旧配置检测', () => {
    it('应该检测到旧格式的 cursor 配置', async () => {
      mockWorkspaceConfig.get.mockReturnValue({});
      mockWorkspaceConfig.inspect.mockImplementation((key: string) => {
        if (key === 'adapters.cursor.enabled') {
          return {
            workspaceValue: true,
          };
        }
        return undefined;
      });

      // 调用私有方法进行测试
      await (provider as any).migrateOldAdapterConfig(mockWorkspaceConfig);

      // 验证迁移逻辑被执行
      expect(mockWorkspaceConfig.update).toHaveBeenCalled();
    });

    it('应该检测到旧格式的 copilot 配置', async () => {
      mockWorkspaceConfig.get.mockReturnValue({});
      mockWorkspaceConfig.inspect.mockImplementation((key: string) => {
        if (key === 'adapters.copilot.enabled') {
          return {
            workspaceValue: false,
          };
        }
        return undefined;
      });

      await (provider as any).migrateOldAdapterConfig(mockWorkspaceConfig);

      expect(mockWorkspaceConfig.update).toHaveBeenCalled();
    });

    it('应该检测到旧格式的 continue 配置', async () => {
      mockWorkspaceConfig.get.mockReturnValue({});
      mockWorkspaceConfig.inspect.mockImplementation((key: string) => {
        if (key === 'adapters.continue.enabled') {
          return {
            globalValue: true,
          };
        }
        return undefined;
      });

      await (provider as any).migrateOldAdapterConfig(mockWorkspaceConfig);

      expect(mockWorkspaceConfig.update).toHaveBeenCalled();
    });
  });

  describe('配置迁移', () => {
    it('应该将旧配置迁移到新格式（cursor）', async () => {
      mockWorkspaceConfig.get.mockReturnValue({});
      mockWorkspaceConfig.inspect.mockImplementation((key: string) => {
        if (key === 'adapters.cursor.enabled') {
          return { workspaceValue: true };
        }
        if (key === 'adapters.cursor.autoUpdate') {
          return { workspaceValue: false };
        }
        return undefined;
      });

      await (provider as any).migrateOldAdapterConfig(mockWorkspaceConfig);

      // 验证新格式配置被更新
      expect(mockWorkspaceConfig.update).toHaveBeenCalledWith(
        'adapters',
        expect.objectContaining({
          cursor: {
            enabled: true,
            autoUpdate: false,
          },
        }),
        vscode.ConfigurationTarget.Workspace,
      );
    });

    it('应该将多个旧配置同时迁移', async () => {
      mockWorkspaceConfig.get.mockReturnValue({});
      mockWorkspaceConfig.inspect.mockImplementation((key: string) => {
        if (key === 'adapters.cursor.enabled') {
          return { workspaceValue: true };
        }
        if (key === 'adapters.copilot.enabled') {
          return { workspaceValue: false };
        }
        if (key === 'adapters.continue.enabled') {
          return { workspaceValue: true };
        }
        return undefined;
      });

      await (provider as any).migrateOldAdapterConfig(mockWorkspaceConfig);

      expect(mockWorkspaceConfig.update).toHaveBeenCalledWith(
        'adapters',
        expect.objectContaining({
          cursor: { enabled: true },
          copilot: { enabled: false },
          continue: { enabled: true },
        }),
        vscode.ConfigurationTarget.Workspace,
      );
    });

    it('应该在迁移时保留 autoUpdate 配置', async () => {
      mockWorkspaceConfig.get.mockReturnValue({});
      mockWorkspaceConfig.inspect.mockImplementation((key: string) => {
        if (key === 'adapters.cursor.enabled') {
          return { workspaceValue: true };
        }
        if (key === 'adapters.cursor.autoUpdate') {
          return { workspaceValue: true };
        }
        return undefined;
      });

      await (provider as any).migrateOldAdapterConfig(mockWorkspaceConfig);

      expect(mockWorkspaceConfig.update).toHaveBeenCalledWith(
        'adapters',
        expect.objectContaining({
          cursor: {
            enabled: true,
            autoUpdate: true,
          },
        }),
        vscode.ConfigurationTarget.Workspace,
      );
    });
  });

  describe('旧配置清理', () => {
    it('应该清理 Workspace 作用域的旧配置', async () => {
      mockWorkspaceConfig.get.mockReturnValue({});
      mockWorkspaceConfig.inspect.mockImplementation((key: string) => {
        if (key === 'adapters.cursor.enabled') {
          return { workspaceValue: true };
        }
        return undefined;
      });

      await (provider as any).migrateOldAdapterConfig(mockWorkspaceConfig);

      // 验证旧配置被清理
      expect(mockWorkspaceConfig.update).toHaveBeenCalledWith(
        'adapters.cursor.enabled',
        undefined,
        vscode.ConfigurationTarget.Workspace,
      );
    });

    it('应该清理所有作用域的旧配置', async () => {
      mockWorkspaceConfig.get.mockReturnValue({});
      mockWorkspaceConfig.inspect.mockImplementation((key: string) => {
        if (key === 'adapters.cursor.enabled') {
          return {
            globalValue: true,
            workspaceValue: true,
            workspaceFolderValue: true,
          };
        }
        return undefined;
      });

      await (provider as any).migrateOldAdapterConfig(mockWorkspaceConfig);

      // 验证所有作用域都被清理
      expect(mockWorkspaceConfig.update).toHaveBeenCalledWith(
        'adapters.cursor.enabled',
        undefined,
        vscode.ConfigurationTarget.Global,
      );
      expect(mockWorkspaceConfig.update).toHaveBeenCalledWith(
        'adapters.cursor.enabled',
        undefined,
        vscode.ConfigurationTarget.Workspace,
      );
      expect(mockWorkspaceConfig.update).toHaveBeenCalledWith(
        'adapters.cursor.enabled',
        undefined,
        vscode.ConfigurationTarget.WorkspaceFolder,
      );
    });

    it('应该同时清理 enabled 和 autoUpdate 配置', async () => {
      mockWorkspaceConfig.get.mockReturnValue({});
      mockWorkspaceConfig.inspect.mockImplementation((key: string) => {
        if (key === 'adapters.cursor.enabled') {
          return { workspaceValue: true };
        }
        if (key === 'adapters.cursor.autoUpdate') {
          return { workspaceValue: false };
        }
        return undefined;
      });

      await (provider as any).migrateOldAdapterConfig(mockWorkspaceConfig);

      // 验证两个配置都被清理
      expect(mockWorkspaceConfig.update).toHaveBeenCalledWith(
        'adapters.cursor.enabled',
        undefined,
        vscode.ConfigurationTarget.Workspace,
      );
      expect(mockWorkspaceConfig.update).toHaveBeenCalledWith(
        'adapters.cursor.autoUpdate',
        undefined,
        vscode.ConfigurationTarget.Workspace,
      );
    });
  });

  describe('迁移通知', () => {
    it('应该在首次迁移时显示通知', async () => {
      mockContext.globalState.get.mockReturnValue(false);
      mockWorkspaceConfig.get.mockReturnValue({});
      mockWorkspaceConfig.inspect.mockImplementation((key: string) => {
        if (key === 'adapters.cursor.enabled') {
          return { workspaceValue: true };
        }
        return undefined;
      });

      await (provider as any).migrateOldAdapterConfig(mockWorkspaceConfig);

      // 验证通知被显示
      expect(notify).toHaveBeenCalled();
      expect(mockContext.globalState.update).toHaveBeenCalledWith('adapterConfigMigrated', true);
    });

    it('应该在已迁移过后不显示通知', async () => {
      mockContext.globalState.get.mockReturnValue(true);
      mockWorkspaceConfig.get.mockReturnValue({});
      mockWorkspaceConfig.inspect.mockImplementation((key: string) => {
        if (key === 'adapters.cursor.enabled') {
          return { workspaceValue: true };
        }
        return undefined;
      });

      await (provider as any).migrateOldAdapterConfig(mockWorkspaceConfig);

      // 验证通知不被显示
      expect(notify).not.toHaveBeenCalled();
    });
  });

  describe('边界情况', () => {
    it('应该跳过已存在新格式配置的适配器', async () => {
      mockWorkspaceConfig.get.mockReturnValue({
        cursor: { enabled: false }, // 新格式已存在
      });
      mockWorkspaceConfig.inspect.mockImplementation((key: string) => {
        if (key === 'adapters.cursor.enabled') {
          return { workspaceValue: true }; // 旧格式存在
        }
        return undefined;
      });

      await (provider as any).migrateOldAdapterConfig(mockWorkspaceConfig);

      // 验证不会覆盖新格式配置
      const updateCall = mockWorkspaceConfig.update.mock.calls.find(
        (call: any) => call[0] === 'adapters',
      );
      if (updateCall) {
        expect(updateCall[1].cursor.enabled).toBe(false); // 保持新格式的值
      }
    });

    it('应该处理没有旧配置的情况', async () => {
      mockWorkspaceConfig.get.mockReturnValue({});
      mockWorkspaceConfig.inspect.mockReturnValue(undefined);

      await (provider as any).migrateOldAdapterConfig(mockWorkspaceConfig);

      // 验证没有进行任何更新
      expect(mockWorkspaceConfig.update).not.toHaveBeenCalled();
    });

    it('应该处理 undefined 的 enabled 值', async () => {
      mockWorkspaceConfig.get.mockReturnValue({});
      mockWorkspaceConfig.inspect.mockImplementation((key: string) => {
        if (key === 'adapters.cursor.enabled') {
          return { workspaceValue: undefined };
        }
        return undefined;
      });

      await (provider as any).migrateOldAdapterConfig(mockWorkspaceConfig);

      // 验证不会迁移 undefined 值
      expect(mockWorkspaceConfig.update).not.toHaveBeenCalledWith(
        'adapters',
        expect.anything(),
        vscode.ConfigurationTarget.Workspace,
      );
    });
  });
});
