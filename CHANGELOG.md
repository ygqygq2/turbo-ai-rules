**Change Log**

All notable changes to the "turbo-ai-rules" extension will be documented in this file.

# [2.0.0]

## 新增功能 🌱

- **feat: 高级搜索 Webview** - 强大的多条件组合搜索
  - 支持名称/内容/标签/优先级/来源多条件搜索
  - 搜索历史记录（最近 10 次，持久化存储）
  - 快捷过滤器（按优先级快速筛选）
  - 快捷键：`Cmd+Shift+Alt+F`
- **feat: 批量操作命令** - 提升规则管理效率
  - 批量启用/禁用规则
  - 批量导出规则
  - 批量删除规则
  - 模态确认对话框，防止误操作

## 文档更新 📚

- **docs: Phase 3 实现文档** - 添加 `10-ui-phase3-implementation.md`
  - 详细的架构设计和实现说明
  - 完整的测试清单
  - 性能优化建议
- **docs: 更新 README** - 添加新功能介绍
  - 高级搜索功能说明
  - 批量操作功能说明
  - 新增快捷键文档

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
