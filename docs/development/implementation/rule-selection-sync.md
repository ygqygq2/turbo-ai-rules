# 规则选择同步机制实施文档

## 概述

本文档记录了左侧规则树视图（TreeView）和右侧规则选择器（Webview）之间的双向选择同步机制的实现。

## 背景

在 Turbo AI Rules 扩展中，用户可以通过两种方式选择规则：

1. **左侧规则树视图** (`RuleFileTreeDataProvider`) - 通过复选框选择文件
2. **右侧规则选择器 Webview** (`RuleSelectorWebviewProvider`) - 通过图形界面选择规则

用户希望这两种选择方式能够实时同步，即：

- 在左侧树视图勾选规则 → 右侧 Webview 自动更新显示
- 在右侧 Webview 选择规则 → 左侧树视图自动更新复选框状态

## 问题分析

### 原有实现的不足

**右侧 → 左侧**：✅ 已实现

- `RuleSelectorWebviewProvider` 保存时调用 `SelectionStateManager.notifySelectionChanged()`
- `RulesTreeProvider` 监听事件并刷新树视图

**左侧 → 右侧**：❌ 未实现

- `RuleFileTreeDataProvider` 保存时仅调用 `vscode.commands.executeCommand('turbo-ai-rules.refresh')`
- 没有触发 `SelectionStateManager` 事件
- `RuleSelectorWebviewProvider` 没有监听选择变更事件

## 解决方案

### 架构设计

使用事件驱动的发布-订阅模式实现双向同步：

```
┌─────────────────────────┐
│ SelectionStateManager   │
│  (事件总线)              │
│  - onSelectionChanged   │
└────────┬────────────────┘
         │
         │ 事件分发
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────────────┐
│ 左侧   │ │ 右侧           │
│ Tree   │ │ Webview        │
│ View   │ │ Provider       │
└────────┘ └────────────────┘
```

### 实现步骤

#### 1. 修改左侧树视图保存逻辑

**文件**：`src/providers/RuleFileTreeDataProvider.ts`

**修改点**：

1. 导入 `SelectionStateManager` 和 `RulesManager`：

```typescript
import { SelectionStateManager } from '../services/SelectionStateManager';
import { RulesManager } from '../services/RulesManager';
```

2. 在 `saveSelection()` 方法中触发事件：

```typescript
private async saveSelection(): Promise<void> {
  try {
    const selection: RuleSelection = {
      mode: 'include',
      paths: Array.from(this.selectedPaths),
    };

    await this.dataManager.setRuleSelection(this.workspacePath, this.sourceId, selection);

    // 触发选择变更事件（用于左右同步）
    const rulesManager = RulesManager.getInstance();
    const totalCount = rulesManager.getRulesBySource(this.sourceId).length;
    SelectionStateManager.getInstance().notifySelectionChanged(
      this.sourceId,
      this.selectedPaths.size,
      totalCount,
    );

    // 刷新侧边栏规则树
    vscode.commands.executeCommand('turbo-ai-rules.refresh');
  } catch (error) {
    Logger.error('Failed to save rule selection', error as Error);
    vscode.window.showErrorMessage(`保存规则选择失败: ${error}`);
  }
}
```

**关键改动**：

- 获取总规则数（`totalCount`）用于事件通知
- 调用 `SelectionStateManager.notifySelectionChanged()` 触发事件
- 传递三个参数：`sourceId`（源 ID）、`selectedCount`（已选数量）、`totalCount`（总数量）

#### 2. 修改右侧 Webview 监听逻辑

**文件**：`src/providers/RuleSelectorWebviewProvider.ts`

**修改点**：

1. 添加 `selectionListener` 属性：

```typescript
export class RuleSelectorWebviewProvider extends BaseWebviewProvider {
  private static instance: RuleSelectorWebviewProvider | undefined;
  private currentSourceId?: string;
  private messenger?: ExtensionMessenger;
  private selectionListener?: vscode.Disposable; // 新增

  private constructor(context: vscode.ExtensionContext) {
    super(context);
    this.setupSelectionListener(); // 新增
  }
```

2. 添加 `setupSelectionListener()` 方法：

```typescript
/**
 * @description 设置选择变更监听器
 * @return {void}
 */
private setupSelectionListener(): void {
  const selectionStateManager = SelectionStateManager.getInstance();
  this.selectionListener = selectionStateManager.onSelectionChanged(async (event) => {
    // 只有当 Webview 打开且事件涉及当前源时才推送更新
    if (!this.panel || !this.messenger) return;
    if (this.currentSourceId && event.sourceId !== this.currentSourceId) return;

    Logger.debug('Selection changed, updating webview', {
      sourceId: event.sourceId,
      selectedCount: event.selectedCount,
      totalCount: event.totalCount,
    });

    // 重新加载并推送数据到 Webview
    await this.loadAndSendInitialData();
  });
}
```

**关键逻辑**：

- 监听 `SelectionStateManager.onSelectionChanged` 事件
- **过滤条件**：
  - Webview 必须处于打开状态（`this.panel` 存在）
  - Messenger 必须已初始化（`this.messenger` 存在）
  - 事件源必须匹配当前显示的源（`event.sourceId === this.currentSourceId`）
- **响应动作**：调用 `loadAndSendInitialData()` 重新加载并推送最新数据到 Webview

3. 添加资源释放逻辑：

