# 基于规则选择的同步实施文档

## 概述

本文档记录了如何修改同步命令 (`syncRules.ts`)，使其在同步规则时只同步用户在规则选择器中选中的规则，而不是同步所有规则。

## 背景

在之前的实现中，`syncRulesCommand` 会同步所有规则，不管用户是否在规则选择器中选择了特定的规则。这导致用户无法控制哪些规则被同步和生成到配置文件中。

**用户需求**：

- 用户在规则选择器 Webview 中选择规则
- 同步命令只同步用户选中的规则
- 未选中的规则不参与配置文件生成

## 问题分析

### 原有实现

**文件**：`src/commands/syncRules.ts`

**原有逻辑**：

```typescript
// 同步单个源
const rules = await syncSingleSource(source, gitManager, parser, validator);

// 添加到规则管理器（所有规则）
rulesManager.addRules(source.id, rules);

totalRules += rules.length;
```

**问题**：

- 所有规则都被添加到 `RulesManager`
- 没有考虑用户的选择状态
- 生成配置文件时包含了所有规则

### 设计目标

1. **保留原有同步逻辑**：Git 克隆/拉取和规则解析不变
2. **增加选择过滤**：根据 `SelectionStateManager` 过滤规则
3. **默认行为**：如果没有选择记录，默认全选（向后兼容）
4. **日志记录**：清晰记录过滤前后的规则数量

## 解决方案

### 实现步骤

#### 1. 导入 SelectionStateManager

**文件**：`src/commands/syncRules.ts`

**修改点**：

```typescript
import { SelectionStateManager } from '../services/SelectionStateManager';
```

#### 2. 获取 SelectionStateManager 实例

在 `syncRulesCommand` 函数中：

```typescript
const selectionStateManager = SelectionStateManager.getInstance();
```

#### 3. 修改同步循环逻辑

**位置**：每个源同步完成后

**原有代码**：

```typescript
try {
  // 同步单个源
  const rules = await syncSingleSource(source, gitManager, parser, validator);

  // 添加到规则管理器
  rulesManager.addRules(source.id, rules);

  totalRules += rules.length;
  successCount++;
```

**修改后代码**：

```typescript
try {
  // 同步单个源
  const allRules = await syncSingleSource(source, gitManager, parser, validator);

  // 初始化选择状态（从磁盘加载）
  await selectionStateManager.initializeState(source.id, allRules.length);

  // 获取用户选择的规则路径
  const selectedPaths = selectionStateManager.getSelection(source.id);

  // 根据选择过滤规则
  let filteredRules: ParsedRule[];
  if (selectedPaths.length === 0) {
    // 空数组表示全选（默认行为）
    filteredRules = allRules;
    Logger.info('No selection found, using all rules', {
      sourceId: source.id,
      totalRules: allRules.length,
    });
  } else {
    // 根据选择的路径过滤规则
    const selectedPathsSet = new Set(selectedPaths);
    filteredRules = allRules.filter((rule) => selectedPathsSet.has(rule.filePath));

    Logger.info('Filtered rules by selection', {
      sourceId: source.id,
      totalRules: allRules.length,
      selectedRules: filteredRules.length,
      selectedPaths: selectedPaths.length,
    });
  }

  // 添加到规则管理器（只添加过滤后的规则）
  rulesManager.addRules(source.id, filteredRules);

  totalRules += filteredRules.length;
  successCount++;

  Logger.info(`Source synced successfully`, {
    sourceId: source.id,
    branch: source.branch || 'default',
    subPath: source.subPath || '/',
    totalRulesInSource: allRules.length,
    selectedRules: filteredRules.length,
  });
```

### 关键逻辑说明

#### 1. 初始化选择状态

```typescript
await selectionStateManager.initializeState(source.id, allRules.length);
```

**作用**：

- 从磁盘加载该源的选择记录
- 如果没有记录，初始化为空数组（表示全选）
- 缓存规则总数用于后续计算

#### 2. 获取选择的路径

```typescript
const selectedPaths = selectionStateManager.getSelection(source.id);
```

**返回值**：

- `string[]`：用户选择的规则文件路径列表
- 空数组 `[]`：表示没有选择记录（默认全选）

#### 3. 过滤规则

```typescript
if (selectedPaths.length === 0) {
  // 空数组表示全选（默认行为）
  filteredRules = allRules;
} else {
  // 根据选择的路径过滤规则
  const selectedPathsSet = new Set(selectedPaths);
  filteredRules = allRules.filter((rule) => selectedPathsSet.has(rule.filePath));
}
```

**逻辑**：

- **空数组（默认全选）**：不过滤，使用所有规则
- **有选择记录**：使用 `Set` 加速查找，过滤出选中的规则

**性能优化**：使用 `Set` 而不是 `Array.includes()`，时间复杂度从 O(n²) 降低到 O(n)

#### 4. 日志记录

```typescript
Logger.info('Filtered rules by selection', {
  sourceId: source.id,
  totalRules: allRules.length,
  selectedRules: filteredRules.length,
  selectedPaths: selectedPaths.length,
});
```

**记录内容**：

- `totalRules`：源中的全部规则数量
- `selectedRules`：过滤后的规则数量
- `selectedPaths`：用户选择的路径数量

**用途**：

- 用户可以在日志中看到过滤效果
- 调试时方便查看选择状态

### 数据流

