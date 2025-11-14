# 规则选择状态同步实施记录

> **实施日期**: 2025-11-13  
> **对应源码**:
>
> - `src/services/SelectionStateManager.ts`
> - `src/providers/RulesTreeProvider.ts`
> - `src/providers/RuleSelectorWebviewProvider.ts`
> - `src/webview/rule-selector/App.tsx`

## 实施目标

实现左侧树视图和右侧规则选择器的选择状态实时同步，让用户在选择器中保存选择后，树视图能立即反映最新的选择情况。

## 问题分析

### 原有实现的问题

1. **延迟刷新**: 选择器保存后通过命令刷新树视图，但存在时序问题
2. **状态不一致**: 树视图可能显示过期的选择状态
3. **用户体验差**: 需要手动刷新才能看到最新状态

## 解决方案

### 架构设计

采用**事件驱动架构**，通过事件发射器实现组件间解耦的状态同步：

```
┌─────────────────────────────────────────────────────────────┐
│                     SelectionStateManager                     │
│                    (事件发射器 - 单例)                         │
│                                                               │
│  EventEmitter<SelectionStateChangeEvent>                     │
│  - notifySelectionChanged(sourceId, selectedCount, total)    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ fire event
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌──────────────────┐           ┌──────────────────────┐
│ RulesTreeProvider│           │RuleSelectorWebview   │
│                  │           │Provider              │
│ - 监听事件        │           │                      │
│ - 300ms 防抖     │           │ - 保存时触发事件      │
│ - 刷新显示       │           │ - 发送 totalCount    │
└──────────────────┘           └──────────────────────┘
```

### 核心组件

#### 1. SelectionStateManager（新建）

**职责**: 管理选择状态变更事件

**关键代码**:

```typescript
export class SelectionStateManager {
  private static instance: SelectionStateManager;
  private _onSelectionChanged = new vscode.EventEmitter<SelectionStateChangeEvent>();

  public readonly onSelectionChanged = this._onSelectionChanged.event;

  public notifySelectionChanged(sourceId: string, selectedCount: number, totalCount: number): void {
    this._onSelectionChanged.fire({
      sourceId,
      selectedCount,
      totalCount,
      timestamp: Date.now(),
    });
  }
}
```

**特点**:

- 单例模式，全局共享
- 提供类型安全的事件接口
- 记录时间戳，便于调试

#### 2. RulesTreeProvider（修改）

**变更**: 添加事件监听器

**关键代码**:

```typescript
constructor(
  private configManager: ConfigManager,
  private rulesManager: RulesManager,
) {
  this.selectionStateManager = SelectionStateManager.getInstance();

  // 监听选择状态变更事件，实时刷新树视图
  this.selectionStateManager.onSelectionChanged(() => {
    // 使用防抖，避免频繁刷新
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    this.refreshTimeout = setTimeout(() => {
      this.refresh();
      Logger.debug('Tree view refreshed after selection change');
    }, 300);
  });
}
```

**优化**:

- 300ms 防抖，避免频繁刷新
- 异步刷新，不阻塞 UI
- 记录调试日志

#### 3. RuleSelectorWebviewProvider（修改）

**变更**: 在保存时触发状态变更事件

**关键代码**:

```typescript
case 'saveRuleSelection': {
  const sourceId = payload?.sourceId;
  const paths = payload?.selection?.paths;
  const totalCount = payload?.totalCount || 0;

  dataManager
    .setRuleSelection(workspacePath, sourceId, selection)
    .then(() => {
      // 触发选择状态变更事件，实时同步到树视图
      selectionStateManager.notifySelectionChanged(
        sourceId,
        paths.length,
        totalCount,
      );

      this.postMessage({ type: 'saveSuccess' });
    });
}
```

**变更点**:

- 接收前端传来的 `totalCount`
- 保存成功后立即触发事件
- 移除了对 `turbo-ai-rules.refresh` 命令的依赖

#### 4. 前端 App.tsx（修改）

**变更**: 在保存时发送 totalCount

**关键代码**:

```typescript
const handleSave = () => {
  setSaving(true);
  vscode.postMessage({
    type: 'saveRuleSelection',
    payload: {
      sourceId: currentSourceId,
      selection: {
        paths: selectedPaths,
      },
      totalCount: totalRules, // 添加总规则数，用于状态同步
    },
  });
};
```

