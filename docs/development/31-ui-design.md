# Turbo AI Rules - 整体 UI 设计

> 目标：把"安装 → 同步 → 选择规则并同步到适配器 → 浏览/搜索 → 查看 → 编辑 → 复查/诊断"的完整闭环以清晰的"页面/交互流"呈现。

- 版本：2.0.2
- 更新内容：
  - 规范文件命名：规则选择器 → 规则同步页
  - 统一设计文档和实施文档命名
  - 同步版本号到软件版本

---

**v2.0.2（2025-11-27 重大更新）**

- 新增 Dashboard 首页
- 新增适配器管理页
- 规则选择器改为规则同步页（支持适配器映射）
- 简化 Skills 处理（作为普通自定义适配器）

相关：

- 设计系统总览 → [.superdesign/design_docs/README.md](../../.superdesign/design_docs/README.md)
- SuperDesign 规范 → [.superdesign/rules.md](../../.superdesign/rules.md)

---

## 一、用户旅程（功能闭环）

### 1. 初次安装与引导

- **事件**：扩展激活后首启展示"欢迎页"
- **页面**：01 欢迎页（WelcomeWebviewProvider）
- **关键操作**：
  - 按钮「添加规则源」→ 进入添加流程
  - 按钮「了解规则格式」→ 打开官方文档
  - 按钮「查看示例」→ 一键导入示例源
  - **首次之后不再默认显示**

### 2. 扩展主入口 - Dashboard (新增)

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

**核心页面**（按使用频率排序）:

1. **Dashboard（12）**：`DashboardWebviewProvider`（新增 v4.0，默认首页）
2. **规则同步页（05）**：`RuleSyncPageWebviewProvider`（升级 v4.0，原规则选择器）
3. **适配器管理（13）**：`AdapterManagerWebviewProvider`（新增 v4.0）
4. **规则树（05）**：VS Code TreeView（`RulesTreeProvider`）
5. **规则详情（03）**：`RuleDetailsWebviewProvider`
6. **源详情（07）**：`SourceDetailWebviewProvider`
7. **欢迎页（01）**：`WelcomeWebviewProvider`（首次启动或手动打开）

**辅助页面**：

- 统计仪表板（02）：`StatisticsWebviewProvider`
- 高级搜索（04）：`SearchWebviewProvider`
- 状态栏（06）：`StatusBarProvider`
- 配置管理（08）：集成在适配器管理页
- 规则编辑器（09）：`RuleEditorWebviewProvider`（待实现）
- 冲突解决（10）：`ConflictResolutionWebviewProvider`（待实现）
- 同步进度（11）：`SyncProgressWebviewProvider`（待实现，可与通知结合）

> 详细页面规范与 HTML/CSS/消息协议请见 `.superdesign/design_docs`。

---

## 三、关键交互设计（摘要）

### 1. Dashboard 主入口

**规则源快捷操作**：

- "同步至所有启用适配器"：快速同步所有规则到所有启用的适配器
- "添加规则源"：打开添加规则源向导
- "管理规则源"：跳转到规则源详情页

**适配器状态概览**：

- 显示所有启用的适配器及其规则数量
- 点击"管理适配器"：跳转到适配器管理页

**快速操作**：

- "规则同步页"：精细控制规则和适配器映射
- "统计面板"、"高级搜索"等其他功能入口

### 2. 规则同步页（核心功能）

**左侧规则树**：

- 统一展示所有规则源的规则树（不需要切换源）
- 文件级复选框选择规则
- 支持跨规则源选择规则
- 搜索和过滤功能

**右侧适配器列表**：

- 显示所有适配器（预置 + 自定义）
- 复选框勾选目标适配器
- 实时显示每个适配器将同步的规则数

**同步流程**：

1. 用户勾选左侧规则
2. 用户勾选右侧适配器
3. 点击"同步"按钮
4. 系统将选中的规则生成到勾选的适配器配置文件
5. 显示同步进度和结果

### 3. 适配器管理

**预置适配器**：

- 复选框启用/禁用（Copilot、Cursor、Continue）
- 展开详细配置（自动更新、包含元数据等）

**自定义适配器**：

- 添加/编辑/删除自定义适配器
- 配置输出路径、输出类型（文件/目录）
- 文件过滤规则（可选）
- Skills 适配器：作为普通自定义适配器处理

### 4. 规则树单击行为（可配置）

- 默认：打开"规则详情"Webview
- 右键菜单：
  - 打开源文件（在编辑器中）
  - 在规则编辑器中编辑（Webview）
  - 复制内容 / 导出 / 忽略

### 5. 规则编辑器保存流程

