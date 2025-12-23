**Change Log**

All notable changes to the "turbo-ai-rules" extension will be documented in this file.

# [2.0.2]

## 🚀 功能增强

- **配置驱动的预设适配器** - 重构预设适配器架构，从 3 个扩展到 9 个主流 AI 工具
  - 新增支持：Windsurf, Cline, Roo-Cline, Aider, Bolt, Qodo Gen
  - 采用配置驱动，添加新工具无需修改代码
- **适配器管理器 UI** - 全新的可视化适配器管理界面
  - 预设适配器和自定义适配器分标签管理
  - 支持启用/禁用、编辑、删除操作
  - 自定义适配器支持单文件和目录两种输出格式
- **适配器配置格式优化** - 采用嵌套对象格式，支持动态扩展
  - 自动迁移旧配置格式（cursor, copilot, continue）
  - 保持 3 个版本兼容性（计划 v2.0.5 移除旧格式）
- **用户规则保护默认启用** - `protectUserRules` 默认改为 `true`，更好地保护用户已有规则
- **统一块标记格式** - 使用固定的 `<!-- TURBO-AI-RULES:BEGIN -->` 标记，时间信息移至第二行
- **Git 缓存刷新后自动重新解析规则** - 点击"刷新 Git 缓存"按钮后，会自动重新解析规则并更新规则树视图

## ⚠️ 配置格式变更

**旧格式**（仍然支持，会自动迁移）:

```json
{
  "turbo-ai-rules.adapters.cursor.enabled": true,
  "turbo-ai-rules.adapters.copilot.enabled": false
}
```

**新格式**（推荐）:

```json
{
  "turbo-ai-rules.adapters": {
    "cursor": { "enabled": true },
    "copilot": { "enabled": false }
  }
}
```

详见: [适配器配置迁移说明](docs/development/implementation/adapter-config-migration.md)

## 🎨 UI 优化

- **适配器管理页面** - 布局优化，使用 tab 分割预设适配器和自定义适配器
- **错误提示优化** - 保存适配器时，错误提示在标题下方显示，更醒目
- **ID 字段保护** - 编辑模式下 ID 字段禁用，防止修改导致冲突
- **翻译参数统一** - 使用 `{0}` 数字占位符格式，保持一致性

## 🐛 修复问题

- 修复自定义适配器保存时重复 ID 检测被绕过的问题
- 修复适配器保存成功消息中名称未正确替换的问题
- 修复规则同步页面不选择任何规则时，之前的选择状态仍被保留的问题
- 修复 Git 缓存刷新后规则列表未自动更新的问题
- 修复未加引号的通配符（`*.md`、`**/*.js` 等）导致的 YAML 解析失败
- 修复扩展启动时规则列表不完整的问题
- 修复取消所有规则选择后配置文件未清空的问题

## 💡 改进优化

- **日志级别优化** - 重复 ID 等预期业务错误使用 warn 级别，避免冗长堆栈信息
- **数据映射改进** - 修正适配器保存时的字段映射逻辑
- 添加智能 YAML 转义：自动为 frontmatter 中的通配符值添加引号
- 统一扩展启动和 Git 缓存刷新的规则解析逻辑
- 即使没有规则也生成空配置，确保清空之前的内容

## 🔧 技术改进

- 添加 `js-yaml` 依赖以支持自定义 YAML 解析
- 提取 `parseAndLoadRules` 共享函数到 `utils/ruleLoader.ts`
- 更新相关文档和实施记录

# [2.0.1]

## 🚀 功能优化

### 规则文件格式统一优化

- **优化三个适配器的规则文件生成格式**，消除标题重复和冗余内容
  - **Cursor 适配器**：去除多余的二级标题（`## title`），直接输出规则原始内容（包含 frontmatter）
  - **Continue 适配器**：去除 Overview 概览部分和多余的三级标题，采用与 Cursor 一致的简洁格式
  - **Copilot 适配器**：去除按标签分组的复杂结构和多余的三级标题，统一为简洁格式
