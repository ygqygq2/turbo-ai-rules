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
}

interface InitialData {
  ruleTree: {
    type: 'source';
    id: string;
    name: string;
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
       * @description 设置初始数据（✅ 复用规则选择器的数据处理逻辑）
       */
      setInitialData: (data) => {
        const sources: SourceInfo[] = [];
        const treeNodesBySource: { [sourceId: string]: TreeNode[] } = {};
        const selectedPathsBySource: { [sourceId: string]: string[] } = {};
        const expandedNodes = new Set<string>();

        // 处理规则树数据（每个源独立处理，与规则选择器逻辑一致）
        for (const source of data.ruleTree || []) {
          sources.push({
            id: source.id,
            name: source.name,
            totalRules: source.stats?.total || 0,
          });

          // ✅ 调试：打印后端原始数据的第一个文件节点
          const sampleFile = source.children?.find((n: FileTreeNode) => n.type === 'file');
          console.log(`[setInitialData] Source ${source.id} - 后端原始数据样本:`, {
            totalChildren: source.children?.length || 0,
            sampleFile: sampleFile
              ? {
                  path: sampleFile.path,
                  checked: sampleFile.checked,
                  hasCheckedField: 'checked' in sampleFile,
                }
              : 'no file found',
          });

          // 构建树结构
          const tree = buildTree(source.children || []);
          treeNodesBySource[source.id] = tree;

          // ✅ 调试：打印 buildTree 后的第一个文件节点
          const sampleTreeFile = tree.find((n: TreeNode) => n.type === 'file');
          console.log(`[setInitialData] Source ${source.id} - buildTree后的数据样本:`, {
            totalTreeNodes: tree.length,
            sampleTreeFile: sampleTreeFile
              ? {
                  path: sampleTreeFile.path,
                  checked: sampleTreeFile.checked,
                  hasCheckedField: 'checked' in sampleTreeFile,
                }
              : 'no file found',
          });

          // 默认展开源节点
          expandedNodes.add(source.id);

          // ✅ 提取已选择的文件路径（从 buildTree 处理后的树中提取）
          const selectedPaths: string[] = [];
          const extractSelectedPaths = (nodes: TreeNode[], depth = 0): void => {
            for (const node of nodes) {
              if (node.type === 'file') {
                if (node.checked && node.path) {
                  selectedPaths.push(node.path); // ✅ 纯路径，不带 sourceId 前缀
                  console.log(`  ${'  '.repeat(depth)}✓ ${node.path} (checked)`);
                } else if (node.path) {
                  console.log(`  ${'  '.repeat(depth)}○ ${node.path} (not checked)`);
                }
              } else if (node.children) {
                console.log(`  ${'  '.repeat(depth)}📁 ${node.name || node.path}`);
                extractSelectedPaths(node.children, depth + 1);
              }
            }
          };
          console.log(`[setInitialData] Extracting from tree (${tree.length} root nodes):`);
          extractSelectedPaths(tree); // ✅ 从处理后的 tree 提取，不是 source.children
          selectedPathsBySource[source.id] = selectedPaths;

          console.log(
            `[setInitialData] Source ${source.id}: ${selectedPaths.length} selected paths`,
            selectedPaths.slice(0, 5),
          );
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
          selectedPathsBySource, // ✅ 按源分组的选择状态
          expandedNodes,
          adapters: data.adapters || [],
          selectedAdapters,
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
    }),
    {
      name: 'RuleSyncPageStore',
      enabled: process.env.NODE_ENV === 'development',
    },
  ),
);
