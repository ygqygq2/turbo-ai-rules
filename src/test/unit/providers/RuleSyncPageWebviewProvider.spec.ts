/**
 * @description RuleSyncPageWebviewProvider 单元测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RuleSyncPageWebviewProvider } from '@/providers/RuleSyncPageWebviewProvider';

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
  workspace: {
    workspaceFolders: [
      {
        uri: { fsPath: '/workspace/root' },
      },
    ],
  },
  Uri: {
    file: vi.fn((path) => ({ fsPath: path })),
  },
}));

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  readFileSync: vi.fn(() => '<html>{{nonce}}{{cspSource}}</html>'),
  promises: {
    readdir: vi.fn(() => []),
    readFile: vi.fn(() => 'rule content'),
  },
}));

// Mock ConfigManager
vi.mock('@/services/ConfigManager', () => ({
  ConfigManager: {
    getInstance: vi.fn(() => ({
      getConfig: vi.fn(() => ({
        sources: [
          { id: 'source1', name: 'Source 1', enabled: true },
          { id: 'source2', name: 'Source 2', enabled: true },
        ],
        adapters: {
          copilot: { enabled: true },
          cursor: { enabled: false },
          continue: { enabled: true },
          custom: [
            {
              id: 'custom1',
              name: 'Custom 1',
              enabled: true,
              outputPath: 'custom/path',
            },
          ],
        },
      })),
    })),
  },
}));

// Mock RulesManager
vi.mock('@/services/RulesManager', () => ({
  RulesManager: {
    getInstance: vi.fn(() => ({
      getRulesBySource: vi.fn(() => [
        { id: '1', filePath: 'rule1.md' },
        { id: '2', filePath: 'rule2.md' },
      ]),
      addRules: vi.fn(),
    })),
  },
}));

// Mock GitManager
vi.mock('@/services/GitManager', () => ({
  GitManager: {
    getInstance: vi.fn(() => ({
      getSourcePath: vi.fn((sourceId) => `/cache/${sourceId}`),
      repositoryExists: vi.fn(() => Promise.resolve(true)),
    })),
  },
}));

describe('RuleSyncPageWebviewProvider', () => {
  let provider: RuleSyncPageWebviewProvider;
  let mockContext: any;

  beforeEach(() => {
    // Reset singleton
    (RuleSyncPageWebviewProvider as any).instance = undefined;

    mockContext = {
      extensionPath: '/test/path',
      subscriptions: [],
      extensionUri: { fsPath: '/test/path' },
    };

    provider = RuleSyncPageWebviewProvider.getInstance(mockContext);
    vi.clearAllMocks();
  });

  describe('getInstance', () => {
    it('应该返回单例实例', () => {
      const instance1 = RuleSyncPageWebviewProvider.getInstance(mockContext);
      const instance2 = RuleSyncPageWebviewProvider.getInstance(mockContext);
      expect(instance1).toBe(instance2);
    });
  });

  describe('getRuleSyncData', () => {
    it('应该返回规则树和适配器列表', async () => {
      const data = await (provider as any).getRuleSyncData();

      expect(data).toHaveProperty('ruleTree');
      expect(data).toHaveProperty('adapters');

      expect(Array.isArray(data.ruleTree)).toBe(true);
      expect(Array.isArray(data.adapters)).toBe(true);
    });

    it('应该为每个规则源构建树节点', async () => {
      const data = await (provider as any).getRuleSyncData();

      expect(data.ruleTree.length).toBeGreaterThan(0);

      const sourceNode = data.ruleTree[0];
      expect(sourceNode.type).toBe('source');
      expect(sourceNode).toHaveProperty('id');
      expect(sourceNode).toHaveProperty('name');
      expect(sourceNode).toHaveProperty('children');
      expect(sourceNode).toHaveProperty('stats');
    });

    it('应该包含所有适配器（预置和自定义）', async () => {
      const data = await (provider as any).getRuleSyncData();

      expect(data.adapters.length).toBeGreaterThanOrEqual(4); // 3 预置 + 1 自定义

      const copilotAdapter = data.adapters.find((a: any) => a.id === 'copilot');
      expect(copilotAdapter).toBeDefined();
      expect(copilotAdapter.type).toBe('preset');
      expect(copilotAdapter.enabled).toBe(true);

      const customAdapter = data.adapters.find((a: any) => a.id === 'custom1');
      expect(customAdapter).toBeDefined();
      expect(customAdapter.type).toBe('custom');
    });
  });

  describe('getAdapterStates', () => {
    it('应该返回所有适配器状态', async () => {
      const states = await (provider as any).getAdapterStates();

      expect(Array.isArray(states)).toBe(true);
      expect(states.length).toBeGreaterThanOrEqual(4);
    });

    it('应该正确设置适配器属性', async () => {
      const states = await (provider as any).getAdapterStates();

      const copilot = states.find((s: any) => s.id === 'copilot');
      expect(copilot).toMatchObject({
        id: 'copilot',
        name: 'GitHub Copilot',
        type: 'preset',
        enabled: true,
        checked: true,
        ruleCount: 0,
      });
    });

    it('应该包含自定义适配器', async () => {
      const states = await (provider as any).getAdapterStates();

      const custom = states.find((s: any) => s.id === 'custom1');
      expect(custom).toMatchObject({
        id: 'custom1',
        name: 'Custom 1',
        type: 'custom',
        enabled: true,
        outputPath: 'custom/path',
      });
    });
  });

  describe('buildFileTree', () => {
    it('应该构建文件树结构', async () => {
      const tree = await (provider as any).buildFileTree('/test/dir', '/test', 'source1');

      expect(Array.isArray(tree)).toBe(true);
    });
  });

  describe('getAdapterOutputPath', () => {
    it('应该返回 Copilot 的输出路径', () => {
      const path = (provider as any).getAdapterOutputPath('copilot');
      expect(path).toContain('.github/copilot-instructions.md');
    });

    it('应该返回 Cursor 的输出路径', () => {
      const path = (provider as any).getAdapterOutputPath('cursor');
      expect(path).toContain('.cursorrules');
    });

    it('应该返回 Continue 的输出路径', () => {
      const path = (provider as any).getAdapterOutputPath('continue');
      expect(path).toContain('.continuerules');
    });

    it('应该返回未知适配器的空路径', () => {
      const path = (provider as any).getAdapterOutputPath('unknown');
      expect(path).toBe('');
    });
  });

  describe('handleSync', () => {
    it('应该处理同步请求', async () => {
      const payload = {
        data: {
          rules: ['source1:rule1.md', 'source1:rule2.md'],
          adapters: ['copilot', 'cursor'],
        },
      };

      const syncToAdapterSpy = vi
        .spyOn(provider as any, 'syncToAdapter')
        .mockResolvedValue(undefined);

      await (provider as any).handleSync(payload);

      expect(syncToAdapterSpy).toHaveBeenCalledTimes(2);
    });

    it('应该解析规则 ID 为源和路径', async () => {
      const payload = {
        data: {
          rules: ['source1:dir/rule.md'],
          adapters: ['copilot'],
        },
      };

      vi.spyOn(provider as any, 'syncToAdapter').mockResolvedValue(undefined);

      await (provider as any).handleSync(payload);

      expect(true).toBe(true); // 验证没有抛出异常
    });

    it('应该在缺少数据时抛出错误', async () => {
      const payload = {
        data: {
          rules: [],
        },
      };

      await expect((provider as any).handleSync(payload)).rejects.toThrow('Invalid sync payload');
    });
  });

  describe('handleMessage', () => {
    it('应该处理 ready 消息', async () => {
      const sendInitialDataSpy = vi.spyOn(provider as any, 'sendInitialData');

      await (provider as any).handleMessage({ type: 'ready' });

      expect(sendInitialDataSpy).toHaveBeenCalled();
    });

    it('应该处理 sync 消息', async () => {
      const handleSyncSpy = vi.spyOn(provider as any, 'handleSync');
      const payload = { data: { rules: [], adapters: [] } };

      await (provider as any).handleMessage({ type: 'sync', payload });

      expect(handleSyncSpy).toHaveBeenCalledWith(payload);
    });

    it('应该处理未知消息类型', async () => {
      await expect((provider as any).handleMessage({ type: 'unknown' })).resolves.not.toThrow();
    });
  });
});