- **统一的格式结构**：文件头部（元数据 + 主标题 + 说明） → 目录（Table of Contents） → 规则内容（直接输出 rawContent） → 分隔符（`---`）
- **格式优势**：
  - ✅ 无重复标题：规则内容本身已包含标题，不再额外添加
  - ✅ 保留元数据：frontmatter 完整保留，包含优先级、标签等信息
  - ✅ 格式统一：三个工具的格式完全一致，易于维护
  - ✅ 简洁清晰：去除了 Overview、标签分组等多余内容
  - ✅ 兼容性好：符合 Markdown 规范，AI 工具可正确解析

## 🐛 修复问题

### 用户规则保护功能修复

- **修复首次使用时用户规则被清空的问题**
  - 问题：启用 `protectUserRules: true` 后，如果用户已有规则文件（如 `.cursorrules`），首次生成配置时仍会清空原有内容
  - 原因：原逻辑只保护块标记外的内容，但首次使用时文件没有块标记，导致原有内容被识别为空
  - 修复：智能检测文件是否包含块标记
    - **无块标记**：将整个现有文件内容视为用户规则，完整保留并移到块标记之后
    - **有块标记**：仅保留块标记外的用户内容（正常流程）
  - 影响：用户首次使用扩展时，原有规则文件会被完整保留，避免数据丢失
  - 测试：添加单元测试覆盖首次保护场景

### 其他修复

- 页面样式不统一
- 扩展安装要求编辑器的版本过高

# [2.0.0]

🎉 **重大版本更新** - 首个 UI 版本,全面重构用户体验

## 💎 核心特性

### 全新 Webview UI 系统

基于 React + Zustand 构建的现代化 UI 界面,提供更直观的交互体验:

- **欢迎页面** - 新手引导,一键快速开始
- **源详情页** - 可视化查看规则源配置、分支信息、同步状态
- **规则选择器** - 交互式规则启用/禁用管理
- **统计仪表板** - 规则数量、分布、来源统计可视化
- **高级搜索** - 多条件组合搜索,支持搜索历史
- **规则详情** - 完整的规则元数据和内容展示

### 可视化源管理

- **添加源向导** - 分步引导添加 Git 规则源
- **源详情查看** - 实时显示分支、最后同步时间、规则统计
- **快捷操作** - 一键同步、启用/禁用、测试连接、编辑配置

### 强大的搜索功能

- **多维度搜索** - 支持名称/内容/标签/优先级/来源组合搜索
- **搜索历史** - 自动保存最近 10 次搜索,快速重用
- **快捷过滤器** - 按优先级(高/中/低)快速筛选
- **快捷键支持** - `Cmd+Shift+Alt+F` (macOS) / `Ctrl+Shift+Alt+F` (Windows/Linux)

### 批量操作增强

- **批量规则管理** - 选择多个规则进行启用/禁用/导出/删除
- **全选/取消全选** - 按源快速选择所有规则
- **安全确认** - 危险操作(删除)需二次确认

## 🚀 新增功能

### UI 界面

- **feat: 欢迎页 Webview** - 引导新用户快速上手
- **feat: 源详情 Webview** - 可视化展示规则源配置和状态
- **feat: 规则选择器 Webview** - 交互式规则管理界面
- **feat: 统计仪表板 Webview** - 数据可视化展示
- **feat: 高级搜索 Webview** - 强大的多条件搜索
- **feat: 规则详情 Webview** - 完整的规则信息展示

### 命令增强

- **feat: 批量操作命令** - 批量启用/禁用/导出/删除规则
- **feat: 查看源详情命令** - 右键菜单打开源详情页
- **feat: 规则选择命令** - 通过 UI 界面管理规则选择状态
- **feat: 刷新 Git 缓存命令** - 强制重新克隆规则源

### 状态管理

- **feat: WorkspaceStateManager** - 工作区级别状态持久化
- **feat: SelectionStateManager** - 规则选择状态管理
- **feat: 搜索历史持久化** - 自动保存和恢复搜索记录

## 🐛 问题修复

- **fix: TreeView 始终显示所有规则** - 直接从 Git 缓存目录加载,不依赖内存缓存
- **fix: 规则同步后 TreeView 刷新** - 确保同步后立即更新显示
- **fix: 规则选择状态持久化** - 工作区级别保存,重启后保持选择
- **fix: 测试覆盖完善** - 357 个单元测试 + 31 个集成测试,100% 通过

## ⚙️ 架构优化

### 模块化重构

- **BaseWebviewProvider** - 统一的 Webview 基类,简化新页面开发
- **分层架构** - Services → Providers → Commands 清晰职责划分
- **状态管理** - Zustand 实现响应式状态管理

