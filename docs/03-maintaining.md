# Turbo AI Rules - 维护指南

> 本文档面向项目维护者,说明如何维护项目,确保设计-代码-文档的同步。

## 📋 目录

- [核心原则](#核心原则)
- [同步更新流程](#同步更新流程)
- [常见维护任务](#常见维护任务)
- [故障排查](#故障排查)
- [发布流程](#发布流程)

---

## 核心原则

### 设计-代码-文档同步

维护项目时,**必须**遵循三者同步原则:

```
设计文档 ──→ 代码实现 ──→ 用户文档
    ↑                         ↓
    └─────── 反馈调整 ────────┘
```

**原则**:

1. **设计先行**: 重大功能或架构变更前,先更新设计文档
2. **边写边测**: 实现功能时同步编写单元测试
3. **文档同步**: 功能完成后立即更新用户文档
4. **版本控制**: 所有改动在同一个提交或 PR 中完成

---

## 同步更新流程

### 1. 新增功能

```bash
# 步骤 1: 设计阶段
# 更新 docs/01design.md,明确:
- 功能目标和使用场景
- 架构设计和模块划分
- 接口定义和数据流
- 技术选型理由

# 步骤 2: 实现阶段
# 编写代码和测试
git checkout -b feature/new-feature
# 在 src/ 中实现功能
# 在 src/test/ 中编写测试

# 步骤 3: 文档同步
# 更新 README.md:
- 添加新功能说明
- 更新配置项说明
- 添加使用示例
# 更新 CHANGELOG.md:
- 记录新功能和 API 变更

# 步骤 4: 审查和提交
pnpm run lint         # 检查代码规范
pnpm test             # 运行所有测试
git add .
git commit -m "feat: add new feature with docs"
git push origin feature/new-feature
```

### 2. 修复 Bug

```bash
# 步骤 1: 重现问题
# 在 src/test/ 中编写失败的测试用例

# 步骤 2: 修复代码
# 修改 src/ 中的相关代码

# 步骤 3: 验证修复
pnpm test             # 确保测试通过

# 步骤 4: 更新文档(如需要)
# 如果是使用方式有变化或需要补充说明:
# - 更新 README.md
# - 更新 CHANGELOG.md

# 步骤 5: 提交
git commit -m "fix: resolve issue #123 with xyz"
```

### 3. 重构代码

```bash
# 步骤 1: 评估影响
# - 检查是否影响公共 API
# - 是否需要更新设计文档

# 步骤 2: 更新设计(如需要)
# 如果架构有变化,先更新 docs/01design.md

# 步骤 3: 重构
# - 保持测试通过
# - 逐步重构,小步提交

# 步骤 4: 更新文档
# - 如果用户接口有变,更新 README.md
# - 更新 CHANGELOG.md

# 步骤 5: 提交
git commit -m "refactor: improve module structure"
```

---

## 常见维护任务

### 添加新的 AI 工具适配器

1. **设计阶段**

   ```markdown
   # 在 docs/01design.md 中添加:

   - 新适配器的目标文件路径
   - 配置文件格式说明
   - 支持的特性列表
   ```

2. **实现阶段**

   ```typescript
   // 1. 创建 src/adapters/NewToolAdapter.ts
   import { BaseAdapter } from './AIToolAdapter';

   export class NewToolAdapter extends BaseAdapter {
     readonly name = 'NewTool';
     // ... 实现接口
   }

   // 2. 在 src/adapters/index.ts 中导出
   export { NewToolAdapter } from './NewToolAdapter';

   // 3. 在 src/services/FileGenerator.ts 中注册
   // 添加配置项和初始化逻辑
   ```

3. **测试**

   ```typescript
   // 创建 src/test/unit/adapters/NewToolAdapter.spec.ts
   // 编写单元测试
   ```

4. **文档更新**

   ```markdown
   # 更新 README.md:

   - 在功能列表中添加新工具
   - 添加配置说明
   - 添加使用示例

   # 更新 package.json:

   - 添加配置项定义
   ```

### 更新依赖

```bash
# 1. 检查过期依赖
pnpm outdated

# 2. 更新依赖
pnpm update

# 3. 测试
pnpm test

# 4. 提交
git commit -m "chore: update dependencies"
```

### 处理安全漏洞

```bash
# 1. 查看漏洞报告
pnpm audit

# 2. 修复
pnpm audit fix

# 3. 如果自动修复失败,手动更新
pnpm update <package-name>

# 4. 测试
pnpm test

# 5. 提交
git commit -m "security: fix vulnerability in <package>"
```

---

## 故障排查

### 常见问题诊断

#### 1. Git 克隆失败

**症状**: 添加规则源时报错 "Failed to clone repository"

**排查步骤**:

```bash
# 1. 检查日志
# 在 VS Code: View > Output > Turbo AI Rules

# 2. 手动测试克隆
git clone <repository-url> /tmp/test-clone

# 3. 检查认证
# - 公开仓库: 无需认证
# - 私有仓库: 检查 Token 权限

# 4. 检查网络
ping github.com
```

**常见原因**:

- Token 过期或权限不足
- 网络问题
- Git URL 格式错误

#### 2. 规则解析失败

**症状**: 同步后规则数量为 0

**排查步骤**:

```bash
# 1. 检查规则文件格式
# 确保文件是 .md 格式
# 确保 Frontmatter 格式正确

# 2. 查看解析日志
# 输出面板中搜索 "Parsing"

# 3. 手动测试解析
# 在项目中编写测试用例验证
```

**常见原因**:

- Frontmatter 格式错误(YAML 语法)
- 文件不是 .md 格式
- 文件编码问题

#### 3. 配置文件未生成

**症状**: 同步成功但配置文件未创建

**排查步骤**:

```bash
# 1. 检查适配器配置
# settings.json 中确认适配器已启用

# 2. 检查权限
# 确保对工作区目录有写权限

# 3. 查看生成日志
# 输出面板中搜索 "Generating"
```

**常见原因**:

- 适配器未启用
- 文件权限问题
- 规则列表为空

### 日志分析

扩展日志级别:

- `ERROR`: 严重错误,导致功能无法使用
- `WARN`: 警告,功能可能受影响
- `INFO`: 一般信息,正常操作日志
- `DEBUG`: 调试信息,详细执行流程

**如何启用调试日志**:

```json
// settings.json
{
  "turbo-ai-rules.debug": true // 需要在代码中添加此功能
}
```

---

## 发布流程

### 准备发布

1. **更新版本号**

   ```bash
   # 根据语义化版本规则更新 package.json
   # - MAJOR: 不兼容的 API 变更
   # - MINOR: 新增功能,向后兼容
   # - PATCH: Bug 修复

   # 手动编辑 package.json 或使用:
   pnpm version patch  # 或 minor, major
   ```

2. **更新 CHANGELOG**

   ```markdown
   # CHANGELOG.md

   ## [x.y.z] - YYYY-MM-DD

   ### Added

   - 新功能列表

   ### Changed

   - 变更列表

   ### Fixed

   - Bug 修复列表

   ### Breaking Changes

   - 不兼容变更(仅 MAJOR 版本)
   ```

3. **运行完整测试**

   ```bash
   pnpm run lint
   pnpm test
   pnpm run compile
   pnpm run package  # 打包测试
   ```

4. **提交和打标签**
   ```bash
   git add .
   git commit -m "chore: release v1.2.3"
   git tag v1.2.3
   git push origin main --tags
   ```

### 发布到市场

```bash
# 1. 打包扩展
pnpm run package
# 生成 turbo-ai-rules-x.y.z.vsix

# 2. 发布
pnpm run publish
# 或手动: vsce publish

# 3. 验证发布
# 访问 VS Code Marketplace 确认
```

### 发布后

1. 在 GitHub 创建 Release
2. 附上 CHANGELOG
3. 附上 .vsix 文件
4. 通知用户(如有订阅列表)

---

## 代码组织原则

### 模块职责

```
src/
├── adapters/      # 适配器: 负责生成各 AI 工具的配置
├── commands/      # 命令: 处理 VSCode 命令,调用服务层
├── parsers/       # 解析器: 解析 MDC 文件和验证
├── providers/     # 提供者: UI 相关(树视图、状态栏)
├── services/      # 服务: 核心业务逻辑
├── types/         # 类型: TypeScript 类型定义
└── utils/         # 工具: 纯函数工具集
```

### 依赖原则

```
commands → services → adapters/parsers
   ↓          ↓
providers → services
   ↓          ↓
         utils + types
```

- **单向依赖**: 上层依赖下层,避免循环依赖
- **服务单例**: 服务层使用单例模式
- **工具纯函数**: utils 中尽量使用纯函数

### 错误处理

```typescript
// 使用自定义错误类型
import { GitError, ParseError, GenerateError } from '../types/errors';

// 在服务层抛出
throw new GitError('Failed to clone repository', 'TAI-3001');

// 在命令层捕获并显示
try {
  await gitManager.clone(url);
} catch (error) {
  if (error instanceof GitError) {
    vscode.window.showErrorMessage(error.message);
  }
  Logger.error('Clone failed', error);
}
```

---

## 测试策略

### 单元测试

- 使用 Vitest
- 覆盖核心逻辑(parsers, services, adapters)
- 目标覆盖率: >80%

### 集成测试

- 使用 VS Code Test Runner
- 测试完整命令流程
- 测试 UI 交互

### 运行测试

```bash
pnpm test:unit         # 单元测试
pnpm test:suite:mocha  # 集成测试
pnpm test              # 全部测试
pnpm test:coverage     # 覆盖率报告
```

---

## 总结

维护项目的核心是**保持同步**:

- ✅ 设计文档反映架构意图
- ✅ 代码实现符合设计
- ✅ 用户文档与功能一致
- ✅ 测试覆盖关键路径

**记住**: 文档不是事后补充,而是开发过程的一部分!
