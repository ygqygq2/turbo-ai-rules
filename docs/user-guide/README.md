# Turbo AI Rules - User Guide

> Complete guide for using Turbo AI Rules extension

## 📑 Quick Navigation

- [01. Commands Reference](./01-commands.md) - Detailed explanation of all commands
- [02. Configuration Guide](./02-configuration.md) - Complete configuration options and examples
- [03. Rule File Format](./03-rule-format.md) - How to write rules in MDC format
- [04. FAQ](./04-faq.md) - Frequently asked questions and troubleshooting

## 🚀 Quick Start

### Installation

1. Search for **Turbo AI Rules** in VS Code Extension Marketplace
2. Click **Install**
3. Reload VS Code

### Basic Usage (3 Steps)

#### 1. Add a Rule Source

```
Command: Turbo AI Rules: Add Source
Input:   Git repository URL
```

#### 2. Sync Rules

```
Command: Turbo AI Rules: Sync Rules
```

#### 3. Verify Generated Config Files

Check workspace root directory for:

- `.cursorrules` (Cursor AI)
- `.github/copilot-instructions.md` (GitHub Copilot)
- `rules/` (Generic rules directory)

## 📚 Detailed Documentation

### For End Users

- **[01. Commands Reference](./01-commands.md)** - Learn all available commands and how to use them
- **[02. Configuration Guide](./02-configuration.md)** - Configure sync behavior, adapters, and custom outputs
- **[04. FAQ](./04-faq.md)** - Solutions to common issues

### For Rule Authors

- **[03. Rule File Format](./03-rule-format.md)** - Write rules using MDC (Markdown + YAML Frontmatter)

## 🆘 Need Help?

- Check [FAQ](./04-faq.md) for common questions
- Search [GitHub Issues](https://github.com/ygqygq2/turbo-ai-rules/issues)
- Submit a [new issue](https://github.com/ygqygy2/turbo-ai-rules/issues/new)

## 🔙 Back to Main

- [Project README](../../README.md)
- [Developer Docs](../development/) (Chinese only)
