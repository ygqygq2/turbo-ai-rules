# 01 - 欢迎页面设计文档

## 页面概述

**页面名称**: Welcome Page (欢迎页面)  
**页面类型**: Webview  
**触发时机**: 首次安装或无配置源时自动显示；可通过命令再次打开

---

## 设计目标

- 🎯 明确"规则同步闭环"：添加源 → 选择规则 → 同步（解析+生成配置）
- 🚀 新用户在 30 秒内完成首次同步（默认全选规则）
- 💎 同步流程中自动生成配置，减少认知负担
- 📚 模板加速起步（点击即添加源并跳到"选择规则"步骤）
- 📖 文档与帮助入口，支持不再显示欢迎页

---

## 页面布局

### 整体结构

```
┌────────────────────────────────────────────────────────────────┐
│                                                                 │
│               🚀 Welcome to Turbo AI Rules                      │
│   Sync AI coding rules & auto-generate tool configs            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ① Add a Rule Source              [➕ Add Source]        │  │
│  │  Configure your first Git repository                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ② Select Rules                   [✅ Select Rules]      │  │
│  │  Choose which rules to sync (filter by tags)            │  │
│  │  Add a source first ⬆                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ③ Sync & Generate                [🔄 Sync Now]         │  │
│  │  Fetch → Parse → Merge → Generate configs               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  📚 Quick Start Templates                                │  │
│  │  One-click add popular rule repositories                │  │
│  │  ┌──────────────────────────────────────────┐           │  │
│  │  │ 🚀 ygqygq2's AI Rules                    │           │  │
│  │  └──────────────────────────────────────────┘           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  [📖 Documentation] [💬 Get Help] [ ] Don't show again          │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### 响应式行为

- **桌面端 (>600px)**: 居中显示，最大宽度 800px，按钮组右对齐（列对齐）
- **移动端 (<600px)**: 全宽显示，按钮组垂直排列，全宽

### 布局特点

- **卡片式设计**: 每个步骤是独立卡片，参考 VSCode Getting Started 设计
- **水平布局**: 步骤号(圆形) + 标题 + 按钮 在同一行，说明文字在下方
- **视觉层次**: 使用圆形数字标记强调步骤顺序
- **间距统一**: 遵循 VSCode 官方间距规范

**CSS 实现**：

```css
.step-header {
  display: flex;
  align-items: center; /* 标题和按钮水平对齐 */
  gap: var(--spacing-md);
}

.step-number {
  width: 28px;
  height: 28px; /* 圆形步骤号 */
  background-color: var(--vscode-button-background);
  border-radius: 50%;
}

