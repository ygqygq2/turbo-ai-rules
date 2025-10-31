# 欢迎页面设计文档

## 页面概述

**页面名称**: Welcome Page (欢迎页面)  
**页面类型**: Webview  
**实现文件**: `src/providers/WelcomeWebviewProvider.ts`  
**触发时机**: 首次安装或无配置源时自动显示

---

## 设计目标

- 🎯 降低新用户学习成本，提供清晰的入门指引
- 🚀 通过 3 步引导帮助用户快速开始
- 📚 提供模板库加速配置
- 📖 链接文档和帮助资源

---

## 页面布局

### 整体结构

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│               🚀 Welcome to Turbo AI Rules           │
│                                                      │
│         Sync AI coding rules from Git repositories  │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │  Step 1: Add a Rule Source                    │ │
│  │  Configure your first Git repository          │ │
│  │                                                │ │
│  │         [➕ Add Source]                        │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │  Step 2: Sync Rules                           │ │
│  │  Fetch rules from your sources                │ │
│  │                                                │ │
│  │         [🔄 Sync Now]                          │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │  Step 3: Generate Configs                     │ │
│  │  Create AI tool configuration files           │ │
│  │                                                │ │
│  │         [📝 Generate]                          │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │  📚 Quick Start Templates                      │ │
│  │  • TypeScript Best Practices                  │ │
│  │  • React Development Rules                    │ │
│  │  • Python Style Guide                         │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│       [📖 Documentation]     [💬 Get Help]          │
│                                                      │
│       [ ] Don't show this again                     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 响应式行为

- **桌面端 (>600px)**: 居中显示，最大宽度 800px
- **移动端 (<600px)**: 全宽显示，内边距减小

---

## 视觉设计

#### Step 1 按钮区

- [Add Source]：添加规则源
- [Select Rules]：选择/定制要同步的规则（仅在有源时可用）
- 两按钮并列，便于用户在添加源后立即定制同步范围，提升流畅度

### 颜色方案

```css
/* 标题 */
color: var(--vscode-foreground);
font-size: 24px;
font-weight: 600;

/* 副标题 */
color: var(--vscode-descriptionForeground);
font-size: 14px;

/* 卡片背景 */
background-color: var(--vscode-editorWidget-background);
border: 1px solid var(--vscode-editorWidget-border);
border-radius: 4px;
padding: 20px;

/* 主要按钮 */
background-color: var(--vscode-button-background);
color: var(--vscode-button-foreground);
padding: 8px 16px;
border-radius: 4px;
```

### 图标使用

- ➕ Add Source - `codicon-add`
- 🔄 Sync - `codicon-sync`
- 📝 Generate - `codicon-file-code`
- 📖 Documentation - `codicon-book`
- 💬 Help - `codicon-comment-discussion`

---

## 交互设计

### 用户流程

```
用户首次启动
    ↓
显示欢迎页面
    ↓
Step 1: 点击"Add Source" → 打开源配置对话框
    ↓
Step 2: 点击"Sync Now" → 执行同步命令
    ↓
Step 3: 点击"Generate" → 生成配置文件
    ↓
勾选"Don't show again" → 不再显示欢迎页
```

### 模板功能

**预定义模板**：

| 模板名称   | 描述                    | Git 仓库                  |
| ---------- | ----------------------- | ------------------------- |
| TypeScript | TypeScript 项目规则模板 | turbo-ai/typescript-rules |
| React      | React 组件开发规则      | turbo-ai/react-rules      |
| Python     | Python 开发规则         | turbo-ai/python-rules     |

**点击模板**：自动添加对应的 Git 源到配置

---

## 动画效果

### 页面加载

```css
/* 淡入动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.welcome-container {
  animation: fadeIn 0.4s ease-out;
}
```

### 卡片动画

```css
/* 卡片依次出现（错开动画） */
.step-card:nth-child(1) {
  animation-delay: 0.1s;
}
.step-card:nth-child(2) {
  animation-delay: 0.2s;
}
.step-card:nth-child(3) {
  animation-delay: 0.3s;
}
```

### 按钮交互

```css
.button:hover {
  transform: scale(1.05);
  transition: transform 0.2s;
}

.button:active {
  transform: scale(0.98);
}
```

---

## 消息通信

### Webview → Extension 消息

```typescript
// 添加源
{ type: 'addSource' }

// 同步规则
{ type: 'syncRules' }

// 生成配置
{ type: 'generateConfigs' }

// 使用模板
{ type: 'useTemplate', payload: { template: 'typescript' } }

// 打开文档
{ type: 'viewDocs' }

// 标记不再显示
{ type: 'dismiss' }
```

### Extension → Webview 消息

```typescript
// 更新状态
{ type: 'updateStatus', status: 'syncing' | 'success' | 'error' }
```

---

## 无障碍支持

- **键盘导航**: Tab 键可遍历所有按钮
- **焦点指示**: 清晰的焦点边框
- **屏幕阅读器**: 所有按钮和卡片都有 `aria-label`

```html
<button aria-label="Add a new rule source" onclick="addSource()">➕ Add Source</button>
```

---

## 性能考虑

- **轻量级**: 无外部依赖，纯 HTML/CSS
- **快速加载**: < 100ms
- **内存占用**: < 5MB

---

_设计版本: 2.0_  
_最后更新: 2025-10-27_
