# 规则详情面板设计文档

## 页面概述

**页面名称**: Rule Details Panel (规则详情面板)  
**页面类型**: Webview  
**实现文件**: `src/providers/RuleDetailsWebviewProvider.ts`  
**访问方式**: 树视图右键 "View Details" / 双击规则节点

---

## 设计目标

- 📋 展示规则完整元数据
- 📄 预览 Markdown 格式的规则内容
- ⚡ 提供快速操作（复制、导出、编辑）
- 🔍 支持内容搜索和自动换行切换

---

## 页面布局

### 整体结构

````
┌─────────────────────────────────────────┐
│ 📄 TypeScript Naming Conventions        │
│               [↔️] [📋] [📥] [📝] [×]   │  ← 工具栏
├─────────────────────────────────────────┤
│ 📊 Metadata                             │
│ ┌───────────────────────────────────┐   │
│ │ Source: company-rules             │   │
│ │ File Path: rules/ts-naming.mdc    │   │
│ │ Version: 1.2.0                    │   │
│ │ Author: Team Lead                 │   │
│ │ Priority: high 🔥                 │   │
│ └───────────────────────────────────┘   │
├─────────────────────────────────────────┤
│ 📝 Description                          │
│ ┌───────────────────────────────────┐   │
│ │ Naming conventions for TypeScript │   │
│ │ projects, including variables,    │   │
│ │ functions, classes, and more.     │   │
│ └───────────────────────────────────┘   │
├─────────────────────────────────────────┤
│ 🏷️ Tags                                 │
│ ┌───────────────────────────────────┐   │
│ │ [typescript] [naming] [style]     │   │
│ │ [conventions] [best-practices]    │   │
│ └───────────────────────────────────┘   │
├─────────────────────────────────────────┤
│ 📄 Content Preview                      │
│ ┌───────────────────────────────────┐   │
│ │ # Naming Conventions              │   │
│ │                                   │   │
│ │ ## Variables                      │   │
│ │ Use camelCase for variables:      │   │
│ │ ```typescript                     │   │
│ │ const userName = "John";          │   │
│ │ ```                               │   │
│ │                                   │   │
│ │ ## Classes                        │   │
│ │ Use PascalCase for classes:       │   │
│ │ ```typescript                     │   │
│ │ class UserAccount {}              │   │
│ │ ```                               │   │
│ │                                   │   │
│ │ [显示更多...]                     │   │
│ └───────────────────────────────────┘   │
├─────────────────────────────────────────┤
│ 🔧 Additional Metadata                  │
│ ┌───────────────────────────────────┐   │
│ │ Created: 2025-01-15               │   │
│ │ Modified: 2025-10-20              │   │
│ │ Related Rules: 3                  │   │
│ └───────────────────────────────────┘   │
└─────────────────────────────────────────┘
````

### 响应式行为

- **桌面端 (>600px)**: 单列布局，最大宽度 900px
- **移动端 (<600px)**: 全宽，减小内边距

---

## 视觉设计

### 颜色方案

```css
/* 标题 */
.rule-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--vscode-foreground);
  padding: 16px;
  border-bottom: 1px solid var(--vscode-editorWidget-border);
}

/* 工具栏 */
.toolbar {
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  background-color: var(--vscode-editorWidget-background);
  border-bottom: 1px solid var(--vscode-editorWidget-border);
}

/* 元数据卡片 */
.metadata-section {
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-editorWidget-border);
  border-radius: 4px;
  padding: 16px;
  margin: 16px;
}

.metadata-item {
  display: flex;
  margin-bottom: 8px;
}

.metadata-label {
  color: var(--vscode-descriptionForeground);
  min-width: 100px;
}

.metadata-value {
  color: var(--vscode-foreground);
}

/* 优先级徽章 */
.priority-high {
  background-color: var(--vscode-errorForeground);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

/* 标签 */
.tag {
  display: inline-block;
  background-color: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  padding: 4px 12px;
  margin: 4px;
  border-radius: 12px;
  font-size: 14px;
}

/* 内容预览 */
.content-preview {
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-editorWidget-border);
  border-radius: 4px;
  padding: 16px;
  margin: 16px;
  font-family: var(--vscode-editor-font-family);
  max-height: 500px;
  overflow-y: auto;
}

/* Markdown 样式 */
.content-preview h1 {
  font-size: 24px;
  margin-top: 16px;
  margin-bottom: 8px;
  color: var(--vscode-foreground);
}

.content-preview h2 {
  font-size: 20px;
  margin-top: 12px;
  margin-bottom: 6px;
  color: var(--vscode-foreground);
}

.content-preview code {
  background-color: var(--vscode-textCodeBlock-background);
  padding: 2px 4px;
  border-radius: 3px;
  font-family: var(--vscode-editor-font-family);
}

.content-preview pre {
  background-color: var(--vscode-textCodeBlock-background);
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
}
```

### 图标使用

