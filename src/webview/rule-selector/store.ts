import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  buildTree,
  toggleNode as toggleTreeNode,
  getAllFilePaths,
  getDirectoryFilePaths,
  type TreeNode,
} from './tree-utils';
import { createWebviewRPC } from '../common/messaging';

// 获取 RPC 实例（延迟到使用时获取，避免模块加载时就调用 acquireVsCodeApi）
const getRpc = () => createWebviewRPC();

// 类型定义
interface RuleSelection {
  mode: 'include' | 'exclude';
  paths?: string[];
  excludePaths?: string[];
}

interface FileTreeNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
}

interface SourceInfo {
  id: string;
  name: string;
  totalRules?: number; // 后端传递的真实规则数（已解析的规则数量）
}

interface InitialData {
  workspacePath: string;
  selections: { [sourceId: string]: RuleSelection };
  fileTreeBySource: { [sourceId: string]: FileTreeNode[] };
  sourceList?: SourceInfo[]; // 源信息列表（包含 id、name 和真实规则数）
  currentSourceId?: string; // 当前选择的源 ID
}

// Store 接口
interface RuleSelectorState {
  // 基础状态
  workspacePath: string;
  currentSourceId: string;
  availableSources: SourceInfo[]; // 修改为源信息数组
  selectedPaths: string[];
  originalPaths: string[];
  totalRules: number;
  searchTerm: string;
  saving: boolean;
  allFileTreeBySource: { [sourceId: string]: FileTreeNode[] };
  allSelections: { [sourceId: string]: RuleSelection };
  treeNodes: TreeNode[];

  // Actions
  setInitialData: (data: InitialData) => void;
  switchSource: (newSourceId: string) => void;
  toggleNode: (path: string) => void;
  selectNode: (path: string, checked: boolean, isDirectory: boolean) => void;
  selectAll: () => void;
  clearAll: () => void;
  reset: () => void;
  setSearchTerm: (term: string) => void;
  setSaving: (saving: boolean) => void;
  updateAfterSave: () => void;
}

/**
 * 规则选择器状态管理 Store
 * 使用 Zustand 管理所有状态和业务逻辑
 */