### 性能优化

- **按需加载** - Webview 仅在需要时创建和加载
- **缓存策略** - Git 缓存避免重复克隆
- **增量更新** - 仅同步变更的规则源

### 开发体验

- **TypeScript 严格模式** - 完整的类型安全
- **ESLint 配置优化** - 测试目录允许 any 类型
- **Vite 构建** - 快速的 Webview 资源构建
- **React 开发模式** - 支持热重载和调试

## 📚 文档更新

### 开发文档

- **docs: UI 设计总览** - `docs/development/30-ui-design-overview.md`
- **docs: UI 开发流程** - `docs/development/32-ui-development-process.md`
- **docs: Webview 最佳实践** - `docs/development/43-webview-best-practices.md`
- **docs: CSS 规范** - `docs/development/44-webview-css-guide.md`
- **docs: Codicons 使用指南** - `docs/development/45-codicons-guide.md`
- **docs: StatusBar 设计** - `docs/development/46-status-bar-design.md`

### 实施文档

- **docs: 欢迎页实施** - `docs/development/webview/01-welcome-page-implementation.md`
- **docs: 添加源实施** - `docs/development/webview/02-add-source-implementation.md`
- **docs: 源详情实施** - `docs/development/webview/03-source-detail-implementation.md`
- **docs: 规则选择器实施** - `docs/development/webview/04-rule-selector-implementation.md`
- **docs: 统计页实施** - `docs/development/webview/05-statistics-implementation.md`
- **docs: 搜索页实施** - `docs/development/webview/06-search-implementation.md`
- **docs: 规则详情实施** - `docs/development/webview/07-rule-details-implementation.md`

### 测试文档

- **docs: 测试覆盖报告** - `docs/development/41-test-coverage.md`
  - 36 个单元测试文件,357 个测试用例
  - 11 个集成测试文件,31 个测试用例
  - 100% 测试通过率

### 用户文档

- **docs: 命令说明更新** - 新增 UI 相关命令
- **docs: 快捷键文档** - 完整的快捷键列表
- **docs: FAQ 更新** - 常见问题解答

## 🔧 技术栈

### 前端

- **React 19.2.0** - UI 框架
- **Zustand 5.0.8** - 状态管理
- **Vite 7.1.11** - 构建工具
- **@vscode/codicons** - VSCode 官方图标

### 后端

- **TypeScript 5.9.3** - 类型安全
- **simple-git 3.28.0** - Git 操作
- **gray-matter 4.0.3** - Frontmatter 解析
- **@ygqygq2/vscode-log** - 日志系统

### 测试

- **Vitest 3.2.4** - 单元测试
- **Mocha 11.7.4** - 集成测试
- **@vscode/test-electron** - VSCode 扩展测试

## ⚠️ 破坏性变更

- 最低 VSCode 版本要求: `^1.88.0`
- Node.js 版本要求: `>=18.0.0`
- 配置结构无变化,完全向后兼容 1.x

## 📦 升级指南

从 1.x 升级到 2.0:

1. **自动迁移** - 配置和数据自动迁移,无需手动操作
2. **新功能体验** - 升级后打开欢迎页了解新功能
3. **性能提升** - 首次同步可能需要重建缓存

## 🙏 致谢

感谢所有贡献者和用户的反馈,让 Turbo AI Rules 2.0 成为可能!

# [1.0.1]

## 新增功能 🌱

- **feat: 双模式解析支持** - 新增解析器配置，支持宽松模式（默认）和严格模式
  - `turbo-ai-rules.parser.strictMode`: 严格模式要求必须包含 id/title
  - `turbo-ai-rules.parser.requireFrontmatter`: 是否要求 YAML frontmatter
  - 宽松模式下自动从文件名生成 id，从标题提取 title
  - 严格模式下强制要求完整元数据，适合企业级规则管理
- **feat: 扩展 Logo 支持** - 添加扩展图标，提升品牌识别度
  - 在 VS Code 扩展市场显示
  - 在 README 文档中展示

## 功能优化 🚀

- **refactor: 优化规则验证逻辑** - `RulesValidator` 现在根据 `strictMode` 动态调整验证策略
  - 宽松模式：缺少 id/title 时仅产生警告，不阻止同步
  - 严格模式：缺少 id/title 时产生错误，拒绝解析
  - 解决了只能同步少量规则的问题