- ↔️ Toggle Wrap - `codicon-word-wrap`
- 📋 Copy - `codicon-copy`
- 📥 Export - `codicon-export`
- 📝 Edit - `codicon-edit`
- × Close - `codicon-close`

---

## 交互设计

### 快速操作

| 按钮           | 功能                   | 快捷键 |
| -------------- | ---------------------- | ------ |
| ↔️ Toggle Wrap | 切换内容自动换行       | Ctrl+W |
| 📋 Copy        | 复制规则内容到剪贴板   | Ctrl+C |
| 📥 Export      | 导出为 Markdown 文件   | Ctrl+E |
| 📝 Edit        | 在编辑器中打开原始文件 | Ctrl+O |
| × Close        | 关闭详情面板           | Esc    |

### 自动换行切换

**默认状态**: 自动换行开启

**切换效果**:

```css
/* 开启自动换行 */
.content-preview {
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* 关闭自动换行 */
.content-preview.no-wrap {
  white-space: pre;
  overflow-x: auto;
}
```

---

## 数据结构

### 规则元数据

```typescript
interface RuleMetadata {
  // 基础信息
  name: string; // 规则名称
  path: string; // 文件路径
  source: string; // 来源名称
  version?: string; // 版本号
  author?: string; // 作者

  // 分类信息
  priority: 0 | 1 | 2; // 优先级
  tags: string[]; // 标签列表
  description?: string; // 描述

  // 内容
  content: string; // Markdown 内容

  // 时间戳
  created?: string; // 创建时间
  modified?: string; // 修改时间

  // 其他
  relatedRules?: string[]; // 相关规则
  [key: string]: any; // 自定义字段
}
```

---

## 动画效果

### 页面加载

```css
@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.details-container {
  animation: slideInRight 0.3s ease-out;
}
```

### 工具栏按钮

```css
.toolbar-button {
  transition: all 0.2s ease;
}

.toolbar-button:hover {
  background-color: var(--vscode-toolbar-hoverBackground);
  transform: scale(1.1);
}

.toolbar-button:active {
  transform: scale(0.95);
}
```

### 标签悬停

```css
.tag {
  transition: all 0.2s ease;
  cursor: pointer;
}

.tag:hover {
  background-color: var(--vscode-badge-foreground);
  color: var(--vscode-badge-background);
  transform: translateY(-2px);
}
```

---

## 消息通信

### Webview → Extension 消息

```typescript
// 复制内容
{ type: 'copyContent' }

// 导出规则
{ type: 'exportRule', payload: { format: 'markdown' } }

// 编辑规则
{ type: 'editRule', payload: { path: string } }

// 切换自动换行
{ type: 'toggleWrap' }

// 查看相关规则
{ type: 'viewRelatedRule', payload: { rulePath: string } }

// 按标签搜索
{ type: 'searchByTag', payload: { tag: string } }
```

### Extension → Webview 消息

```typescript
// 加载规则数据
{ type: 'loadRule', data: RuleMetadata }

// 复制成功
{ type: 'copySuccess' }

// 导出完成
{ type: 'exportComplete', path: string }
```

---

## 安全实现

### HTML 转义

**防止 XSS 攻击**：

```typescript
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
```

### Markdown 渲染安全

- 使用 VS Code 内置 Markdown 渲染器（如果可用）
- 或使用 `marked` 库的 `sanitize` 选项
- 禁止执行内嵌脚本

---

## 无障碍支持

```html
<!-- 工具栏 -->
<div class="toolbar" role="toolbar" aria-label="Rule actions">
  <button aria-label="Toggle word wrap" onclick="toggleWrap()">
    <i class="codicon codicon-word-wrap"></i>
  </button>
  <button aria-label="Copy content to clipboard" onclick="copyContent()">
    <i class="codicon codicon-copy"></i>
  </button>
</div>

<!-- 元数据 -->
<dl class="metadata-section" aria-label="Rule metadata">
  <dt class="metadata-label">Priority:</dt>
  <dd class="metadata-value">high</dd>
</dl>

<!-- 标签 -->
<div role="list" aria-label="Tags">
  <span role="listitem" class="tag" tabindex="0">typescript</span>
</div>
```

---

## 性能考虑

### 内容加载

- **按需加载**: 仅在打开详情时加载完整内容
- **异步渲染**: 大内容分块渲染
- **缓存**: 缓存已加载的规则内容

### Markdown 渲染

- **轻量级**: 使用简化的 Markdown 渲染
- **语法高亮**: 仅渲染可见代码块
- **延迟加载**: 长文档延迟渲染后续内容

### 内存管理

- **关闭清理**: 面板关闭时释放资源
- **内容限制**: 超大文件显示摘要 + "查看完整"链接

---

## 性能指标

- **初始加载**: < 100ms
- **Markdown 渲染**: < 50ms（1000 行以内）
- **内存占用**: < 5MB/面板

---

_设计版本: 2.0_  
_最后更新: 2025-10-27_
