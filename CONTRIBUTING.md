# 贡献指南

> 感谢您对 Turbo AI Rules 项目的关注! 我们欢迎各种形式的贡献。

## 📝 贡献方式

您可以通过以下方式为项目做出贡献:

- 🐛 **报告 Bug** - 提交问题和错误报告
- ✨ **提议新功能** - 分享您的想法和建议
- 📖 **改进文档** - 修正错别字、补充说明或翻译
- 💻 **提交代码** - 修复 Bug 或实现新功能
- 🧪 **编写测试** - 提高测试覆盖率
- 💬 **参与讨论** - 在 Issues 和 Discussions 中分享见解

---

## 🚀 快速开始

### 1. Fork 和克隆

```bash
# Fork 项目到您的 GitHub 账号
# 然后克隆到本地
git clone https://github.com/YOUR_USERNAME/turbo-ai-rules.git
cd turbo-ai-rules

# 添加上游仓库
git remote add upstream https://github.com/ygqygq2/turbo-ai-rules.git
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 创建分支

```bash
# 功能分支
git checkout -b feature/my-new-feature

# Bug 修复分支
git checkout -b fix/issue-123
```

### 4. 开发和测试

```bash
# 启动观察模式
pnpm run watch

# 运行测试
pnpm test

# 代码检查
pnpm run lint
```

### 5. 提交更改

```bash
git add .
git commit -m "feat: add new feature"
git push origin feature/my-new-feature
```

### 6. 创建 Pull Request

1. 访问您的 Fork 仓库
2. 点击 "New Pull Request"
3. 填写 PR 描述(见下方模板)
4. 等待审核

---

## 🐛 报告 Bug

在提交 Bug 报告前,请:

1. **搜索现有 Issues** - 可能已有人报告过
2. **使用最新版本** - 确认问题在最新版本中仍存在
3. **收集信息** - 准备复现步骤和环境信息

### Bug 报告模板

```markdown
**问题描述**
简短描述问题

**复现步骤**

1. 执行命令 '...'
2. 点击 '...'
3. 看到错误 '...'

**期望行为**
应该发生什么

**实际行为**
实际发生了什么

**环境信息**

- OS: [如 Windows 11, macOS 14, Ubuntu 22.04]
- VS Code 版本: [如 1.85.0]
- 扩展版本: [如 0.0.1]
- Node.js 版本: [如 18.16.0]

**截图或日志**
如果适用,添加截图或日志输出

**其他信息**
任何其他相关信息
```

---

## ✨ 提议新功能

在提交功能请求前:

1. **搜索现有 Issues** - 可能已有类似提议
2. **说明用例** - 解释为什么需要这个功能
3. **考虑替代方案** - 是否有其他实现方式

### 功能请求模板

```markdown
**功能描述**
简短描述想要的功能

**使用场景**
谁会使用这个功能?在什么情况下?

**建议的解决方案**
您认为应该如何实现

**替代方案**
考虑过的其他方案

**其他信息**
任何其他相关信息或截图
```

---

## 💻 代码贡献

### 提交前检查清单

在提交 PR 前,请确保:

- [ ] 代码通过所有测试 (`pnpm test`)
- [ ] 代码符合 ESLint 规范 (`pnpm run lint`)
- [ ] 添加了必要的测试用例
- [ ] 更新了相关文档
- [ ] 遵循了提交规范
- [ ] PR 描述清晰完整

### 代码规范

- 使用 TypeScript
- 遵循项目的 ESLint 配置
- 添加 JSDoc 注释(对公共 API)
- 保持代码简洁易读

参考 [开发指南](./docs/02-development.md#代码规范) 了解详细规范。

### 提交信息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**类型 (type)**:

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式(不影响功能)
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具配置

**作用域 (scope)** (可选):

- `adapters`: 适配器相关
- `commands`: 命令相关
- `parsers`: 解析器相关
- `services`: 服务相关
- `ui`: UI 相关

**示例**:

```
feat(adapters): add support for new AI tool
fix(parser): handle empty frontmatter correctly
docs: update README with installation steps
test(services): add unit tests for RulesManager
```

### Pull Request 模板

```markdown
**变更类型**

- [ ] Bug 修复
- [ ] 新功能
- [ ] 破坏性变更
- [ ] 文档更新
- [ ] 重构
- [ ] 性能优化
- [ ] 其他

**相关 Issue**
Closes #123 (如果解决了某个 Issue)

**变更描述**
简短描述这个 PR 做了什么

**测试**

- [ ] 添加了单元测试
- [ ] 添加了集成测试
- [ ] 手动测试通过

**文档**

- [ ] 更新了 README
- [ ] 更新了设计文档
- [ ] 添加了代码注释

**截图或演示**
如果适用,添加截图或 GIF

**检查清单**

- [ ] 代码通过 `pnpm test`
- [ ] 代码通过 `pnpm run lint`
- [ ] 更新了 CHANGELOG.md
- [ ] 遵循了项目的代码规范
```

---

## 📖 文档贡献

文档改进也是重要的贡献!

### 文档类型

- **用户文档** (`README.md`) - 面向用户
- **开发文档** (`docs/`) - 面向开发者
- **代码注释** (`src/`) - JSDoc 注释

### 文档原则

- 清晰简洁
- 包含示例
- 保持最新
- 易于搜索

### 同步更新

遵循 **设计-代码-文档同步** 原则:

1. 功能设计 → 更新设计文档
2. 代码实现 → 添加代码注释
3. 功能完成 → 更新用户文档

参考 [维护指南](./docs/03-maintaining.md#同步更新流程) 了解详细流程。

---

## 🧪 测试贡献

提高测试覆盖率帮助项目更稳定!

### 测试类型

- **单元测试** (`src/test/unit/`) - 使用 Vitest
- **集成测试** (`src/test/suite/`) - 使用 Mocha

### 编写测试

```typescript
// 单元测试示例
import { describe, it, expect } from 'vitest';
import { MyModule } from '../../../path/to/module';

describe('MyModule', () => {
  it('should do something', () => {
    const result = MyModule.doSomething();
    expect(result).toBe(expectedValue);
  });
});
```

参考 [开发指南](./docs/02-development.md#测试) 了解更多。

---

## 🔍 代码审查

所有 PR 都需要经过代码审查。作为审查者,请:

- ✅ 检查代码质量和可读性
- ✅ 验证测试覆盖率
- ✅ 确认文档已更新
- ✅ 测试功能是否正常
- ✅ 提供建设性反馈

---

## 📜 许可证

提交代码即表示您同意将代码以 MIT 许可证授权。

---

## 🙏 感谢

感谢所有为项目做出贡献的人!

- 贡献者列表: [Contributors](https://github.com/ygqygq2/turbo-ai-rules/graphs/contributors)

---

## 💬 联系方式

有问题或建议?

- 📧 GitHub Issues: https://github.com/ygqygq2/turbo-ai-rules/issues
- 💭 GitHub Discussions: https://github.com/ygqygq2/turbo-ai-rules/discussions

期待您的贡献! 🎉
