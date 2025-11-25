/**
 * RulesTreeProvider 单元测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RulesTreeProvider } from '@/providers/RulesTreeProvider';
import type { RuleSource } from '@/types/config';
import type { ParsedRule } from '@/types/rules';

// Mock vscode 必须在其他 Mock 之前
vi.mock('vscode', () => ({
  TreeItem: class TreeItem {
    label: string;
    collapsibleState: any;
    id?: string;
    tooltip?: string;
    iconPath?: any;
    contextValue?: string;
    command?: any;
    description?: string;
    checkboxState?: any;

    constructor(label: string, collapsibleState?: any) {
      this.label = label;
      this.collapsibleState = collapsibleState;
    }
  },
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2,
  },
  TreeItemCheckboxState: {
    Unchecked: 0,
    Checked: 1,
  },
  ThemeIcon: class ThemeIcon {
    constructor(public id: string) {}
  },
  Uri: {
    file: (path: string) => ({ fsPath: path }),
  },
  EventEmitter: class EventEmitter {
    event: any;
    fire: any;
    constructor() {
      this.fire = vi.fn();
      this.event = vi.fn();
    }
  },
  window: {
    onDidChangeActiveTextEditor: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  },
  workspace: {},
}));

// Mock 模块
vi.mock('@/services/ConfigManager');
vi.mock('@/services/RulesManager');
vi.mock('@/services/SelectionStateManager');
vi.mock('@/services/WorkspaceDataManager');
vi.mock('@/utils/logger');

describe('RulesTreeProvider 单元测试', () => {
  let rulesTreeProvider: RulesTreeProvider;
  let mockConfigManager: any;
  let mockRulesManager: any;
  let mockSelectionStateManager: any;

  const mockSource: RuleSource = {
    id: 'test-source',
    name: 'Test Source',
    gitUrl: 'https://github.com/test/repo.git',
    branch: 'main',
    enabled: true,
    subPath: '',
    authentication: { type: 'none' },
  };

  const mockRule: ParsedRule = {
    id: 'test-rule',
    title: 'Test Rule',
    content: 'Test content',
    sourceId: 'test-source',
    filePath: '/rules/test.md',
    metadata: {
      version: '1.0.0',
      tags: ['test'],
      priority: 'medium' as const,
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock ConfigManager
    const { ConfigManager } = await import('@/services/ConfigManager');
    mockConfigManager = {
      getSources: vi.fn().mockImplementation((_resourceUri?: any) => {
        return [mockSource]; // 总是返回 mockSource
      }),
      onConfigChanged: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    };
    (ConfigManager.getInstance as any) = vi.fn().mockReturnValue(mockConfigManager);

    // Mock RulesManager
    const { RulesManager } = await import('@/services/RulesManager');
    mockRulesManager = {
      getRulesBySource: vi.fn().mockReturnValue([mockRule]),
      getAllRules: vi.fn().mockReturnValue([mockRule]),
      getStats: vi.fn().mockReturnValue({
        totalRules: 1,
        sourceCount: 1,
        enabledSourceCount: 1,
        conflictCount: 0,
      }),
    };
    (RulesManager.getInstance as any) = vi.fn().mockReturnValue(mockRulesManager);

    // Mock SelectionStateManager
    const { SelectionStateManager } = await import('@/services/SelectionStateManager');
    mockSelectionStateManager = {
      getSelection: vi.fn().mockReturnValue([mockRule.filePath]),
      getSelectionCount: vi.fn().mockReturnValue(1),
      updateSelection: vi.fn(),
      initializeState: vi.fn().mockResolvedValue([mockRule.filePath]),
      onStateChanged: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    };
    (SelectionStateManager.getInstance as any) = vi.fn().mockReturnValue(mockSelectionStateManager);

    // Mock WorkspaceDataManager
    const { WorkspaceDataManager } = await import('@/services/WorkspaceDataManager');
    (WorkspaceDataManager.getInstance as any) = vi.fn().mockReturnValue({
      getRuleSelection: vi.fn().mockResolvedValue(null),
    });

    rulesTreeProvider = new RulesTreeProvider(
      mockConfigManager,
      mockRulesManager,
      mockSelectionStateManager,
    );
  });

  describe('基本功能', () => {
    it('应该正确创建实例', () => {
      expect(rulesTreeProvider).toBeDefined();
    });

    it('应该调用 ConfigManager 获取规则源', async () => {
      await rulesTreeProvider.getChildren();

      expect(mockConfigManager.getSources).toHaveBeenCalled();
    });

    it('应该能获取树节点', async () => {
      const children = await rulesTreeProvider.getChildren();

      expect(children).toBeDefined();
      expect(Array.isArray(children)).toBe(true);
    });
  });

  describe('数据刷新', () => {
    it('应该支持刷新树视图', () => {
      const refreshSpy = vi.spyOn(rulesTreeProvider['_onDidChangeTreeData'], 'fire');

      rulesTreeProvider.refresh();

      expect(refreshSpy).toHaveBeenCalled();
    });
  });

  describe('规则选择', () => {
    it('应该初始化规则源的选择状态', async () => {
      await rulesTreeProvider.getChildren();

      expect(mockSelectionStateManager.initializeState).toHaveBeenCalled();
    });
  });

  describe('配置变更监听', () => {
    it('应该监听选择状态变更并刷新', () => {
      expect(mockSelectionStateManager.onStateChanged).toHaveBeenCalled();
    });
  });
});
