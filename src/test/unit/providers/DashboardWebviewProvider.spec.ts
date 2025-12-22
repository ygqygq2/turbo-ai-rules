/**
 * @description DashboardWebviewProvider 单元测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardWebviewProvider } from '@/providers/DashboardWebviewProvider';

// Mock vscode
vi.mock('vscode', () => ({
  ViewColumn: {
    One: 1,
  },
  window: {
    createWebviewPanel: vi.fn(),
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
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
vi.mock('@/services/ConfigManager', () => ({
  ConfigManager: {
    getInstance: vi.fn(() => ({
      getConfig: vi.fn(() => ({
        sources: [
          { id: 'source1', name: 'Source 1', enabled: true },
          { id: 'source2', name: 'Source 2', enabled: false },
        ],
        adapters: {
          copilot: { enabled: true },
          cursor: { enabled: false },
          continue: { enabled: true },
          custom: [{ id: 'custom1', name: 'Custom 1', enabled: true }],
        },
      })),
    })),
  },
}));

// Mock WorkspaceStateManager
vi.mock('@/services/WorkspaceStateManager', () => ({
  WorkspaceStateManager: {
    getInstance: vi.fn(() => ({
      getLastSyncTime: vi.fn((sourceId: string) => {
        if (sourceId === 'source1') return Promise.resolve(new Date('2024-01-01'));
        return Promise.resolve(null);
      }),
    })),
  },
}));

// Mock RulesManager
vi.mock('@/services/RulesManager', () => ({
  RulesManager: {
    getInstance: vi.fn(() => ({
      getAllRules: vi.fn(() => [
        { id: '1', sourceId: 'source1' },
        { id: '2', sourceId: 'source1' },
        { id: '3', sourceId: 'source2' },
      ]),
    })),
  },
}));

// Mock WorkspaceDataManager
vi.mock('@/services/WorkspaceDataManager', () => ({
  WorkspaceDataManager: {
    getInstance: vi.fn(() => ({
      readGenerationManifest: vi.fn(() =>
        Promise.resolve({
          artifacts: [
            {
              adapter: 'cursor',
              generatedAt: '2024-01-01T12:00:00Z',
              filePath: '.cursorrules',
              ruleCount: 2,
            },
            {
              adapter: 'copilot',
              generatedAt: '2024-01-02T12:00:00Z',
              filePath: '.github/copilot-instructions.md',
              ruleCount: 3,
            },
          ],
        }),
      ),
    })),
  },
}));

// Mock WorkspaceContextManager
vi.mock('@/services/WorkspaceContextManager', () => ({
  WorkspaceContextManager: {
    getInstance: vi.fn(() => ({
      getCurrentWorkspaceFolder: vi.fn(() => ({
        uri: { fsPath: '/test/workspace' },
        name: 'test-workspace',
        index: 0,
      })),
    })),
  },
}));

describe('DashboardWebviewProvider', () => {
  let provider: DashboardWebviewProvider;
  let mockContext: any;

  beforeEach(() => {
    // Reset singleton
    (DashboardWebviewProvider as any).instance = undefined;

    mockContext = {
      extensionPath: '/test/path',
      subscriptions: [],
      extensionUri: { fsPath: '/test/path' },
    };

    provider = DashboardWebviewProvider.getInstance(mockContext);
  });

  describe('getInstance', () => {
    it('应该返回单例实例', () => {
      const instance1 = DashboardWebviewProvider.getInstance(mockContext);
      const instance2 = DashboardWebviewProvider.getInstance(mockContext);
      expect(instance1).toBe(instance2);
    });
  });

  describe('getDashboardState', () => {
    it('应该正确聚合仪表板状态', async () => {
      const state = await (provider as any).getDashboardState();

      expect(state).toHaveProperty('sources');
      expect(state.sources).toHaveProperty('enabled');
      expect(state.sources).toHaveProperty('total');
      expect(state.sources).toHaveProperty('totalRules');
      expect(state.sources).toHaveProperty('list');
      expect(Array.isArray(state.sources.list)).toBe(true);

      expect(state).toHaveProperty('adapters');
      expect(Array.isArray(state.adapters)).toBe(true);
    });

    it('应该正确计算启用的规则源数量', async () => {
      const state = await (provider as any).getDashboardState();

      expect(state.sources.enabled).toBe(1);
      expect(state.sources.total).toBe(2);
    });

    it('应该正确计算规则总数', async () => {
      const state = await (provider as any).getDashboardState();

      expect(state.sources.totalRules).toBe(3);
    });

    it('应该包含所有适配器（预置和自定义）', async () => {
      const state = await (provider as any).getDashboardState();

      expect(state.adapters.length).toBeGreaterThanOrEqual(4); // 3 预置 + 1 自定义
    });

    it('应该在发生错误时返回默认状态', async () => {
      // 临时替换 configManager 为一个会抛错的版本
      const originalConfigManager = (provider as any).configManager;
      (provider as any).configManager = {
        getConfig: vi.fn(() => {
          throw new Error('Test error');
        }),
      };

      const state = await (provider as any).getDashboardState();

      expect(state.sources.enabled).toBe(0);
      expect(state.sources.total).toBe(0);
      expect(state.sources.totalRules).toBe(0);
      expect(state.adapters.length).toBe(0);

      // 恢复原始 configManager
      (provider as any).configManager = originalConfigManager;
    });
  });

  describe('handleMessage', () => {
    it('应该处理 ready 消息', async () => {
      const sendInitialStateSpy = vi.spyOn(provider as any, 'sendInitialState');

      await (provider as any).handleMessage({ type: 'ready' });

      expect(sendInitialStateSpy).toHaveBeenCalled();
    });

    it('应该处理未知消息类型', async () => {
      await expect((provider as any).handleMessage({ type: 'unknown' })).resolves.not.toThrow();
    });
  });
});
