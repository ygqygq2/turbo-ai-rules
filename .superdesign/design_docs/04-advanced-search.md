# 高级搜索界面设计文档

## 页面概述

**页面名称**: Advanced Search (高级搜索界面)  
**页面类型**: Webview  
**实现文件**: `src/providers/SearchWebviewProvider.ts`  
**访问方式**: 工具栏搜索图标 / 快捷键 `Cmd/Ctrl+Shift+Alt+F`

---

## 设计目标

- 🔍 提供强大的多条件搜索能力
- 📜 保存搜索历史（最近 10 次）
- ⚡ 快捷过滤器加速常用搜索
- 📊 实时显示搜索结果
- 📥 支持结果导出（JSON/CSV）
- 🎯 支持批量操作（选中、导出）
- 📄 支持 Markdown 预览（在 VSCode 中打开）
- 🔖 显示匹配字段提示

---

## 页面布局

### 整体结构

```
┌─────────────────────────────────────────────────┐
│ Advanced Rule Search                        [×] │
├─────────────────────────────────────────────────┤
│ 🔍 Search Conditions                            │
│ ┌───────────────────────────────────────────┐   │
│ │ Name: [__________] Content: [__________]  │   │
│ │ Tags: [__________] Source:  [__________]  │   │
│ │                     [🔍 Search] [⟲ Reset] │   │
│ └───────────────────────────────────────────┘   │
│                                                  │
│ ⚡ Quick Filters                                 │
│ ┌───────────────────────────────────────────┐   │
│ │ [🔥 High]  [⚠️ Medium]  [ℹ️ Low]  [🔄]    │   │
│ └───────────────────────────────────────────┘   │
│                                                  │
│ 🕒 标题:"auth" · 内容:"jwt" · 优先级:high · ... ×  │
│                                                  │
│ 📊 Results (23 found)              [Export ▼]   │
│ ┌───────────────────────────────────────────┐   │
│ │ □ 🔥 auth/jwt-validation.mdc              │   │
│ │    Source: company-rules                  │   │
│ │    Tags: auth, security, jwt              │   │
│ │    Matched: name, tags                    │   │
│ │    [📄 预览 Markdown] [✅ 选中规则]        │   │
│ ├───────────────────────────────────────────┤   │
│ │ □ ⚠️  security/input-sanitize.mdc         │   │
│ │    Source: best-practices                 │   │
│ │    Tags: security, validation             │   │
│ │    Matched: content, tags                 │   │
│ │    [📄 预览 Markdown] [✅ 选中规则]        │   │
│ ├───────────────────────────────────────────┤   │
│ │ ... 21 more results                       │   │
│ └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### 响应式行为

- **桌面端 (>900px)**: 左侧搜索条件 + 右侧结果（2 列布局）
- **平板端 (600-900px)**: 上下布局（搜索条件折叠）
- **移动端 (<600px)**: 单列，搜索条件默认折叠

---

## 视觉设计

### 颜色方案

```css
/* 搜索条件卡片 */
.search-form {
  background-color: var(--vscode-editorWidget-background);
  border: 1px solid var(--vscode-editorWidget-border);
  border-radius: 4px;
  padding: 12px 16px;
  margin-bottom: 12px;
}

/* 输入框 - 一行2列布局 */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 8px;
}

.search-input {
  width: 100%;
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
}

.search-input:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
}

