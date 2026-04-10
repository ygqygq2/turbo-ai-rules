import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { createWebviewRPC } from '../common/messaging';
import {
  buildTree,
  getAllFilePaths,
  getDirectoryFilePaths,
  toggleNode as toggleTreeNode,
  collectKinds,
  filterTreeByKind,
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
  totalAssets?: number;
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

interface SuiteInfo {
  id: string;
  name: string;
  description: string;
  adapterIds: string[];
}

interface InitialData {
  sources: Array<{
    id: string;
    name: string;
    fileTree: FileTreeNode[]; // ✅ 纯树结构
    selectedPaths: string[]; // ✅ 选中路径数组
    stats: { total: number; selected: number };
  }>;
  suites: SuiteInfo[];
  adapters: AdapterInfo[];
}

// Store 接口
interface RuleSyncPageState {
  // 资产树状态
  sources: SourceInfo[];
  treeNodesBySource: { [sourceId: string]: TreeNode[] };
  // ✅ 复用规则选择器的数据结构：按源分组，每个源使用 string[] 存储路径
  selectedPathsBySource: { [sourceId: string]: string[] };
  expandedNodes: Set<string>;

  // 适配器状态
  suites: SuiteInfo[];
  adapters: AdapterInfo[];
  selectedAdapters: Set<string>;

  // UI 状态
  searchTerm: string;
  kindFilter: string | null;
  syncing: boolean;

  // Actions
  setInitialData: (data: InitialData) => void;
  toggleTreeNode: (sourceId: string, path: string) => void;
  selectNode: (sourceId: string, path: string, checked: boolean, isDirectory: boolean) => void;
  updateSelectionFromExtension: (sourceId: string, selectedPaths: string[]) => void; // ✅ 新增：从扩展更新选择
  toggleAllRules: () => void;
  toggleAllAdapters: () => void;
  toggleSuite: (suiteId: string) => void;
  toggleAdapter: (adapterId: string) => void;
  setSearchTerm: (term: string) => void;
  setKindFilter: (kind: string | null) => void;
  sync: () => Promise<void>;
  cancel: () => void;

  // 计算属性
  isAllRulesSelected: () => boolean;
  isAllAdaptersSelected: () => boolean;
  isSuiteSelected: (suiteId: string) => boolean;
  isSuiteIndeterminate: (suiteId: string) => boolean;
  getSelectedAssetCount: () => number;
  getSelectedAdaptersCount: () => number;
  getTotalAssetCount: () => number;
  getStandaloneAdapters: () => AdapterInfo[];
  getSuiteAdapters: (suiteId: string) => AdapterInfo[];
  getAvailableKinds: () => string[];
  getFilteredTreeNodes: (sourceId: string) => TreeNode[];
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
      suites: [],
      adapters: [],
      selectedAdapters: new Set(),
      searchTerm: '',
      kindFilter: null,
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
            totalAssets: source.stats?.total || 0,
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
          suites: data.suites || [],
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

        set({
          selectedAdapters: newSelected,
        });
      },

      toggleSuite: (suiteId) => {
        const state = get();
        const suite = state.suites.find((item) => item.id === suiteId);
        if (!suite) {
          return;
        }

        const selectableAdapterIds = suite.adapterIds.filter((adapterId) => {
          const adapter = state.adapters.find((item) => item.id === adapterId);
          return adapter?.enabled;
        });

        const areAllSelected =
          selectableAdapterIds.length > 0 &&
          selectableAdapterIds.every((adapterId) => state.selectedAdapters.has(adapterId));

        const nextSelected = new Set(state.selectedAdapters);
        if (areAllSelected) {
          selectableAdapterIds.forEach((adapterId) => nextSelected.delete(adapterId));
        } else {
          selectableAdapterIds.forEach((adapterId) => nextSelected.add(adapterId));
        }

        set({ selectedAdapters: nextSelected });
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

        set({
          selectedAdapters: newSelected,
        });
      },

      /**
       * @description 设置搜索词
       */
      setSearchTerm: (term) => {
        set({ searchTerm: term });
      },

      /**
       * @description 设置资产类型过滤
       */
      setKindFilter: (kind) => {
        set({ kindFilter: kind });
      },

      /**
       * @description 执行同步
       */
      sync: async () => {
        const state = get();
        set({ syncing: true });

        try {
          // 转换为扁平的资产路径数组
          const allAssets: string[] = [];
          for (const [sourceId, paths] of Object.entries(state.selectedPathsBySource)) {
            paths.forEach((path) => allAssets.push(`${sourceId}:${path}`));
          }

          await getRpc().request('sync', {
            assets: allAssets,
            rules: allAssets,
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
        const totalCount = state.getTotalAssetCount();
        const selectedCount = state.getSelectedAssetCount();
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

      isSuiteSelected: (suiteId) => {
        const state = get();
        const suite = state.suites.find((item) => item.id === suiteId);
        if (!suite) {
          return false;
        }

        const enabledAdapterIds = suite.adapterIds.filter((adapterId) => {
          const adapter = state.adapters.find((item) => item.id === adapterId);
          return adapter?.enabled;
        });

        return (
          enabledAdapterIds.length > 0 &&
          enabledAdapterIds.every((adapterId) => state.selectedAdapters.has(adapterId))
        );
      },

      isSuiteIndeterminate: (suiteId) => {
        const state = get();
        const suite = state.suites.find((item) => item.id === suiteId);
        if (!suite) {
          return false;
        }

        const enabledAdapterIds = suite.adapterIds.filter((adapterId) => {
          const adapter = state.adapters.find((item) => item.id === adapterId);
          return adapter?.enabled;
        });
        const selectedCount = enabledAdapterIds.filter((adapterId) =>
          state.selectedAdapters.has(adapterId),
        ).length;

        return selectedCount > 0 && selectedCount < enabledAdapterIds.length;
      },

      getSelectedAssetCount: () => {
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

      getTotalAssetCount: () => {
        const state = get();
        let total = 0;
        for (const tree of Object.values(state.treeNodesBySource)) {
          total += getAllFilePaths(tree).length;
        }
        return total;
      },

      getStandaloneAdapters: () => {
        const state = get();
        const suiteAdapterIds = new Set(state.suites.flatMap((suite) => suite.adapterIds));
        return state.adapters.filter((adapter) => !suiteAdapterIds.has(adapter.id));
      },

      getSuiteAdapters: (suiteId) => {
        const state = get();
        const suite = state.suites.find((item) => item.id === suiteId);
        if (!suite) {
          return [];
        }
        return suite.adapterIds
          .map((adapterId) => state.adapters.find((adapter) => adapter.id === adapterId))
          .filter((adapter): adapter is AdapterInfo => Boolean(adapter));
      },

      /**
       * @description 获取所有源中可用的资产类型列表（去重排序）
       */
      getAvailableKinds: () => {
        const state = get();
        const kinds = new Set<string>();
        for (const tree of Object.values(state.treeNodesBySource)) {
          collectKinds(tree).forEach((k) => kinds.add(k));
        }
        return Array.from(kinds).sort();
      },

      /**
       * @description 获取按 kindFilter 过滤后的树节点
       */
      getFilteredTreeNodes: (sourceId: string) => {
        const state = get();
        const tree = state.treeNodesBySource[sourceId] || [];
        return filterTreeByKind(tree, state.kindFilter);
      },
    }),
    {
      name: 'RuleSyncPageStore',
      enabled: process.env.NODE_ENV === 'development',
    },
  ),
);
