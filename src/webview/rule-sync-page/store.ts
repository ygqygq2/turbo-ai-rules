import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { createWebviewRPC } from '../common/messaging';
import {
  buildTree,
  getAllFilePaths,
  getDirectoryFilePaths,
  toggleNode as toggleTreeNode,
  type TreeNodeType as TreeNode,
} from '../components/tree';

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
  checked: boolean;
  selectDisabled: boolean;
  isRuleType: boolean;
}

interface InitialData {
  sources: Array<{
    id: string;
    name: string;
    fileTree: FileTreeNode[]; // ✅ 纯树结构
    selectedPaths: string[]; // ✅ 选中路径数组
    stats: { total: number; selected: number };
  }>;
  adapters: AdapterInfo[];
}

// Store 接口
interface RuleSyncPageState {
  // 规则树状态
  sources: SourceInfo[];
  treeNodesBySource: { [sourceId: string]: TreeNode[] };
  // ✅ 复用规则选择器的数据结构：按源分组，每个源使用 string[] 存储路径
  selectedPathsBySource: { [sourceId: string]: string[] };
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
  updateSelectionFromExtension: (sourceId: string, selectedPaths: string[]) => void; // ✅ 新增：从扩展更新选择
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
  getAdapterSelectDisabled: (adapterId: string, selectedAdapters?: Set<string>) => boolean;
}

/**
 * 规则同步页状态管理 Store
 * ✅ 复用规则选择器的数据处理逻辑，支持多源
 */
