# Webview 开发最佳实践

> **创建日期**: 2025-10-27  
> **最后更新**: 2025-10-27  
> **状态**: 正式文档

---

## 📋 概述

本文档说明 Turbo AI Rules 项目中 Webview 的开发规范和最佳实践。

### 为什么要重构？

之前的实现存在以下问题：

- ❌ **800+ 行代码在字符串里** - HTML/CSS/JS 全混在 TypeScript 字符串中，难以维护
- ❌ **无代码高亮和智能提示** - 在字符串里写代码没有 IDE 支持
- ❌ **代码组织混乱** - 单个文件过大，职责不清晰
- ❌ **难以复用和测试** - 无法拆分组件和样式

### 解决方案

采用 **前后端分离** 的现代架构：

- ✅ HTML/CSS/TypeScript 独立文件，完整的 IDE 支持
- ✅ 使用 Vite 构建工具链，开发体验现代化
- ✅ 模块化设计，单个文件 80-300 行，职责单一
- ✅ 共享组件和样式，提高复用性

---

## 📚 目录结构

```
src/
├── webview/                    # Webview 前端代码（独立）
│   ├── shared/                # 共享资源
│   │   ├── styles.css         # 通用样式
│   │   ├── vscode-api.ts     # VS Code API 封装
│   │   └── utils.ts          # 工具函数
│   ├── search/               # 搜索页面
│   │   ├── index.html        # HTML 模板
│   │   ├── search.css        # 页面专属样式
│   │   └── search.ts         # 页面逻辑
│   ├── welcome/              # 欢迎页面
│   ├── statistics/           # 统计页面
│   └── tsconfig.json         # Webview 专用 TS 配置
├── providers/                 # Provider（后端）
│   ├── BaseWebviewProvider.ts
│   └── SearchWebviewProvider.ts  # 简化版
```

## 🎯 核心优势

### 1. **前后端分离**

**之前的问题：**

```typescript
// ❌ 800+ 行代码在一个字符串里
protected getHtmlContent(): string {
  return `
    <!DOCTYPE html>
    <html>
      <!-- 无高亮、无智能提示、难以维护 -->
    </html>
  `;
}
```

**现在的方案：**

```typescript
// ✅ 加载独立的 HTML 文件
protected getHtmlContent(webview: vscode.Webview): string {
  const htmlPath = path.join(this.context.extensionPath, 'out/webview/search/index.html');
  let html = fs.readFileSync(htmlPath, 'utf-8');
  // 替换资源 URI
  return html;
}
```

### 2. **模块化开发**

**HTML**（`search/index.html`）：

- 完整的 HTML 代码高亮
- Emmet 支持
- HTML 验证

**CSS**（`search/search.css` + `shared/styles.css`）：

- CSS 代码高亮和智能提示
- 样式复用
- 易于维护

**TypeScript**（`search/search.ts`）：

- 完整的 TypeScript 支持
- 类型检查
- 代码补全
- 可以 import 模块

### 3. **现代工具链**

使用 **Vite** 构建：

- 🚀 快速的开发服务器（HMR）
- 📦 优化的生产构建
- 🔧 TypeScript 编译
- 🎨 CSS 预处理（如需）
- 📂 自动处理资源

### 4. **代码组织**

**单一职责：**

- `SearchWebviewProvider.ts`：只负责消息通信和业务逻辑（~300 行）
- `search.ts`：只负责 UI 交互（~200 行）
- `search.html`：只负责结构（~80 行）
- `search.css`：只负责样式（~100 行）

## 🛠️ 开发流程

### 1. 开发模式

```bash
# 同时监听前后端变化
npm run dev

# 或分别监听
npm run watch:webview   # 监听 Webview 前端
npm run esbuild-watch   # 监听扩展后端
```

### 2. 构建生产版本

```bash
npm run compile
# 会自动：
# 1. 使用 Vite 构建 Webview -> out/webview/
# 2. 使用 esbuild 构建扩展 -> out/extension/
```

### 3. 添加新页面

#### Step 1: 创建 HTML

