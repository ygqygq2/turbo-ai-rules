# Turbo AI Rules - UI 设计概览

> 本文档总结 Turbo AI Rules 扩展的所有 UI 组件和交互设计
>
> **版本**: 2.0.0  
> **最后更新**: 2025-11-14

---

## UI 组件架构

Turbo AI Rules 包含以下主要 UI 组件：

### 1. 侧边栏树视图（TreeView）

**文件**: `src/providers/RulesTreeProvider.ts`  
**设计文档**: `.superdesign/design_docs/05-tree-view.md`  
**位置**: VS Code 活动栏侧边栏

**核心功能**:

- 📂 显示规则源和规则列表
- ☑️ 复选框选择规则（**已实现**）
- 🏷️ 显示优先级和标签
- 📊 显示选择状态（已选/总数）
- 🔄 右键菜单快速操作

**复选框特性**（v2.0 新增）:

- ✅ 规则节点支持复选框
- ✅ 实时保存选择状态
- ✅ 与右侧 Webview 双向同步
- ✅ 批量操作优化
- ✅ 事件驱动架构

**交互方式**:

- 单击复选框：切换选中状态
- 空格键：切换当前节点复选框
- 右键菜单：快速选择/取消选择
- 双击规则：打开详情面板

---

### 2. 规则选择器（Webview）

**文件**: `src/providers/RuleSelectorWebviewProvider.ts`  
**设计文档**: `.superdesign/design_docs/05-rule-selector.md`  
**实施文档**: `docs/development/webview/05-rule-selector-implementation.md`

**核心功能**:

- 📁 文件树形结构展示
- ☑️ 可视化选择规则
- 🔍 搜索和过滤
- 📊 统计信息显示
- 💾 保存选择配置

**同步机制**:

- 左侧树视图勾选 → 右侧自动更新
- 右侧保存 → 左侧复选框自动更新
- 通过 `SelectionStateManager` 事件系统实现

---

### 3. 欢迎页面（Webview）

**文件**: `src/providers/WelcomeWebviewProvider.ts`  
**设计文档**: `.superdesign/design_docs/01-welcome-page.md`  
**实施文档**: `docs/development/webview/01-welcome-page-implementation.md`

**核心功能**:

- 🎯 引导用户快速开始
- ➕ 添加第一个规则源
- 📚 快速入门教程
- 🔗 常用链接和文档

---

### 4. 统计仪表板（Webview）

**文件**: `src/providers/StatisticsWebviewProvider.ts`  
**设计文档**: `.superdesign/design_docs/02-statistics-dashboard.md`

**核心功能**:

- 📊 规则数量统计
- 📈 优先级分布图表
- 🏷️ 标签统计
- 📦 源状态概览

---

### 5. 规则详情面板（Webview）

**文件**: `src/providers/RuleDetailsWebviewProvider.ts`  
**设计文档**: `.superdesign/design_docs/03-rule-details-panel.md`

**核心功能**:

- 📝 显示规则完整内容
- 📋 元数据信息
- 🔗 相关规则链接
- 📤 导出和复制功能

---

### 6. 高级搜索（Webview）

**文件**: `src/providers/SearchWebviewProvider.ts`  
**设计文档**: `.superdesign/design_docs/04-advanced-search.md`

**核心功能**:

- 🔍 全文搜索
- 🏷️ 标签过滤
- ⚡ 优先级筛选
- 📦 源范围限定

---

### 7. 源详情页面（Webview）

**文件**: `src/providers/SourceDetailWebviewProvider.ts`  
**设计文档**: `.superdesign/design_docs/07-source-details-new.md`

**核心功能**:

- ⚙️ 源配置管理
- 🔌 连接测试
- 📊 源统计信息
- 🔄 同步操作

---

### 8. 状态栏（StatusBar）

**文件**: `src/providers/StatusBarProvider.ts`  
**设计文档**: `.superdesign/design_docs/06-status-bar.md`

**核心功能**:

- 📊 显示规则总数
- ⚡ 显示同步状态
- 🖱️ 点击打开快速操作

---

## 选择同步机制

### 架构设计

```
┌─────────────────────────────────────┐
│  SelectionStateManager (事件总线)   │
│  - onSelectionChanged 事件          │
└──────────┬──────────────────────────┘
           │
           │ 事件分发
           │
   ┌───────┴───────┐
   │               │
   ▼               ▼
┌─────────────┐ ┌──────────────────┐
│ 左侧树视图  │ │ 右侧 Webview     │
│ TreeView    │ │ 选择器           │
│ - 复选框    │ │ - 文件树选择     │
└─────────────┘ └──────────────────┘
```

### 同步流程

**左侧 → 右侧**:

1. 用户勾选左侧树视图复选框
2. `RulesTreeProvider.handleCheckboxChange()` 处理变更
3. 保存到 `.turbo-ai-rules/rule-selections.json`
4. 触发 `SelectionStateManager.notifySelectionChanged()`
5. `RuleSelectorWebviewProvider` 监听事件
6. 重新加载数据并推送到 Webview
7. Webview UI 自动更新