export const useRuleSyncPageStore = create<RuleSyncPageState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      sources: [],
      treeNodesBySource: {},
      selectedPathsBySource: {}, // ✅ 按源分组，格式：{ [sourceId]: string[] }
      expandedNodes: new Set(),
      adapters: [],
      selectedAdapters: new Set(),
      searchTerm: '',
      syncing: false,

      /**
       * @description 设置初始数据（✅ 与规则选择器100%复用逻辑）
       */
      setInitialData: (data) => {
        const sources: SourceInfo[] = [];
        const treeNodesBySource: { [sourceId: string]: TreeNode[] } = {};
        const selectedPathsBySource: { [sourceId: string]: string[] } = {};
        const expandedNodes = new Set<string>();

        // ✅ 处理每个源（与规则选择器完全一致）
        for (const source of data.sources || []) {
          sources.push({
            id: source.id,
            name: source.name,
            totalRules: source.stats?.total || 0,
          });

          // ✅ 构建 UI 树结构（FileTreeNode → TreeNode）
          const tree = buildTree(source.fileTree);
          treeNodesBySource[source.id] = tree;

          // ✅ 直接使用后端返回的 selectedPaths（不需要从树中提取）
          selectedPathsBySource[source.id] = source.selectedPaths || [];

          // 默认展开源节点
          expandedNodes.add(source.id);

          console.log(
            `[setInitialData] Source ${source.id}: ${source.selectedPaths?.length || 0}/${
              source.stats?.total || 0
            } selected`,
          );
        }

        // ✅ 默认不选中任何适配器（用户需要明确选择）
        const selectedAdapters = new Set<string>();

        set({
          sources,
          treeNodesBySource,
          selectedPathsBySource, // ✅ 按源分组的选择状态
          expandedNodes,
          adapters: data.adapters || [],
          selectedAdapters, // ✅ 初始为空
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
       * @description 选择/取消选择节点（✅ 复用规则选择器逻辑）
       */
      selectNode: (sourceId, path, checked, isDirectory) => {
        const state = get();
        const currentPaths = state.selectedPathsBySource[sourceId] || [];
        let newPaths: string[];

        if (isDirectory) {
          // 目录节点：选择/取消该目录下所有文件
          const tree = state.treeNodesBySource[sourceId] || [];
          const dirPaths = getDirectoryFilePaths(tree, path);

          if (checked) {
            // 添加目录下所有文件（去重）
            const pathsSet = new Set([...currentPaths, ...dirPaths]);
            newPaths = Array.from(pathsSet);
          } else {
            // 移除目录下所有文件
            const dirPathsSet = new Set(dirPaths);
            newPaths = currentPaths.filter((p) => !dirPathsSet.has(p));
          }
        } else {
          // 文件节点
          if (checked) {
            newPaths = currentPaths.includes(path) ? currentPaths : [...currentPaths, path];
          } else {
            newPaths = currentPaths.filter((p) => p !== path);
          }
        }

        // ✅ 更新该源的选择状态（创建新对象触发更新）
        set({
          selectedPathsBySource: {
            ...state.selectedPathsBySource,
            [sourceId]: newPaths,
          },
        });

        // 通知后端选择变更
        const rpc = getRpc();
        rpc.notify('selectionChanged', {
          sourceId,
          selectedPaths: newPaths,
        });
      },

      /**
       * @description 从扩展更新选择状态（用于左侧树视图同步）
       */
      updateSelectionFromExtension: (sourceId: string, selectedPaths: string[]) => {
        const state = get();
        set({
          selectedPathsBySource: {
            ...state.selectedPathsBySource,
            [sourceId]: selectedPaths,
          },
        });
      },

      /**
       * @description 全选/全不选规则切换
       */
      toggleAllRules: () => {
        const state = get();
        const isAllSelected = state.isAllRulesSelected();

        if (isAllSelected) {
          // 全不选
          set({ selectedPathsBySource: {} });
        } else {
          // 全选
          const newSelected: { [sourceId: string]: string[] } = {};
          for (const [sourceId, tree] of Object.entries(state.treeNodesBySource)) {
            newSelected[sourceId] = getAllFilePaths(tree);
          }
          set({ selectedPathsBySource: newSelected });
        }
      },

      /**
       * @description 全选/全不选适配器切换
       */
      toggleAllAdapters: () => {
        const state = get();
        const isAllSelected = state.isAllAdaptersSelected();

        let newSelected: Set<string>;
        if (isAllSelected) {
          // 全不选
          newSelected = new Set();
        } else {
          // 全选所有启用的适配器
          newSelected = new Set<string>();
          state.adapters.forEach((a) => {
            if (a.enabled) {
              newSelected.add(a.id);
            }
          });
        }

        // 更新所有适配器的 selectDisabled 状态
        const updatedAdapters = state.adapters.map((a) => {
          const selectDisabled = state.getAdapterSelectDisabled(a.id, newSelected);
          return { ...a, selectDisabled };
        });

        set({
          selectedAdapters: newSelected,
          adapters: updatedAdapters,
        });
      },

      /**
       * @description 切换单个适配器选中状态（支持规则/技能适配器互斥）
       */
      toggleAdapter: (adapterId) => {
        const state = get();
        const adapter = state.adapters.find((a) => a.id === adapterId);
        if (!adapter) {
          return;
        }

        const newSelected = new Set(state.selectedAdapters);

        if (newSelected.has(adapterId)) {
          // 取消选中
          newSelected.delete(adapterId);
        } else {
          // 选中该适配器
          newSelected.add(adapterId);
        }

        // 更新所有适配器的 selectDisabled 状态
        const updatedAdapters = state.adapters.map((a) => {
          const selectDisabled = state.getAdapterSelectDisabled(a.id, newSelected);
          return { ...a, selectDisabled };
        });

        set({
          selectedAdapters: newSelected,
          adapters: updatedAdapters,
        });
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
          // 转换为扁平的规则路径数组
          const allRules: string[] = [];
          for (const [sourceId, paths] of Object.entries(state.selectedPathsBySource)) {
            paths.forEach((path) => allRules.push(`${sourceId}:${path}`));
          }

          await getRpc().request('sync', {
            rules: allRules,
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
        const selectedCount = state.getSelectedRulesCount();
        return totalCount > 0 && selectedCount === totalCount;
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
        const state = get();
        let count = 0;
        for (const paths of Object.values(state.selectedPathsBySource)) {
          count += paths.length;
        }
        return count;
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

      /**
       * @description 判断适配器是否因互斥而被禁用
       * @return default {boolean}
       * @param adapterId {string} 适配器ID
       * @param selectedAdapters {Set<string> | undefined} 选中的适配器集合（可选，默认使用当前状态）
       */
      getAdapterSelectDisabled: (adapterId, selectedAdapters) => {
        const state = get();
        const selected = selectedAdapters ?? state.selectedAdapters;

        // 没有选中任何适配器，所有适配器都可选
        if (selected.size === 0) {
          return false;
        }

        const adapter = state.adapters.find((a) => a.id === adapterId);
        if (!adapter) {
          return false;
        }

        // 如果该适配器已被选中，不应被禁用
        if (selected.has(adapterId)) {
          return false;
        }

        // 检查是否有相反类型的适配器被选中
        const hasRuleTypeSelected = Array.from(selected).some((id) => {
          const a = state.adapters.find((adapter) => adapter.id === id);
          return a?.isRuleType === true;
        });

        const hasSkillsTypeSelected = Array.from(selected).some((id) => {
          const a = state.adapters.find((adapter) => adapter.id === id);
          return a?.isRuleType === false;
        });

        // 如果选中了规则类型，禁用 skills 类型
        if (hasRuleTypeSelected && adapter.isRuleType === false) {
          return true;
        }

        // 如果选中了 skills 类型，禁用规则类型
        if (hasSkillsTypeSelected && adapter.isRuleType === true) {
          return true;
        }

        return false;
      },
    }),
    {
      name: 'RuleSyncPageStore',
      enabled: process.env.NODE_ENV === 'development',
    },
  ),
);