```
同步命令执行
  ↓
Git 克隆/拉取仓库
  ↓
解析所有规则文件 (allRules)
  ↓
从磁盘加载选择记录
  ↓
SelectionStateManager.initializeState(sourceId, allRules.length)
  ↓
获取选择的路径
  ↓
SelectionStateManager.getSelection(sourceId) → selectedPaths
  ↓
过滤规则
  ↓
if selectedPaths.length === 0:
  filteredRules = allRules (全选)
else:
  filteredRules = allRules.filter(rule => selectedPaths.has(rule.filePath))
  ↓
添加到 RulesManager
  ↓
rulesManager.addRules(sourceId, filteredRules)
  ↓
合并规则 & 生成配置文件
  ↓
只有 filteredRules 被写入配置文件
```

## 向后兼容性

### 默认行为

**场景**：用户从未使用过规则选择器

**行为**：

- `selectedPaths.length === 0`
- 所有规则被同步（默认全选）
- 行为与之前版本一致

**原因**：

- `SelectionStateManager.getSelection()` 返回空数组
- 代码检测到空数组时使用所有规则

### 迁移

**场景**：用户从旧版本升级

**行为**：

- 旧版本没有保存选择记录
- 初次同步时默认全选
- 用户打开选择器后可以调整选择

**步骤**：

1. 升级扩展
2. 执行同步（默认全选）
3. 打开规则选择器调整选择
4. 再次同步（只同步选中的规则）

## 测试覆盖

### 单元测试场景

**文件**：`src/test/unit/commands/syncRules.selection.test.ts` (待创建)

**测试用例**：

1. **默认全选测试**

   - 没有选择记录时，同步所有规则
   - 验证 `filteredRules.length === allRules.length`

2. **部分选择测试**

   - 用户选择了 3 个规则
   - 验证只有 3 个规则被添加到 `RulesManager`

3. **空选择测试**

   - 用户取消了所有选择
   - 验证没有规则被添加

4. **多源测试**
   - 两个源，一个全选，一个部分选择
   - 验证每个源的过滤逻辑独立

### 集成测试场景

**手动测试步骤**：

1. **准备工作**

   - 添加规则源
   - 执行一次完整同步（默认全选）
   - 检查生成的配置文件（应包含所有规则）

2. **选择规则**

   - 打开规则选择器
   - 勾选部分规则（如 5 个）
   - 保存选择

3. **验证同步**

   - 再次执行同步命令
   - 检查日志输出：
     ```
     Filtered rules by selection: {
       sourceId: 'test-source',
       totalRules: 10,
       selectedRules: 5,
       selectedPaths: 5
     }
     ```
   - 检查生成的配置文件（应只包含 5 个规则）

4. **验证默认行为**
   - 删除选择记录文件 (`.turbo-ai-rules/rule-selections.json`)
   - 再次同步
   - 检查日志输出：
     ```
     No selection found, using all rules: {
       sourceId: 'test-source',
       totalRules: 10
     }
     ```
   - 检查生成的配置文件（应包含所有 10 个规则）

## 性能考虑

### 时间复杂度

**过滤操作**：

```typescript
const selectedPathsSet = new Set(selectedPaths);
filteredRules = allRules.filter((rule) => selectedPathsSet.has(rule.filePath));
```

- `Set` 构建：O(m)，m = selectedPaths.length
- 过滤操作：O(n)，n = allRules.length
- 总复杂度：**O(m + n)**

**对比 Array.includes()**：

- 每次查找：O(m)
- 总复杂度：O(n × m)

**结论**：使用 `Set` 时，在规则数量较多时性能显著提升。

### 内存占用

- `allRules`：完整规则数组（必须保留用于解析）
- `selectedPathsSet`：路径集合（临时，过滤完成后释放）
- `filteredRules`：过滤后的规则数组（持久化到 `RulesManager`）

**优化建议**：

- 过滤后立即清理 `selectedPathsSet`（JavaScript GC 自动处理）
- 不需要同时保留 `allRules` 和 `filteredRules`（可优化，但影响有限）

## 日志示例

### 全选场景

```
[INFO] No selection found, using all rules { sourceId: 'example-source', totalRules: 27 }
[INFO] Source synced successfully {
  sourceId: 'example-source',
  branch: 'main',
  subPath: '/',
  totalRulesInSource: 27,
  selectedRules: 27
}
```

### 部分选择场景

```
[INFO] Filtered rules by selection {
  sourceId: 'example-source',
  totalRules: 27,
  selectedRules: 5,
  selectedPaths: 5
}
[INFO] Source synced successfully {
  sourceId: 'example-source',
  branch: 'main',
  subPath: '/',
  totalRulesInSource: 27,
  selectedRules: 5
}
```

## 已知限制

1. **规则路径变更**

   - 如果规则文件被重命名或移动，选择记录会失效
   - 需要用户重新选择

2. **并发同步**

   - 多个源同时同步时，选择状态可能存在短暂不一致
   - 已通过按仓库分组串行处理缓解

3. **大量规则场景**
   - 过滤操作在规则数量非常大时（>10000）可能有延迟
   - 已通过 `Set` 优化查找性能

## 未来改进

1. **增量同步**

   - 只同步变更的规则
   - 减少不必要的解析和过滤

2. **规则路径映射**

   - 建立规则 ID 到路径的映射
   - 解决规则文件重命名问题

3. **并行过滤**

   - 对于大量规则，使用 Web Worker 或子进程并行过滤
   - 提升性能

4. **预览模式**
   - 同步前预览将要同步的规则
   - 用户确认后再执行

## 相关文档

- 选择状态管理：`docs/development/services/SelectionStateManager.md`
- 选择同步机制：`docs/development/implementation/rule-selection-sync.md`
- 同步命令设计：`docs/development/commands/syncRules.md`
- 规则管理器：`docs/development/services/RulesManager.md`

---

**实施日期**：2025-11-18  
**版本**：v1.0.0  
**作者**：GitHub Copilot + ygqygq2
