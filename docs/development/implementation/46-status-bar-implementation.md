# Status Bar Per-Source Sync Statistics - Implementation

> **关联设计文档**: docs/development/46-status-bar-design.md  
> **实施版本**: v2.0.3  
> **实施文件**: StatusBarProvider.ts, WorkspaceStateManager.ts, syncRules.ts

---

## 实施概述

为状态栏增加了**按规则源统计同步状态**的能力，实现了每个规则源独立跟踪同步结果，并在状态栏显示聚合统计信息。

**核心实现**：

- ✅ 每个规则源独立记录同步快照（时间、数量、路径、状态）
- ✅ 状态栏显示实际已同步规则数（非选择数）
- ✅ Tooltip 显示每个规则源的详细同步状态
- ✅ 新规则源默认不选任何规则（用户需显式勾选）

**数据一致性保证**：所有同步时间统一使用 `WorkspaceStateManager` 存储和读取，确保状态栏、仪表板、统计页面数据一致。

---

## 架构实现

### 1. 数据模型扩展 (WorkspaceStateManager.ts)

**新增同步快照结构**：

- `SourceSyncStats` 接口：记录单个规则源的同步快照（时间、数量、路径列表、状态、错误信息）
- `WorkspaceState.sourceSyncStats`：字典结构存储所有规则源的快照
- `WorkspaceState.rulesStats` 扩展：新增 `totalSyncedRules`（已同步规则总数）和 `syncedSourceCount`（成功同步的规则源数量）

**新增方法**：

- `getSourceSyncStats(sourceId)`: 获取指定规则源同步快照
- `setSourceSyncStats(sourceId, stats)`: 设置规则源同步快照
- `getAllSourceSyncStats()`: 获取所有规则源同步快照
- `deleteSourceSyncStats(sourceId)`: 删除规则源同步快照

**实现要点**：

- 使用 workspaceState API 持久化存储
- 同步快照独立于规则选择状态
- 支持同步成功/失败/从未同步三种状态

---

### 2. 同步流程改造 (syncRules.ts)

**核心逻辑变更**：

1. **同步成功时保存快照**

   - 记录实际同步成功的规则数量和路径列表
   - 标记状态为 'success'
   - 记录时间戳

2. **同步失败时记录错误**

   - 规则数量置零，路径列表清空
   - 标记状态为 'failed'
   - 保存错误消息供调试

3. **聚合统计所有规则源**

   - 遍历所有规则源的同步快照
   - 计算成功同步的规则总数
   - 统计成功同步的规则源数量
   - 更新全局 rulesStats

4. **修改新规则源默认行为**

   - 原行为：新规则源默认全选（传入所有规则路径）
   - 新行为：新规则源默认不选（传入空数组）
   - 理由：用户应显式勾选需要的规则

5. **移除"空数组=全选"语义**
   - 原逻辑：`selectedPaths.length === 0` 被视为全选
   - 新逻辑：空数组表示不选任何规则
   - 过滤条件：`selectedPaths.length > 0 && selectedPaths.includes(path)`

**数据流**：

```
规则源同步 → 记录快照 → 聚合统计 → 更新 rulesStats → 通知状态栏刷新
```

---

### 3. 状态栏展示优化 (StatusBarProvider.ts)

**显示格式变更**：

- 旧格式：`30 Rules`（总规则数，含义模糊）
- 新格式：`30R·2/3S`（30 个已同步规则 · 2 个成功源/3 个总源）
- 数据来源：`rulesStats.totalSyncedRules` 和 `rulesStats.syncedSourceCount`

**Tooltip 异步化重构**：

- `getSuccessTooltip()` 和 `getIdleTooltip()` 改为异步方法
- 原因：需要读取 WorkspaceState 中的同步快照数据
- 所有调用点改为 `await` 调用

**Tooltip 内容增强**：

- 显示总体统计（已同步规则数、成功源数/总源数）
- 逐个列出每个规则源的同步状态：
  - ✅ 图标：同步成功
  - ❌ 图标：同步失败
  - ⏳ 图标：从未同步
  - 数字：已同步规则数量

**新增方法 `getSourceDetails()`**：

- 获取所有规则源配置
- 读取每个规则源的同步快照
- 格式化为图标+名称+数量的字符串数组
- 返回供 Tooltip 使用

---

### 4. 国际化支持 (l10n)

**新增翻译键**（8 个）：

- `statusBar.tooltip.syncSuccess`: "同步成功" / "Sync Successful"
- `statusBar.tooltip.statsTitle`: "统计信息:" / "Statistics:"
- `statusBar.tooltip.syncedRules`: "已同步规则" / "Synced Rules"
- `statusBar.tooltip.sources`: "规则源" / "Sources"
- `statusBar.tooltip.sourcesTitle`: "规则源详情:" / "Source Details:"
- `statusBar.tooltip.sourceSuccess`: "成功" / "Success"
- `statusBar.tooltip.sourceNever`: "从未同步" / "Never Synced"
- `statusBar.tooltip.sourceFailed`: "失败" / "Failed"

