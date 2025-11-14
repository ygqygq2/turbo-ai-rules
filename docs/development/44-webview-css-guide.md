# Webview CSS 组织规范

> 文档创建日期：2025-10-30
> 目的：规范 React Webview 项目中的 CSS 组织方式

---

## CSS 架构概述

本项目采用**全局 CSS + 页面 CSS**的混合架构：

```
src/webview/
├── global.css                 # 全局样式和 CSS 变量
├── welcome/
│   ├── App.tsx
│   ├── welcome.css            # 页面特定样式
│   └── index.html
├── search/
│   ├── App.tsx
│   ├── search.css
│   └── index.html
└── components/
    ├── Button.tsx             # 使用 global.css 中的 .button 类
    ├── Card.tsx               # 使用 global.css 中的 .card 类
    └── Input.tsx              # 使用 global.css 中的 .input 类
```

---

## 1. global.css - 全局样式库

### 作用

- 定义所有 CSS 变量（VSCode 主题颜色、间距、圆角等）
- 提供基础组件样式类（`.button`, `.card`, `.input` 等）
- 定义通用样式（滚动条、链接、排版等）

### CSS 变量分类

#### VSCode 主题变量

```css
:root {
  /* 文本颜色 */
  --vscode-foreground: #cccccc;
  --vscode-descriptionForeground: #9d9d9d;

  /* 背景颜色 */
  --vscode-editor-background: #1e1e1e;
  --vscode-editorWidget-background: #252526;

  /* 按钮颜色 */
  --vscode-button-background: #0e639c;
  --vscode-button-foreground: #ffffff;

  /* ... 更多 VSCode 变量 */
}
```

#### 自定义间距变量

```css
:root {
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
}
```

#### 自定义设计变量

```css
:root {
  --border-radius: 4px;
  --border-radius-sm: 2px;
  --border-radius-lg: 8px;

  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.15);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.2);
}
```

### 基础组件类

```css
/* 按钮 */
.button {
  /* 基础样式 */
}
.button-primary {
  /* 主按钮 */
}
.button-secondary {
  /* 次要按钮 */
}

/* 卡片 */
.card {
  /* 卡片容器 */
}

/* 输入框 */
.input {
  /* 表单输入 */
}

/* 工具栏 */
.toolbar {
  /* 工具栏容器 */
}

/* Badge */
.badge {
  /* 标签徽章 */
}
```

---

## 2. 组件 CSS 使用方式

### 方式一：使用全局类（当前方式，推荐）

**优点**：

- 统一管理，易于维护
- 样式复用率高
- 主题变量集中控制

**组件实现**：

```tsx
// Button.tsx
export const Button: React.FC<ButtonProps> = ({ children, type = 'primary', onClick }) => (
  <button className={`button button-${type}`} onClick={onClick}>
    {children}
  </button>
);
```

**使用示例**：

```tsx
<Button type="primary">Add Source</Button>
<Button type="secondary">Cancel</Button>
```

### 方式二：CSS Modules（可选，适合复杂组件）

**适用场景**：

- 组件样式非常复杂
- 需要避免类名冲突
- 组件独立性要求高

**实现步骤**：

1. 创建 CSS Module 文件：

```css
/* Button.module.css */
.button {
  /* 基础样式，仍使用 CSS 变量 */
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius);
}

.primary {
  background: var(--vscode-button-background);
}

.secondary {
  background: var(--vscode-button-secondaryBackground);
}
```

2. 在组件中导入：

```tsx
// Button.tsx
import styles from './Button.module.css';

export const Button: React.FC<ButtonProps> = ({ children, type = 'primary' }) => (
  <button className={`${styles.button} ${styles[type]}`}>{children}</button>
);
```

---

## 3. 页面特定样式

### 文件命名

每个页面目录下创建同名 CSS 文件：

```
welcome/
├── App.tsx
├── welcome.css         # 页面特定样式
└── index.html

search/
├── App.tsx
├── search.css          # 页面特定样式
└── index.html
```

### 样式组织原则

1. **仅包含页面特定布局**（不包含通用组件样式）
2. **使用 global.css 中的变量**（保持主题一致性）
3. **采用 BEM 或语义化命名**（避免冲突）

**示例**（welcome.css）：

```css
/* 页面容器 */
.hero {
  text-align: center;
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-lg) 0;
}

/* 步骤卡片布局 */
.step-card {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
}

.step-number {
  width: 40px;
  height: 40px;
  background-color: var(--vscode-button-background);
  border-radius: 50%;
  /* 使用变量而非硬编码值 */
}

/* 模板网格 */
.template-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
}
```

---

## 4. CSS 导入顺序

### HTML 中的引入顺序（重要！）

```html
<!DOCTYPE html>
<html>
  <head>
    <!-- 1. 全局样式（最先加载） -->
    <link rel="stylesheet" href="../global.css" />

    <!-- 2. 页面样式会被 Vite 自动注入 -->
    <title>Welcome</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./index.tsx"></script>
  </body>
</html>
```

### React 组件中的导入顺序

```tsx
// App.tsx
import React from 'react';

// 1. 全局样式
import '../global.css';

// 2. 页面样式
import './welcome.css';

// 3. 组件导入
import { Button } from '../components/Button';
import { Card } from '../components/Card';
```

