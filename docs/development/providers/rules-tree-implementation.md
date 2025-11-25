# 规则树视图实施文档（RulesTreeProvider）

> **对应源码**: `src/providers/RulesTreeProvider.ts`  
> **功能**: 左侧侧边栏的规则树视图，提供规则源和规则列表展示、复选框选择、状态显示等功能

---

## 1. 功能概述

规则树视图是用户与规则交互的主要入口之一，提供：

1. **规则源管理**: 显示所有规则源及其状态（启用/禁用、分支、选择统计）
2. **规则列表**: 展示每个源下的规则，支持展开/折叠
3. **复选框选择**: 通过复选框直接选择/取消规则
4. **状态显示**: 显示规则优先级、标签、选择状态
5. **右键菜单**: 提供快捷操作（刷新、查看详情、编辑等）

---

## 2. 核心实现

### 2.1 数据结构

#### RuleTreeItem（树项）

**继承关系**：继承自 `vscode.TreeItem`

**核心功能**：

- 封装树项数据（TreeItemData）
- 设置复选框状态（仅规则项）
- 生成图标、描述、Tooltip
- 支持展开/折叠状态

**实现文件**: `src/providers/RulesTreeProvider.ts`

#### TreeItemData（树项数据）

**数据结构**：

- **通用字段**：

  - `type`: 类型（'source' | 'rule'）
  - `label`: 显示文本

- **规则源字段**：

  - `source`: 规则源对象
  - `selectedCount`: 已选择规则数
  - `totalCount`: 总规则数

- **规则字段**：
  - `rule`: 规则对象
  - `isSelected`: 是否被选中

**实现文件**: `src/types/rules.ts`

---

### 2.2 规则源显示

#### 图标

- **启用的源**: `repo-check` 图标（蓝色）
- **禁用的源**: `repo` 图标（灰色）

#### 描述信息格式

```
✅ 已启用 • main • 📊 12/25 已选
```

包含：

- 启用状态：`✅ 已启用` / `❌ 已禁用`
- 分支名：当前使用的分支
- 选择状态：
  - `📭 无规则` - 源中没有规则
  - `⚠️ 未选择` - 有规则但未选择任何一个
  - `✅ 全部已选 (25)` - 所有规则都已选择
  - `📊 12/25 已选` - 部分规则已选择

#### Tooltip

显示详细信息：

```markdown
**源名称**: my-rules-source
**仓库**: https://github.com/org/rules.git
**分支**: main
**状态**: ✅ 已启用
**规则**: 12/25 已选
```

---

### 2.3 规则项显示

#### 复选框状态

- **已选择**: `TreeItemCheckboxState.Checked`
- **未选择**: `TreeItemCheckboxState.Unchecked`

#### 图标（根据优先级）

**优先级与图标映射**：

| 优先级 | 图标      | 颜色                  | 说明           |
| ------ | --------- | --------------------- | -------------- |
| high   | flame     | errorForeground       | 火焰图标，红色 |
| medium | warning   | warningForeground     | 警告图标，黄色 |
| low    | info      | descriptionForeground | 信息图标，灰色 |
| normal | file-text | foreground            | 文件图标，白色 |

**实现方式**：使用 `vscode.ThemeIcon` + `vscode.ThemeColor` 实现主题自适应

#### 描述信息

已选择的规则在描述前显示 `✓ 已选` 标记：

```
✓ 已选 • typescript, coding • +3
```

包含：

- 选择状态标记（可选）
- 标签列表（最多显示 2 个）
- 附加规则数（如果有更多规则）

#### Tooltip

```markdown
**规则**: typescript-conventions
**文件**: rules/001-typescript-conventions.md
**优先级**: HIGH
**标签**: typescript, coding, conventions
**来源**: my-rules-source
```

---

### 2.4 复选框功能

#### 复选框变更处理

**处理流程**：

1. **收集变更**：按源 ID 分组收集所有复选框变更
2. **获取当前状态**：从 SelectionStateManager 获取每个源的当前选择状态
3. **更新状态**：根据复选框状态添加/移除路径
4. **批量提交**：将每个源的更新批量提交到 SelectionStateManager

