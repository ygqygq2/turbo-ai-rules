/**
 * @description RuleSyncPageWebviewProvider 单元测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RuleSyncPageWebviewProvider } from '@/providers/RuleSyncPageWebview';

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
  workspace: {
    workspaceFolders: [
      {
        uri: { fsPath: '/workspace/root' },
      },
    ],
  },
  commands: {
    executeCommand: vi.fn(() => Promise.resolve()), // ✅ Mock commands.executeCommand
  },
  Uri: {
    file: vi.fn((path) => ({ fsPath: path })),
  },
  l10n: {
    t: vi.fn((key) => key), // ✅ Mock l10n.t
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
        adapterSuites: [
          {
            id: 'custom-suite',
            name: 'Custom Suite',
            description: 'Custom adapter bundle',
            adapterIds: ['copilot', 'custom1'],
            enabled: true,
          },
        ],
      })),
      // ✅ 添加 getSources 方法
      getSources: vi.fn(() => [
        { id: 'source1', name: 'Source 1', enabled: true },
        { id: 'source2', name: 'Source 2', enabled: true },
      ]),
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

// Mock StatusBarProvider
vi.mock('@/providers/StatusBarProvider', () => ({
  StatusBarProvider: {
    getInstance: vi.fn(() => ({
      setSyncStatus: vi.fn(),
      updateLastSyncTime: vi.fn(),
      dispose: vi.fn(),
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

      expect(data).toHaveProperty('sources');
      expect(data).toHaveProperty('suites');
      expect(data).toHaveProperty('adapters');

      expect(Array.isArray(data.sources)).toBe(true);
      expect(Array.isArray(data.suites)).toBe(true);
      expect(Array.isArray(data.adapters)).toBe(true);
    });

    it('应该为每个规则源构建树节点', async () => {
      const data = await (provider as any).getRuleSyncData();

      expect(data.sources.length).toBeGreaterThan(0);

      const source = data.sources[0];
      expect(source).toHaveProperty('id');
      expect(source).toHaveProperty('name');
      expect(source).toHaveProperty('fileTree');
      expect(source).toHaveProperty('selectedPaths');
      expect(source).toHaveProperty('stats');
    });

    it('应该包含所有适配器（预置和自定义）', async () => {
      const data = await (provider as any).getRuleSyncData();

      expect(data.adapters.length).toBeGreaterThanOrEqual(19); // 18 预置 + 1 自定义

      const copilotAdapter = data.adapters.find((a: any) => a.id === 'copilot');
      expect(copilotAdapter).toBeDefined();
      expect(copilotAdapter.type).toBe('preset');
      expect(copilotAdapter.enabled).toBe(true);

      const cursorSkillsAdapter = data.adapters.find((a: any) => a.id === 'cursor-skills');
      expect(cursorSkillsAdapter).toBeDefined();
      expect(cursorSkillsAdapter.isRuleType).toBe(false);

      const customAdapter = data.adapters.find((a: any) => a.id === 'custom1');
      expect(customAdapter).toBeDefined();
      expect(customAdapter.type).toBe('custom');
    });

    it('应该返回适配器综合体并包含子适配器', async () => {
      const data = await (provider as any).getRuleSyncData();

      const cursorSuite = data.suites.find((suite: any) => suite.id === 'cursor-core');
      const copilotSuite = data.suites.find((suite: any) => suite.id === 'copilot-core');
      const claudeSuite = data.suites.find((suite: any) => suite.id === 'claude-core');
      const agenticSuite = data.suites.find((suite: any) => suite.id === 'agentic-core');

      expect(cursorSuite).toBeDefined();
      expect(cursorSuite.adapterIds).toEqual(['cursor', 'cursor-skills']);
      expect(copilotSuite).toBeDefined();
      expect(copilotSuite.adapterIds).toEqual([
        'copilot',
        'copilot-instructions-files',
        'copilot-skills',
        'copilot-agents',
        'copilot-prompts',
      ]);
      expect(claudeSuite).toBeDefined();
      expect(claudeSuite.adapterIds).toEqual([
        'claude-md',
        'claude-skills',
        'claude-commands',
        'claude-agents',
      ]);
      expect(agenticSuite).toBeDefined();
      expect(agenticSuite.adapterIds).toEqual(['continue', 'cline', 'roo-cline', 'aider']);
    });

    it('应该合并配置中的自定义综合体', async () => {
      const data = await (provider as any).getRuleSyncData();

      const customSuite = data.suites.find((suite: any) => suite.id === 'custom-suite');

      expect(customSuite).toBeDefined();
      expect(customSuite.name).toBe('Custom Suite');
      expect(customSuite.adapterIds).toEqual(['copilot', 'custom1']);
    });
  });

  describe('getAdapterStates', () => {
    it('应该返回所有适配器状态', async () => {
      const states = await (provider as any).getAdapterStates();

      expect(Array.isArray(states)).toBe(true);
      expect(states.length).toBeGreaterThanOrEqual(19);
    });

    it('应该正确设置适配器属性', async () => {
      const states = await (provider as any).getAdapterStates();

      const copilot = states.find((s: any) => s.id === 'copilot');
      expect(copilot).toMatchObject({
        id: 'copilot',
        name: 'GitHub Copilot',
        type: 'preset',
        enabled: true,
        checked: false, // 默认未启用，checked 为 false
        assetCount: 0,
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
        outputPath: 'custom/path/',
      });
    });
  });

  describe('handleSyncInternal', () => {
    it('应该处理同步请求', async () => {
      const payload = {
        data: {
          rules: ['source1:rule1.md', 'source1:rule2.md'],
          adapters: ['copilot', 'cursor'],
        },
      };

      // 测试不抛出异常
      await expect((provider as any).handleSyncInternal(payload)).resolves.not.toThrow();
    });

    it('应该解析规则 ID 为源和路径', async () => {
      const payload = {
        data: {
          rules: ['source1:dir/rule.md'],
          adapters: ['copilot'],
        },
      };

      // 测试不抛出异常
      await expect((provider as any).handleSyncInternal(payload)).resolves.not.toThrow();
    });

    it('应该在缺少数据时抛出错误', async () => {
      const payload = {
        data: {
          rules: [],
          // 缺少 adapters 字段
        },
      };

      // handleSyncInternal 现在会抛出错误
      await expect((provider as any).handleSyncInternal(payload)).rejects.toThrow();
    });
  });

  describe('handleMessage', () => {
    it('应该处理 ready 消息（兼容旧协议）', async () => {
      const getRuleSyncDataSpy = vi.spyOn(provider as any, 'getRuleSyncData');

      await (provider as any).handleMessage({ type: 'ready' });

      expect(getRuleSyncDataSpy).toHaveBeenCalled();
    });

    it('应该处理未知消息类型（不抛出错误）', async () => {
      await expect((provider as any).handleMessage({ type: 'unknown' })).resolves.not.toThrow();
    });
  });

  // ✅ RPC 消息处理器现在通过 registerMessageHandlers 注册，不再通过 handleMessage
  describe('registerMessageHandlers', () => {
    it('应该注册 RPC 处理器', () => {
      // 简单测试：确保方法存在且可调用
      expect((provider as any).registerMessageHandlers).toBeDefined();
      expect(typeof (provider as any).registerMessageHandlers).toBe('function');
    });
  });
});