```typescript
/**
 * @description 释放资源
 * @return {void}
 */
public dispose(): void {
  if (this.selectionListener) {
    this.selectionListener.dispose();
    this.selectionListener = undefined;
  }
  super.dispose();
}
```

**作用**：在 Webview 关闭时清理监听器，防止内存泄漏。

### 数据流

#### 左侧保存 → 右侧更新

```
用户操作左侧复选框
  ↓
RuleFileTreeDataProvider.handleCheckboxChange()
  ↓
RuleFileTreeDataProvider.saveSelection()
  ↓
WorkspaceDataManager.setRuleSelection() (保存到磁盘)
  ↓
SelectionStateManager.notifySelectionChanged() (触发事件)
  ↓
RuleSelectorWebviewProvider.setupSelectionListener() (监听事件)
  ↓
loadAndSendInitialData() (重新加载数据)
  ↓
messenger.notify('initialData', ...) (推送到 Webview)
  ↓
Webview App.tsx: rpc.on('initialData') (前端监听)
  ↓
setInitialData(payload) (更新前端状态)
  ↓
UI 自动重新渲染
```

#### 右侧保存 → 左侧更新

```
用户操作右侧 Webview
  ↓
App.tsx: handleSave()
  ↓
rpc.request('saveRuleSelection', { sourceId, paths, totalCount })
  ↓
RuleSelectorWebviewProvider.saveRuleSelection (RPC handler)
  ↓
WorkspaceDataManager.setRuleSelection() (保存到磁盘)
  ↓
SelectionStateManager.notifySelectionChanged() (触发事件)
  ↓
RulesTreeProvider (监听事件，已存在)
  ↓
refresh() (刷新树视图)
  ↓
getChildren() 重新计算选择状态
  ↓
VSCode TreeView 自动更新 UI
```

## 关键技术点

### 1. 事件过滤

右侧 Webview 监听器使用三层过滤：

```typescript
if (!this.panel || !this.messenger) return; // 层1: Webview 未打开
if (this.currentSourceId && event.sourceId !== this.currentSourceId) return; // 层2: 源不匹配
```

**原因**：

- 避免不必要的数据加载和推送
- 防止多个 Webview 实例相互干扰
- 提升性能

### 2. 防抖优化

`RulesTreeProvider` 中已实现防抖（150ms）：

```typescript
this.selectionStateManager.onSelectionChanged((event) => {
  if (this.refreshTimeout) {
    clearTimeout(this.refreshTimeout);
  }
  this.refreshTimeout = setTimeout(() => {
    this.refresh();
    Logger.debug('Tree view refreshed after selection change', {
      sourceId: event.sourceId,
      selectedCount: event.selectedCount,
      totalCount: event.totalCount,
      delay: Date.now() - event.timestamp,
    });
  }, 150);
});
```

**作用**：避免频繁刷新导致的性能问题。

### 3. 异步处理

所有监听器使用 `async` 函数，确保数据加载完成后再推送：

```typescript
this.selectionListener = selectionStateManager.onSelectionChanged(async (event) => {
  // ...
  await this.loadAndSendInitialData(); // 等待数据加载完成
});
```

## 测试覆盖

### 单元测试

**文件**：`src/test/unit/providers/RuleSelectorWebviewProvider.selection-sync.test.ts`

**测试场景**：

1. ✅ 事件触发验证：验证 `notifySelectionChanged()` 正确触发事件
2. ✅ Webview 更新验证：验证右侧收到左侧的选择变更通知
3. ✅ 源过滤验证：验证不同源的事件不会触发更新
4. ✅ 多监听器验证：验证多个监听器能正确接收事件

### 集成测试建议

1. **手动测试**：

   - 打开扩展
   - 添加规则源并同步规则
   - 打开右侧选择器 Webview
   - 在左侧树视图勾选/取消规则，观察右侧是否同步
   - 在右侧保存选择，观察左侧是否同步

2. **自动化测试**（待实施）：
   - 使用 VSCode Extension Test Runner
   - 模拟用户操作左侧复选框
   - 验证右侧 Webview 内容更新
   - 模拟右侧保存操作
   - 验证左侧树视图复选框状态

## 已知限制

1. **性能考虑**：

   - 大量规则源时，频繁触发事件可能影响性能
   - 已通过防抖和事件过滤优化

2. **多工作区支持**：

   - 当前实现基于单工作区假设
   - 多工作区场景未充分测试

3. **并发保存**：
   - 左右同时保存可能导致数据竞争
   - 通过文件系统锁和事件序列化减少风险

## 未来改进

1. **增量更新**：

   - 目前右侧接收事件后重新加载全部数据
   - 可优化为仅推送差异数据

2. **状态缓存**：

   - 在内存中缓存选择状态
   - 减少磁盘 I/O

3. **乐观更新**：
   - 用户操作后立即更新 UI
   - 保存成功后确认或失败后回滚

## 参考

- VSCode Extension API: [TreeDataProvider](https://code.visualstudio.com/api/references/vscode-api#TreeDataProvider)
- VSCode Extension API: [EventEmitter](https://code.visualstudio.com/api/references/vscode-api#EventEmitter)
- 设计文档：`docs/development/providers/RuleSelectorWebviewProvider.md`
- 选择状态管理：`docs/development/services/SelectionStateManager.md`

---

**实施日期**：2025-11-14  
**版本**：v1.0.0  
**作者**：GitHub Copilot + ygqygq2
