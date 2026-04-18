# Turbo AI Rules - User Guide

> Complete guide for using Turbo AI Rules extension

## 📑 Quick Navigation

- [01. Commands Reference](./01-commands.md) - Current command entry points and sync workflow
- [02. Configuration Guide](./02-configuration.md) - Adapter, suite, sync, and custom output settings
- [03. Rule File Format](./03-rule-format.md) - How to write rule / instruction / skill-style content
- [04. FAQ](./04-faq.md) - Frequently asked questions and troubleshooting

## 🚀 Quick Start

### Installation

1. Search for **Turbo AI Rules** in VS Code Extension Marketplace
2. Click **Install**
3. Reload VS Code

### Basic Usage (4 Steps)

#### 1. Add a Rule Source

```
Command: Turbo AI Rules: Add Source
Input:   Git repository URL
```

#### 2. Sync Rules

```
Command: Turbo AI Rules: Sync Rules
```

#### 3. Select Assets and Suites

```text
Command: Turbo AI Rules: Open Sync Page
Action:  Select parsed assets and choose one or more adapter suites
```

#### 4. Verify Generated Config Files

Check workspace root directory for:

- `.cursorrules` (Cursor AI)
- `.github/copilot-instructions.md` (GitHub Copilot)
- `.cursor/skills/` or `.github/skills/` (skills-style outputs)
- `.claude/commands/`, `.claude/hooks/`, `.vscode/mcp.json` (when related adapters/suites are enabled)

## 🧩 What the Extension Syncs

Turbo AI Rules now works with multiple **AI asset kinds**, not just plain rules.

- `rule`
- `instruction`
- `skill`
- `agent`
- `prompt`
- `command`
- `hook`
- `mcp`

These assets can be installed through **preset adapters**, **custom adapters**, and **adapter suites**.

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
