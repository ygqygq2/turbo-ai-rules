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
});
