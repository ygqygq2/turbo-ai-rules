# Turbo AI Rules - Documentation

> Complete documentation for Turbo AI Rules extension

---

## 📚 Documentation Structure

This directory contains all project documentation, organized into user guides and developer guides.

- Start here: [文档导航（必读）](./00-documentation-system.md)
- Overview: [01-overall-design.md](./01-overall-design.md)

---

## 📘 For Users

### Quick Links

- **[User Guide (English)](./user-guide/README.md)** - Complete user guide
- **[用户指南 (中文)](./user-guide/README.zh.md)** - 完整用户指南

### Topics

| Document                                                                                                | Description                    |
| ------------------------------------------------------------------------------------------------------- | ------------------------------ |
| [01. Commands](./user-guide/01-commands.md) / [命令详解](./user-guide/01-commands.zh.md)                | Actual command entry points and workflows |
| [02. Configuration](./user-guide/02-configuration.md) / [配置指南](./user-guide/02-configuration.zh.md) | Adapter, suite, sync, and custom output settings |
| [03. Rule Format](./user-guide/03-rule-format.md) / [规则格式](./user-guide/03-rule-format.zh.md)       | How to author rule / instruction / skill-style content |
| [04. FAQ](./user-guide/04-faq.md) / [常见问题](./user-guide/04-faq.zh.md)                               | Frequently asked questions     |

### Current Product Shape

- **Asset-centric**: the extension now works with more than just “rules”; it can classify and sync instructions, skills, agents, prompts, commands, hooks, and MCP fragments.
- **Adapter + Suite model**: users can enable atomic adapters in settings, then apply selected assets to one or more adapter suites in the sync page.
- **Composite outputs**: docs and samples now cover composite installs such as Claude commands/hooks/settings and custom MCP merge-json outputs.

---

## 🛠️ For Developers

> Developer documentation is in Chinese only

### Development Guides

#### 📐 基础层：架构和设计规范

| Document                                                       | Description                                      |
| -------------------------------------------------------------- | ------------------------------------------------ |
| [背景与目标](./development/01-background.md)                   | Project background and goals                     |
| [需求分析](./development/02-requirements.md)                   | Requirements analysis                            |
| [详细设计](./development/03-design.md)                         | Detailed design specification                    |
| [架构设计](./development/20-architecture.md)                   | System architecture, design patterns, data flows |
| [自定义适配器设计](./development/23-custom-adapters-design.md) | Custom adapter design and implementation         |
| [用户规则设计](./development/50-user-rules-design.md)          | User rules protection design                     |
| [文档导航（必读）](./00-documentation-system.md)               | How to read docs and navigate quickly            |

#### 🛠️ 开发层：开发指南和最佳实践

| Document                                                       | Description                                   |
| -------------------------------------------------------------- | --------------------------------------------- |
| [开发指南](./development/40-development.md)                    | Environment setup, coding standards, testing  |
| [维护指南](./development/42-maintaining.md)                    | Maintenance workflows and best practices      |
| [Webview 最佳实践](./development/43-webview-best-practices.md) | Webview development architecture and patterns |
| [Webview CSS 规范](./development/44-webview-css-guide.md)      | CSS organization and styling guidelines       |
| [Codicons 指南](./development/45-codicons-guide.md)            | VS Code Codicons usage guide                  |
| [状态栏设计](./development/46-status-bar-design.md)            | Status bar design and integration             |

#### 🎨 UI 设计与实施

| Document                                                  | Description                      |
| --------------------------------------------------------- | -------------------------------- |
| [UI 设计概述](./development/30-ui-design-overview.md)     | UI design overview               |
| [UI 设计方案](./development/31-ui-design.md)              | Complete UI design specification |
| [UI 开发流程](./development/32-ui-development-process.md) | UI development workflow          |

#### 📊 数据与存储

| Document                                               | Description                   |
| ------------------------------------------------------ | ----------------------------- |
| [数据模型](./development/10-data-model.md)             | Data model design             |
| [存储策略](./development/11-storage-strategy.md)       | Storage strategy              |
| [解析器与验证器](./development/12-parser-validator.md) | Parser and validator design   |
| [适配器设计](./development/21-adapter-design.md)       | Adapter design                |
| [配置同步](./development/22-config-sync.md)            | Configuration synchronization |

#### 🧪 测试文档

| Document                                                          | Description                        |
| ----------------------------------------------------------------- | ---------------------------------- |
| [单元测试覆盖](./development/60-unit-test-coverage.md)            | Unit test coverage report          |
| [单元测试分析](./development/61-unit-test-coverage-analysis.md)   | Unit test coverage analysis        |
| [单元测试缓存清理](./development/62-unit-test-cache-cleanup.md)   | Unit test cache cleanup guide      |
| [单元测试命令](./development/63-unit-test-commands.md)            | Unit test commands reference       |
| [集成测试设计](./development/70-integration-test-design.md)       | Integration test design            |
| [集成测试总结](./development/71-integration-test-summary.md)      | Integration test summary           |
| [集成测试参考](./development/72-integration-test-reference.md)    | Integration test quick reference   |
| [测试总结报告](./development/73-test-summary-report.md)           | Test reorganization summary report |

### Quick Start for Contributors

1. **理解架构**：阅读 [架构设计](./development/20-architecture.md) 了解系统架构
2. **搭建环境**：按照 [开发指南](./development/40-development.md) 设置开发环境
3. **学习规范**：查看 [维护指南](./development/42-maintaining.md) 了解贡献流程
4. **Webview 开发**：参考 [Webview 最佳实践](./development/43-webview-best-practices.md) 和 [CSS 规范](./development/44-webview-css-guide.md)

### Other Resources

- [Sample Workspace](../sampleWorkspace/) - Configuration examples and test scenarios

---

## 🎯 Quick Navigation

### New to the Project?

1. **Users**: Start with [User Guide](./user-guide/README.md) or [用户指南](./user-guide/README.zh.md)
2. **Contributors**: Read [开发指南](./development/40-development.md)
3. **Architecture**: Check [架构设计](./development/20-architecture.md)
4. **UI Development**: See [UI 开发流程](./development/32-ui-development-process.md)

### Common Tasks

- **Installing**: See [User Guide - Quick Start](./user-guide/README.md#-quick-start)
- **Configuring**: See [02. Configuration Guide](./user-guide/02-configuration.md)
- **Selecting assets / suites**: See [01. Commands](./user-guide/01-commands.md)
- **Troubleshooting**: See [04. FAQ](./user-guide/04-faq.md)
- **Contributing**: See [维护指南](./development/42-maintaining.md)
- **UI Development**: See [Webview 最佳实践](./development/43-webview-best-practices.md)

---

## 🌍 Language

- **User Documentation**: Available in English and Chinese
  - English: `*.md`
  - Chinese: `*.zh.md`
- **Developer Documentation**: Chinese only

---

## 🤝 Contributing to Docs

We welcome documentation improvements!

### How to Contribute

1. **Fix Typos**: Submit PR directly
2. **Improve Clarity**: Suggest better explanations
3. **Add Examples**: Share real-world use cases
4. **Translate**: Help improve translations

### Guidelines

- Follow existing document structure
- Keep language simple and clear
- Test all code examples
- Update both language versions (for user docs)

---

## 📧 Feedback

- Found a documentation issue? [Report it](https://github.com/ygqygq2/turbo-ai-rules/issues)
- Have a suggestion? [Start a discussion](https://github.com/ygqygq2/turbo-ai-rules/discussions)

---

[⬅️ Back to Project README](../README.md)
