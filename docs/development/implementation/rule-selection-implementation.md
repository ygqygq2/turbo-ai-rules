# 规则选择机制实施文档

> **核心功能**: 实现左侧树视图、右侧 Webview 选择器和文件树的规则选择功能，以及三者之间的实时同步。

---

## 1. 功能概述

用户可以通过三种方式选择规则：

1. **左侧规则树视图** (`RulesTreeProvider`) - 复选框直接勾选规则
2. **右侧规则选择器 Webview** (`RuleSelectorWebviewProvider`) - 可视化界面选择
3. **文件树视图** - 文件系统结构浏览

三种方式的选择状态**完全同步**，选择结果用于：

- **同步过滤**: 只同步用户选中的规则
- **配置生成**: 只将选中的规则写入配置文件

---

## 2. 架构设计

### 2.1 核心组件

#### SelectionStateManager（单一数据源）

**职责**：

- 管理所有规则源的选择状态（内存 + 磁盘持久化）
- 提供监听器机制实现状态变更通知
- 支持延时持久化（500ms 防抖）

**核心功能**：

- **状态初始化**：从磁盘加载已保存的选择状态，**新源默认全不选（空数组）**
- **状态读取**：获取指定源的选择路径列表和选择数量
- **状态更新**：更新选择状态，触发监听器，安排持久化
- **事件监听**：注册监听器响应状态变更
- **持久化**：将选择状态保存到磁盘

**设计原则**：

- **空数组 = 全不选**：新添加的规则源默认不选择任何规则
- **用户主动选择**：用户需要主动勾选规则才会包含在同步和配置生成中
- **持久化优先**：已保存的选择状态优先级高于默认状态

**实现文件**: `src/services/SelectionStateManager.ts`

---

#### RulesTreeProvider（左侧树视图）

**职责**：

- 显示规则源和规则列表
- 提供复选框选择功能
- 显示选择状态（已选/总数）
- 监听 `SelectionStateManager` 状态变更并刷新

**核心机制**：

- **状态监听**：注册 SelectionStateManager 监听器，状态变更时触发刷新
- **防抖刷新**：300ms 防抖避免频繁刷新 UI
- **复选框处理**：批量收集变更，统一更新到 SelectionStateManager
- **状态同步**：确保复选框状态与 SelectionStateManager 一致

**实现文件**: `src/providers/RulesTreeProvider.ts`

---

#### RuleSelectorWebviewProvider（右侧选择器）

**职责**：

- 提供可视化的规则选择界面
- 支持多选、全选、搜索过滤
- 监听 `SelectionStateManager` 状态变更并更新 UI

**核心机制**：

- **状态监听**：注册 SelectionStateManager 监听器
- **消息通知**：状态变更时通过 Messenger 发送消息给 Webview
- **保存处理**：接收 Webview 保存请求，更新 SelectionStateManager
- **立即持久化**：保存操作不延时，直接写入磁盘

**实现文件**: `src/providers/RuleSelectorWebviewProvider.ts`

---

### 2.2 数据流架构

```
┌────────────────────────────────────────────────────────┐
│           SelectionStateManager (单例)                 │
│                                                        │
│  - 内存状态: Map<sourceId, Set<filePath>>             │
│  - 监听器列表: SelectionStateChangeListener[]         │
│  - 持久化定时器: Map<sourceId, Timer>                 │
│                                                        │
│  方法:                                                 │
│  - updateSelection(sourceId, paths, immediate)        │
│    → 更新内存                                         │
│    → 触发监听器                                       │
│    → 安排延时持久化（immediate=false）                │
│                                                        │
│  - onStateChanged(listener)                           │
│    → 注册监听器                                       │
│    → 返回 Disposable                                  │
└──────────────┬─────────────────────────────────────────┘
               │
               │ 事件分发
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌─────────────────┐  ┌──────────────────────┐
│RulesTreeProvider│  │RuleSelectorWebview   │
│                 │  │Provider              │
│ - 监听事件      │  │                      │
│ - 300ms 防抖    │  │ - 监听事件           │
│ - 刷新树视图    │  │ - 通知 Webview UI    │
│                 │  │                      │
│ - 复选框变更 →  │  │ - 保存按钮 →         │
│   updateSelection│  │   updateSelection    │
└─────────────────┘  └──────────────────────┘
```

