/**
 * 规则选择器 Webview Provider 选择同步测试
 * 测试左侧树视图和右侧 Webview 的双向选择同步
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { SelectionStateManager } from '../../../services/SelectionStateManager';

describe('RuleSelectorWebviewProvider - Selection Sync', () => {
  let selectionStateManager: SelectionStateManager;

  beforeEach(() => {
    selectionStateManager = SelectionStateManager.getInstance();
  });

  it('should notify selection changes with correct event data', () => {
    const mockListener = vi.fn();

    // 监听选择变更事件
    const disposable = selectionStateManager.onSelectionChanged(mockListener);

    // 触发选择变更
    selectionStateManager.notifySelectionChanged('test-source', 10, 20);

    // 验证监听器被调用
    expect(mockListener).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'test-source',
        selectedCount: 10,
        totalCount: 20,
        timestamp: expect.any(Number),
      }),
    );

    disposable.dispose();
  });

  it('should update webview when selection changes from tree view', async () => {
    const mockMessenger = {
      notify: vi.fn(),
    };

    // 模拟 Webview 打开并监听选择变更
    const disposable = selectionStateManager.onSelectionChanged(async (event) => {
      if (event.sourceId === 'my-source') {
        mockMessenger.notify('initialData', {
          sourceId: event.sourceId,
          selectedCount: event.selectedCount,
          totalCount: event.totalCount,
        });
      }
    });

    // 模拟左侧树视图保存选择（触发事件）
    selectionStateManager.notifySelectionChanged('my-source', 5, 10);

    // 等待异步处理
    await new Promise((resolve) => setTimeout(resolve, 10));

    // 验证 Webview 收到通知
    expect(mockMessenger.notify).toHaveBeenCalledWith(
      'initialData',
      expect.objectContaining({
        sourceId: 'my-source',
        selectedCount: 5,
        totalCount: 10,
      }),
    );

    disposable.dispose();
  });

  it('should not update webview for different source', async () => {
    const mockMessenger = {
      notify: vi.fn(),
    };

    const currentSourceId = 'source-a';

    // 模拟 Webview 只监听特定源
    const disposable = selectionStateManager.onSelectionChanged(async (event) => {
      if (currentSourceId && event.sourceId !== currentSourceId) return;
      mockMessenger.notify('initialData', { sourceId: event.sourceId });
    });

    // 触发不同源的选择变更
    selectionStateManager.notifySelectionChanged('source-b', 3, 5);

    // 等待异步处理
    await new Promise((resolve) => setTimeout(resolve, 10));

    // 验证 Webview 不会收到通知
    expect(mockMessenger.notify).not.toHaveBeenCalled();

    disposable.dispose();
  });

  it('should handle multiple listeners correctly', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    const disposable1 = selectionStateManager.onSelectionChanged(listener1);
    const disposable2 = selectionStateManager.onSelectionChanged(listener2);

    // 触发选择变更
    selectionStateManager.notifySelectionChanged('test', 1, 2);

    // 验证两个监听器都被调用
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);

    disposable1.dispose();
    disposable2.dispose();
  });
});
