# 树视图界面设计文档

## 页面概述

**页面名称**: Rules Tree View (规则树视图)  
**页面类型**: VS Code TreeView  
**实现文件**: `src/providers/RulesTreeProvider.ts`  
**位置**: VS Code 活动栏（侧边栏）

---

## 设计目标

- 📂 分层展示规则源和规则列表
- 🎨 丰富的视觉层次和图标系统
- ⚡ 快速访问常用操作
- 📊 显示关键元数据信息
- 🖱️ 支持右键上下文菜单

---

## 页面布局

### 树结构

```
🎯 AI RULES (156)                           [⚙️] [🔄] [➕] [🔍]
├─ 📦 company-rules                         main   ✓
│  ├─ 🔥 auth/jwt-validation.mdc           HIGH • auth, security
│  ├─ ⚠️  security/input-sanitize.mdc      MEDIUM • security
│  └─ ℹ️  style/naming-conventions.mdc     LOW • style, naming
│
├─ 📦 personal-rules                        develop ✗
│  ├─ 🔥 typescript/strict-mode.mdc        HIGH • ts, config
│  └─ ⚠️  react/hooks-rules.mdc            MEDIUM • react, hooks
│
└─ 📦 archived-rules                        main   ⚠️ (冲突)
   └─ ℹ️  legacy/old-patterns.mdc          LOW • legacy

底部统计栏:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 156 规则 | ✓ 2/3 源 | ⚠️ 2 冲突
```

### 工具栏按钮

| 图标 | 功能     | 快捷键           | 位置 |
| ---- | -------- | ---------------- | ---- |
| ⚙️   | 管理源   | Ctrl+Shift+M     | 1    |
| 🔄   | 同步规则 | Ctrl+Shift+R     | 2    |
| ➕   | 添加源   | Ctrl+Shift+A     | 3    |
| 🔍   | 高级搜索 | Ctrl+Shift+Alt+F | 4    |
| 📊   | 显示统计 | -                | 5    |

---

## 视觉设计

### 图标系统

**源节点图标**:

- 📦 `codicon-package` - 规则源
- 🟢 绿色圆点 - 启用且已同步
- 🔴 红色圆点 - 禁用
- 🟡 黄色圆点 - 同步中
- ⚠️ 警告标志 - 有冲突

**规则节点图标**:

- 🔥 `codicon-flame` - 高优先级（红色）
- ⚠️ `codicon-warning` - 中优先级（黄色）
- ℹ️ `codicon-info` - 低优先级（灰色）

### 颜色编码

```typescript
// 优先级颜色
高优先级: 'errorForeground'; // 红色
中优先级: 'editorWarning.foreground'; // 黄色
低优先级: 'descriptionForeground'; // 灰色

// 源状态
启用: 'charts.green'; // 绿色
禁用: 'errorForeground'; // 红色
同步中: 'charts.yellow'; // 黄色
```

### Tooltip 信息

**源节点 Tooltip**:

```markdown
**company-rules**  
📍 github.com/company/ai-rules  
🌿 Branch: main  
📊 Rules: 89  
✅ Status: Synced (2m ago)
```

**规则节点 Tooltip**:

```markdown
**JWT Validation Rules**  
📁 auth/jwt-validation.mdc  
🔥 Priority: HIGH  
🏷️ Tags: auth, security, jwt  
📦 Source: company-rules
```

### 描述信息

**源节点描述**: `main ✓` (分支 + 状态)  
**规则节点描述**: `HIGH • auth, security` (优先级 + 标签预览)

---

## 交互设计

### 右键菜单

**源节点菜单**:

```
──────────────────────────
✏️  编辑源配置
🔌  测试连接
🔄  启用/禁用切换
🗑️  删除源
──────────────────────────
📊  查看统计
──────────────────────────
```

**规则节点菜单**:

```
──────────────────────────
👁️  查看详情
📋  复制内容
📤  导出规则
✏️  编辑原文件
──────────────────────────
🚫  忽略规则
──────────────────────────
```

### 展开/折叠

- **双击源节点**: 展开/折叠规则列表
- **右箭头键**: 展开节点
- **左箭头键**: 折叠节点
- **全部展开/折叠**: 工具栏下拉菜单

### 选择和操作