/* 快捷过滤器 */
.quick-filter {
  display: inline-flex;
  align-items: center;
  background-color: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: none;
  padding: 6px 12px;
  margin: 4px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-filter.active {
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.quick-filter:hover {
  background-color: var(--vscode-button-hoverBackground);
}

/* 搜索历史 - 横向单行滚动 */
.history-container {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.history-list-horizontal {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  overflow-y: hidden;
  flex: 1;
  padding: 2px 0;
}

.history-item-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background-color: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  border-radius: 12px;
  cursor: pointer;
  font-size: 11px;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.2s;
}

.history-item-chip:hover {
  background-color: var(--vscode-list-activeSelectionBackground);
  transform: translateY(-1px);
}

/* 结果卡片 */
.result-card {
  background-color: var(--vscode-editorWidget-background);
  border: 1px solid var(--vscode-editorWidget-border);
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 12px;
  transition: all 0.2s;
}

.result-card:hover {
  border-color: var(--vscode-focusBorder);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 匹配字段标记 */
.matched-field {
  background-color: var(--vscode-editor-findMatchHighlightBackground);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  margin: 0 4px;
}
```

### 图标使用

- 🔍 Search - `codicon-search`
- 🔥 High Priority - `codicon-flame`
- ⚠️ Medium Priority - `codicon-warning`
- ℹ️ Low Priority - `codicon-info`
- 🔄 Clear - `codicon-clear-all`
- 📥 Export - `codicon-export`
- 👁️ View - `codicon-eye`

---

## 数据结构

### 搜索条件

```typescript
interface SearchCriteria {
  namePattern?: string; // 规则名称模糊匹配
  contentPattern?: string; // 内容全文搜索
  tags?: string[]; // 标签过滤
  priority?: 0 | 1 | 2; // 优先级筛选
  source?: string; // 来源过滤（支持 ID 和 Name）
}
```

### 搜索结果

```typescript
interface SearchResult {
  rule: ParsedRule; // 匹配的规则
  matchedFields: string[]; // 匹配的字段列表 ['name', 'tags']
  score?: number; // 匹配分数（可选）
}
```

### 搜索历史

```typescript
interface SearchHistoryItem {
  criteria: SearchCriteria; // 搜索条件
  timestamp: number; // 搜索时间戳
  resultCount: number; // 结果数量
  summary: string; // 搜索摘要（如"标题:"auth" + 优先级:high"）
}
```

---

## 交互设计

### 搜索流程

```
输入搜索条件
    ↓
防抖 300ms
    ↓
执行搜索（显示加载状态）
    ↓
展示结果
    ↓
保存到历史记录
```

### 快捷过滤器

**功能**：一键快速筛选

| 按钮            | 操作               |
| --------------- | ------------------ |
| 🔥 High         | 筛选高优先级规则   |
| ⚠️ Medium       | 筛选中优先级规则   |
| ℹ️ Low          | 筛选低优先级规则   |
| 🔄 Clear        | 清除所有搜索条件   |
| [源名称] 下拉框 | 筛选特定源的规则   |
| [All] 优先级    | 显示所有优先级规则 |

### 搜索历史

**功能**：点击历史记录重新搜索

**显示信息**：

- 搜索摘要（条件组合）
- 结果数量
- 相对时间（刚刚/分钟前/小时前/天前）

**存储**：

- 存储位置：`globalState`
- 最大数量：5 条
- 去重策略：相同条件不重复，保留最新

**交互**：

- 简洁链接样式显示
- 点击链接重新执行搜索
- 清空按钮（× 图标）位于右侧

### 搜索结果操作按钮

**单条规则操作**（每个搜索结果卡片上）：

| 按钮             | 图标 | 功能说明                                                         |
| ---------------- | ---- | ---------------------------------------------------------------- |
| 📄 预览 Markdown | 📄   | 打开 Rule Details Panel（Webview），显示规则详细信息和格式化内容 |
| ✅ 选中规则      | ✅   | 显示扩展侧边栏，在 TreeView 中自动勾选该规则（添加到选择列表）   |

**批量操作**（多选后显示）：

| 按钮     | 功能说明                                         |
| -------- | ------------------------------------------------ |
| 批量选中 | 显示扩展侧边栏，在 TreeView 中勾选所有选择的规则 |
| 批量导出 | 将搜索结果导出为 JSON 或 CSV 格式文件            |

---

## 动画效果

### 页面加载

```css
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.search-container {
  animation: fadeIn 0.3s ease-out;
}
```

### 结果出现

```css
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.result-card {
  animation: slideInUp 0.3s ease-out;
}

/* 结果依次出现 */
.result-card:nth-child(1) {
  animation-delay: 0s;
}
.result-card:nth-child(2) {
  animation-delay: 0.05s;
}
.result-card:nth-child(3) {
  animation-delay: 0.1s;
}
```

### 搜索加载

```css
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.searching .search-icon {
  animation: pulse 1.5s ease-in-out infinite;
}
```

---

## 消息通信

### Webview → Extension 消息

```typescript
// 执行搜索
{ type: 'search', payload: { criteria: SearchCriteria } }

// 查看规则详情（打开 Rule Details Panel）
{ type: 'viewRule', payload: { ruleId: string } }

// 选中规则（显示侧边栏 TreeView 并勾选规则）
{ type: 'selectRules', payload: { ruleIds: string[] } }

// 导出结果
{ type: 'exportResults', payload: { format: 'json' | 'csv', ruleIds?: string[] } }

// 加载历史记录
{ type: 'loadHistory' }

// 应用历史搜索
{ type: 'applyHistory', payload: { criteria: SearchCriteria } }

// 清除历史记录
{ type: 'clearHistory' }
```

### Extension → Webview 消息

```typescript
// 搜索结果
{ type: 'searchResults', payload: { results: SearchResult[] } }

// 搜索历史
{ type: 'searchHistory', payload: { history: SearchHistoryItem[] } }

// 错误消息
{ type: 'error', payload: { message: string } }

// 成功消息
{ type: 'success', payload: { message: string } }
```

---

## 搜索算法

### 多条件组合

**逻辑**：所有条件 AND 组合

```
规则匹配 =
  (namePattern 匹配 OR namePattern 为空) AND
  (contentPattern 匹配 OR contentPattern 为空) AND
  (tags 匹配 OR tags 为空) AND
  (priority 匹配 OR priority 为 All) AND
  (source 匹配 OR source 为 All)
```

### 模糊匹配

- **名称**: 不区分大小写，子串匹配
- **内容**: 全文搜索，支持多个关键词
- **标签**: 交集判断（包含任一标签即匹配）

### 结果排序

1. 优先级高的优先
2. 匹配字段多的优先
3. 名称匹配优先于内容匹配
4. 按字母顺序

---

## 性能优化

### 防抖搜索

```typescript
let searchTimeout: NodeJS.Timeout;

function debounceSearch(criteria: SearchCriteria) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    executeSearch(criteria);
  }, 300); // 300ms 延迟
}
```

### 虚拟滚动

**适用场景**：结果数 > 100

**实现**：仅渲染可见区域的结果

### 结果缓存

- 缓存最近 5 次搜索结果
- 相同条件直接返回缓存

---

## 无障碍支持

```html
<!-- 搜索表单 -->
<form role="search" aria-label="Advanced rule search">
  <label for="name-input">Rule Name</label>
  <input
    id="name-input"
    type="text"
    aria-describedby="name-hint"
    placeholder="Enter rule name..."
  />
  <span id="name-hint" class="sr-only">Search by rule name, supports partial matching</span>
</form>

<!-- 结果列表 -->
<div role="region" aria-label="Search results" aria-live="polite">
  <p>Found 23 results</p>
  <ul role="list">
    <li role="listitem">
      <!-- 结果项 -->
    </li>
  </ul>
</div>

<!-- 快捷过滤器 -->
<div role="group" aria-label="Quick filters">
  <button aria-label="Filter high priority rules" aria-pressed="false">🔥 High</button>
</div>
```

---

## 性能指标

- **搜索响应**: < 100ms（100 条规则）
- **结果渲染**: < 50ms（50 条结果）
- **防抖延迟**: 300ms
- **内存占用**: < 10MB

---

_设计版本: 2.0_  
_最后更新: 2025-10-27_
