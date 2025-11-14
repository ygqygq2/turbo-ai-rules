# Turbo AI Rules - 整体 UI 设计

> 目标：把“安装 → 同步 → 浏览/搜索 → 查看 → 编辑 → 生成配置 → 复查/诊断”的完整闭环以清晰的“页面/交互流”呈现；每个页面的详细交互与 HTML 由 `.superdesign/design_docs/*` 维护。

- 版本：3.0（SuperDesign 协作）
- 更新：2025-11-10

相关：

- 设计系统总览 → [.superdesign/design_docs/README.md](../../.superdesign/design_docs/README.md)
- SuperDesign 规范 → [.superdesign/rules.md](../../.superdesign/rules.md)

---

## 一、用户旅程（功能闭环）

1. 初次安装与引导

- 事件：扩展激活后首启展示“欢迎页”。
- 页面：01 欢迎页（WelcomeWebviewProvider）
- 关键操作：
  - 按钮「添加规则源」→ 进入添加流程（命令串 + 进度反馈）。
  - 按钮「了解规则格式」→ 打开官方文档。
  - 按钮「查看示例」→ 一键导入示例源并完成一次同步。

2. 添加/管理规则源

- 形式：命令面板 + QuickPick/输入框；详情以 Webview 呈现。
- 页面：07 源详情页（SourceDetailWebviewProvider）
- 关键操作：新增、编辑、开启/关闭、测试连接、同步、查看缓存位置。

3. 同步与进度反馈

- 形式：进度条 + 状态栏提示 + 可选的“同步详情”面板（新）。
- 页面：11 同步进度面板（新建）
- 行为：显示克隆/拉取、解析、合并、生成配置的分阶段进度与错误。

4. 浏览与搜索规则

- 侧边栏：Rules Explorer（TreeView）
  - 根节点：规则源
  - 子节点：规则（按源/标签/优先级等）
  - 单击：默认“打开规则详情”Webview；支持右键“打开源文件”“在编辑器中编辑”。
- 页面：
  - 05 Tree View（已有）
  - 04 高级搜索（SearchWebviewProvider，已有）
  - 02 统计仪表板（可选，已有）

5. 规则详情（展示）

- 页面：03 规则详情面板（RuleDetailsWebviewProvider，展示 md/mdc 渲染结果）
- 关键交互：
  - 顶部操作：复制、导出、忽略、打开源文件、在规则编辑器中编辑。
  - 元数据区：id、tags、priority、来源、路径。

6. 规则编辑（新）

- 页面：09 规则编辑器（新建）
- 形态：Webview 编辑器 + 右侧实时预览 + 元数据表单（frontmatter）
- 功能：
  - 打开：从 TreeView 或 详情页点击“编辑”，加载对应 md/mdc。
  - 校验：保存前进行规则格式校验（错误码 TAI-30xx），错误定位。
  - 预览：基于 Markdown 渲染（与详情相同渲染管线）。
  - 保存：原子写入；保护用户目录；失败有友好提示与日志。

7. 配置生成与适配器

- 行为：同步后自动/手动生成目标工具配置（Copilot/Cursor/Continue/自定义）。
- 页面：08 配置管理（已有）
- 提示：在状态栏显示“最近一次生成时间/目标数量/异常计数”。

8. 冲突与诊断

- 页面：10 冲突解决（新建）、02 统计/概览、日志视图
- 功能：展示重复 ID/标题等冲突，提供“采用/合并/跳过”策略说明与溯源。

---

## 二、信息架构（页面与提供者）

- 欢迎页（01）：`WelcomeWebviewProvider`（已实现）
- 统计仪表板（02）：`StatisticsWebviewProvider`（已实现）
- 规则详情（03）：`RuleDetailsWebviewProvider`（已实现）
- 高级搜索（04）：`SearchWebviewProvider`（已实现）
- 规则树（05）：VS Code TreeView（`RulesTreeProvider`，已实现）
- 状态栏（06）：`StatusBarProvider`（已实现）
- 源详情（07）：`SourceDetailWebviewProvider`（已实现）
- 配置管理（08）：`SuperDesign Config Manager`（文档已存在）
- 规则编辑器（09）：`RuleEditorWebviewProvider`（待实现）
- 冲突解决（10）：`ConflictResolutionWebviewProvider`（待实现）
- 同步进度（11）：`SyncProgressWebviewProvider`（待实现，可与通知结合）

> 详细页面规范与 HTML/CSS/消息协议请见 `.superdesign/design_docs`。本文件只负责“是什么/为什么/流程”而不包含实现细节。

---

## 三、关键交互设计（摘要）

1. 规则树单击行为（可配置）

- 默认：打开“规则详情”Webview。
- 右键菜单：
  - 打开源文件（在编辑器中）
  - 在规则编辑器中编辑（Webview）
  - 复制内容 / 导出 / 忽略

2. 规则编辑器保存流程

- 编辑 → 校验（MDC/frontmatter）→ 写入临时文件 → 覆盖源文件 → 刷新解析缓存 → 详情/树自动刷新。
- 错误码：`TAI-300x`（解析/校验）、`TAI-400x`（写入）、`TAI-500x`（系统）。

3. 同步与冲突

- 同步时显示进度；若发现冲突，提供“查看详情”入口到冲突面板。
- 冲突面板显示来源、版本、优先级、建议方案，支持一键采纳策略说明。

---

## 四、导航与命令一览（对外）

- Activity Bar：Turbo AI Rules → Rules Explorer（TreeView）
- 顶部菜单（视图标题）：欢迎页/添加源/刷新缓存/生成配置/统计/搜索
- 命令面板：`turbo-ai-rules.*` 系列（见 package.json）
- 新增命令（规划）：
  - `turbo-ai-rules.openRuleFile`（在编辑器中打开 md/mdc）
  - `turbo-ai-rules.editRule`（打开规则编辑器）

---

## 五、与 SuperDesign 文档的对应关系

本文件是“总设计”，逐页的实现设计请见：

- 01 欢迎页 → `.superdesign/design_docs/01-welcome-page.md`
- 02 统计仪表板 → `.superdesign/design_docs/02-statistics-dashboard.md`
- 03 规则详情面板 → `.superdesign/design_docs/03-rule-details-panel.md`
- 04 高级搜索 → `.superdesign/design_docs/04-advanced-search.md`
- 05 规则树 → `.superdesign/design_docs/05-tree-view.md`
- 06 状态栏 → `.superdesign/design_docs/06-status-bar.md`
- 07 源详情 → `.superdesign/design_docs/07-source-details-page.md`
- 08 配置管理 → `.superdesign/design_docs/08-superdesign-config-manager.md`
- 09 规则编辑器（新） → `.superdesign/design_docs/09-rule-editor.md`
- 10 冲突解决（新） → `.superdesign/design_docs/10-conflict-resolution.md`
- 11 同步进度（新） → `.superdesign/design_docs/11-sync-progress.md`

> 说明：设计文档序号将作为实施文档的编号前缀，二者需保持一致；现存重复编号（如 05/07 的两个版本）在后续清理阶段合并保留一个。

---

## 六、后续实施顺序（建议）

1. 新增“在编辑器中打开规则文件”命令与右键菜单；
2. 新增“规则编辑器”页面与 Provider 框架；
3. 同步进度面板（可先用通知/状态栏，再补面板）；
4. 冲突解决面板；
5. 清理并统一 `.superdesign/design_docs` 编号与内容。

---

如需补充或调整流程，请在 PR 中同步更新本文件与对应的 SuperDesign 页面文档（保持设计-实现一致）。
