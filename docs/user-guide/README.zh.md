# Turbo AI Rules - 用户指南

> Turbo AI Rules 扩展完整使用指南

## 📑 快速导航

- [01. 命令详解](./01-commands.zh.md) - 当前命令入口与同步工作流
- [02. 配置指南](./02-configuration.zh.md) - 适配器、综合体、同步与自定义输出配置
- [03. 规则文件格式](./03-rule-format.zh.md) - 如何编写规则 / 指令 / skill 风格内容
- [04. 常见问题](./04-faq.zh.md) - 常见问题解答和故障排查

## 🚀 快速开始

### 安装

1. 在 VS Code 扩展市场搜索 **Turbo AI Rules**
2. 点击 **安装**
3. 重新加载 VS Code

### 基本使用（四步走）

#### 1. 添加规则源

```
命令: Turbo AI Rules: Add Source
输入: Git 仓库 URL
```

#### 2. 同步规则

```
命令: Turbo AI Rules: Sync Rules
```

#### 3. 选择资产和综合体

```text
命令: Turbo AI Rules: Open Sync Page
操作:  选择已解析资产，并勾选一个或多个适配器综合体
```

#### 4. 验证生成的配置文件

检查工作区根目录：

- `.cursorrules` (Cursor AI)
- `.github/copilot-instructions.md` (GitHub Copilot)
- `.cursor/skills/` 或 `.github/skills/`（skills 类输出）
- `.claude/commands/`、`.claude/hooks/`、`.vscode/mcp.json`（启用相关适配器/综合体时）

## 🧩 扩展现在同步什么

Turbo AI Rules 现在处理的不只是传统“规则”，而是一组更通用的 **AI 资产类型**：

- `rule`
- `instruction`
- `skill`
- `agent`
- `prompt`
- `command`
- `hook`
- `mcp`

这些资产可以通过 **预设适配器**、**自定义适配器** 和 **适配器综合体** 安装到不同工具中。

## 📚 详细文档

### 面向最终用户

- **[01. 命令详解](./01-commands.zh.md)** - 学习所有可用命令及使用方法
- **[02. 配置指南](./02-configuration.zh.md)** - 配置同步行为、适配器和自定义输出
- **[04. 常见问题](./04-faq.zh.md)** - 常见问题的解决方案

### 面向规则作者

- **[03. 规则文件格式](./03-rule-format.zh.md)** - 使用 MDC (Markdown + YAML Frontmatter) 编写规则

## 🆘 需要帮助？

- 查看[常见问题](./04-faq.zh.md)
- 搜索 [GitHub Issues](https://github.com/ygqygq2/turbo-ai-rules/issues)
- 提交[新问题](https://github.com/ygqygq2/turbo-ai-rules/issues/new)

## 🔙 返回

- [项目 README](../../README.zh.md)
- [开发者文档](../development/)（仅中文）