```html
<!-- src/webview/my-page/index.html -->
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="{{stylesUri}}" />
    <link rel="stylesheet" href="./my-page.css" />
  </head>
  <body>
    <div class="container">
      <!-- 你的页面内容 -->
    </div>
    <script type="module" src="./my-page.ts"></script>
  </body>
</html>
```

#### Step 2: 创建 TypeScript

```typescript
// src/webview/my-page/my-page.ts
import { vscodeApi } from '../shared/vscode-api';

// DOM 操作
const button = document.getElementById('myButton');
button?.addEventListener('click', () => {
  vscodeApi.postMessage('buttonClicked', { data: 'test' });
});

// 接收消息
window.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  // 处理消息
});
```

#### Step 3: 创建 CSS

```css
/* src/webview/my-page/my-page.css */
.my-custom-class {
  /* 样式 */
}
```

#### Step 4: 创建 Provider

```typescript
// src/providers/MyPageWebviewProvider.ts
export class MyPageWebviewProvider extends BaseWebviewProvider {
  protected getHtmlContent(webview: vscode.Webview): string {
    const htmlPath = path.join(this.context.extensionPath, 'out/webview/my-page/index.html');
    let html = fs.readFileSync(htmlPath, 'utf-8');
    // 替换 URI...
    return html;
  }
}
```

#### Step 5: 更新 Vite 配置

```typescript
// vite.config.ts
input: {
  search: path.resolve(__dirname, 'src/webview/search/index.html'),
  welcome: path.resolve(__dirname, 'src/webview/welcome/index.html'),
  myPage: path.resolve(__dirname, 'src/webview/my-page/index.html'), // 新增
}
```

## 💡 最佳实践

### 1. **使用共享样式**

```css
/* 在 shared/styles.css 中定义通用组件 */
.button,
.card,
.input,
.badge; /* 在页面 CSS 中只写特定样式 */
```

### 2. **类型安全的消息通信**

```typescript
// 定义消息类型
interface MyMessage {
  type: 'search' | 'export' | 'view';
  payload: SearchCriteria | ExportOptions | ViewOptions;
}

// Provider 端
this.postMessage({ type: 'searchResults', payload: { results } });

// Webview 端
window.addEventListener('message', (event: MessageEvent<MyMessage>) => {
  // TypeScript 会提供类型检查
});
```

### 3. **状态管理**

```typescript
// 使用 VS Code 的状态 API
vscodeApi.setState({ lastSearch: criteria });
const state = vscodeApi.getState();
```

### 4. **安全性**

```html
<!-- 使用 CSP -->
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'none'; 
               style-src {{cspSource}} 'unsafe-inline'; 
               script-src {{cspSource}};"
/>

<!-- HTML 转义 -->
<div>${escapeHtml(userInput)}</div>
```

## 📊 对比

| 维度     | 旧方案（字符串）  | 新方案（文件分离） |
| -------- | ----------------- | ------------------ |
| 代码行数 | 800+ 行/文件      | ~200 行/文件       |
| 开发体验 | ❌ 无高亮、无提示 | ✅ 完整 IDE 支持   |
| 维护性   | ❌ 难以定位问题   | ✅ 清晰的文件结构  |
| 复用性   | ❌ 难以复用       | ✅ 共享组件/样式   |
| 构建速度 | ✅ 直接字符串     | ⚠️ 需要编译（快）  |
| 调试     | ❌ 困难           | ✅ Source Map      |
| 团队协作 | ❌ 冲突多         | ✅ 文件独立        |

## 🎓 学习资源

