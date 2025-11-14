# Webview 实施总览（概览与索引）

> 位置：docs/development/webview/
> 作用：作为 Webview 相关实施文档的入口与索引，统一约束、消息协议与页面清单。

---

## 架构要点

- 基类：`src/providers/BaseWebviewProvider.ts`（模板方法 + 单例）
- 主题：统一使用 VS Code CSS 变量 `var(--vscode-*)`
- 安全：严格 CSP + `asWebviewUri()` 资源转换 + HTML 转义
- 通信：双向消息（Webview ↔ Extension），仅在 Provider 端注册命令
- 构建：Vite 打包 Webview 前端，esbuild 打包扩展后端

### 通用消息契约

- Extension → Webview
  - `{ type: 'updateData' | 'updateTheme' | 'error', data?: any, error?: string }`
- Webview → Extension
  - `{ type: string, payload?: any }`

错误处理要求：Provider 捕获异常并发送 `{ type: 'error', payload: { message } }`。

---

## 页面清单与对应源码

- 01 欢迎页（Welcome） → `src/providers/WelcomeWebviewProvider.ts`
- 02 统计仪表板（Statistics） → `src/providers/StatisticsWebviewProvider.ts`
- 03 规则详情（Rule Details） → `src/providers/RuleDetailsWebviewProvider.ts`
- 04 源详情/新增（Source Details/New） → `src/providers/SourceDetailWebviewProvider.ts`
- 05 高级搜索（Advanced Search） → `src/providers/SearchWebviewProvider.ts`

> 设计稿（若有）：`.superdesign/design_docs/`；原型：`.superdesign/design_iterations/`

---

## 相关规范与指南

- 样式与主题规范：`./css-guide.md`
- Codicons 图标：`./codicons-guide.md`
- Webview 开发最佳实践：`./best-practices.md`
- UI 设计/协作流程:`../32-ui-development-process.md`

---

## 文档导航

- 01-welcome-page-implementation.md
- 02-statistics-implementation.md
- 03-rule-details-implementation.md
- 04-source-details-implementation.md
- 05-advanced-search-implementation.md

> 提示：每篇实施文档都包含“对应源码”“消息协议”“测试要点”“已知限制”四小节，保持精简且可追踪。