---

## 5. Vite 构建配置

### 自动生成的产物

构建后，Vite 会生成：

```
out/webview/
├── global.css                    # 压缩后的全局样式
├── welcome.css                   # 压缩后的页面样式
├── welcome.js                    # 打包后的 JS
└── src/webview/welcome/
    └── index.html                # 注入了正确的资源引用
```

### Vite 配置关键点

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // 全局样式输出到根目录
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'global.css') {
            return 'global.css';
          }
          // 页面样式输出到根目录（与页面名对应）
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return '[name].css';
          }
          return 'assets/[name]-[hash].[ext]';
        },
      },
    },
  },
});
```

---

## 6. 开发流程

### 添加新页面

1. 创建页面目录和文件：

```bash
src/webview/new-page/
├── App.tsx
├── new-page.css
├── index.html
└── index.tsx
```

2. 在 `index.html` 中引入 global.css：

```html
<link rel="stylesheet" href="../global.css" />
```

3. 在 `App.tsx` 中导入样式：

```tsx
import '../global.css';
import './new-page.css';
```

4. 重新构建：

```bash
pnpm run build:webview
```

### 添加新组件

1. 在 `components/` 下创建组件：

```tsx
// components/NewComponent.tsx
export const NewComponent: React.FC = () => (
  <div className="new-component">
    {/* 使用 global.css 中定义的类 */}
    <button className="button button-primary">Click</button>
  </div>
);
```

2. 如需要特定样式，在 `global.css` 中添加：

```css
/* global.css */
.new-component {
  padding: var(--spacing-md);
  background: var(--vscode-editorWidget-background);
}
```

---

## 7. 最佳实践

### ✅ 推荐做法

1. **优先使用 CSS 变量**

```css
/* ✅ 好 */
.card {
  padding: var(--spacing-md);
  background: var(--vscode-editorWidget-background);
}

/* ❌ 不好 */
.card {
  padding: 16px;
  background: #252526;
}
```

2. **组件样式使用全局类**

```tsx
/* ✅ 好 - 使用全局类 */
<button className="button button-primary">Save</button>

/* ❌ 不好 - 内联样式 */
<button style={{ background: '#0e639c', color: '#fff' }}>Save</button>
```

3. **页面样式使用语义化命名**

```css
/* ✅ 好 - 语义化 */
.welcome-hero {
}
.welcome-steps {
}
.template-grid {
}

/* ❌ 不好 - 通用命名 */
.container1 {
}
.box {
}
.wrapper {
}
```

### ❌ 避免的做法

1. **不要在组件中硬编码颜色**

```tsx
/* ❌ 错误 */
<div style={{ color: '#cccccc' }}>Text</div>

/* ✅ 正确 */
<div style={{ color: 'var(--vscode-foreground)' }}>Text</div>
```

2. **不要创建重复的样式类**

```css
/* ❌ 错误 - 重复定义 */
.welcome-button { /* 与 .button 重复 */ }
.search-input { /* 与 .input 重复 */ }

/* ✅ 正确 - 复用全局类 */
<button className="button">Click</button>
<input className="input" />
```

3. **不要在页面 CSS 中定义通用组件样式**

```css
/* ❌ 错误 - welcome.css */
.button {
  /* 应该在 global.css 中 */
}

/* ✅ 正确 - welcome.css */
.welcome-hero {
  /* 页面特定布局 */
}
```

---

## 8. 调试技巧

### 检查 CSS 是否生效

1. **构建后检查输出**：

```bash
# 查看构建产物
ls -la out/webview/

# 检查 global.css 内容
cat out/webview/global.css
```

2. **在浏览器 DevTools 中检查**：

- 打开 Webview
- 右键 → "检查元素"
- 查看 `Styles` 面板，确认变量值

3. **验证变量定义**：

```javascript
// 在浏览器控制台执行
getComputedStyle(document.documentElement).getPropertyValue('--spacing-md');
// 应输出: " 16px"
```

### 常见问题排查

| 问题             | 原因              | 解决方案                          |
| ---------------- | ----------------- | --------------------------------- |
| 样式完全不生效   | global.css 未引入 | 检查 HTML `<link>` 标签           |
| 变量未定义       | 变量名拼写错误    | 检查 `:root` 中是否定义           |
| 页面样式覆盖失败 | CSS 优先级问题    | 增加选择器权重或使用 `!important` |
| 构建后样式丢失   | Vite 配置问题     | 检查 `assetFileNames` 配置        |

---

## 9. 参考资源

- **VSCode Webview 官方文档**：https://code.visualstudio.com/api/extension-guides/webview
- **VSCode 主题颜色变量**：https://code.visualstudio.com/api/references/theme-color
- **项目基础文档**:`docs/development/43-webview-best-practices.md`

---

## 附录：完整 CSS 变量清单

参见 `src/webview/global.css` 文件中的 `:root` 定义。

主要分类：

- **VSCode 主题变量**：`--vscode-*`（20+ 个）
- **间距变量**：`--spacing-*`（5 个）
- **边框圆角**：`--border-radius-*`（3 个）
- **阴影**：`--shadow-*`（3 个）
