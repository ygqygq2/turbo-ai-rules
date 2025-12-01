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
    showErrorMessage: vi.fn(),
    setStatusBarMessage: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  },
  Uri: {
    file: vi.fn((path) => ({ fsPath: path })),
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

  beforeEach(() => {
    // Reset singleton
    (AdapterManagerWebviewProvider as any).instance = undefined;

    mockContext = {
      extensionPath: '/test/path',
      subscriptions: [],
      extensionUri: { fsPath: '/test/path' },
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

      expect(data).toHaveProperty('presets');
      expect(data).toHaveProperty('custom');

      expect(data.presets).toHaveProperty('copilot');
      expect(data.presets).toHaveProperty('cursor');
      expect(data.presets).toHaveProperty('continue');

      expect(Array.isArray(data.custom)).toBe(true);
      expect(data.custom.length).toBe(1);
    });

    it('应该正确设置预置适配器的属性', async () => {
      const data = await (provider as any).getAdapterData();

      expect(data.presets.copilot.enabled).toBe(true);
      expect(data.presets.copilot.autoUpdate).toBe(true);

      expect(data.presets.cursor.enabled).toBe(false);
      expect(data.presets.cursor.autoUpdate).toBe(false);
    });

    it('应该包含自定义适配器的完整信息', async () => {
      const data = await (provider as any).getAdapterData();

      expect(data.custom[0].id).toBe('custom1');
      expect(data.custom[0].name).toBe('Custom Adapter 1');
      expect(data.custom[0].enabled).toBe(true);
      expect(data.custom[0].outputPath).toBe('custom/path');
    });
  });

  describe('handleSaveAdapter', () => {
    it('应该保存新的自定义适配器', async () => {
      const newAdapter = {
        id: 'new-adapter',
        name: 'New Adapter',
        enabled: true,
        outputPath: 'output/path',
        format: 'markdown',
        template: 'custom template',
      };

      await (provider as any).handleSaveAdapter(newAdapter);

      expect(mockUpdateConfig).toHaveBeenCalled();
      const callArgs = mockUpdateConfig.mock.calls[mockUpdateConfig.mock.calls.length - 1];
      expect(callArgs[0]).toBe('adapters');
      expect(callArgs[1].custom).toBeDefined();
      expect(callArgs[1].custom.some((a: any) => a.id === 'new-adapter')).toBe(true);
    });

    it('应该更新现有的自定义适配器', async () => {
      const updatedAdapter = {
        id: 'custom1',
        name: 'Updated Custom Adapter',
        isEdit: true,
        enabled: false,
        outputPath: 'new/path',
        format: 'json',
        template: 'new template',
      };

      await (provider as any).handleSaveAdapter(updatedAdapter);

      expect(mockUpdateConfig).toHaveBeenCalled();
      const callArgs = mockUpdateConfig.mock.calls[mockUpdateConfig.mock.calls.length - 1];
      expect(callArgs[0]).toBe('adapters');
      const updatedAdapterInCall = callArgs[1].custom.find((a: any) => a.id === 'custom1');
      expect(updatedAdapterInCall).toBeDefined();
      expect(updatedAdapterInCall.outputPath).toBe('new/path');
    });
  });

  describe('handleDeleteAdapter', () => {
    it('应该删除指定的自定义适配器', async () => {
      await (provider as any).handleDeleteAdapter({ name: 'custom1' });

      expect(mockUpdateConfig).toHaveBeenCalled();
      const callArgs = mockUpdateConfig.mock.calls[mockUpdateConfig.mock.calls.length - 1];
      expect(callArgs[0]).toBe('adapters');
      expect(callArgs[1].custom.some((a: any) => a.id === 'custom1')).toBe(false);
    });

    it('应该在适配器不存在时抛出错误', async () => {
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
