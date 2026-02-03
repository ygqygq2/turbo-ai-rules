# UI 设计文档总览

> **项目**: Turbo AI Rules Extension  
> **目的**: 为 SuperDesign AI 提供完整的 UI 页面设计参考  
> **版本**: 3.0 (重组版)  
> **最后更新**: 2026-02-03  
> **更新说明**: 统一编号、整理关联关系、完善缺失内容

---

## 📋 文档导航

### ✅ 完整页面（01-10）

Webview 页面，每个都有对应的实现和 HTML 原型。

| # | 页面名称 | 功能 | 实现路径 | 设计文档 | HTML 原型 | 状态 |
|---|---------|------|---------|---------|---------|------|
| **01** | 欢迎页 | 首次使用引导、快速开始 | `src/webview/welcome/` | ✅ [01-welcome-page.md](./01-welcome-page.md) | ✅ 01-welcome-page_1.html | ✅ 完整 |
| **02** | Dashboard | 功能中心、快速访问 | `src/webview/dashboard/` | ✅ [02-dashboard.md](./02-dashboard.md) | ✅ 02-dashboard_1.html | ✅ 完整 |
| **03** | 源管理 | 管理规则源 | `src/webview/source-manager/` | ✅ [03-source-manager.md](./03-source-manager.md) | ✅ 03-source-manager_2.html | ✅ 完整 |
| **04** | 适配器管理 | 管理输出适配器 | `src/webview/adapter-manager/` | ✅ [04-adapter-manager.md](./04-adapter-manager.md) | ✅ 04-adapter-manager_1.html | ✅ 完整 |
| **05** | 规则同步 | 同步规则流程 | `src/webview/rule-sync-page/` | ✅ [05-rule-sync-page.md](./05-rule-sync-page.md) | ✅ 05-rule-sync-page_1.html | ✅ 完整 |
| **06** | 搜索 | 高级搜索界面 | `src/webview/search/` | ✅ [06-search.md](./06-search.md) | ✅ 06-search_1.html | ✅ 完整 |
| **07** | 规则详情 | 规则全文展示 | `src/webview/rule-details/` | ✅ [07-rule-details.md](./07-rule-details.md) | ✅ 07-rule-details_1.html | ✅ 完整 |
| **08** | 源详情 | 查看单个源的详情 | `src/webview/source-detail/` | ✅ [08-source-details.md](./08-source-details.md) | ✅ 08-source-details_1.html | ✅ 完整 |
| **09** | 添加源 | 添加/编辑规则源表单 | `src/webview/source-detail/` | ✅ [09-add-source.md](./09-add-source.md) | ✅ 09-add-source_1.html | ✅ 完整 |
| **10** | 统计 | 规则统计面板 | `src/webview/statistics/` | ✅ [10-statistics.md](./10-statistics.md) | ✅ 10-statistics_1.html | ✅ 完整 |

### 🔧 原生 UI 组件（A-B）

VSCode 原生 UI 组件，非 Webview 页面。

| # | 组件名称 | 功能 | 实现 | 设计文档 | HTML 原型 | 状态 |
|---|---------|------|------|---------|---------|------|
| **A** | 树视图 | 规则源和规则树 | `src/providers/RulesTreeProvider.ts` | ✅ [A-tree-view.md](./A-tree-view.md) | ✅ A-tree-view_2.html | ✅ 完整 |
| **B** | 状态栏 | VS Code 状态栏显示 | `src/providers/StatusBarProvider.ts` | ✅ [06-status-bar.md](./06-status-bar.md) | ✅ 06-status-bar_1.html | ✅ 完整 |

---

## 📦 归档文件

未来功能的设计文档已移到 [archive/](../archive/) 目录：

- 08-config-manager - 配置管理面板（功能已通过源管理和适配器管理实现）
- 09-rule-editor - 规则编辑器（未来增强功能）
- 10-conflict-resolution - 冲突解决（未来功能）
- 11-sync-progress - 同步进度（未来功能）

详见 [archive/README.md](../archive/README.md)

---

## 🔄 维护指南

### 新增 Webview 页面

1. 创建实现：`src/webview/{name}/`
2. 创建设计文档：`.superdesign/design_docs/{序号}-{name}.md`
3. 创建 HTML 原型：`.superdesign/design_iterations/{序号}-{name}_1.html`
4. 创建实施文档：`docs/implementation/ui/{序号}-{name}-implementation.md`
5. 更新本 README.md

### 更新现有页面

1. 更新实现代码
2. 更新设计文档
3. 生成新版本 HTML 原型（版本号 +1）
4. 更新实施文档

---

## 📚 相关文档

- 📋 [完成报告](../REORGANIZATION-COMPLETION-REPORT.md) - UI 设计整理完成报告
- 🧹 [整理计划](../CLEANUP-PLAN.md) - 整理概述
