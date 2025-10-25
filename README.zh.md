# Turbo AI Rules

<div align="center">

🚀 **从外部 Git 仓库同步 AI 编码规则，自动生成多种 AI 工具的配置文件**

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/ygqygq2.turbo-ai-rules.svg?color=07c160&label=turbo-ai-rules&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=ygqygq2.turbo-ai-rules)
![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/ygqygq2.turbo-ai-rules)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

[English](./README.md) | [中文文档](./README.zh.md)

</div>

---

## ✨ 功能特性

- 🌐 **多源支持** - 从多个 Git 仓库同步规则
- 🔄 **自动同步** - 定时或手动同步规则更新
- 🎯 **智能适配** - 为 Cursor、Copilot、Continue 及自定义工具生成配置
- 🔍 **规则搜索** - 快速查找和浏览规则
- 🔐 **私有仓库** - 支持 Token 认证
- 📊 **可视化管理** - 树视图和状态栏集成
- 🌍 **多语言** - 界面支持中文/英文

---

## 🚀 快速开始

### 1. 安装扩展

在 VS Code 扩展市场搜索 **Turbo AI Rules** 并安装。

### 2. 添加规则源

**方式 1：通过状态栏**

- 点击 **🤖 AI Rules** 图标 → 选择 **Add Source**

**方式 2：通过命令面板**

- 按 `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`)
- 输入 `Turbo AI Rules: Add Source`

输入 Git 仓库信息：

```
仓库 URL: https://github.com/username/ai-rules.git
分支:     main (可选)
子路径:   rules/ (可选)
显示名称: My Rules (可选)
访问令牌: ghp_xxxx (仅私有仓库需要)
```

### 3. 同步规则

添加源后会自动同步。也可以手动同步：

- 命令面板：`Turbo AI Rules: Sync Rules`
- 状态栏：点击 **🤖 AI Rules** → **Sync Rules**

### 4. 验证生成的文件

检查工作区根目录：

```
workspace/
├── .cursorrules                      # ✅ Cursor AI 配置
├── .github/.copilot-instructions.md  # ✅ GitHub Copilot 配置
└── rules/                            # ✅ 通用规则目录
```

---

## 📖 文档

### 📘 用户指南

- [📚 完整用户指南](./docs/user-guide/README.zh.md) - 详细使用说明
- [📋 01. 命令详解](./docs/user-guide/01-commands.zh.md) - 所有可用命令
- [⚙️ 02. 配置指南](./docs/user-guide/02-configuration.zh.md) - 配置选项和示例
- [📝 03. 规则文件格式](./docs/user-guide/03-rule-format.zh.md) - 如何编写规则
- [❓ 04. 常见问题](./docs/user-guide/04-faq.zh.md) - 常见问题解答

### 🛠️ 开发者指南

- [📐 架构设计](./docs/development/01-design.md)
- [🔧 开发指南](./docs/development/02-development.md)
- [📦 维护指南](./docs/development/03-maintaining.md)

---

## ⚡ 核心概念

### 支持的 AI 工具

| 工具           | 配置文件                           | 默认状态    |
| -------------- | ---------------------------------- | ----------- |
| Cursor         | `.cursorrules`                     | ✅ 已启用   |
| GitHub Copilot | `.github/.copilot-instructions.md` | ✅ 已启用   |
| Continue       | `.continuerules`                   | ⚙️ 已禁用   |
| 自定义         | 可配置                             | ⚙️ 用户定义 |

### 规则文件格式 (MDC)

规则使用 **MDC** (Markdown + YAML Frontmatter) 格式：

```markdown
---
id: typescript-naming
title: TypeScript 命名规范
priority: high
tags: [typescript, naming]
---

# TypeScript 命名规范

使用 camelCase 命名变量...
```

---

## 🎯 使用场景

- 📦 **团队协作** - 在团队项目中共享编码标准
- 🎓 **学习** - 应用社区规则库的最佳实践
- 🔄 **多项目** - 在多个项目间同步相同规则
- 🛠️ **自定义工具** - 通过自定义适配器支持任何 AI 工具

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