**右侧 → 左侧**:

1. 用户在 Webview 中选择规则并保存
2. RPC 调用 `saveRuleSelection`
3. 保存到 `.turbo-ai-rules/rule-selections.json`
4. 触发 `SelectionStateManager.notifySelectionChanged()`
5. `RulesTreeProvider` 监听事件（150ms 防抖）
6. 调用 `refresh()` 刷新树视图
7. 重新计算复选框状态并显示

**详细文档**: `docs/development/implementation/rule-selection-sync.md`

---

## 设计原则

### 1. 一致性

- 所有 Webview 使用统一的 CSS 变量（VS Code 主题）
- 图标使用 Codicons
- 按钮样式统一
- 间距和布局规范一致

### 2. 响应式

- Webview 支持不同窗口大小
- 自适应布局
- 移动端友好（未来）

### 3. 可访问性

- 键盘导航支持
- 屏幕阅读器兼容
- 高对比度主题支持
- ARIA 标签

### 4. 性能

- 虚拟滚动（大量数据）
- 懒加载
- 防抖和节流
- 增量更新

---

## 图标系统

### 优先级图标

- 🔥 `codicon-flame` - 高优先级（红色）
- ⚠️ `codicon-warning` - 中优先级（黄色）
- ℹ️ `codicon-info` - 低优先级（灰色）

### 状态图标

- ✅ `codicon-pass` - 成功/已同步
- ❌ `codicon-error` - 失败/错误
- 🔄 `codicon-sync` - 同步中
- ⚠️ `codicon-warning` - 警告/冲突

### 复选框图标

- ☑️ `codicon-check` - 已选中
- ☐ `codicon-checkbox` - 未选中
- ▣ `codicon-check-all` - 部分选中（未来）

### 操作图标

- ➕ `codicon-add` - 添加
- 🗑️ `codicon-trash` - 删除
- ✏️ `codicon-edit` - 编辑
- 🔄 `codicon-refresh` - 刷新
- 🔍 `codicon-search` - 搜索

---

## 颜色规范

### 语义颜色

```typescript
// 使用 VS Code CSS 变量
高优先级: 'var(--vscode-errorForeground)'; // 红色
中优先级: 'var(--vscode-editorWarning-foreground)'; // 黄色
低优先级: 'var(--vscode-descriptionForeground)'; // 灰色

成功: 'var(--vscode-testing-iconPassed)'; // 绿色
失败: 'var(--vscode-testing-iconFailed)'; // 红色
警告: 'var(--vscode-editorWarning-foreground)'; // 黄色
```

### 主题适配

所有 UI 组件自动适配 VS Code 主题：

- Light Theme
- Dark Theme
- High Contrast Theme

---

## 性能指标

### TreeView

- 初始加载: < 200ms（100 个规则）
- 复选框切换: < 20ms（包括状态同步）
- 刷新速度: < 100ms
- 内存占用: < 10MB

### Webview

- 页面加载: < 500ms
- 交互响应: < 100ms
- 大列表渲染: < 300ms（虚拟滚动）

---

## 未来改进

### TreeView

1. **目录复选框**：

   - 三态复选框（已选/未选/部分选中）
   - 点击目录复选框 → 递归选中/取消所有子项

2. **源节点复选框**：

   - 全选/全不选该源的所有规则
   - 显示选择比例

3. **拖拽排序**：
   - 拖拽规则调整优先级
   - 拖拽规则到不同源

### Webview

1. **批量操作**：

   - 批量选择/取消选择
   - 批量导出规则

2. **高级过滤**：

   - 多标签组合过滤
   - 正则表达式搜索
   - 保存过滤器

3. **可视化增强**：
   - 规则依赖关系图
   - 冲突可视化
   - 规则使用热力图

---

## 实施文档索引

### Webview 实施文档

- [欢迎页面实施](../webview/01-welcome-page-implementation.md)
- [规则选择器实施](../webview/05-rule-selector-implementation.md)
- [Webview 开发指南](./43-webview-best-practices.md)
- [CSS 规范](./44-webview-css-guide.md)
- [Codicons 使用指南](./45-codicons-guide.md)

### 功能实施文档

- [规则选择同步机制](./implementation/rule-selection-sync.md)
- [左侧树视图复选框](./implementation/tree-view-checkbox-implementation.md)
- [选择同步流程图](./implementation/rule-selection-sync-diagrams.md)

---

## 参考资源

- [VS Code Extension API](https://code.visualstudio.com/api)
- [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [Codicons 图标库](https://microsoft.github.io/vscode-codicons/dist/codicon.html)
- [VS Code Theme Colors](https://code.visualstudio.com/api/references/theme-color)

---

**维护者**: ygqygq2  
**最后更新**: 2025-11-14  
**版本**: 2.0.0 - 添加左侧树视图复选框功能
