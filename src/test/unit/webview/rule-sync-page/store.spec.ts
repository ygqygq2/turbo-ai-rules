import { beforeEach, describe, expect, it } from 'vitest';

import { useRuleSyncPageStore } from '@/webview/rule-sync-page/store';

describe('rule-sync-page store', () => {
  beforeEach(() => {
    useRuleSyncPageStore.setState({
      sources: [],
      treeNodesBySource: {},
      selectedPathsBySource: {},
      expandedNodes: new Set(),
      suites: [],
      adapters: [],
      selectedAdapters: new Set(),
      searchTerm: '',
      kindFilter: null,
      syncing: false,
    });
  });

  it('选择综合体时应默认选中其子适配器', () => {
    const store = useRuleSyncPageStore.getState();

    store.setInitialData({
      sources: [],
      suites: [
        {
          id: 'cursor-core',
          name: 'Cursor Core',
          description: 'Cursor 规则与 Skills 组合',
          adapterIds: ['cursor', 'cursor-skills'],
        },
      ],
      adapters: [
        {
          id: 'cursor',
          name: 'Cursor',
          type: 'preset',
          enabled: true,
          outputPath: '.cursorrules',
          checked: false,
          selectDisabled: false,
          isRuleType: true,
        },
        {
          id: 'cursor-skills',
          name: 'Cursor Skills',
          type: 'preset',
          enabled: true,
          outputPath: '.cursor/skills/',
          checked: false,
          selectDisabled: false,
          isRuleType: false,
        },
        {
          id: 'continue',
          name: 'Continue',
          type: 'preset',
          enabled: true,
          outputPath: '.continuerules',
          checked: false,
          selectDisabled: false,
          isRuleType: true,
        },
      ],
    });

    useRuleSyncPageStore.getState().toggleSuite('cursor-core');

    const nextState = useRuleSyncPageStore.getState();
    expect(nextState.selectedAdapters.has('cursor')).toBe(true);
    expect(nextState.selectedAdapters.has('cursor-skills')).toBe(true);
    expect(nextState.selectedAdapters.has('continue')).toBe(false);
    expect(nextState.isSuiteSelected('cursor-core')).toBe(true);
    expect(nextState.getStandaloneAdapters().map((adapter) => adapter.id)).toEqual(['continue']);
  });

  it('只选择部分子适配器时综合体应为半选状态', () => {
    const store = useRuleSyncPageStore.getState();

    store.setInitialData({
      sources: [],
      suites: [
        {
          id: 'copilot-core',
          name: 'Copilot Core',
          description: 'GitHub Copilot 指令与 Skills 组合',
          adapterIds: ['copilot', 'copilot-skills'],
        },
      ],
      adapters: [
        {
          id: 'copilot',
          name: 'GitHub Copilot',
          type: 'preset',
          enabled: true,
          outputPath: '.github/copilot-instructions.md',
          checked: false,
          selectDisabled: false,
          isRuleType: true,
        },
        {
          id: 'copilot-skills',
          name: 'GitHub Copilot Skills',
          type: 'preset',
          enabled: true,
          outputPath: '.github/skills/',
          checked: false,
          selectDisabled: false,
          isRuleType: false,
        },
      ],
    });

    useRuleSyncPageStore.getState().toggleAdapter('copilot');

    const nextState = useRuleSyncPageStore.getState();
    expect(nextState.isSuiteSelected('copilot-core')).toBe(false);
    expect(nextState.isSuiteIndeterminate('copilot-core')).toBe(true);
  });

  it('初始化时应自动展开已选文件的祖先目录', () => {
    const store = useRuleSyncPageStore.getState();

    store.setInitialData({
      sources: [
        {
          id: 'source1',
          name: 'Source 1',
          fileTree: [
            {
              path: '.project-rules',
              name: '.project-rules',
              type: 'directory',
              children: [
                {
                  path: '.project-rules/rules',
                  name: 'rules',
                  type: 'directory',
                  children: [
                    {
                      path: '.project-rules/rules/react.md',
                      name: 'react.md',
                      type: 'file',
                      kind: 'rule',
                    },
                  ],
                },
              ],
            },
          ],
          selectedPaths: ['.project-rules/rules/react.md'],
          stats: { total: 1, selected: 1 },
        },
      ],
      suites: [],
      adapters: [],
    });

    const state = useRuleSyncPageStore.getState();
    const rootDir = state.treeNodesBySource.source1[0];
    const nestedDir = rootDir.children?.[0];

    expect(rootDir.expanded).toBe(true);
    expect(nestedDir?.expanded).toBe(true);
  });

  it('从扩展同步选择时应展开对应祖先目录', () => {
    const store = useRuleSyncPageStore.getState();

    store.setInitialData({
      sources: [
        {
          id: 'source1',
          name: 'Source 1',
          fileTree: [
            {
              path: '.project-rules',
              name: '.project-rules',
              type: 'directory',
              children: [
                {
                  path: '.project-rules/rules',
                  name: 'rules',
                  type: 'directory',
                  children: [
                    {
                      path: '.project-rules/rules/react.md',
                      name: 'react.md',
                      type: 'file',
                      kind: 'rule',
                    },
                  ],
                },
              ],
            },
          ],
          selectedPaths: [],
          stats: { total: 1, selected: 0 },
        },
      ],
      suites: [],
      adapters: [],
    });

    store.updateSelectionFromExtension('source1', ['.project-rules/rules/react.md']);

    const state = useRuleSyncPageStore.getState();
    const rootDir = state.treeNodesBySource.source1[0];
    const nestedDir = rootDir.children?.[0];

    expect(rootDir.expanded).toBe(true);
    expect(nestedDir?.expanded).toBe(true);
    expect(state.selectedPathsBySource.source1).toEqual(['.project-rules/rules/react.md']);
  });
  
  it('kind 过滤后源统计应只计算当前可见类型的已选项', () => {
    const store = useRuleSyncPageStore.getState();

    store.setInitialData({
      sources: [
        {
          id: 'source1',
          name: 'Source 1',
          fileTree: [
            {
              path: 'rules',
              name: 'rules',
              type: 'directory',
              children: [
                {
                  path: 'rules/101-python.mdc',
                  name: '101-python.mdc',
                  type: 'file',
                  kind: 'rule',
                },
                {
                  path: 'rules/102-typescript.mdc',
                  name: '102-typescript.mdc',
                  type: 'file',
                  kind: 'rule',
                },
              ],
            },
            {
              path: 'skills',
              name: 'skills',
              type: 'directory',
              children: [
                {
                  path: 'skills/0001-python-development.mdc',
                  name: '0001-python-development.mdc',
                  type: 'file',
                  kind: 'skill',
                },
              ],
            },
          ],
          selectedPaths: [
            'rules/101-python.mdc',
            'rules/102-typescript.mdc',
            'skills/0001-python-development.mdc',
          ],
          stats: { total: 3, selected: 3 },
        },
      ],
      suites: [],
      adapters: [],
    });

    store.setKindFilter('rule');

    const filteredTree = store.getFilteredTreeNodes('source1');
    const visiblePaths = filteredTree.flatMap((node) =>
      node.children?.map((child) => child.path) || (node.type === 'file' ? [node.path] : []),
    );
    const selectedPaths = useRuleSyncPageStore.getState().selectedPathsBySource.source1;
    const visibleSelectedCount = visiblePaths.filter((path) => selectedPaths.includes(path)).length;

    expect(visibleSelectedCount).toBe(2);
  });
});
