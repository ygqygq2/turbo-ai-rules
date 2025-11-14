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
| [01. Commands](./user-guide/01-commands.md) / [命令详解](./user-guide/01-commands.zh.md)                | All available commands         |
| [02. Configuration](./user-guide/02-configuration.md) / [配置指南](./user-guide/02-configuration.zh.md) | Complete configuration options |
| [03. Rule Format](./user-guide/03-rule-format.md) / [规则格式](./user-guide/03-rule-format.zh.md)       | How to write rules             |
| [04. FAQ](./user-guide/04-faq.md) / [常见问题](./user-guide/04-faq.zh.md)                               | Frequently asked questions     |

---

## 🛠️ For Developers

> Developer documentation is in Chinese only

### Development Guides

#### 📐 基础层：架构和设计规范

| Document                                                       | Description                                      |
| -------------------------------------------------------------- | ------------------------------------------------ |
| [架构设计](./development/01-design.md)                         | System architecture, design patterns, data flows |
| [自定义适配器设计](./development/23-custom-adapters-design.md) | Custom adapter design and implementation         |
| [文档导航（必读）](./00-documentation-system.md)               | How to read docs and navigate quickly            |
| [测试覆盖规范](./development/41-test-coverage.md)              | Test coverage requirements and reports           |

#### 🛠️ 开发层：开发指南和最佳实践

| Document                                                       | Description                                   |
| -------------------------------------------------------------- | --------------------------------------------- |
| [开发指南](./development/40-development.md)                    | Environment setup, coding standards, testing  |
| [维护指南](./development/42-maintaining.md)                    | Maintenance workflows and best practices      |
| [Webview 最佳实践](./development/43-webview-best-practices.md) | Webview development architecture and patterns |
| [Webview CSS 规范](./development/44-webview-css-guide.md)      | CSS organization and styling guidelines       |

#### 🎨 实施层：UI 实施文档

| Document                                                                     | Description                                  |
| ---------------------------------------------------------------------------- | -------------------------------------------- |
| [UI 设计方案](./development/31-ui-design.md)                                 | Complete UI design specification             |
| [UI 开发流程](./development/32-ui-development-process.md)                    | UI development workflow and standards        |
| [UI Phase 1 实施](./development/11-ui-phase1-implementation.md)              | Phase 1: Basic UI implementation             |
| [UI Phase 2 实施](./development/12-ui-phase2-implementation.md)              | Phase 2: Enhanced UI implementation overview |
| [欢迎页面实施](./development/13-ui-phase2-01-welcome-page-implementation.md) | Welcome page implementation details          |
| [UI Phase 3 设计](./development/14-ui-phase3-design.md)                      | Phase 3: Advanced interaction design         |
| [UI Phase 3 实施](./development/15-ui-phase3-implementation.md)              | Phase 3: Advanced search implementation      |
| [规则源详情实施](./development/16-source-detail-implementation.md)           | Source detail page implementation            |

### Quick Start for Contributors

1. **理解架构**：阅读 [架构设计](./development/01-design.md) 了解系统架构
2. **搭建环境**：按照 [开发指南](./development/40-development.md) 设置开发环境
3. **学习规范**：查看 [维护指南](./development/42-maintaining.md) 了解贡献流程
4. **Webview 开发**：参考 [Webview 最佳实践](./development/43-webview-best-practices.md) 和 [CSS 规范](./development/44-webview-css-guide.md)

### Other Resources

- [Sample Workspace](../sampleWorkspace/) - Configuration examples and test scenarios

---

## 🎯 Quick Navigation

### New to the Project?

1. **Users**: Start with [User Guide](./user-guide/README.md) or [用户指南](./user-guide/README.zh.md)
2. **Contributors**: Read [开发指南](./development/05-development.md)
3. **Architecture**: Check [架构设计](./development/01-design.md)
4. **UI Development**: See [UI 开发流程](./development/10-ui-development-process.md)

### Common Tasks

- **Installing**: See [User Guide - Quick Start](./user-guide/README.md#-quick-start)
- **Configuring**: See [02. Configuration Guide](./user-guide/02-configuration.md)
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