**使用位置**：StatusBarProvider 的 tooltip 生成方法

---

## 实施验证

### 验证场景 1：新规则源默认行为

**操作**：添加新规则源 → 不勾选任何规则 → 同步
**预期**：

- 状态栏显示 `0R·0/1S`
- Tooltip 显示 `⏳ SourceName: 0`（从未同步）

### 验证场景 2：部分规则同步

**操作**：勾选 5 个规则 → 同步成功
**预期**：

- 状态栏显示 `5R·1/1S`
- Tooltip 显示 `✅ SourceName: 5`

### 验证场景 3：多规则源混合状态

**操作**：

- 规则源 A：10 个规则，同步成功
- 规则源 B：5 个规则，同步失败
- 规则源 C：未同步
  **预期**：
- 状态栏显示 `10R·1/3S`（只有 A 成功，共 10 个规则）
- Tooltip 显示：
  ```
  ✅ SourceA: 10
  ❌ SourceB: 0
  ⏳ SourceC: 0
  ```

---

## 关键实现细节

### 1. 数据一致性保证

- **唯一数据源**：同步时间统一使用 `WorkspaceStateManager`
- **同步时刻更新**：每次同步成功/失败立即保存快照
- **聚合统计**：从快照聚合，而非从 RulesManager 计算

### 2. 性能优化

- 快照数据结构扁平，读取快速
- Tooltip 异步加载，不阻塞 UI
- 缓存机制：StatusBarProvider 缓存最后同步时间

### 3. 错误处理

- 同步失败时清空规则列表，避免显示过时数据
- 保存错误消息供调试
- 状态图标清晰标识失败状态

---

## 关联文件

**核心文件**：

- `src/services/WorkspaceStateManager.ts` - 数据模型和存储
- `src/commands/syncRules.ts` - 同步逻辑和快照记录
- `src/providers/StatusBarProvider.ts` - 状态栏展示
- `l10n/bundle.l10n.json` - 国际化翻译

**设计文档**：

- `docs/development/46-status-bar-design.md` - 功能设计

**相关实施**：

- Dashboard 和 Statistics 页面也使用 `WorkspaceStateManager` 读取同步时间
- 确保全局数据一致性

4. 规则源 C: 不勾选规则,不同步

**预期结果**:

- 状态栏显示: `10R·1/3S` (10 个同步规则·1 个成功/3 个总源)
- Tooltip 显示:
  ```
  ✅ SourceA: 10
  ❌ SourceB: 0
  ⏳ SourceC: 0
  ```

### 测试场景 4: 重新同步更新快照

**步骤**:

1. 规则源 A 已同步 10 个规则
2. 勾选新增 5 个规则(共 15 个)
3. 重新同步

**预期结果**:

- 状态栏显示: `15R·1/1S`
- sourceSyncStats 更新:
  - `syncedRulesCount: 15`
  - `lastSyncTime` 更新为最新时间

---

## 遗留问题与后续优化

### 当前限制

1. **同步快照不持久化失败原因**: 虽然保存了 `errorMessage`,但没有在 UI 中展示
2. **没有同步历史**: 只保存最后一次同步快照,无法查看历史记录
3. **状态栏格式可能需要调整**: `30R·2/3S` 对新用户可能不够直观

### 后续优化方向

1. **错误信息展示**: 在 tooltip 中显示失败规则源的错误原因
2. **同步历史**: 考虑在 webview 中展示同步历史时间线
3. **状态栏 hover 效果**: 考虑使用更丰富的 markdown tooltip
4. **性能优化**: 规则源数量较多时,考虑缓存 `getAllSourceSyncStats()` 结果

---

## 相关文件

### 主要修改文件

- `src/services/WorkspaceStateManager.ts` - 数据结构和存储逻辑
- `src/commands/syncRules.ts` - 同步逻辑和快照保存
- `src/providers/StatusBarProvider.ts` - 状态栏显示逻辑
- `l10n/bundle.l10n.json` - 英文翻译
- `l10n/bundle.l10n.zh-cn.json` - 中文翻译

### 关联文档

- `docs/development/46-status-bar-design.md` - 设计文档
- `docs/development/20-architecture.md` - 整体架构
- `docs/development/11-storage-strategy.md` - 存储策略

---

## 实施总结

本次实施完整实现了设计文档中的所有功能点:

✅ 按规则源统计同步快照  
✅ 状态栏显示格式调整  
✅ 详细的每规则源 tooltip  
✅ 新规则源默认不选任何规则  
✅ 同步成功/失败状态追踪  
✅ 国际化支持(英文/中文)

代码已通过编译测试,符合项目规范要求。
