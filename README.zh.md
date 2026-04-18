# Turbo AI Rules

<div align="center">

<img src="./resources/images/logo.png" alt="Turbo AI Rules Logo" width="128" height="128" />

🚀 **从外部 Git 仓库同步 AI 编码规则，自动生成多种 AI 工具的配置文件**

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/ygqygq2.turbo-ai-rules.svg?color=07c160&label=turbo-ai-rules&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=ygqygq2.turbo-ai-rules)
[![VS Code Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/ygqygq2.turbo-ai-rules?label=VS%20Code%20安装量)](https://marketplace.visualstudio.com/items?itemName=ygqygq2.turbo-ai-rules)
[![OpenVSX Downloads](https://img.shields.io/open-vsx/dt/ygqygq2/turbo-ai-rules?label=OpenVSX%20下载量)](https://open-vsx.org/extension/ygqygq2/turbo-ai-rules)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

[English](./README.md) | [中文文档](./README.zh.md)

</div>

---

## ✨ 功能特性

- 🌐 **多源支持** - 从多个 Git 仓库同步规则
- 🔄 **自动同步** - 定时或手动同步规则更新
- 🧩 **资产化同步** - 用统一流程管理和生成 AI 资产
  - 支持的资产类型包括 `rule`、`instruction`、`skill`、`agent`、`prompt`、`command`、`hook`、`mcp`
  - 支持 Markdown / MDC / JSON / YAML / 目录类输入，结合路径和内容进行分类
- 🎯 **智能适配器与综合体** - 为 Cursor、Copilot、Continue、Claude/Cline 生态以及自定义工具生成输出
  - 预设适配器覆盖单文件规则、skills 目录、commands 目录、hooks 片段和 MCP 设置
  - 适配器综合体（Adapter Suite）支持在同步页中一键选择一组输出
- 🧠 **Skills 与资源复制** - 完整支持技能类资产
  - 保持目录结构并自动识别 `skill.md` 文件
  - 自动复制资源文件（图片、配置、脚本等）
  - 支持按规则源过滤，多仓库技能管理
- 🔍 **规则搜索** - 快速查找和浏览规则
- 🔐 **私有仓库** - 支持 Token 认证
- 📊 **可视化管理** - 树视图和状态栏集成
- 🌍 **多语言** - 界面支持中文/英文

### 🎨 增强的用户界面

- **欢迎页** - 首次启动引导，包含快速开始步骤和模板库
- **统计面板** - 可视化分析，包含图表、指标和导出功能
- **规则详情面板** - 完整的规则检查器，显示元数据和内容预览
- **高级搜索** - 多条件搜索，支持历史记录、过滤器和导出（JSON/CSV）
- **规则选择** - UI界面批量选择规则，同步到多个适配器
- **树视图** - 优先级图标、工具提示、右键菜单（编辑/测试/切换/复制/导出）
- **状态栏** - 多状态指示器，带进度反馈和快捷操作

---

## 🚀 快速开始

> ⚠️ **多工作空间限制**: 本扩展目前对多工作空间支持有限，建议在单工作空间环境下使用。[了解更多](#-已知限制)

### 1. 安装扩展

在 VS Code 扩展市场搜索 **Turbo AI Rules** 并安装。

### 2. 添加规则源

**方式 1：通过状态栏**

- 点击 **Turbo AI Rules** 状态栏图标 → 选择 **Add Source**

**方式 2：通过命令面板**

- 按 `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`)
- 输入 `Turbo AI Rules: Add Source`

输入 Git 仓库信息：

```
仓库 URL: https://github.com/username/ai-rules.git
分支:     main (可选)
子路径:   rules (可选，如 rules 或 docs/rules)
显示名称: My Rules (可选)
访问令牌: ghp_xxxx (仅私有仓库需要)
```

### 3. 同步规则

添加源后会自动同步。也可以手动同步：

- 命令面板：`Turbo AI Rules: Sync Rules`
- 状态栏：点击 **Turbo AI Rules** → **Sync Rules**

### 4. 验证生成的文件

检查工作区根目录：

```
workspace/
├── .cursorrules  # ✅ Cursor 配置 (默认生成)
```

根据启用的适配器/综合体，扩展还可以生成例如：

```
workspace/
├── .github/copilot-instructions.md
├── .github/skills/
├── .cursor/skills/
├── .claude/commands/
├── .claude/hooks/
└── .vscode/mcp.json
```

> **注意**: 默认只启用 Cursor 单文件适配器。如需启用其他 AI 工具或组合输出，请先在 `Turbo AI Rules: Manage Adapters` 中开启对应适配器，再到 `Turbo AI Rules: Open Sync Page` 中选择资产和综合体。

---

## 📖 文档

### 📘 用户指南

- [📚 完整用户指南](./docs/user-guide/README.zh.md) - 详细使用说明
- [📋 01. 命令详解](./docs/user-guide/01-commands.zh.md) - 当前命令入口与工作流说明
- [⚙️ 02. 配置指南](./docs/user-guide/02-configuration.zh.md) - 配置选项和示例
- [📝 03. 规则文件格式](./docs/user-guide/03-rule-format.zh.md) - 如何编写规则 / 指令 / skill 风格内容
- [❓ 04. 常见问题](./docs/user-guide/04-faq.zh.md) - 常见问题解答

### 🛠️ 开发者指南

- [📐 架构设计](./docs/development/01-design.md)
- [🔧 开发指南](./docs/development/05-development.md)
- [📦 维护指南](./docs/development/06-maintaining.md)

---

## ⚡ 核心概念

### 支持的 AI 工具

| 工具           | 配置文件                          | 默认状态  | 说明                            |
| -------------- | --------------------------------- | --------- | ------------------------------- |
| Cursor         | `.cursorrules`                    | ✅ 已启用 | AI-first 代码编辑器             |
| Windsurf       | `.windsurfrules`                  | ⚙️ 已禁用 | Codeium AI IDE                  |
| GitHub Copilot | `.github/copilot-instructions.md` | ⚙️ 已禁用 | GitHub 官方 AI 编程助手         |
| Continue       | `.continuerules`                  | ⚙️ 已禁用 | 开源 AI 编码助手（VSCode 扩展） |
| Cline          | `.clinerules`                     | ⚙️ 已禁用 | 自主编码代理（原 Claude Dev）   |
| Roo-Cline      | `.roorules`                       | ⚙️ 已禁用 | Cline 的增强版分支              |
| Aider          | `.aider.conf.yml`                 | ⚙️ 已禁用 | 终端中的 AI 结对编程工具        |
| Bolt.new       | `.bolt/prompt`                    | ⚙️ 已禁用 | StackBlitz AI 全栈开发平台      |
| Qodo Gen       | `.qodo/rules.md`                  | ⚙️ 已禁用 | AI 测试生成和代码质量工具       |
| Cursor Skills  | `.cursor/skills`                  | ⚙️ 已禁用 | Cursor 技能库目录               |
| Copilot Skills | `.github/skills`                  | ⚙️ 已禁用 | GitHub Copilot 技能目录         |
| 自定义适配器   | 可配置                            | ⚙️ 按需   | 支持任何 AI 工具的自定义配置    |

### 支持的资产类型

| 资产类型        | 常见输入形态                      | 常见输出示例                        |
| --------------- | --------------------------------- | ----------------------------------- |
| `rule`          | Markdown / MDC 规则文件           | `.cursorrules`、`.roorules`         |
| `instruction`   | Markdown / MDC 指令文件           | `.github/copilot-instructions.md`   |
| `skill`         | `skill.md` + 资源目录             | `.cursor/skills/*`、`.github/skills/*` |
| `agent`         | agent 说明 / prompt 文件          | `.claude/agents/*` 或自定义路径     |
| `prompt`        | prompt markdown 文件              | 工具专属 prompt 目录                |
| `command`       | slash-command markdown 文件       | `.claude/commands/*`                |
| `hook`          | hook JSON / 脚本片段              | `.claude/hooks/*` 或 hook settings  |
| `mcp`           | MCP JSON 片段                     | `.vscode/mcp.json`                  |

### 当前同步体验

- 在 **Open Sync Page** 中查看所有已解析资产
- **一次选择资产**，可同时应用到一个或多个适配器综合体
- 支持生成 **Claude 组合输出**（如 `commands + hooks + settings`）或 **自定义 MCP merge-json** 等结果
- 对支持块标记或 merge 策略的输出，尽量保护已有手工内容

### 规则文件格式

扩展支持**双模式解析**，兼顾灵活性和可管理性：

#### **宽松模式（默认）**

✅ 兼容社区现有规则文件（如 [awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules)）
✅ Frontmatter 可选，支持纯 Markdown 文件
✅ 自动从文件名/内容提取元数据

**官方约定格式（Cursor/Copilot 社区标准）**:

```markdown
---
description: TypeScript 最佳实践指南
globs: **/*.{ts,tsx}
---

# TypeScript Best Practices

使用 camelCase 命名变量...
```

**纯 Markdown（无 frontmatter）**:

```markdown
# TypeScript Best Practices

使用 camelCase 命名变量...
```

#### **严格模式（可选）**

适用于企业级规则库管理，需要精确控制：

```markdown
---
id: typescript-naming      # 必需：kebab-case 格式
title: TypeScript 命名规范  # 必需
description: TypeScript 最佳实践指南
globs: **/*.{ts,tsx}
priority: high             # 可选：low/medium/high
tags: [typescript, naming] # 可选
---

# TypeScript 命名规范

使用 camelCase 命名变量...
```

**启用严格模式**:

```json
{
  "turbo-ai-rules.parser.strictMode": true,
  "turbo-ai-rules.parser.requireFrontmatter": true
}
```

📖 **详细说明**: [规则文件格式文档](./docs/RULE_FORMAT.md)

---

## 🎯 使用场景

- 📦 **团队协作** - 在团队项目中共享编码标准
- 🎓 **学习** - 应用社区规则库的最佳实践
- 🔄 **多项目** - 在多个项目间同步相同规则
- 🛠️ **自定义工具** - 通过自定义适配器支持任何 AI 工具

---

## ⚠️ 已知限制

### 多工作空间支持

本扩展目前对**多工作空间（Multi-root Workspace）支持有限**（即 VS Code 中打开多个项目文件夹的场景）。

**当前行为**:

- ✅ 可以在多工作空间环境中激活扩展
- ⚠️ 操作时仅使用**第一个工作空间文件夹**
- ⚠️ 同步/生成配置前需要用户确认
- ❌ 无法保证在所有工作空间文件夹中都能正常工作

**推荐使用方式**:

- 📁 在**单工作空间**环境下使用以获得最佳体验
- 🔄 使用本扩展时，建议分别打开每个项目文件夹

**为什么有此限制？**

- 多工作空间场景下规则选择状态管理变得复杂
- 在 Webview 和编辑器之间切换时可能丢失工作空间上下文
- 为主要使用场景保持简单性和可靠性

**未来计划**: 我们可能会根据用户反馈在未来版本中添加完整的多工作空间支持。

---

## 🤝 贡献

欢迎贡献！请阅读我们的[贡献指南](./CONTRIBUTING.md)。

贡献方式：

- 🐛 通过 [GitHub Issues](https://github.com/ygqygq2/turbo-ai-rules/issues) 报告 Bug
- 💡 提出功能建议
- 📝 改进文档
- 🔧 提交 Pull Request

---

## 📚 资源

- [📖 更新日志](./CHANGELOG.md) - 版本历史
- [⚖️ 许可证](./LICENSE) - MIT License
- [💬 讨论区](https://github.com/ygqygq2/turbo-ai-rules/discussions) - 问答和想法

---

## 📄 许可证

本项目采用 **MIT License**。详见 [LICENSE](./LICENSE)。

---

## 💬 支持

- 📧 邮箱: ygqygq2@qq.com
- 🐙 GitHub: [@ygqygq2](https://github.com/ygqygq2)

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给个 Star！ ⭐**

Made with ❤️ by [ygqygq2](https://github.com/ygqygq2)

</div>
