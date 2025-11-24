# Status Bar Per-Source Sync Statistics - Implementation

> **关联设计文档**: docs/development/46-status-bar-design.md  
> **实施时间**: 2025-01-XX  
> **实施人**: AI Assistant

---

## 实施概述

本次实施为状态栏增加了**按规则源统计同步状态**的能力,并修改了新规则源的默认行为(从"全选"改为"不选任何规则")。

核心改进:

1. 明确区分"用户选择的规则"和"已成功同步的规则"
2. 状态栏显示实际同步成功的规则数,而非选择数
3. 每个规则源独立跟踪同步快照(时间、数量、状态)
4. 新规则源默认不选择任何规则,用户需显式勾选
5. 提供详细的每规则源同步状态 tooltip

---

## 代码修改清单

### 1. 数据结构扩展 (WorkspaceStateManager.ts)

#### 新增接口

```typescript
/**
 * 单个规则源的同步统计快照
 */
export interface SourceSyncStats {
  /** 最后同步时间 */
  lastSyncTime: number;
  /** 已同步规则数量 */
  syncedRulesCount: number;
  /** 已同步规则路径列表 */
  syncedRulePaths: string[];
  /** 同步状态: 'success' | 'failed' | 'never' */
  syncStatus: 'success' | 'failed' | 'never';
  /** 错误消息(如果失败) */
  errorMessage?: string;
}
```

#### WorkspaceState 扩展

```typescript
export interface WorkspaceState {
  // ... 原有字段

  /** 按规则源统计的同步快照 */
  sourceSyncStats: Record<string, SourceSyncStats>; // ← 新增

  /** 规则总体统计信息 */
  rulesStats: {
    totalRules: number;
    enabledRules: number;
    totalSyncedRules: number; // ← 新增: 所有规则源已同步规则总数
    syncedSourceCount: number; // ← 新增: 已同步规则源数量
    lastUpdateTime: number;
  };
}
```

#### 新增方法

```typescript
// 获取指定规则源的同步快照
async getSourceSyncStats(sourceId: string): Promise<SourceSyncStats | undefined>

// 设置规则源同步快照
async setSourceSyncStats(sourceId: string, stats: SourceSyncStats): Promise<void>

// 获取所有规则源的同步快照
async getAllSourceSyncStats(): Promise<Record<string, SourceSyncStats>>

// 删除规则源同步快照
async deleteSourceSyncStats(sourceId: string): Promise<void>
```

---

### 2. 同步逻辑修改 (syncRules.ts)

#### 核心修改点

1. **保存每个规则源的同步快照**

```typescript
// 同步成功后保存快照
await this.workspaceStateManager.setSourceSyncStats(source.id, {
  lastSyncTime: Date.now(),
  syncedRulesCount: selectedRules.length,
  syncedRulePaths: selectedRules.map((r) => r.filePath),
  syncStatus: 'success',
});
```

2. **同步失败时标记错误**

```typescript
// 同步失败
await this.workspaceStateManager.setSourceSyncStats(source.id, {
  lastSyncTime: Date.now(),
  syncedRulesCount: 0,
  syncedRulePaths: [],
  syncStatus: 'failed',
  errorMessage: error.message,
});
```

3. **聚合所有规则源的统计信息**

```typescript
// 从所有规则源同步快照聚合统计
const allSourceStats = await this.workspaceStateManager.getAllSourceSyncStats();
const totalSyncedRules = Object.values(allSourceStats).reduce(
  (sum, stats) => sum + (stats.syncStatus === 'success' ? stats.syncedRulesCount : 0),
  0,
);
const syncedSourceCount = Object.values(allSourceStats).filter(
  (stats) => stats.syncStatus === 'success',
).length;

// 更新rulesStats
await this.workspaceStateManager.setRulesStats({
  totalRules: allRules.length,
  enabledRules: selectedRules.length,
  totalSyncedRules, // ← 新增
  syncedSourceCount, // ← 新增
  lastUpdateTime: Date.now(),
});
```

4. **修改默认规则选择行为**

```typescript
// 旧代码: 新规则源默认选择所有规则
await initializeState(source.id, allRules.length, allRulePaths);

// 新代码: 新规则源默认不选择任何规则
await initializeState(source.id, allRules.length, []); // ← 传空数组
```

5. **移除"空数组=全选"逻辑**

```typescript
// 旧代码
if (selectedPaths.length === 0 || selectedPaths.includes(rule.filePath)) {
  selectedRules.push(rule);
}

// 新代码
if (selectedPaths.length > 0 && selectedPaths.includes(rule.filePath)) {
  selectedRules.push(rule); // ← 只包含用户显式勾选的规则
}
```

