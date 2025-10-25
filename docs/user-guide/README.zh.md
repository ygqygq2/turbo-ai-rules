# Turbo AI Rules - 用户指南

> Turbo AI Rules 扩展完整使用指南

## 📑 快速导航

- [01. 命令详解](./01-commands.zh.md) - 所有命令的详细说明
- [02. 配置指南](./02-configuration.zh.md) - 完整的配置选项和示例
- [03. 规则文件格式](./03-rule-format.zh.md) - 如何编写 MDC 格式的规则
- [04. 常见问题](./04-faq.zh.md) - 常见问题解答和故障排查

## 🚀 快速开始

### 安装

1. 在 VS Code 扩展市场搜索 **Turbo AI Rules**
2. 点击 **安装**
3. 重新加载 VS Code

### 基本使用（三步走）

#### 1. 添加规则源

```
命令: Turbo AI Rules: Add Source
输入: Git 仓库 URL
```

#### 2. 同步规则

```
命令: Turbo AI Rules: Sync Rules
```

#### 3. 验证生成的配置文件

检查工作区根目录：

- `.cursorrules` (Cursor AI)
- `.github/.copilot-instructions.md` (GitHub Copilot)
- `rules/` (通用规则目录)

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
