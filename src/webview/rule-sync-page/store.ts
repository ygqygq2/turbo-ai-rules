import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { createWebviewRPC } from '../common/messaging';
import {
  buildTree,
  getAllFilePaths,
  getDirectoryFilePaths,
  toggleNode as toggleTreeNode,
  type TreeNode,
} from '../rule-selector/tree-utils';

// 获取 RPC 实例
const getRpc = () => createWebviewRPC();

// 类型定义
interface FileTreeNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
}

interface SourceInfo {
  id: string;
  name: string;
  totalRules?: number;
}

interface AdapterInfo {
  id: string;
  name: string;
  type: 'preset' | 'custom';
  enabled: boolean;
  outputPath: string;
}

interface InitialData {
  ruleTree: {
    type: 'source';
    id: string;
    name: string;
    sourceId: string;
    children?: FileTreeNode[];
    stats?: { total: number; selected: number };
  }[];
  adapters: AdapterInfo[];
}

// Store 接口
interface RuleSyncPageState {
  // 规则树状态
  sources: SourceInfo[];
  treeNodesBySource: { [sourceId: string]: TreeNode[] };
  selectedPaths: Set<string>; // 使用 Set 提高性能
  expandedNodes: Set<string>;

  // 适配器状态
  adapters: AdapterInfo[];
  selectedAdapters: Set<string>;

  // UI 状态
  searchTerm: string;
  syncing: boolean;

  // Actions
  setInitialData: (data: InitialData) => void;
  toggleTreeNode: (sourceId: string, path: string) => void;
  selectNode: (sourceId: string, path: string, checked: boolean, isDirectory: boolean) => void;
  toggleAllRules: () => void;
  toggleAllAdapters: () => void;
  toggleAdapter: (adapterId: string) => void;
  setSearchTerm: (term: string) => void;
  sync: () => Promise<void>;
  cancel: () => void;

  // 计算属性
  isAllRulesSelected: () => boolean;
  isAllAdaptersSelected: () => boolean;
  getSelectedRulesCount: () => number;
  getSelectedAdaptersCount: () => number;
  getTotalRulesCount: () => number;
}

/**
 * 规则同步页状态管理 Store
 */