---

### 3. 状态栏显示修改 (StatusBarProvider.ts)

#### 显示格式

```typescript
// 旧格式: "30 Rules" (总规则数)
// 新格式: "30R·2/3S" (30个已同步规则·2个成功/3个总源)
statusBarItem.text = `${totalSyncedRules}R·${syncedSourceCount}/${sourceCount}S`;
```

#### Tooltip 重构

将 `getSuccessTooltip()` 和 `getIdleTooltip()` 改为异步方法:

```typescript
private async getSuccessTooltip(): Promise<string> {
  const stats = await this.workspaceStateManager.getRulesStats();
  const sourceDetails = await this.getSourceDetails();

  return [
    l10n.t('statusBar.tooltip.syncSuccess'),
    l10n.t('statusBar.tooltip.statsTitle'),
    `  ${l10n.t('statusBar.tooltip.syncedRules')}: ${stats.totalSyncedRules}`,
    `  ${l10n.t('statusBar.tooltip.sources')}: ${stats.syncedSourceCount}/${sourceCount}`,
    '',
    l10n.t('statusBar.tooltip.sourcesTitle'),
    ...sourceDetails, // ← 每规则源的详细状态
  ].join('\n');
}
```

#### 新增每规则源详情方法

```typescript
/**
 * 获取每个规则源的同步状态详情
 * @return {Promise<string[]>} 格式化的规则源状态列表
 */
private async getSourceDetails(): Promise<string[]> {
  const ConfigManager = (await import('../services/ConfigManager')).default;
  const configManager = ConfigManager.getInstance();
  const sources = await configManager.getRuleSources();
  const allStats = await this.workspaceStateManager.getAllSourceSyncStats();

  return sources.map(source => {
    const stats = allStats[source.id];
    let icon = '⏳'; // never
    if (stats?.syncStatus === 'success') icon = '✅';
    if (stats?.syncStatus === 'failed') icon = '❌';

    const count = stats?.syncedRulesCount ?? 0;
    return `  ${icon} ${source.name}: ${count}`;
  });
}
```

#### 调用点修改

需要将所有调用 tooltip 方法的地方改为 await:

```typescript
// 旧代码
statusBarItem.tooltip = this.getSuccessTooltip();

// 新代码
statusBarItem.tooltip = await this.getSuccessTooltip();
```

---

### 4. 国际化 (l10n)

#### 新增翻译键 (bundle.l10n.json)

```json
{
  "statusBar.tooltip.syncSuccess": "Sync Successful",
  "statusBar.tooltip.statsTitle": "Statistics:",
  "statusBar.tooltip.syncedRules": "Synced Rules",
  "statusBar.tooltip.sources": "Sources",
  "statusBar.tooltip.sourcesTitle": "Source Details:",
  "statusBar.tooltip.sourceSuccess": "Success",
  "statusBar.tooltip.sourceNever": "Never Synced",
  "statusBar.tooltip.sourceFailed": "Failed"
}
```

#### 中文翻译 (bundle.l10n.zh-cn.json)

```json
{
  "statusBar.tooltip.syncSuccess": "同步成功",
  "statusBar.tooltip.statsTitle": "统计信息:",
  "statusBar.tooltip.syncedRules": "已同步规则",
  "statusBar.tooltip.sources": "规则源",
  "statusBar.tooltip.sourcesTitle": "规则源详情:",
  "statusBar.tooltip.sourceSuccess": "成功",
  "statusBar.tooltip.sourceNever": "从未同步",
  "statusBar.tooltip.sourceFailed": "失败"
}
```

---

## 测试验证

### 测试场景 1: 新规则源默认不选规则

**步骤**:

1. 添加新规则源
2. 不勾选任何规则
3. 运行同步命令

**预期结果**:

- 状态栏显示: `0R·0/1S` (0 个同步规则·0 个成功/1 个总源)
- Tooltip 显示: `⏳ NewSource: 0` (从未同步)

### 测试场景 2: 选择部分规则后同步

**步骤**:

1. 勾选 5 个规则
2. 运行同步命令

**预期结果**:

- 状态栏显示: `5R·1/1S` (5 个同步规则·1 个成功/1 个总源)
- Tooltip 显示: `✅ NewSource: 5`

### 测试场景 3: 多规则源部分失败

**步骤**:

1. 添加 3 个规则源
2. 规则源 A: 选择 10 个规则,同步成功
3. 规则源 B: 选择 5 个规则,同步失败(如网络错误)
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