---

## 3. 关键流程

### 3.1 用户在左侧树视图勾选规则

```
1. 用户点击复选框
   ↓
2. RulesTreeProvider.onDidChangeCheckboxState() 触发
   ↓
3. 调用 selectionStateManager.updateSelection(sourceId, paths, true)
   ↓
4. SelectionStateManager:
   - 更新内存状态
   - 触发所有监听器
   - 安排延时持久化（500ms）
   ↓
5. RuleSelectorWebviewProvider 收到事件
   ↓
6. 通过 messenger.notify() 发送消息给 Webview
   ↓
7. Webview UI 更新复选框状态
```

---

### 3.2 用户在右侧选择器保存选择

```
1. 用户点击"保存选择"按钮
   ↓
2. Webview 发送 'saveSelection' 消息
   ↓
3. RuleSelectorWebviewProvider 处理消息
   ↓
4. 调用 selectionStateManager.updateSelection(sourceId, paths, false)
   ↓
5. SelectionStateManager:
   - 更新内存状态
   - 触发所有监听器
   - 立即持久化到磁盘（immediate=false，已经保存过）
   ↓
6. RulesTreeProvider 收到事件
   ↓
7. 300ms 防抖后刷新树视图
   ↓
8. 树视图复选框状态更新
```

---

### 3.3 同步命令根据选择过滤规则

```
1. 用户触发同步命令
   ↓
2. syncRulesCommand() 执行
   ↓
3. 对每个规则源:
   ├─ syncSingleSource() → 获取所有规则
   ├─ selectionStateManager.initializeState(sourceId, totalCount, []) → 默认空数组（全不选）
   ├─ rulesManager.addRules(sourceId, allRules) → 添加所有规则到树视图
   ├─ selectionStateManager.getSelection(sourceId) → 获取选择的路径（新源为空）
   ├─ 过滤规则: selectedRules = allRules.filter(r => selectedPaths.includes(r.filePath))
   └─ 只有用户勾选的规则才会用于生成配置
   ↓
4. 生成配置文件
   ├─ 只包含用户主动勾选的规则
   ├─ 新源未勾选任何规则时，不生成配置内容
   └─ 写入 .cursorrules / copilot-instructions.md 等
```

**重要说明**：

- **新源默认行为**：添加规则源后，默认全不选（空数组），用户需要主动勾选
- **树视图显示**：所有规则都会显示在树视图中，但复选框默认未勾选
- **同步过滤**：只有勾选的规则才会包含在配置文件生成中

**实现文件**: `src/commands/syncRules.ts`

---

## 4. 持久化机制

### 4.1 存储位置

选择状态存储在 `WorkspaceDataManager` 中：

```json
{
  "selections": {
    "source-id-1": {
      "selectedPaths": ["rules/001-typescript-conventions.md", "rules/002-react-best-practices.md"],
      "totalCount": 50,
      "lastUpdated": 1700000000000
    }
  }
}
```

**文件路径**: `.vscode/turbo-ai-rules/workspace-data.json`

### 4.2 延时持久化策略

**目的**: 避免频繁写入磁盘

**实现**:

- 用户操作 → 更新内存状态
- 启动 500ms 定时器
- 定时器触发 → 写入磁盘
- 新操作到来 → 取消旧定时器 → 启动新定时器

**实现机制**：

- 每次状态更新时，取消该源的旧定时器
- 启动新的 500ms 定时器
- 定时器触发时执行持久化并清理定时器
- 通过 Map 管理每个源的独立定时器

---

## 5. 防抖与性能优化

### 5.1 树视图刷新防抖（300ms）

**目的**: 避免频繁刷新导致 UI 卡顿

**实现机制**：

- 每次刷新请求时，取消旧定时器
- 启动新的 300ms 定时器
- 定时器触发时调用 VSCode API 刷新树视图
- 避免短时间内多次刷新导致 UI 卡顿

### 5.2 选择状态缓存

**目的**: 避免重复从磁盘加载

