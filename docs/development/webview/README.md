# Webview 实施文档索引

> **位置**: `docs/development/webview/`  
> **作用**: Webview 相关实施文档的入口与索引

---

## 架构要点

- **基类**: `src/providers/BaseWebviewProvider.ts`（模板方法 + 单例）
- **主题**: 统一使用 VS Code CSS 变量 `var(--vscode-*)`
- **安全**: 严格 CSP + `asWebviewUri()` 资源转换 + HTML 转义
- **通信**: 双向消息（Webview ↔ Extension），通过 Messenger 模式
- **构建**: Vite 打包 Webview 前端，esbuild 打包扩展后端

---

## Webview 页面列表

| 序号 | 页面名称     | Provider                        | 实施文档                                                                               |
| ---- | ------------ | ------------------------------- | -------------------------------------------------------------------------------------- |
| 01   | 欢迎页       | `WelcomeWebviewProvider`        | [01-welcome-page-implementation.md](./01-welcome-page-implementation.md)               |
| 02   | 统计仪表板   | `StatisticsWebviewProvider`     | [02-statistics-implementation.md](./02-statistics-implementation.md)                   |
| 03   | 规则详情     | `RuleDetailsWebviewProvider`    | [03-rule-details-implementation.md](./03-rule-details-implementation.md)               |
| 04   | 高级搜索     | `SearchWebviewProvider`         | [04-advanced-search-implementation.md](./04-advanced-search-implementation.md)         |
| 05   | 规则同步页   | `RuleSyncPageWebviewProvider`   | [05-rule-sync-page-implementation.md](./05-rule-sync-page-implementation.md)           |
| 07   | 源详情       | `SourceDetailWebviewProvider`   | [07-source-details-implementation.md](./07-source-details-implementation.md)           |
| 12   | 仪表盘       | `DashboardWebviewProvider`      | [12-dashboard-implementation.md](./12-dashboard-implementation.md)                     |
| 13   | 适配器管理   | `AdapterManagerWebviewProvider` | [13-adapter-manager-implementation.md](./13-adapter-manager-implementation.md)         |
| 14   | 规则源管理器 | `SourceManagerWebviewProvider`  | [14-source-manager-page-implementation.md](./14-source-manager-page-implementation.md) |

> **注**: 序号对应 `.superdesign/design_docs/` 下的设计文档编号

---

## 通用消息协议

### Extension → Webview

```typescript
{
  type: 'updateData' | 'updateTheme' | 'error',
  data?: any,
  error?: string
}
```

### Webview → Extension

```typescript
{
  type: string,  // 消息类型
  payload?: any  // 消息数据
}
```

**错误处理**: Provider 捕获异常并发送 `{ type: 'error', payload: { message } }`

---

## 相关规范与指南

- **[Webview 最佳实践](./43-webview-best-practices.md)** - 开发规范和注意事项
- **[CSS 样式指南](./44-webview-css-guide.md)** - 样式与主题规范
- **[Codicons 使用指南](./45-codicons-guide.md)** - 图标使用规范
- **[UI 开发流程](./32-ui-development-process.md)** - SuperDesign 集成流程

---

## 文档规范

每篇实施文档应包含：

1. **功能概述** - 页面功能和用途
2. **架构实现** - 技术架构和关键组件
3. **消息协议** - 详细的消息定义
4. **关键流程** - 用户交互流程
5. **测试覆盖** - 测试场景
6. **相关文件** - 源码和资源文件列表

---

> **维护提示**:
>
> - 添加新 Webview 时，按序号创建对应的实施文档
> - 修改消息协议时，同步更新实施文档和代码注释
> - 确保设计文档、UI 原型、实施文档三者一致