**性能优化**：

- 批量处理同一事件循环中的多个变更
- 按源分组，减少 SelectionStateManager 调用次数

---

### 2.5 实时同步机制

#### 监听选择状态变更

**初始化逻辑**：

- 在构造函数中注册 SelectionStateManager 的状态变更监听器
- 监听器被触发时调用防抖刷新方法
- 使用 Disposable 管理监听器生命周期

#### 防抖刷新

**实现机制**：

- 维护一个刷新定时器
- 每次调用时取消旧定时器，启动 300ms 新定时器
- 定时器触发时调用 VSCode API 刷新整个树视图

**目的**: 避免频繁刷新导致 UI 卡顿

---

### 2.6 数据加载流程

```
getRootItems()
  ↓
获取所有规则源（rulesManager.getAllSources()）
  ↓
对每个源:
  ├─ 获取规则列表（rulesManager.getRulesBySource(sourceId)）
  ├─ 从 SelectionStateManager 获取选择状态
  ├─ 计算 selectedCount / totalCount
  └─ 创建源节点（TreeItemData）
  ↓
返回源节点列表
```

```
getChildren(source node)
  ↓
获取该源的规则列表（rulesManager.getRulesBySource(sourceId)）
  ↓
从 SelectionStateManager 获取选择状态
  ↓
对每个规则:
  └─ 创建规则节点（TreeItemData + isSelected）
  ↓
返回规则节点列表
```

---

## 3. 交互功能

### 3.1 右键菜单

支持的上下文菜单操作：

- **规则源节点**:
  - 刷新规则源
  - 查看源详情
  - 启用/禁用源
  - 编辑源配置
  - 删除源
- **规则节点**:
  - 查看规则详情
  - 在编辑器中打开
  - 复制规则内容

### 3.2 双击操作

- **双击规则项**: 在编辑器中打开原始 Markdown 文件

---

## 4. 性能优化

### 4.1 防抖机制

- **复选框变更**: 批量处理同一事件循环中的多个变更
- **树视图刷新**: 300ms 防抖，避免频繁刷新

### 4.2 缓存策略

- 选择状态缓存在 `SelectionStateManager` 内存中
- 规则列表缓存在 `RulesManager` 中
- 只在数据变更时刷新树视图

---

## 5. 边界处理

### 5.1 空数据

- **无规则源**: 显示空态提示（"No rule sources configured"）
- **源中无规则**: 显示 "📭 无规则" 状态

### 5.2 错误处理

- **获取规则失败**: 日志记录错误，显示为空列表
- **选择状态加载失败**: 默认为全不选状态（空数组）

### 5.3 UI 细节

- **超长名称**: 在 Tooltip 中完整展示
- **MarkdownString**: 严格转义用户内容，防止 XSS
- **主题适配**: 使用 ThemeColor，自动适配浅色/深色主题

---

## 6. 测试覆盖

### 6.1 单元测试

- ✅ 规则源节点创建
- ✅ 规则节点创建
- ✅ 图标和描述生成
- ✅ 复选框状态计算

### 6.2 集成测试

- ✅ 树视图加载和刷新
- ✅ 复选框变更同步到 SelectionStateManager
- ✅ 右键菜单操作触发命令
- ✅ 双击打开文件

---

## 7. 相关文件

- **实现**: `src/providers/RulesTreeProvider.ts`
- **类型**: `src/types/rules.ts`（TreeItemData）
- **依赖**:
  - `src/services/SelectionStateManager.ts` - 选择状态管理
  - `src/services/RulesManager.ts` - 规则数据管理
- **测试**:
  - `src/test/unit/providers/RulesTreeProvider.test.ts`
  - `src/test/suite/tree-view.spec.ts`

---

## 8. 未来改进

1. **虚拟滚动**: 大量规则时（> 500）优化渲染性能
2. **搜索过滤**: 在树视图内直接搜索规则
3. **拖拽排序**: 支持拖拽调整规则优先级
4. **分组显示**: 按标签、优先级等维度分组显示规则
