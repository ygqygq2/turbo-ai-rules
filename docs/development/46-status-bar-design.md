# 状态栏显示设计

## 设计目标

状态栏需要清晰地展示：

1. 多规则源的同步状态（每个源独立统计）
2. 已同步规则数量（只计算同步成功的规则）
3. 区分"用户选择"和"已同步"的概念

---

## 2. 核心概念

### 1. 规则状态流转

```
规则源添加
    ↓
用户勾选规则（选择状态，未同步）
    ↓
执行同步命令（手动/自动）
    ↓
同步成功（已同步状态）✅
```

### 2. "已同步规则"的定义

**已同步规则** = 上次同步成功时实际包含的规则数量

- ✅ 规则源已启用
- ✅ 用户已勾选该规则
- ✅ 执行过同步命令
- ✅ 同步成功完成

**未同步规则** = 用户勾选但还未执行同步，或同步失败的规则

---

## 数据结构设计

### WorkspaceState 扩展

```typescript
interface WorkspaceState {
  // ... 现有字段

  /** 每个规则源的同步统计（按源分别记录） */
  sourceSyncStats: {
    [sourceId: string]: {
      /** 上次同步成功时间 */
      lastSyncTime: string; // ISO 8601
      /** 上次同步成功包含的规则数 */
      syncedRulesCount: number;
      /** 上次同步时用户选择的规则路径（快照） */
      syncedRulePaths: string[];
      /** 同步状态 */
      syncStatus: 'success' | 'failed' | 'never';
      /** 错误信息（如果失败） */
      errorMessage?: string;
    };
  };

  /** 全局统计（聚合） */
  rulesStats: {
    totalRules: number; // 所有源的规则总数
    totalSyncedRules: number; // 所有源已同步的规则总数
    sourceCount: number; // 规则源总数
    enabledSourceCount: number; // 已启用的规则源数量
    syncedSourceCount: number; // 至少同步过一次的源数量
  };
}
```

### 同步流程更新点

```typescript
// syncRules.ts 中同步成功后
for (const source of enabledSources) {
  const selectedPaths = selectionStateManager.getSelection(source.id);
  const syncedCount = selectedPaths.length;

  // 保存该源的同步快照
  await workspaceStateManager.setSourceSyncStats(source.id, {
    lastSyncTime: new Date().toISOString(),
    syncedRulesCount: syncedCount,
    syncedRulePaths: selectedPaths,
    syncStatus: 'success',
  });
}

// 聚合统计
const totalSyncedRules = sources.reduce((sum, s) => {
  const stats = await workspaceStateManager.getSourceSyncStats(s.id);
  return sum + (stats?.syncedRulesCount || 0);
}, 0);

await workspaceStateManager.setRulesStats({
  totalRules: allRules.length,
  totalSyncedRules,
  sourceCount: sources.length,
  enabledSourceCount: enabledSources.length,
  syncedSourceCount: sources.filter(
    (s) => workspaceStateManager.getSourceSyncStats(s.id)?.syncStatus === 'success',
  ).length,
});
```

---

## 4. 状态栏显示方案

### 方案 A：简洁模式（推荐）

**显示格式**：

- Idle: `$(turbo-logo) 30R·2/3S`
- Syncing: `$(sync~spin) 同步中 1/3`
- Success: `✅ 30R·2/3S`
- Error: `$(error) 同步失败`

**含义**：

- `30R` = 30 条已同步规则（Rules）
- `2/3S` = 2 个源已同步 / 共 3 个源（Sources）

**Tooltip 详细信息**：

```
Turbo AI Rules

📊 规则统计
  • 已同步规则: 30 条
  • 规则源: 2/3 已同步

📦 规则源详情
  ✅ company-rules (15 条, 2 小时前)
  ✅ personal-rules (15 条, 2 小时前)
  ⏳ new-source (0 条, 未同步)

🕐 上次同步: 2 小时前

点击打开 Turbo AI Rules 面板
```

### 方案 B：详细模式

**显示格式**：

- `$(turbo-logo) 30 Synced | 2S✓ 1S⏳`

**含义**：

- `30 Synced` = 30 条已同步规则
- `2S✓` = 2 个源同步成功
- `1S⏳` = 1 个源未同步

**Tooltip**：同方案 A

---

## 5. 推荐方案：方案 A

**优点**：

1. ✅ 简洁明了，不占用过多空间
2. ✅ 数字含义清晰（R=Rules, S=Sources）
3. ✅ Tooltip 提供详细信息
4. ✅ 按源分别统计，用户可以看到每个源的同步状态

**实现要点**：

