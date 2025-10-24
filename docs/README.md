# Turbo AI Rules - 开发者文档

> 本目录包含项目的技术文档、设计说明和维护指南。

## 📚 文档目录

### 用户文档

- [项目 README](../README.md) - 用户使用指南、快速开始和常见问题
- [贡献指南](../CONTRIBUTING.md) - 如何为项目做贡献

### 开发文档(按阅读顺序)

1. [01-design.md](./01-design.md) - **架构设计文档** - 核心设计理念、架构图和技术决策
2. [02-development.md](./02-development.md) - **开发指南** - 环境搭建、代码规范、测试和构建
3. [03-maintaining.md](./03-maintaining.md) - **维护指南** - 日常维护流程、同步更新规范

### 其他资源

- [示例工作区](../sampleWorkspace/) - 包含各种配置示例和测试场景
- [99-sync-summary.md](./99-sync-summary.md) - 文档同步工作总结(历史记录)

## 🎯 快速开始指南

### 👨‍💻 新手开发者

如果你是第一次接触本项目,建议按以下顺序阅读:

1. 📖 [README](../README.md) - 了解项目功能和使用方法
2. 🏗️ [01-design.md](./01-design.md) - 理解整体架构和设计理念
3. 🔧 [02-development.md](./02-development.md) - 搭建开发环境并开始编码
4. ✅ 运行测试确保环境正常

### 🔧 维护者

如果你负责项目维护,重点关注:

- 📋 [03-maintaining.md](./03-maintaining.md) - 日常维护流程和最佳实践
- 🔄 遵循**设计-代码-文档同步**的原则
- 📝 使用 [GitHub Issues](https://github.com/ygqygq2/turbo-ai-rules/issues) 跟踪问题

### 🤝 贡献者

想要贡献代码或文档?

- 🎯 [CONTRIBUTING.md](../CONTRIBUTING.md) - 了解贡献流程和规范
- 📧 提交 [Pull Request](https://github.com/ygqygq2/turbo-ai-rules/pulls) 前请阅读贡献指南

## 🏗️ 项目结构

```
turbo-ai-rules/
├── src/                      # 源代码
│   ├── adapters/            # AI 工具适配器
│   ├── commands/            # VSCode 命令实现
│   ├── parsers/             # MDC 规则解析器
│   ├── providers/           # UI 提供者(树视图、状态栏)
│   ├── services/            # 核心服务(Git、规则管理、文件生成)
│   ├── types/               # TypeScript 类型定义
│   └── utils/               # 工具函数
├── docs/                     # 📖 技术文档
├── sampleWorkspace/          # 示例和测试用工作区
├── out/                      # 编译输出
└── coverage/                 # 测试覆盖率报告
```

## 📖 核心概念

### 适配器模式

每个 AI 工具有独立的适配器,负责将统一的规则格式转换为工具特定的配置:

- `CursorAdapter` → `.cursorrules`
- `CopilotAdapter` → `.github/.copilot-instructions.md`
- `ContinueAdapter` → `.continuerules`

### MDC 格式

规则文件使用 Markdown + YAML Frontmatter 格式,包含元数据和规则内容。

### 全局缓存

规则源克隆到 `~/.turbo-ai-rules/sources/`,多个项目共享以节省空间。

## 🔧 开发工作流

```bash
# 1. 安装依赖
pnpm install

# 2. 启动观察模式(自动编译)
pnpm run watch

# 3. 按 F5 启动调试

# 4. 运行测试
pnpm test

# 5. 检查代码规范
pnpm run lint
```

## 🤝 贡献流程

1. Fork 项目并克隆到本地
2. 创建功能分支: `git checkout -b feature/my-feature`
3. 提交更改: `git commit -am 'Add my feature'`
4. 推送分支: `git push origin feature/my-feature`
5. 提交 Pull Request

**重要**: 提交前请确保:

- ✅ 所有测试通过
- ✅ 代码符合 ESLint 规范
- ✅ 更新了相关文档
- ✅ 遵循**设计-代码-文档同步**原则

## 📝 文档维护原则

### 设计-代码-文档同步

在维护项目时,**必须**遵循三者同步更新:

```
设计阶段 → 实现阶段 → 完成阶段
   ↓          ↓          ↓
设计文档  →  代码+测试 → 用户文档
```

**具体流程**:

1. **设计阶段**: 更新 `01-design.md`,明确架构和接口
2. **实现阶段**: 编写代码和单元测试
3. **完成阶段**: 同步更新用户文档和示例

详见 [03-maintaining.md](./03-maintaining.md) 了解完整的维护流程。

### 文档更新时机

| 文档                | 更新时机               | 责任人            |
| ------------------- | ---------------------- | ----------------- |
| `01-design.md`      | 架构变更、新模块设计   | 架构师/核心开发者 |
| `02-development.md` | 开发工具、流程变更     | 维护者            |
| `03-maintaining.md` | 维护流程、故障排查更新 | 维护者            |
| `../README.md`      | 功能变更、使用方法更新 | 所有开发者        |

## 🐛 问题反馈

- [GitHub Issues](https://github.com/ygqygq2/turbo-ai-rules/issues) - 提交 bug 或功能请求
- [GitHub Discussions](https://github.com/ygqygy2/turbo-ai-rules/discussions) - 讨论和提问

## 📄 许可证

MIT License - 详见 [LICENSE](../LICENSE)
