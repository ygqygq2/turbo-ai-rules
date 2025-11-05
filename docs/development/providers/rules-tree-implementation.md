# 规则树视图实施要点（RulesTreeProvider）

对应源码：`src/providers/RulesTreeProvider.ts`
目标：直观展示规则源与规则项，提供图标、Tooltip 与快捷操作入口。

## 关键实现

- 图标与优先级映射：`ThemeIcon('flame'|'warning'|'info')` + 主题色。
- Tooltip：`MarkdownString` 显示源名称、文件路径、优先级、标签。
- 描述信息：启用状态、分支、标签预览，便于不展开即可获取上下文。
- 刷新策略：数据变化后 300ms 防抖刷新。

## 交互点

- 右键菜单透传到命令（见 `commands/context-menu-implementation.md`）。
- 双击规则项 → 打开原始文件。

## 边界与注意

- 空数据时显示空态文案（避免空白面板）。
- 超长名称截断并在 Tooltip 完整展示。
- MarkdownString 严格转义用户内容，防止 XSS。