- **单击**: 选中节点
- **双击规则**: 打开规则详情面板
- **Ctrl/Cmd+Click**: 多选（Phase 3 待实现）
- **拖放**: 重新排序（Phase 3 待实现）

---

## 数据结构

### 树节点类型

```typescript
interface TreeNode extends vscode.TreeItem {
  // 节点类型
  contextValue: 'source' | 'rule';

  // 显示信息
  label: string; // 节点标题
  description?: string; // 右侧描述
  tooltip?: vscode.MarkdownString; // Tooltip
  iconPath?: vscode.ThemeIcon; // 图标

  // 数据
  data: {
    source?: RuleSource; // 源数据
    rule?: ParsedRule; // 规则数据
  };

  // 状态
  collapsibleState?: vscode.TreeItemCollapsibleState;
}
```

---

## 刷新机制

### 触发刷新的事件

1. **手动刷新**: 点击刷新按钮
2. **自动刷新**: 同步完成后
3. **配置变更**: 源配置修改后
4. **文件变更**: 监听规则文件变化

### 刷新策略

```typescript
// 防抖刷新（避免频繁重绘）
let refreshTimeout: NodeJS.Timeout;

function scheduleRefresh() {
  clearTimeout(refreshTimeout);
  refreshTimeout = setTimeout(() => {
    treeProvider.refresh();
  }, 300); // 300ms 延迟
}
```

### 性能优化

- **增量更新**: 仅刷新变更的节点
- **懒加载**: 展开时才加载子节点
- **虚拟化**: 大量规则时使用虚拟列表（VS Code 内置）

---

## 动画效果

### 节点展开/折叠

VS Code 内置动画，无需自定义。

### 同步进度指示

```
同步中:
📦 company-rules  🔄 Syncing... (67%)

同步完成:
📦 company-rules  ✅ Synced just now
```

---

## 状态管理

### 源状态

| 状态         | 图标 | 描述     |
| ------------ | ---- | -------- |
| `synced`     | ✓    | 已同步   |
| `not_synced` | ✗    | 未同步   |
| `syncing`    | 🔄   | 同步中   |
| `error`      | ❌   | 同步失败 |
| `conflict`   | ⚠️   | 有冲突   |
| `disabled`   | 🔴   | 已禁用   |

### 规则状态

| 状态       | 标识 | 描述   |
| ---------- | ---- | ------ |
| `normal`   | -    | 正常   |
| `ignored`  | 👁️   | 已忽略 |
| `conflict` | ⚠️   | 冲突   |
| `new`      | 🆕   | 新规则 |

---

## 排序规则

### 源排序

1. 启用的源在前
2. 按源名称字母顺序

### 规则排序

1. 优先级高的在前（High → Medium → Low）
2. 同优先级按名称字母顺序

---

## 空状态处理

### 无源状态

```
┌─────────────────────────────┐
│                             │
│   📦 No Rule Sources        │
│                             │
│   Get started by adding     │
│   a rule source.            │
│                             │
│   [➕ Add Source]           │
│                             │
└─────────────────────────────┘
```

### 无规则状态

```
📦 company-rules        main   ✓
   ┌─────────────────────────┐
   │ No rules found.         │
   │ [🔄 Sync Now]           │
   └─────────────────────────┘
```

---

## 无障碍支持

- **键盘导航**: 完整的键盘操作支持
- **屏幕阅读器**: 所有节点都有 `accessibilityInformation`
- **焦点管理**: 清晰的焦点指示

```typescript
// 节点无障碍信息
accessibilityInformation: {
  label: 'company-rules, 89 rules, synced 2 minutes ago',
  role: 'treeitem'
}
```

---

## 性能指标

- **初始加载**: < 200ms（100 条规则）
- **刷新速度**: < 100ms
- **滚动性能**: 60 FPS
- **内存占用**: < 10MB

---

## 与其他组件集成

### 与状态栏集成

- 树视图变化时更新状态栏统计
- 状态栏点击打开树视图

### 与 Webview 集成

- 右键"查看详情" → 打开 RuleDetailsWebview
- 工具栏"统计" → 打开 StatisticsWebview
- 工具栏"搜索" → 打开 SearchWebview

---

_设计版本: 2.0_  
_最后更新: 2025-10-27_