export const useRuleSyncPageStore = create<RuleSyncPageState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      sources: [],
      treeNodesBySource: {},
      selectedPaths: new Set(),
      expandedNodes: new Set(),
      adapters: [],
      selectedAdapters: new Set(),
      searchTerm: '',
      syncing: false,

      /**
       * @description 设置初始数据
       */
      setInitialData: (data) => {
        const sources: SourceInfo[] = [];
        const treeNodesBySource: { [sourceId: string]: TreeNode[] } = {};
        const expandedNodes = new Set<string>();

        // 处理规则树数据
        for (const source of data.ruleTree || []) {
          sources.push({
            id: source.id,
            name: source.name,
            totalRules: source.stats?.total || 0,
          });

          // 构建树结构
          const tree = buildTree(source.children || []);
          treeNodesBySource[source.id] = tree;

          // 默认展开源节点
          expandedNodes.add(source.id);
        }

        // 处理适配器数据，默认选中已启用的
        const selectedAdapters = new Set<string>();
        for (const adapter of data.adapters || []) {
          if (adapter.enabled) {
            selectedAdapters.add(adapter.id);
          }
        }

        set({
          sources,
          treeNodesBySource,
          expandedNodes,
          adapters: data.adapters || [],
          selectedAdapters,
          selectedPaths: new Set(), // 初始不选择任何规则
        });
      },

      /**
       * @description 展开/收起树节点
       */
      toggleTreeNode: (sourceId, path) => {
        const state = get();
        const key = `${sourceId}:${path}`;
        const newExpanded = new Set(state.expandedNodes);

        if (newExpanded.has(key)) {
          newExpanded.delete(key);
        } else {
          newExpanded.add(key);
        }

        // 同时更新树节点的 expanded 状态
        const trees = { ...state.treeNodesBySource };
        if (trees[sourceId]) {
          trees[sourceId] = toggleTreeNode(trees[sourceId], path);
        }

        set({ expandedNodes: newExpanded, treeNodesBySource: trees });
      },

      /**
       * @description 选择/取消选择节点
       */
      selectNode: (sourceId, path, checked, isDirectory) => {
        const state = get();
        const newSelected = new Set(state.selectedPaths);
        const fullPath = `${sourceId}:${path}`;

        if (isDirectory) {
          // 目录节点：选择/取消该目录下所有文件
          const tree = state.treeNodesBySource[sourceId] || [];
          const dirPaths = getDirectoryFilePaths(tree, path).map((p) => `${sourceId}:${p}`);

          if (checked) {
            dirPaths.forEach((p) => newSelected.add(p));
          } else {
            dirPaths.forEach((p) => newSelected.delete(p));
          }
        } else {
          // 文件节点
          if (checked) {
            newSelected.add(fullPath);
          } else {
            newSelected.delete(fullPath);
          }
        }

        set({ selectedPaths: newSelected });
      },

      /**
       * @description 全选/全不选规则切换
       */
      toggleAllRules: () => {
        const state = get();
        const isAllSelected = state.isAllRulesSelected();

        if (isAllSelected) {
          // 全不选
          set({ selectedPaths: new Set() });
        } else {
          // 全选
          const newSelected = new Set<string>();
          for (const [sourceId, tree] of Object.entries(state.treeNodesBySource)) {
            const paths = getAllFilePaths(tree);
            paths.forEach((p) => newSelected.add(`${sourceId}:${p}`));
          }
          set({ selectedPaths: newSelected });
        }
      },

      /**
       * @description 全选/全不选适配器切换
       */
      toggleAllAdapters: () => {
        const state = get();
        const isAllSelected = state.isAllAdaptersSelected();

        if (isAllSelected) {
          // 全不选
          set({ selectedAdapters: new Set() });
        } else {
          // 全选所有启用的适配器
          const newSelected = new Set<string>();
          state.adapters.forEach((a) => {
            if (a.enabled) {
              newSelected.add(a.id);
            }
          });
          set({ selectedAdapters: newSelected });
        }
      },

      /**
       * @description 切换单个适配器选中状态
       */
      toggleAdapter: (adapterId) => {
        const state = get();
        const newSelected = new Set(state.selectedAdapters);

        if (newSelected.has(adapterId)) {
          newSelected.delete(adapterId);
        } else {
          newSelected.add(adapterId);
        }

        set({ selectedAdapters: newSelected });
      },

      /**
       * @description 设置搜索词
       */
      setSearchTerm: (term) => {
        set({ searchTerm: term });
      },

      /**
       * @description 执行同步
       */
      sync: async () => {
        const state = get();
        set({ syncing: true });

        try {
          await getRpc().request('sync', {
            rules: Array.from(state.selectedPaths),
            adapters: Array.from(state.selectedAdapters),
          });
        } catch (error) {
          console.error('Sync failed:', error);
          throw error;
        } finally {
          set({ syncing: false });
        }
      },

      /**
       * @description 取消并关闭
       */
      cancel: () => {
        getRpc().notify('cancel');
      },

      // 计算属性
      isAllRulesSelected: () => {
        const state = get();
        const totalCount = state.getTotalRulesCount();
        return totalCount > 0 && state.selectedPaths.size === totalCount;
      },

      isAllAdaptersSelected: () => {
        const state = get();
        const enabledAdapters = state.adapters.filter((a) => a.enabled);
        return (
          enabledAdapters.length > 0 &&
          enabledAdapters.every((a) => state.selectedAdapters.has(a.id))
        );
      },

      getSelectedRulesCount: () => {
        return get().selectedPaths.size;
      },

      getSelectedAdaptersCount: () => {
        return get().selectedAdapters.size;
      },

      getTotalRulesCount: () => {
        const state = get();
        let total = 0;
        for (const tree of Object.values(state.treeNodesBySource)) {
          total += getAllFilePaths(tree).length;
        }
        return total;
      },
    }),
    {
      name: 'RuleSyncPageStore',
      enabled: process.env.NODE_ENV === 'development',
    },
  ),
);