- **refactor: 改进 MDC 解析器** - `MdcParser` 支持无 frontmatter 的纯 Markdown 文件
  - 自动生成 id（kebab-case 文件名）
  - 自动提取 title（第一个 # 标题）
  - 完全兼容 Cursor/Copilot 社区规则文件
- **refactor: 移除 CursorAdapter 中的类型断言** - 使用 `ParsedRule` 接口的 `sourceId` 和 `filePath` 属性
  - 消除 ESLint 警告
  - 提高类型安全性
- **refactor: 完善配置管理** - `ConfigManager` 现在读取 `parser` 配置
  - 添加 `ParserConfig` 类型导入
  - 从 VSCode 配置中读取解析器设置

## 文档更新 📚

- **docs: 完善设计文档** - `docs/development/01-design.md`
  - 新增"双模式解析策略"章节
  - 详细说明宽松模式 vs 严格模式的区别和使用场景
  - 移除不必要的 TypeScript 代码实现，符合设计文档规范
- **docs: 增强规则格式文档** - `docs/user-guide/03-rule-format.zh.md`
  - 合并双模式解析说明
  - 提供宽松模式和严格模式的完整示例
  - 说明官方约定字段 vs 扩展字段
- **docs: 更新配置文档** - `docs/user-guide/02-configuration*.md`
  - 添加解析器配置说明
  - 说明 `scope: "resource"` 的含义和使用场景
- **docs: 添加文档规范** - `.github/copilot-instructions.md`
  - 制定强制文档规范：设计文档不包含代码实现
  - 所有 docs/ 子目录文件必须有序号（01-_.md, 02-_.md）
  - 设计-代码-文档统一要求
- **docs: 文件组织优化**
  - 删除 `docs/99-sync-summary.md` 和 `docs/test-coverage.md`
  - 新增 `docs/development/05-sync-summary.md`
  - 新增 `docs/development/06-test-coverage.md`
  - 统一文档序号规范
- **docs: README 增强**
  - 添加 Logo 展示
  - 更新功能特性说明

## 配置更新 ⚙️

- **config: 新增解析器配置项** - `package.json`
  - `turbo-ai-rules.parser.strictMode`: 是否启用严格模式（默认 false）
  - `turbo-ai-rules.parser.requireFrontmatter`: 是否要求 frontmatter（默认 false）
- **config: 更新示例工作区配置** - 所有 `sampleWorkspace/*/settings.json`
  - 添加 `parser` 配置示例
  - 调整适配器启用状态

## Bug 修复 🐛

- **fix: 解决规则同步只显示少量规则的问题** - 根因是 `RulesValidator` 总是要求 id/title
  - 现在宽松模式下可以同步所有兼容的规则文件
  - 严格模式保持企业级规则管理的严格性
- **fix: 修复 TypeScript 编译错误** - `ConfigManager` 缺少 `parser` 属性
- **fix: 修复 ESLint 警告** - `CursorAdapter` 中移除未使用变量和 `any` 类型

## 测试 ✅

- 15 个集成测试通过
- 多源同步测试验证
- 适配器输出文件生成测试
- 用户规则保护测试

# [1.0.0]

## 新增功能 🌱

- feat: 支持从多个来源同步 AI 规则（Git 仓库、本地目录、URL）
- feat: 支持多种 AI 工具适配器（Cursor、GitHub Copilot、Continue）
- feat: 支持自定义适配器配置（文件/目录输出、过滤规则、组织方式）
- feat: 支持 MDC 格式解析（Markdown + YAML Frontmatter）
- feat: 提供规则搜索和管理功能
- feat: 提供规则树视图和状态栏显示
- feat: 支持国际化（中文/英文）
- feat: 用户自定义规则保护机制（目录前缀规避 + 单文件块标记）

## 功能优化 🚀

- refactor: 模块化架构设计，易于扩展
- refactor: 完善的错误处理和日志记录
- refactor: 自动 .gitignore 管理

## 文档更新 📚

- docs: 完整的 README 文档（中英文）
- docs: 详细的自定义适配器设计文档
- docs: FAQ 包含用户自定义规则指南
- docs: 标注 AI 工具优先级机制的官方确认状态
