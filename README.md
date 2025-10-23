# Turbo AI Rules

> 🚀 从外部 Git 仓库同步 AI 编码规则，自动生成 Cursor、GitHub Copilot、Continue 配置文件

## 功能特性

- ✨ **多源支持**：从多个 Git 仓库同步规则
- 🔄 **自动同步**：定时或手动同步规则更新
- 🎯 **智能适配**：自动生成不同 AI 工具的配置文件
  - `.cursorrules` (Cursor)
  - `.github/.copilot-instructions.md` (GitHub Copilot)
  - `.continuerules` (Continue)
- 🔍 **规则搜索**：快速查找和浏览规则
- ⚙️ **冲突解决**：自动处理重复规则
- 🔐 **私有仓库**：支持 Token 认证访问私有仓库
- 📊 **可视化管理**：树视图和状态栏集成

## 快速开始

### 1. 添加规则源

点击状态栏的 **AI Rules** 图标，或执行命令：

```
Turbo AI Rules: Add Source
```

输入以下信息：

- Git 仓库 URL（如：`https://github.com/username/ai-rules.git`）
- 分支名（可选，默认 `main`）
- 子路径（可选，如 `rules/`）
- 显示名称（可选）
- 访问令牌（仅私有仓库需要）

### 2. 同步规则

执行命令：

```
Turbo AI Rules: Sync Rules
```

或点击树视图中的同步按钮 🔄

### 3. 生成配置文件

同步完成后，配置文件会自动生成到工作区根目录：

- `.cursorrules`
- `.github/.copilot-instructions.md`
- `.continuerules` (如果启用)

## 规则文件格式

规则文件使用 MDC (Markdown + YAML Frontmatter) 格式:

```markdown
---
id: typescript-naming
title: TypeScript 命名规范
priority: high
tags: [typescript, naming, conventions]
version: 1.0.0
author: Your Name
description: TypeScript 项目的命名约定
---

# TypeScript 命名规范

## 变量命名

- 使用 camelCase 命名变量和函数
- 使用 PascalCase 命名类和接口
- 使用 UPPER_SNAKE_CASE 命名常量

## 示例

\`\`\`typescript
// 好的命名
const userName = 'John';
class UserService {}
const MAX_RETRY_COUNT = 3;

// 避免
const user_name = 'John'; // ❌
class userservice {} // ❌
\`\`\`
```

## 配置选项

在 VS Code 设置中配置扩展：

```json
{
  "turbo-ai-rules.storage.useGlobalCache": true,
  "turbo-ai-rules.sync.onStartup": true,
  "turbo-ai-rules.sync.interval": 30,
  "turbo-ai-rules.sync.conflictStrategy": "priority",
  "turbo-ai-rules.adapters.cursor.enabled": true,
  "turbo-ai-rules.adapters.copilot.enabled": true,
  "turbo-ai-rules.adapters.continue.enabled": false
}
```

## 命令列表

| 命令                                    | 描述             |
| --------------------------------------- | ---------------- |
| `Turbo AI Rules: Add Source`            | 添加新的规则源   |
| `Turbo AI Rules: Remove Source`         | 删除规则源       |
| `Turbo AI Rules: Sync Rules`            | 同步所有规则     |
| `Turbo AI Rules: Search Rules`          | 搜索规则         |
| `Turbo AI Rules: Generate Config Files` | 手动生成配置文件 |
| `Turbo AI Rules: Manage Sources`        | 管理规则源       |

## 规则源管理

### 启用/禁用源

在树视图中右键点击源，选择 "Enable" 或 "Disable"

### 编辑源配置

使用 `Manage Sources` 命令编辑分支、子路径或名称

### 删除源

右键点击源，选择 "Remove"，或使用 `Remove Source` 命令

## 冲突解决策略

当多个源包含相同 ID 的规则时：

- **priority**（默认）：使用优先级最高的规则
- **skip-duplicates**：保留第一个规则，跳过重复
- **merge**：合并规则（待实现）

## 工作原理

1. **规则源管理**: 从 Git 仓库克隆规则到全局缓存 (`~/.turbo-ai-rules/`)
2. **规则解析**: 解析 MDC 格式的规则文件,提取元数据和内容
3. **冲突解决**: 根据配置的策略(优先级/跳过重复)合并来自多个源的规则
4. **适配器生成**: 使用适配器模式为不同 AI 工具生成配置文件
5. **自动同步**: 定时检查规则源更新并自动重新生成配置

## 目录结构

```
~/.turbo-ai-rules/          # 全局缓存目录
  └── sources/              # Git 仓库克隆目录
      └── <source-id>/      # 各规则源

<workspace>/                # 工作区目录
  ├── .cursorrules          # Cursor 配置
  ├── .continuerules        # Continue 配置
  └── .github/
      └── .copilot-instructions.md  # Copilot 配置
```

## 开发

查看 [开发文档](./docs/DEVELOPMENT.md) 了解如何参与开发。

### 快速开始

```bash
# 安装依赖
pnpm install

# 编译
pnpm run compile

# 运行测试
pnpm test

# 观察模式(开发时)
pnpm run watch
```

## 常见问题

### Q: 私有仓库需要什么权限？

A: 需要具有读取权限的 Personal Access Token (PAT)。在 GitHub 上创建 Token 时,选择 `repo` 权限即可。

### Q: 规则文件必须是 .md 格式吗？

A: 是的,目前仅支持 Markdown 格式的规则文件,文件名需以 `.md` 结尾。

### Q: 可以手动编辑生成的配置文件吗？

A: 不建议手动编辑生成的配置文件(如 `.cursorrules`),因为下次同步会覆盖手动修改。应该修改规则源仓库中的规则文件。

### Q: 如何调试同步问题？

A: 查看 VS Code 的输出面板(View > Output),选择 "Turbo AI Rules" 频道查看详细日志。

### Q: 多个规则源有相同 ID 的规则怎么办？

A: 扩展会根据配置的冲突策略处理:

- `priority` (默认): 使用优先级最高的规则
- `skip-duplicates`: 保留第一个出现的规则

### Q: 如何禁用某个 AI 工具的配置生成？

A: 在 VS Code 设置中将对应的适配器禁用,例如:

```json
{
  "turbo-ai-rules.adapters.cursor.enabled": false
}
```

## 贡献

欢迎贡献代码、提交问题或改进建议!请查看 [贡献指南](./CONTRIBUTING.md)。

## 相关链接

### 📚 文档

- [文档中心](./docs/) - 所有技术文档的索引
- [架构设计](./docs/01design.md) - 了解架构设计和技术决策
- [开发指南](./docs/02-development.md) - 参与开发的完整指南
- [维护文档](./docs/03-maintaining.md) - 日常维护和同步流程

### 🔗 社区

- [GitHub Issues](https://github.com/ygqygq2/turbo-ai-rules/issues) - 问题追踪和功能请求
- [贡献指南](./CONTRIBUTING.md) - 如何为项目做贡献

## 许可证

MIT

## 反馈

遇到问题或有功能建议？请在 [GitHub Issues](https://github.com/ygqygq2/turbo-ai-rules/issues) 提交。