- [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [Vite 文档](https://vitejs.dev/)
- [TypeScript DOM 类型](https://github.com/microsoft/TypeScript/blob/main/lib/lib.dom.d.ts)

## ⚠️ 注意事项

1. **资源 URI 替换**：HTML 中的资源路径需要通过 `webview.asWebviewUri()` 转换
2. **CSP 配置**：确保内容安全策略正确配置
3. **构建顺序**：发布前必须先构建 Webview（`npm run build:webview`）
4. **缓存问题**：开发时可能需要重新加载扩展查看更改

## 🔄 迁移指南

对于现有的 Provider：

1. 保留 Provider 的业务逻辑和消息处理
2. 将 HTML/CSS/JS 提取到独立文件
3. 更新 `getHtmlContent()` 为文件加载方式
4. 测试功能是否正常

逐步迁移，不需要一次性全部重写。

---

## 📈 重构效果对比

### 代码行数对比

| Provider                   | 重构前（字符串） | 重构后（文件分离）                | 改进    |
| -------------------------- | ---------------- | --------------------------------- | ------- |
| SearchWebviewProvider      | ~850 行          | 300 行 (Provider) + 400 行 (前端) | -150 行 |
| WelcomeWebviewProvider     | ~600 行          | 待迁移                            | -       |
| StatisticsWebviewProvider  | ~700 行          | 待迁移                            | -       |
| RuleDetailsWebviewProvider | ~650 行          | 待迁移                            | -       |

### 开发体验改善

| 方面     | 重构前        | 重构后          | 说明                     |
| -------- | ------------- | --------------- | ------------------------ |
| 代码高亮 | ❌ 无         | ✅ 完整         | HTML/CSS/TS 都有完整高亮 |
| 智能提示 | ❌ 无         | ✅ 完整         | IntelliSense 全面支持    |
| 代码跳转 | ❌ 不支持     | ✅ 支持         | 可跳转到定义和引用       |
| 重构工具 | ❌ 不支持     | ✅ 支持         | 支持自动重命名、提取等   |
| 调试     | ❌ 困难       | ✅ 支持         | Source Map 支持          |
| 热更新   | ❌ 需手动重载 | ✅ 自动更新     | Vite HMR                 |
| 构建速度 | ✅ 快（无需） | ✅ 快（Vite）   | 开发模式下增量构建很快   |
| 文件组织 | ❌ 单文件     | ✅ 多文件模块化 | 清晰的职责分离           |

### 维护性改善

- **定位问题**: 从"在 800 行字符串中查找"变为"在对应的 HTML/CSS/TS 文件中查找"
- **代码审查**: 从"大段字符串 diff"变为"清晰的文件变更"
- **团队协作**: 从"单文件冲突频繁"变为"多文件独立修改"
- **复用性**: 共享样式和组件库，避免重复代码

---

## 🎯 下一步计划

### 短期（已完成）

- ✅ 创建 `src/webview` 目录结构
- ✅ 实现共享样式 (`shared/styles.css`)
- ✅ 实现 VS Code API 封装 (`shared/vscode-api.ts`)
- ✅ 重构 SearchWebviewProvider 作为示例
- ✅ 配置 Vite 构建流程
- ✅ 更新 package.json 脚本

### 中期（进行中）

- ⏳ 迁移 WelcomeWebviewProvider
- ⏳ 迁移 StatisticsWebviewProvider
- ⏳ 迁移 RuleDetailsWebviewProvider
- ⏳ 建立共享组件库（按钮、卡片、表单等）

### 长期（规划中）

- 📋 引入 CSS 预处理器（如 Sass/Less）
- 📋 实现主题切换支持
- 📋 添加单元测试和 E2E 测试
- 📋 性能优化和懒加载

---

## 🤝 贡献指南

如果你要添加新的 Webview 页面或修改现有页面：

1. **遵循目录结构**: 每个页面在 `src/webview/` 下有独立文件夹
2. **使用共享样式**: 优先使用 `shared/styles.css` 中的样式
3. **类型安全**: 定义清晰的消息接口
4. **测试验证**: 在 Extension Development Host 中测试
5. **文档更新**: 如有新功能，更新相关文档

---

## 📚 相关文档

- [开发指南](./02-development.md) - 项目开发环境和工作流
- [UI 开发流程](./07-ui-development-process.md) - UI 设计和开发流程
- [架构设计](./01-design.md) - 整体架构说明

---

**最后更新**: 2025-10-27  
**维护者**: ygqygq2
