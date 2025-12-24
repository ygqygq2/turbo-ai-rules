/**
 * @description AdapterManagerWebviewProvider 单元测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdapterManagerWebviewProvider } from '@/providers/AdapterManagerWebviewProvider';

// Mock vscode
vi.mock('vscode', () => ({
  ViewColumn: {
    One: 1,
  },
  window: {
    createWebviewPanel: vi.fn(),
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn().mockResolvedValue(undefined),
    showWarningMessage: vi.fn().mockResolvedValue(undefined),
    setStatusBarMessage: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  },
  Uri: {
    file: vi.fn((path) => ({ fsPath: path })),
  },
  workspace: {
    getConfiguration: vi.fn(),
  },
  l10n: {
    t: vi.fn((key: string, _args?: any) => key),
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },
}));

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  readFileSync: vi.fn(() => '<html>{{nonce}}{{cspSource}}</html>'),
}));

// Mock ConfigManager
const mockUpdateConfig = vi.fn();
vi.mock('@/services/ConfigManager', () => ({
  ConfigManager: {
    getInstance: vi.fn(() => ({
      getConfig: vi.fn(() => ({
        adapters: {
          copilot: { enabled: true, autoUpdate: true },
          cursor: { enabled: false, autoUpdate: false },
          continue: { enabled: true, autoUpdate: true },
          custom: [
            {
              id: 'custom1',
              name: 'Custom Adapter 1',
              enabled: true,
              outputPath: 'custom/path',
            },
          ],
        },
      })),
      updateConfig: mockUpdateConfig,
    })),
  },
}));

describe('AdapterManagerWebviewProvider', () => {
  let provider: AdapterManagerWebviewProvider;
  let mockContext: any;

  beforeEach(async () => {
    // Reset singleton
    (AdapterManagerWebviewProvider as any).instance = undefined;

    // Mock vscode.workspace.getConfiguration
    const mockVscode = await import('vscode');
    const mockGet = vi.fn((key: string, defaultValue?: any) => {
      if (key === 'adapters.custom') {
        return [
          {
            id: 'custom1',
            name: 'Custom Adapter 1',
            enabled: true,
            outputPath: 'custom/path',
          },
        ];
      }
      if (key === 'adapters') {
        return {
          copilot: { enabled: true, autoUpdate: true },
          cursor: { enabled: false, autoUpdate: false },
          continue: { enabled: true, autoUpdate: true },
        };
      }
      return defaultValue || {};
    });

    vi.mocked(mockVscode.workspace.getConfiguration).mockReturnValue({
      get: mockGet,
      has: vi.fn(),
      inspect: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    } as any);

    mockContext = {
      extensionPath: '/test/path',
      subscriptions: [],
      extensionUri: { fsPath: '/test/path' },
      globalState: {
        get: vi.fn().mockReturnValue(false),
        update: vi.fn(),
      },
    };

    provider = AdapterManagerWebviewProvider.getInstance(mockContext);
    vi.clearAllMocks();
  });

  describe('getInstance', () => {
    it('应该返回单例实例', () => {
      const instance1 = AdapterManagerWebviewProvider.getInstance(mockContext);
      const instance2 = AdapterManagerWebviewProvider.getInstance(mockContext);
      expect(instance1).toBe(instance2);
    });
  });

  describe('getAdapterData', () => {
    it('应该返回预置适配器和自定义适配器', async () => {
      const data = await (provider as any).getAdapterData();

      expect(data).toHaveProperty('presetAdapters');
      expect(data).toHaveProperty('customAdapters');

      expect(Array.isArray(data.presetAdapters)).toBe(true);
      expect(Array.isArray(data.customAdapters)).toBe(true);
      expect(data.customAdapters.length).toBe(1);
    });

    it('应该正确设置预置适配器的属性', async () => {
      const data = await (provider as any).getAdapterData();

      const copilot = data.presetAdapters.find((a: any) => a.id === 'copilot');
      const cursor = data.presetAdapters.find((a: any) => a.id === 'cursor');

      expect(copilot?.enabled).toBe(true);
      expect(cursor?.enabled).toBe(false);
    });

    it('应该包含自定义适配器的完整信息', async () => {
      const data = await (provider as any).getAdapterData();

      expect(data.customAdapters[0].id).toBe('custom1');
      expect(data.customAdapters[0].name).toBe('Custom Adapter 1');
      expect(data.customAdapters[0].enabled).toBe(true);
      expect(data.customAdapters[0].outputPath).toBe('custom/path');
    });
  });

  describe('handleSaveAdapter', () => {
    it('应该保存新的自定义适配器', async () => {
      // Mock configManager
      const mockAddAdapter = vi.fn().mockResolvedValue(undefined);
      const mockGetConfig = vi.fn().mockReturnValue({
        adapters: {
          custom: [],
        },
      });

      (provider as any).configManager = {
        getConfig: mockGetConfig,
        addAdapter: mockAddAdapter,
      };

      const newAdapter = {
        id: 'new-adapter',
        name: 'New Adapter',
        enabled: true,
        outputPath: 'new/path',
        format: 'file' as const,
        isNew: true, // 标记为新增
      };

      await (provider as any).handleSaveAdapter({ adapter: newAdapter });

      expect(mockAddAdapter).toHaveBeenCalled();
      const callArgs = mockAddAdapter.mock.calls[0];
      expect(callArgs[0].id).toBe('new-adapter');
      expect(callArgs[0].name).toBe('New Adapter');
    });

    it('应该更新现有的自定义适配器', async () => {
      // Mock configManager
      const mockUpdateAdapter = vi.fn().mockResolvedValue(undefined);
      const mockGetConfig = vi.fn().mockReturnValue({
        adapters: {
          custom: [
            {
              id: 'custom1',
              name: 'Custom Adapter 1',
              enabled: true,
              outputPath: 'old/path',
            },
          ],
        },
      });

      (provider as any).configManager = {
        getConfig: mockGetConfig,
        updateAdapter: mockUpdateAdapter,
      };

      const updatedAdapter = {
        id: 'custom1',
        name: 'Custom Adapter 1',
        enabled: true,
        outputPath: 'new/path',
        format: 'file' as const,
      };

      await (provider as any).handleSaveAdapter({ adapter: updatedAdapter });

      expect(mockUpdateAdapter).toHaveBeenCalled();
      const callArgs = mockUpdateAdapter.mock.calls[0];
      expect(callArgs[0]).toBe('custom1');
      expect(callArgs[1].outputPath).toBe('new/path');
    });
  });

  describe('handleDeleteAdapter', () => {
    it('应该删除指定的自定义适配器', async () => {
      // Mock vscode.window.showWarningMessage to return delete button
      const vscode = await import('vscode');
      vi.mocked(vscode.window.showWarningMessage).mockResolvedValue('form.button.delete' as any);

      // Mock configManager
      const mockRemoveAdapter = vi.fn().mockResolvedValue(undefined);
      const mockGetConfig = vi.fn().mockReturnValue({
        adapters: {
          custom: [
            {
              id: 'custom1',
              name: 'Custom Adapter 1',
              enabled: true,
              outputPath: 'custom/path',
            },
          ],
        },
      });

      (provider as any).configManager = {
        getConfig: mockGetConfig,
        removeAdapter: mockRemoveAdapter,
      };

      await (provider as any).handleDeleteAdapter({ id: 'custom1' });

      expect(mockRemoveAdapter).toHaveBeenCalled();
      const callArgs = mockRemoveAdapter.mock.calls[0];
      expect(callArgs[0]).toBe('custom1');
    });

    it('应该在适配器不存在时抛出错误', async () => {
      // Mock vscode.window.showWarningMessage to return delete button
      const vscode = await import('vscode');
      vi.mocked(vscode.window.showWarningMessage).mockResolvedValue('form.button.delete' as any);

      // Mock configManager
      const mockGetConfig = vi.fn().mockReturnValue({
        adapters: {
          custom: [],
        },
      });

      (provider as any).configManager = {
        getConfig: mockGetConfig,
      };

      // 删除不存在的适配器应该抛出错误
      await expect((provider as any).handleDeleteAdapter({ name: 'non-existent' })).rejects.toThrow(
        'Adapter "non-existent" not found',
      );
    });
  });

  describe('handleSaveAll', () => {
    it('应该保存所有适配器配置', async () => {
      const allData = {
        presets: {
          copilot: { enabled: false, autoUpdate: false },
          cursor: { enabled: true, autoUpdate: true },
          continue: { enabled: true, autoUpdate: false },
        },
        custom: [
          {
            id: 'custom1',
            name: 'Custom 1',
            enabled: true,
            outputPath: 'path1',
          },
        ],
      };

      // handleSaveAll 当前是 TODO 状态，只测试不会抛错误
      await expect((provider as any).handleSaveAll(allData)).resolves.not.toThrow();
    });
  });

  describe('handleMessage', () => {
    it('应该处理 ready 消息', async () => {
      const sendInitialDataSpy = vi.spyOn(provider as any, 'sendInitialData');

      await (provider as any).handleMessage({ type: 'ready' });

      expect(sendInitialDataSpy).toHaveBeenCalled();
    });

    it('应该处理 saveAll 消息', async () => {
      const handleSaveAllSpy = vi.spyOn(provider as any, 'handleSaveAll');
      const payload = { presets: {}, custom: [] };

      await (provider as any).handleMessage({ type: 'saveAll', payload });

      expect(handleSaveAllSpy).toHaveBeenCalledWith(payload);
    });

    it('应该处理 saveAdapter 消息', async () => {
      const handleSaveAdapterSpy = vi.spyOn(provider as any, 'handleSaveAdapter');
      const payload = { adapter: { id: 'test' } };

      await (provider as any).handleMessage({ type: 'saveAdapter', payload });

      expect(handleSaveAdapterSpy).toHaveBeenCalledWith(payload);
    });

    it('应该处理 deleteAdapter 消息', async () => {
      const handleDeleteAdapterSpy = vi.spyOn(provider as any, 'handleDeleteAdapter');
      const payload = { adapterId: 'test' };

      await (provider as any).handleMessage({ type: 'deleteAdapter', payload });

      expect(handleDeleteAdapterSpy).toHaveBeenCalledWith(payload);
    });
  });
});
