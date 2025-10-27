# SuperDesign AI 设计规范

> **项目**: Turbo AI Rules Extension  
> **用途**: VS Code Webview UI 设计规范  
> **目标用户**: SuperDesign AI 设计助手

---

## 📋 核心使命

创建符合 VS Code 设计规范、用户体验优秀的 Webview 界面。

**设计目标**：

- 🎨 视觉一致性 - 完全遵循 VS Code UX Guidelines
- 🌈 主题自适应 - 自动适配明亮/暗黑/高对比度主题
- 📱 响应式设计 - 适配 300px - 1920px+ 宽度
- ♿ 无障碍访问 - 符合 WCAG 2.1 标准
- ⚡ 性能优先 - 流畅的交互体验

---

## 🎨 视觉规范

### 主题变量系统

**核心原则：禁止硬编码颜色，必须使用 VS Code CSS 变量！**

**常用变量**：

```css
/* 文本颜色 */
color: var(--vscode-foreground);              /* 主要文本 */
color: var(--vscode-descriptionForeground);   /* 次要文本 */
color: var(--vscode-errorForeground);         /* 错误文本 */

/* 背景颜色 */
background-color: var(--vscode-editor-background);       /* 编辑器背景 */
background-color: var(--vscode-editorWidget-background); /* 组件背景 */
background-color: var(--vscode-input-background);        /* 输入框背景 */

/* 边框 */
border: 1px solid var(--vscode-editorWidget-border);
outline: 1px solid var(--vscode-focusBorder);

/* 按钮 */
background-color: var(--vscode-button-background);
color: var(--vscode-button-foreground);

/* 徽章 */
background-color: var(--vscode-badge-background);
color: var(--vscode-badge-foreground);
```

### 响应式设计

**视口适配**：

- 📱 最小: 300px（窄面板）
- 💻 常规: 600px - 1200px（主工作区）
- 🖥️ 最大: 1920px+（大屏幕）

```css
/* 响应式布局示例 */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

@media (max-width: 600px) {
  .grid {
    grid-template-columns: 1fr; /* 单列 */
  }
}
```

### 间距系统

```css
:root {
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --border-radius: 4px;
}
```

### 图标库

- ✅ **推荐**: [VS Code Codicons](https://microsoft.github.io/vscode-codicons/dist/codicon.html)
- ✅ **备选**: [Lucide Icons](https://lucide.dev/)（通过 CDN）

```html
<i class="codicon codicon-sync"></i>
<i class="codicon codicon-add"></i>
```

---

## 📐 布局规范

### 常用布局模式

```css
/* Flexbox 垂直居中 */
.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Grid 响应式布局 */
.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
}

/* 卡片容器 */
.card {
  background-color: var(--vscode-editorWidget-background);
  border: 1px solid var(--vscode-editorWidget-border);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
}
```

### 参考布局模式

本项目已实现的 Webview 布局参考：

- **WelcomeWebview**: 居中卡片布局 + 步骤引导
- **StatisticsWebview**: 网格卡片 + 数据表格
- **RuleDetailsWebview**: 头部工具栏 + 内容区域
- **SearchWebview**: 侧边栏筛选器 + 主内容区

---

## ✨ 交互规范

### 动画设计

**原则**：

- ⚡ 性能优先：使用 \`transform\` 和 \`opacity\`
- 🎯 目的性：每个动画都有明确的用户反馈目的
- ⏱️ 时长：150ms-300ms（快速反馈），300ms-600ms（过渡效果）

```css
/* 淡入动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.element {
  animation: fadeIn 0.3s ease-out;
}

/* 按钮交互 */
.button {
  transition: all 0.2s ease;
}

.button:hover {
  transform: scale(1.05);
}

.button:active {
  transform: scale(0.98);
}
```

---

## 🔨 设计工作流程
强制：从 design_docs 目录读取设计文档，生成的 HTML 文件名和 design_docs 文件名一致（去掉 .md 后缀），并且加上 `_页面数字序号`。
这是因为一个页面可能有弹窗、按钮等不能同效，这样一个页面可能有多个页面，所以需要一个序号来区分。

### Step 1: 布局设计

**输出**：文本描述 + ASCII 线框图

**任务**：

1. 分析需求，确定页面目标
2. 规划布局结构
3. 绘制 ASCII 线框图
4. 说明响应式行为

**示例**：

```
┌─────────────────────────────────────┐
│  [⚙️ Settings]         [× Close]   │  ← 头部
├─────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  │
│  │  卡片 1     │  │  卡片 2     │  │  ← 网格
│  └─────────────┘  └─────────────┘  │
│  [取消]  [保存]                     │  ← 操作栏
└─────────────────────────────────────┘

响应式：
- 桌面端(>600px): 2列
- 移动端(<600px): 1列
```

---

### Step 2: 主题设计

**输出**：CSS 变量定义

**要求**：

- 使用 VS Code CSS 变量
- 禁止硬编码颜色
- 确保主题自适应

```css
.card {
  background-color: var(--vscode-editorWidget-background);
  border: 1px solid var(--vscode-editorWidget-border);
  padding: var(--spacing-md);
}
```

---

### Step 3: 动画设计

**输出**：CSS 动画代码

**要求**：

- 优先使用 \`transform\` 和 \`opacity\`
- 时长合理（150-600ms）
- 有明确的反馈目的

---

### Step 4: 生成 HTML

**输出**：完整 HTML 文件（使用工具调用）

**要求**：

1. 集成 VS Code Webview API
2. 实现消息通信
3. 配置 CSP 策略
4. 文件路径：\`.superdesign/design_iterations/{页面名}_1.html\`

**基本结构**：

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="..." />
    <title>页面标题</title>
    <style>
      /* Step 2 的样式 */
      /* Step 3 的动画 */
    </style>
  </head>
  <body>
    <!-- Step 1 的布局 -->

    <script nonce="\${nonce}">
      const vscode = acquireVsCodeApi();

      function sendMessage(type, payload) {
        vscode.postMessage({ type, payload });
      }

      window.addEventListener('message', (event) => {
        const message = event.data;
        // 处理消息
      });
    </script>
  </body>
</html>
```

---

## ⚠️ 重要规则

### 必须遵守

1. **工具调用**：使用 \`write()\` 或 \`edit()\` 工具，不要只输出文本
2. **逐步确认**：每个步骤等待用户确认
3. **主题变量**：禁止硬编码颜色（如 \`#000\`, \`rgb(0,0,0)\`）
4. **文件路径**：\`.superdesign/design_iterations/{页面名}_版本.html\`

### 成功检查清单

- [ ] 布局已用户确认
- [ ] 主题使用 CSS 变量
- [ ] 动画已用户确认
- [ ] HTML 包含 \`acquireVsCodeApi()\`
- [ ] CSP 策略已配置
- [ ] 响应式设计已实现

---

## 📚 参考资源

- [VS Code UX Guidelines](https://code.visualstudio.com/api/ux-guidelines/overview)
- [VS Code Codicons](https://microsoft.github.io/vscode-codicons/dist/codicon.html)
- [VS Code Theme Colors](https://code.visualstudio.com/api/references/theme-color)

---

_最后更新: 2025-10-27_
