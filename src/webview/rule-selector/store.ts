import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  buildTree,
  toggleNode as toggleTreeNode,
  getAllFilePaths,
  getDirectoryFilePaths,
  type TreeNode,
} from './tree-utils';

// 类型定义
interface RuleSelection {
  mode: 'include' | 'exclude';
  paths?: string[];
  excludePaths?: string[];
}

interface RuleItem {
  id: string;
  title: string;
  filePath: string;
  tags: string[];
  priority: number;
}

interface InitialData {
  workspacePath: string;
  selections: { [sourceId: string]: RuleSelection };
  rulesBySource: { [sourceId: string]: RuleItem[] };
}

// Store 接口
interface RuleSelectorState {
  // 基础状态
  workspacePath: string;
  currentSourceId: string;
  availableSources: string[];
  rules: RuleItem[];
  selectedPaths: string[];
  originalPaths: string[];
  totalRules: number;
  searchTerm: string;
  saving: boolean;
  allRulesBySource: { [sourceId: string]: RuleItem[] };
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
      rules: [],
      selectedPaths: [],
      originalPaths: [],
      totalRules: 0,
      searchTerm: '',
      saving: false,
      allRulesBySource: {},
      allSelections: {},
      treeNodes: [],

      /**
       * @description 设置初始数据（从扩展端接收）
       * @param data {InitialData}
       */
      setInitialData: (data) => {
        const sourceIds = Object.keys(data.rulesBySource || {});
        const firstSourceId = sourceIds[0] || '';
        const sourceRules = data.rulesBySource[firstSourceId] || [];
        const tree = buildTree(sourceRules);
        const selection = data.selections[firstSourceId];
        const paths = selection?.paths || [];

        set({
          workspacePath: data.workspacePath,
          allRulesBySource: data.rulesBySource,
          allSelections: data.selections,
          availableSources: sourceIds,
          currentSourceId: firstSourceId,
          rules: sourceRules,
          treeNodes: tree,
          selectedPaths: [...paths],
          originalPaths: [...paths],
          totalRules: sourceRules.length,
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
        const sourceRules = state.allRulesBySource[newSourceId] || [];
        const tree = buildTree(sourceRules);
        const selection = updatedSelections[newSourceId];
        const paths = selection?.paths || [];

        set({
          allSelections: updatedSelections,
          currentSourceId: newSourceId,
          rules: sourceRules,
          treeNodes: tree,
          selectedPaths: [...paths],
          originalPaths: [...paths],
          totalRules: sourceRules.length,
          searchTerm: '',
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
       * @description 选择/取消选择节点
       * @param path {string}
       * @param checked {boolean}
       * @param isDirectory {boolean}
       */
      selectNode: (path, checked, isDirectory) => {
        const state = get();

        if (isDirectory) {
          // 目录节点：选择/取消该目录下所有文件
          const dirPaths = getDirectoryFilePaths(state.treeNodes, path);
          if (checked) {
            set({
              selectedPaths: [...new Set([...state.selectedPaths, ...dirPaths])],
            });
          } else {
            set({
              selectedPaths: state.selectedPaths.filter((p) => !dirPaths.includes(p)),
            });
          }
        } else {
          // 文件节点：直接添加/移除
          if (checked) {
            set({
              selectedPaths: [...new Set([...state.selectedPaths, path])],
            });
          } else {
            set({
              selectedPaths: state.selectedPaths.filter((p) => p !== path),
            });
          }
        }
      },

      /**
       * @description 全选所有规则
       */
      selectAll: () => {
        const state = get();
        const allPaths = getAllFilePaths(state.treeNodes);
        set({ selectedPaths: allPaths });
      },

      /**
       * @description 清除所有选择
       */
      clearAll: () => {
        set({ selectedPaths: [] });
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