```typescript
// 内存中的选择状态（sourceId -> Set<filePath>）
private memoryState = new Map<string, Set<string>>();

// 规则总数缓存（sourceId -> totalCount）
private totalCountCache = new Map<string, number>();
```

---

## 6. 测试覆盖

### 6.1 单元测试

**文件**: `src/test/unit/services/SelectionStateManager.test.ts`

**测试场景**:

- ✅ 初始化状态（从空开始、从磁盘加载）
- ✅ 更新选择（单规则、多规则、全选、全不选）
- ✅ 监听器触发（正确的事件数据、多监听器）
- ✅ 延时持久化（防抖、取消）
- ✅ 清理资源（dispose）

### 6.2 集成测试

**文件**: `src/test/suite/selection-sync.spec.ts`

**测试场景**:

- ✅ 左侧勾选 → 右侧更新
- ✅ 右侧保存 → 左侧更新
- ✅ 同步命令 → 只同步选中规则
- ✅ 跨会话持久化

---

## 7. 已知限制

1. **并发问题**: 如果同时在多个地方修改选择，可能出现竞态条件（当前通过延时持久化缓解）
2. **大规则源性能**: 规则数量 > 1000 时，树视图刷新可能较慢（已通过防抖优化）
3. **磁盘空间**: 每个规则源的选择状态约占 1-10KB（根据规则数量）

---

## 8. 未来改进

1. **批量操作优化**: 支持一次性更新多个源的选择状态
2. **选择历史**: 记录选择变更历史，支持撤销/重做
3. **智能推荐**: 根据规则使用频率自动推荐选择
4. **冲突检测**: 检测选中规则之间的冲突并提示用户

---

## 9. 相关文件

### 核心实现

- `src/services/SelectionStateManager.ts` - 选择状态管理器
- `src/services/WorkspaceDataManager.ts` - 持久化存储
- `src/providers/RulesTreeProvider.ts` - 左侧树视图
- `src/providers/RuleSelectorWebviewProvider.ts` - 右侧选择器
- `src/commands/syncRules.ts` - 同步命令过滤逻辑

### 类型定义

- `src/types/rules.ts` - `RuleSelection` 类型
- `src/services/SelectionStateManager.ts` - `SelectionStateChangeEvent` 类型

### 测试

- `src/test/unit/services/SelectionStateManager.test.ts`
- `src/test/suite/selection-sync.spec.ts`

---

## 7. 版本更新记录

### v2.0.2 - 规则选择清空功能修复

**问题描述**：
在规则同步页面（`RuleSyncPageWebviewProvider`）不选择任何规则进行同步时，之前选择的规则状态仍会被保留。这导致用户无法通过不选择规则来清空某个规则源的所有规则。

**修复内容**：

1. **在 `RuleSyncPageWebviewProvider.handleSync()` 中添加选择状态更新**

   - 解析用户选择的规则后，遍历所有启用的规则源
   - 对每个规则源调用 `selectionStateManager.updateSelection()`
   - 即使选择数量为 0，也会更新状态（清空选择）

2. **关键代码变更**：

   ```typescript
   // 更新每个启用源的选择状态
   for (const source of enabledSources) {
     const selectedPaths = selectedRulePaths.get(source.id) || [];
     // 即使是空数组也要更新，这样可以清空之前的选择
     this.selectionStateManager.updateSelection(
       source.id,
       selectedPaths,
       true, // 立即安排持久化
       workspaceRoot,
     );
   }
   ```

3. **文件修改**：
   - `src/providers/RuleSyncPageWebviewProvider.ts` - 添加 `SelectionStateManager` 导入和使用
   - `docs/development/22-config-sync.md` - 更新文档说明选择状态清空行为
   - `src/test/suite/syncRules.test.ts` - 添加测试用例验证清空功能

**使用场景**：

- 用户希望暂时禁用某个规则源的所有规则，但不删除规则源本身
- 用户只想保留自定义规则，清空所有规则源的规则

---

> **维护提示**: 修改选择状态相关代码时，必须确保：
>
> 1. 内存状态、磁盘状态、UI 显示三者一致
> 2. 所有监听器都能正确收到事件
> 3. 持久化逻辑不会丢失用户操作
> 4. **重要**：空选择（0 个规则）也需要正确持久化，不能被忽略
