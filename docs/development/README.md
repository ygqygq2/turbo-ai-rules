# 开发文档总览（development/）

本文档说明 `docs/development/` 的新结构与维护规范。自 2025-11 起，取消按"阶段（Phase）"划分的文档，改为"设计 Design"与"实施 Implementation"两大类，并对旧文档进行归档/清理。

## 核心设计文档

- **[01-design.md](./01-design.md)** - 产品整体设计总览
- **[01-background.md](./01-background.md)** - 项目背景和设计目标
- **[02-core-concepts.md](./02-core-concepts.md)** - 核心理念和设计原则
- **[03-design.md](./03-design.md)** - 整体设计指引(总纲)
- **[10-data-model.md](./10-data-model.md)** - 数据结构和类型定义
- **[11-storage-strategy.md](./11-storage-strategy.md)** - 存储策略和文件管理
- **[12-parser-validator.md](./12-parser-validator.md)** - 解析验证和错误处理
- **[20-architecture.md](./20-architecture.md)** - 顶层架构和模块分工
- **[21-adapter-design.md](./21-adapter-design.md)** - 适配器架构和扩展机制
- **[22-config-sync.md](./22-config-sync.md)** - 配置管理和同步策略
- **[23-custom-adapters-design.md](./23-custom-adapters-design.md)** - 自定义适配器设计
- **[30-ui-design-overview.md](./30-ui-design-overview.md)** - UI 设计概览(包含复选框功能)
- **[31-ui-design.md](./31-ui-design.md)** - UI 设计详细方案
- **[32-ui-development-process.md](./32-ui-development-process.md)** - UI 开发流程
- **[40-development.md](./40-development.md)** - 开发指南
- **[41-test-coverage.md](./41-test-coverage.md)** - 测试覆盖规范
- **[42-maintaining.md](./42-maintaining.md)** - 维护指南
- **[43-webview-best-practices.md](./43-webview-best-practices.md)** - Webview 最佳实践
- **[44-webview-css-guide.md](./44-webview-css-guide.md)** - Webview CSS 规范
- **[45-codicons-guide.md](./45-codicons-guide.md)** - Codicons 使用指南

## 文档分层

- design/ 设计与规范（开发前的方案、结构与规则）
  - 只讲“是什么/为什么/约束”，不粘贴业务代码
  - 可包含时序/流程/接口契约、伪代码
- implementation/ 实施与细节（与当前代码一一对应的实现说明）
  - 讲“怎么做/关键路径/边界处理”，可含伪代码与必要片段
  - 显式标注对应源码路径，便于对照源码追踪

## 命名约定

- 设计文档：design/<主题>-design.md
- 实施文档：implementation/<模块>-implementation.md
- 索引与纲要：00-overview.md 或 README.md

## 迁移与清理

- 旧的分阶段实施文档（11/12/13/15-\*.md）已废弃，改为按模块归档：
  - implementation/rules-tree-implementation.md（树视图）
  - implementation/status-bar-implementation.md（状态栏）
  - implementation/welcome-webview-implementation.md（欢迎页）
  - implementation/sync-flow-implementation.md（同步流程）
  - implementation/storage-refactor-implementation.md（存储重构）
- 原有 16/17 号实施文档内容已整合到上述新文档。

## 维护要求（强制）

- 先更新 design，再提交实现与 implementation
- 代码有变更必须同步更新 implementation 的“对应源码路径/边界处理/错误码”小节
- 文档中禁止粘贴整段实现代码，推荐伪代码 + 关键接口签名
- 对外行为变化必须同步用户文档（docs/user-guide）

> 参考：docs/development/03-documentation-system.md 已同步更新本结构。