- 编辑 → 校验（MDC/frontmatter）→ 写入临时文件 → 覆盖源文件 → 刷新解析缓存 → 详情/树自动刷新
- 错误码：`TAI-300x`（解析/校验）、`TAI-400x`（写入）、`TAI-500x`（系统）

---

## 四、导航与命令一览（对外）

**Activity Bar**:

- Turbo AI Rules → Rules Explorer（TreeView）

**顶部菜单（视图标题）**:

- Dashboard/欢迎页/添加源/刷新缓存/统计/搜索

**核心命令**（`turboAiRules.*`）:

- `openDashboard` - 打开 Dashboard 首页（新增）
- `openRuleSyncPage` - 打开规则同步页（原 openRuleSelector，升级）
- `manageAdapters` - 打开适配器管理页（新增）
- `addSource` - 添加规则源
- `syncRules` - 同步规则（快捷同步至所有启用适配器）
- `syncToAdapters` - 规则同步页的同步操作（新增）
- `generateConfigs` - 生成配置文件
- `openWelcome` - 打开欢迎页（手动）
- `openRuleFile` - 在编辑器中打开规则文件
- `editRule` - 打开规则编辑器（待实现）

---

## 五、与 SuperDesign 文档的对应关系

本文件是"总设计"，逐页的实现设计请见：

**v4.0 新增/更新页面**:

- 12 Dashboard → `.superdesign/design_docs/12-dashboard.md`（新增）
- 13 适配器管理 → `.superdesign/design_docs/13-adapter-manager.md`（新增）
- 05 规则同步页 → `.superdesign/design_docs/05-rule-sync-page.md`（重大升级）

**现有页面**:

- 01 欢迎页 → `.superdesign/design_docs/01-welcome-page.md`
- 02 统计仪表板 → `.superdesign/design_docs/02-statistics-dashboard.md`
- 03 规则详情面板 → `.superdesign/design_docs/03-rule-details-panel.md`
- 04 高级搜索 → `.superdesign/design_docs/04-advanced-search.md`
- 05 规则树 → `.superdesign/design_docs/05-tree-view.md`
- 06 状态栏 → `.superdesign/design_docs/06-status-bar.md`
- 07 源详情 → `.superdesign/design_docs/07-source-details-page.md`
- 09 规则编辑器（待实现） → `.superdesign/design_docs/09-rule-editor.md`
- 10 冲突解决（待实现） → `.superdesign/design_docs/10-conflict-resolution.md`
- 11 同步进度（待实现） → `.superdesign/design_docs/11-sync-progress.md`

---

## 六、核心设计变更总结（v4.0）

### 1. 首页体验优化

**变更前**：欢迎页作为默认首页，对老用户无用
**变更后**：Dashboard 作为默认首页，欢迎页仅首次或手动打开
**优势**：提供所有功能的快捷入口，提升老用户效率

### 2. 规则同步机制升级

**变更前**：

- 规则选择器只能选择规则
- 同步时所有规则同步到所有启用的适配器
- 缺乏灵活性

**变更后**：

- 规则同步页支持规则 + 适配器双向选择
- 左侧：所有规则源统一展示（不需要切换源）
- 右侧：勾选目标适配器
- 支持精细控制：不同规则同步到不同适配器
  **优势**：灵活的规则-适配器映射关系

### 3. 适配器管理独立

**变更前**：适配器配置分散在设置中
**变更后**：独立的适配器管理页
**优势**：集中管理预置和自定义适配器，UI 更友好

### 4. Skills 处理简化

**变更前**：Skills 需要特殊字段（skills/sourceId/subPath）
**变更后**：Skills 作为普通自定义适配器
**优势**：

- 简化数据结构和实现
- 用户通过命名和输出路径识别
- 推荐使用 `skill` 标签配合过滤

### 5. 同步策略双轨制

**快捷同步**（Dashboard）：

- 同步所有规则到所有启用的适配器
- 适合初始设置和日常更新

**精细同步**（规则同步页）：

- 选择特定规则同步到特定适配器
- 适合复杂场景和个性化配置

---

## 七、后续实施建议

**优先级 P0**（核心功能）:

1. 实现 Dashboard 首页
2. 升级规则选择器为规则同步页
3. 实现适配器管理页
4. 更新 ConfigManager 移除 Skills 相关字段

**优先级 P1**（增强功能）:

1. 规则同步页的搜索和过滤
2. 适配器详细配置选项
3. 同步进度展示优化

**优先级 P2**（高级功能）:

1. 规则编辑器
2. 冲突解决面板
3. 同步进度独立页面

---

如需补充或调整流程，请在 PR 中同步更新本文件与对应的 SuperDesign 页面文档（保持设计-实现一致）。

**最后更新**: 2025-11-27  
**版本**: 4.0 - 重大架构升级