## 数据流

### 完整的同步流程

```
1. 用户操作
   用户在规则选择器中选择/取消选择规则
   ↓

2. 状态更新
   Zustand store 更新 selectedPaths
   ↓

3. 用户保存
   点击"保存"按钮
   ↓

4. 发送消息
   postMessage({
     type: 'saveRuleSelection',
     payload: { sourceId, selection: { paths }, totalCount }
   })
   ↓

5. 后端处理
   RuleSelectorWebviewProvider.handleMessage()
   ↓

6. 持久化
   WorkspaceDataManager.setRuleSelection()
   ↓

7. 触发事件
   SelectionStateManager.notifySelectionChanged(sourceId, count, total)
   ↓

8. 事件传播
   EventEmitter fires event
   ↓

9. 树视图响应
   RulesTreeProvider receives event
   ↓

10. 防抖刷新
    300ms 后 treeProvider.refresh()
    ↓

11. 重新计算
    getRootItems() 重新获取选择状态
    ↓

12. UI 更新
    树视图显示最新的选择状态（✅ 全部已选 / 📊 12/25 已选）
```

## 性能优化

### 防抖机制

```typescript
private refreshTimeout?: NodeJS.Timeout;

this.selectionStateManager.onSelectionChanged(() => {
  if (this.refreshTimeout) {
    clearTimeout(this.refreshTimeout);
  }
  this.refreshTimeout = setTimeout(() => {
    this.refresh();
  }, 300);
});
```

**优点**:

- 避免快速连续保存时的频繁刷新
- 最终只执行一次刷新操作
- 提升性能和用户体验

### 异步加载

```typescript
private async getRootItems(): Promise<RuleTreeItem[]> {
  // 异步获取选择状态，不阻塞主线程
  const selection = await this.workspaceDataManager.getRuleSelection(source.id);
  // ...
}
```

## 错误处理

### 容错机制

1. **获取选择状态失败**: 默认显示全选状态
2. **保存失败**: 显示错误提示，不触发刷新
3. **事件发射失败**: 记录错误日志，不影响其他功能

### 调试支持

```typescript
Logger.debug('Selection state changed', {
  sourceId,
  selectedCount,
  totalCount,
});

Logger.debug('Tree view refreshed after selection change');
```

## 测试要点

### 功能测试

1. ✅ 在规则选择器中选择规则并保存
2. ✅ 观察左侧树视图是否在 300ms 后自动刷新
3. ✅ 验证显示的选择数量是否正确
4. ✅ 测试多次快速保存，确认防抖生效

### 边界测试

1. ✅ 全选状态显示 `✅ 全部已选 (25)`
2. ✅ 未选择显示 `⚠️ 未选择`
3. ✅ 部分选择显示 `📊 12/25 已选`
4. ✅ 无规则显示 `📭 无规则`

### 性能测试

1. ✅ 快速连续保存 10 次，确认只刷新一次
2. ✅ 大量规则（1000+）时刷新速度 < 300ms
3. ✅ 内存占用无异常增长

## 已知限制

1. **单向同步**: 当前只支持从选择器到树视图的同步，不支持反向
2. **延迟显示**: 有 300ms 的防抖延迟
3. **依赖事件**: 如果事件系统失败，同步会中断

## 后续优化方向

### Phase 2: 双向同步

- 在树视图中添加复选框
- 支持直接在树视图中选择规则
- 实现树视图 → 选择器的同步

### Phase 3: 实时同步

- 减少防抖延迟到 100ms
- 使用增量更新，只刷新变化的节点
- 添加加载指示器

### Phase 4: 冲突检测

- 检测并解决选择器和树视图的状态冲突
- 提供冲突提示和手动解决选项

## 相关文件

- `src/services/SelectionStateManager.ts` - 状态管理器
- `src/providers/RulesTreeProvider.ts` - 树视图提供者
- `src/providers/RuleSelectorWebviewProvider.ts` - 选择器提供者
- `src/webview/rule-selector/App.tsx` - 前端界面
- `docs/development/providers/rules-tree-implementation.md` - 树视图设计文档
- `.superdesign/design_docs/05-tree-view.md` - UI 设计文档