1. 状态栏显示：聚合数字（totalSyncedRules, syncedSourceCount/sourceCount）
2. Tooltip 显示：每个源的详细统计
3. 同步成功后：立即更新每个源的快照数据
4. 区分场景：
   - 新添加的源：显示 `⏳ 未同步`
   - 同步失败的源：显示 `❌ 同步失败`
   - 同步成功的源：显示 `✅ {count} 条，{time}`

---

## 6. 边界情况处理

### 1. 新规则源添加后

- **WorkspaceState**: `sourceSyncStats[newSourceId]` 不存在
- **状态栏显示**: 源计数增加，但 syncedSourceCount 不变
- **Tooltip**: 显示 `⏳ new-source (0 条, 未同步)`

### 2. 用户勾选规则但未同步

- **WorkspaceState**: `sourceSyncStats[sourceId].syncedRulesCount` 保持旧值
- **状态栏显示**: 不变（显示上次同步的数量）
- **提示**: 可以在 TreeView 中显示 "待同步" 标记

### 3. 部分源同步失败

- **WorkspaceState**: 失败的源标记 `syncStatus: 'failed'`
- **状态栏**: 显示 `$(error)` 图标，background 红色
- **Tooltip**: 详细列出哪个源失败，显示错误信息

### 4. 自动同步

- **行为**: 与手动同步完全一致
- **通知**: 可选静默或显示简短通知
- **状态栏**: 同步成功后更新统计

### 5. 规则源禁用

- **WorkspaceState**: 保留 `sourceSyncStats`（历史记录）
- **状态栏**: 不计入 `enabledSourceCount`，但保留历史统计
- **Tooltip**: 显示 `🚫 disabled-source (15 条, 已禁用)`

---

## 7. 实现要点

### 7.1 数据层

**WorkspaceStateManager 扩展**：

- 新增方法获取/设置单个源的同步统计
- 新增方法获取所有源的同步统计
- 更新 rulesStats 的设置方法支持新字段

### 7.2 同步流程

**syncRules 命令更新**：

- 每个源同步成功后立即保存快照
- 同步完成后聚合计算总统计
- 区分同步成功和失败的源

### 7.3 状态栏显示

**StatusBarProvider 更新**：

- 显示格式改为：`{totalSyncedRules}R·{syncedSourceCount}/{sourceCount}S`
- Tooltip 按源列表显示详细信息
- 支持不同同步状态的图标和颜色

### 7.4 国际化

**需要的翻译键**：

- 状态栏格式化文本
- Tooltip 各部分标题
- 各种同步状态的描述文本

---

## 8. 典型场景示例

### 场景 1：初始状态（无源）

```
状态栏: $(turbo-logo) 无规则
Tooltip: Turbo AI Rules
         没有配置规则源
         点击添加规则源
```

### 场景 2：添加源但未同步

```
状态栏: $(turbo-logo) 0R·0/1S
Tooltip: 规则统计: 0 条已同步
         规则源: 0/1 已同步

         ⏳ company-rules (0 条, 未同步)
```

### 场景 3：同步成功

```
状态栏: $(turbo-logo) 30R·1/1S
Tooltip: 规则统计: 30 条已同步
         规则源: 1/1 已同步

         ✅ company-rules (30 条, 刚刚)
```

### 场景 4：多源部分同步

```
状态栏: $(turbo-logo) 30R·2/3S
Tooltip: 规则统计: 30 条已同步
         规则源: 2/3 已同步

         ✅ company-rules (15 条, 2 小时前)
         ✅ personal-rules (15 条, 2 小时前)
         ⏳ new-source (0 条, 未同步)
```

### 场景 5：部分源失败

```
状态栏: $(error) 15R·1/3S (背景红色)
Tooltip: 规则统计: 15 条已同步
         规则源: 1/3 已同步

         ✅ company-rules (15 条, 2 小时前)
         ❌ personal-rules (同步失败: 网络错误)
         ⏳ new-source (0 条, 未同步)
```

---

## 9. 设计总结

### 核心原则

1. **分层展示**：状态栏显示聚合数字，Tooltip 显示详细分源统计
2. **精确定义**：只有同步成功的规则才计入"已同步"
3. **独立快照**：每个源独立记录同步快照（时间、数量、路径）
4. **场景完备**：支持多源、部分失败、禁用等复杂场景

### 用户体验目标

1. **一目了然**：一眼看出总体同步情况（多少规则、多少源）
2. **详情可查**：Hover 查看每个源的详细状态
3. **状态清晰**：明确区分"未同步"、"同步中"、"已同步"、"失败"四种状态

### 技术要点

1. **状态持久化**：使用 WorkspaceState 存储同步快照
2. **聚合计算**：运行时从各源统计聚合总数
3. **实时更新**：同步完成后立即更新显示
4. **国际化支持**：所有文本支持中英文切换

---

> **下一步**：参见实施文档（implementation/ 目录）了解具体代码实现细节