.step-description {
  margin-left: 44px; /* 与标题左对齐 */
}
```

---

## 视觉设计

### 步骤卡片布局

- **Step 1**: `①` + "Add a Rule Source" + [Add Source 按钮]，下方显示说明
- **Step 2**: `②` + "Select Rules" + [Select Rules 按钮]，无源时下方显示提示
- **Step 3**: `③` + "Sync & Generate" + [Sync Now 按钮]，下方显示流程说明
- **Step 3**: 标题下方显示 `Sync Now` (主按钮)，右侧显示说明文字
- **Step 3**: `Sync Now` (主按钮) + `Advanced` (次按钮) 并排，右对齐

**对齐策略**:

- 所有按钮组使用 `width: 260px` 固定宽度（隐形盒子）
- 按钮使用 `.button-wrapper` 包裹，确保垂直对齐
- 确保三个步骤的主按钮（第一个按钮）在垂直方向上列对齐

### 颜色方案

```css
/* 按钮组容器 - 固定宽度的隐形盒子 */
.button-group {
  width: 260px;
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

/* 按钮包装器 - 用于垂直排列按钮和提示 */
.button-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

/* 卡片背景 */
background-color: var(--vscode-editorWidget-background);
border: 1px solid var(--vscode-editorWidget-border);
border-radius: 4px;
padding: 16px 20px;

/* 主要按钮 */
background-color: var(--vscode-button-background);
color: var(--vscode-button-foreground);
padding: 8px 16px;
border-radius: 4px;

/* 次要按钮 */
background-color: var(--vscode-button-secondaryBackground);
color: var(--vscode-button-secondaryForeground);
```

### 图标使用

- ➕ Add Source - `codicon-add` (16px，加号图标)
- 📦 Templates - `codicon-package`
- ✅ Select Rules - `codicon-list-selection` (16px，列表选择图标)
- 🔄 Sync Now - `codicon-sync` (16px，同步图标)
- ⚙ Advanced - `codicon-settings-gear`
- 📖 Documentation - `codicon-book`
- 💬 Get Help - `codicon-comment-discussion`
- 🚀 Template Icon - Emoji

**按钮图标样式**：

```css
.button .icon {
  flex-shrink: 0;
  font-size: 16px; /* 图标稍大，更明显 */
}

.button {
  gap: 8px; /* 图标和文字间距 */
}
```

---

## 交互设计

### 用户流程

```
首次启动
  ↓
欢迎页显示（复选框未勾选）
  ↓
Step1 Add Source → 成功后提示"进入 Select Rules?"
  ↓
Step2 Select Rules → 默认全选，可过滤标签/优先级并保存选择
  ↓
Step3 Sync & Generate → 一次执行同步闭环（含生成配置文件）
  ↓
结果展示（成功/冲突/错误）→ 可跳转冲突页面或规则详情/编辑
  ↓
勾选 Don't show again → 下次启动不再自动显示（已勾选）
  ↓
通过命令手动打开 Welcome 页 → 复选框显示为已勾选状态（反映当前设置）
  ↓
用户可取消勾选 → 恢复自动显示欢迎页
```

### 模板功能

**预定义模板**：

| 模板名称           | 描述               | Git 仓库                                |
| ------------------ | ------------------ | --------------------------------------- |
| ygqygq2's AI Rules | 一些常用的规则模板 | https://github.com/ygqygq2/ai-rules.git |

**点击模板**：自动添加对应的 Git 源到配置（显示确认对话框）

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
// 前端加载完成（VSCode 最佳实践）
{ type: 'ready' }

// 添加源
{ type: 'addSource' }

// 打开模板选择
{ type: 'openTemplates' }

// 选择规则
{ type: 'selectRules' }

// 同步并生成配置
{ type: 'syncAndGenerate' }

// 打开高级选项
{ type: 'openAdvancedOptions' }

// 使用模板
{ type: 'useTemplate', payload: { template: 'typescript' | 'react' | 'python' } }

// 打开文档
{ type: 'viewDocs' }

// 获取帮助
{ type: 'getHelp' }

// 更新"Don't show this again"状态（实时保存）
{ type: 'updateDontShowAgain', payload: { checked: boolean } }

// 关闭欢迎页（已废弃，现在使用 updateDontShowAgain）
{ type: 'dismiss', payload: { checked: boolean } }
```

### Extension → Webview 消息

```typescript
// 发送初始状态（响应 ready 消息）
{ type: 'initialState', payload: { dontShowAgain: boolean } }

// 更新 Select Rules 按钮是否可用
{ type: 'rulesSelectionState', enabled: boolean }

// 同步阶段进度（简要）
{ type: 'syncStage', stage: string, percent: number }
```

**通信时序（VSCode 最佳实践）**:

1. Webview 加载完成 → 发送 `ready` 消息
2. Extension 收到 `ready` → 发送 `initialState` 消息（包含 `dontShowAgain` 状态）
3. 前端接收 `initialState` → 更新复选框状态
4. 用户点击复选框 → 发送 `updateDontShowAgain` → Extension 立即保存状态

这样可以避免时序问题（Extension 在 Webview 加载完成前发送消息导致消息丢失）。

---

## 无障碍支持

- **键盘导航**: Tab 键可遍历所有按钮
- **焦点指示**: 清晰的焦点边框
- **屏幕阅读器**: 所有按钮和卡片都有 `aria-label`

```html
<button aria-label="Add a new rule source" onclick="addSource()">➕ Add Source</button>
```

---