export const useRuleSelectorStore = create<RuleSelectorState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      workspacePath: '',
      currentSourceId: '',
      availableSources: [],
      selectedPaths: [],
      originalPaths: [],
      totalRules: 0,
      searchTerm: '',
      saving: false,
      allFileTreeBySource: {},
      allSelections: {},
      treeNodes: [],

      /**
       * @description 设置初始数据（从扩展端接收）
       * @param data {InitialData}
       */
      setInitialData: (data) => {
        // 使用 sourceList 或从 fileTreeBySource 生成
        const sourceList: SourceInfo[] =
          data.sourceList ||
          Object.keys(data.fileTreeBySource || {}).map((id) => ({ id, name: id }));
        const firstSourceId = data.currentSourceId || sourceList[0]?.id || '';
        const sourceFileTree = data.fileTreeBySource[firstSourceId] || [];
        const tree = buildTree(sourceFileTree);
        const selection = data.selections[firstSourceId];
        // 默认策略统一为“无配置 = 全选”
        const allPaths = getAllFilePaths(tree);
        const paths = selection?.paths && selection.paths.length > 0 ? selection.paths : allPaths;

        // 优先使用后端传递的真实规则数，否则使用文件树计算的文件数
        const firstSource = sourceList.find((s) => s.id === firstSourceId);
        const totalFiles = firstSource?.totalRules ?? getAllFilePaths(tree).length;

        set({
          workspacePath: data.workspacePath,
          allFileTreeBySource: data.fileTreeBySource,
          allSelections: data.selections,
          availableSources: sourceList,
          currentSourceId: firstSourceId,
          treeNodes: tree,
          selectedPaths: [...paths],
          originalPaths: [...paths],
          totalRules: totalFiles,
        });
      },

      /**
       * @description 切换规则源
       * @param newSourceId {string}
       */
      switchSource: (newSourceId) => {
        const state = get();
        if (newSourceId === state.currentSourceId) return;

        // 保存当前源的选择到临时状态
        const updatedSelections = {
          ...state.allSelections,
          [state.currentSourceId]: {
            mode: 'include' as const,
            paths: state.selectedPaths,
          },
        };

        // 切换到新源
        const sourceFileTree = state.allFileTreeBySource[newSourceId] || [];
        const tree = buildTree(sourceFileTree);
        const selection = updatedSelections[newSourceId];
        const allPaths = getAllFilePaths(tree);
        const paths = selection?.paths && selection.paths.length > 0 ? selection.paths : allPaths;

        // 优先使用后端传递的真实规则数，否则使用文件树计算的文件数
        const newSource = state.availableSources.find((s) => s.id === newSourceId);
        const totalFiles = newSource?.totalRules ?? getAllFilePaths(tree).length;

        set({
          allSelections: updatedSelections,
          currentSourceId: newSourceId,
          treeNodes: tree,
          selectedPaths: [...paths],
          originalPaths: [...paths],
          totalRules: totalFiles,
          searchTerm: '',
        });

        // 通知 Extension 端切换源（用于初始化 MessageChannel）
        getRpc().notify('sourceChanged', {
          sourceId: newSourceId,
          selectedPaths: [...paths],
          totalCount: totalFiles,
        });
      },

      /**
       * @description 展开/收起树节点
       * @param path {string}
       */
      toggleNode: (path) => {
        const state = get();
        const updatedNodes = toggleTreeNode(state.treeNodes, path);
        set({ treeNodes: updatedNodes });
      },

      /**
       * @description 选择/取消选择节点（仅内存更新，通过事件实时同步）
       * @param path {string}
       * @param checked {boolean}
       * @param isDirectory {boolean}
       */
      selectNode: (path, checked, isDirectory) => {
        const state = get();
        let newSelectedPaths: string[];

        if (isDirectory) {
          // 目录节点：选择/取消该目录下所有文件
          const dirPaths = getDirectoryFilePaths(state.treeNodes, path);
          if (checked) {
            newSelectedPaths = [...new Set([...state.selectedPaths, ...dirPaths])];
          } else {
            newSelectedPaths = state.selectedPaths.filter((p) => !dirPaths.includes(p));
          }
        } else {
          // 文件节点：直接添加/移除
          if (checked) {
            newSelectedPaths = [...new Set([...state.selectedPaths, path])];
          } else {
            newSelectedPaths = state.selectedPaths.filter((p) => p !== path);
          }
        }

        set({ selectedPaths: newSelectedPaths });

        // 通过 RPC notify 实时同步到扩展端
        getRpc().notify('selectionChanged', {
          type: 'selectionChanged',
          sourceId: state.currentSourceId,
          selectedPaths: newSelectedPaths,
          totalCount: state.totalRules,
          timestamp: Date.now(),
        });
      },

      /**
       * @description 全选所有规则（仅内存更新）
       */
      selectAll: () => {
        const state = get();
        const allPaths = getAllFilePaths(state.treeNodes);
        set({ selectedPaths: allPaths });

        // 通过 RPC notify 实时同步到扩展端
        getRpc().notify('selectionChanged', {
          type: 'selectionChanged',
          sourceId: state.currentSourceId,
          selectedPaths: allPaths,
          totalCount: state.totalRules,
          timestamp: Date.now(),
        });
      },

      /**
       * @description 清除所有选择（仅内存更新）
       */
      clearAll: () => {
        const state = get();
        set({ selectedPaths: [] });

        // 通过 RPC notify 实时同步到扩展端
        getRpc().notify('selectionChanged', {
          type: 'selectionChanged',
          sourceId: state.currentSourceId,
          selectedPaths: [],
          totalCount: state.totalRules,
          timestamp: Date.now(),
        });
      },

      /**
       * @description 重置到原始状态
       */
      reset: () => {
        const state = get();
        set({ selectedPaths: [...state.originalPaths] });
      },

      /**
       * @description 设置搜索词
       * @param term {string}
       */
      setSearchTerm: (term) => {
        set({ searchTerm: term });
      },

      /**
       * @description 设置保存状态
       * @param saving {boolean}
       */
      setSaving: (saving) => {
        set({ saving });
      },

      /**
       * @description 保存成功后更新原始路径
       */
      updateAfterSave: () => {
        const state = get();
        set({
          originalPaths: [...state.selectedPaths],
          saving: false,
        });
      },
    }),
    {
      name: 'RuleSelectorStore',
      enabled: process.env.NODE_ENV === 'development',
    },
  ),
);
