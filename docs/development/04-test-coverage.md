# 测试规范与指引

## 测试策略

Turbo AI Rules 采用**分层测试策略**，确保代码质量和功能稳定性：

- **单元测试（Vitest）**：快速、隔离、高覆盖率，测试单个模块的逻辑正确性
- **集成测试（Mocha）**：真实环境、端到端验证，测试模块间协作和实际功能

## 测试原则

### 1. 必须通过原则

**所有新增测试必须 100% 通过**，不允许提交失败的测试用例。如果测试失败：

- 修复代码使测试通过
- 或修改测试使其符合实际代码行为
- 或删除不合理的测试

### 2. 真实性原则

测试必须基于**实际代码实现**，而不是理想化的假设：

- 验证逻辑符合代码实际行为
- Mock 数据符合实际数据结构
- 正则表达式、验证规则与代码一致

### 3. 隔离性原则

- 每个测试独立运行，不依赖执行顺序
- 测试间不共享状态
- 使用 `beforeEach` 初始化，`afterEach` 清理

### 4. 可读性原则

- 测试名称清晰描述测试内容
- 一个测试只验证一个行为
- 使用 `describe` 分组相关测试

## 测试分类与职责

### 单元测试 (`src/test/unit/**/*.spec.ts`)

**适用场景**：

- 工具函数（validator、fileSystem、path）
- 解析器（MdcParser、RulesValidator）
- 服务类的单个方法（GitManager、ConfigManager）
- 适配器的格式转换（CursorAdapter、CopilotAdapter）

**编写规范**：

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('模块名 单元测试', () => {
  beforeEach(() => {
    // 初始化
  });

  describe('方法名', () => {
    it('应该返回预期结果', () => {
      // Arrange: 准备数据
      const input = 'test';

      // Act: 执行操作
      const result = functionUnderTest(input);

      // Assert: 验证结果
      expect(result).toBe('expected');
    });
  });
});
```

**命名规范**：

- 文件名：`ModuleName.spec.ts`（如 `GitManager.spec.ts`）
- 测试组：`describe('模块名 单元测试', ...)`
- 测试用例：`it('应该...', ...)` 或 `it('应该在...时...', ...)`

### 集成测试 (`src/test/suite/**/*.test.ts`)

**适用场景**：

- 命令执行流程（addSource、syncRules）
- 多模块协作（同步 + 解析 + 生成）
- 文件系统操作（读写配置文件）
- VSCode API 交互（工作区、配置、通知）

**测试工作区**：
每个场景在 `sampleWorkspace/` 下有独立目录，包含：

- `.vscode/settings.json` - 测试配置
- `README.md` - 场景说明
- 可选的测试数据

**命名规范**：

- 文件名：`featureName.test.ts`（如 `syncRules.test.ts`）
- 测试组：`describe('Feature Tests', ...)`

## 关键模块测试要求

### GitManager 测试要点

- ✅ URL 验证（支持的格式和不支持的格式）
- ✅ 分支名验证（符合实际正则表达式）
- ✅ 路径安全性（防目录遍历）
- ✅ 仓库存在性检测
- ✅ 错误处理（网络失败、权限不足）

### RulesValidator 测试要点

- ✅ 必填字段验证（id、title、content）
- ✅ ID 格式验证（kebab-case）
- ✅ 内容长度检查（过短/过长警告）
- ✅ 元数据验证（version、tags、priority）
- ✅ 批量验证和过滤

### 适配器测试要点

- ✅ 格式转换正确性
- ✅ 输出路径计算
- ✅ 空规则处理
- ✅ 特殊字符转义
- ✅ 多文件输出（CustomAdapter）

### 命令测试要点

- ✅ 正常流程验证
- ✅ 错误处理（无工作区、无源、网络失败）
- ✅ 用户提示（信息、警告、错误）
- ✅ 配置状态变更

## Mock 使用指南

### Mock VSCode API

```typescript
// 在 setup.ts 中统一 mock
vi.mock('vscode', () => ({
  window: {
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    withProgress: vi.fn(async (_options, task) => {
      return task({ report: vi.fn() }, { checkCancellation: vi.fn() });
    }),
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
      update: vi.fn(),
    })),
    workspaceFolders: [],
  },
}));
```

### Mock 外部依赖

```typescript
// Mock simple-git
vi.mock('simple-git', () => ({
  default: vi.fn(() => ({
    clone: vi.fn(),
    pull: vi.fn(),
    checkout: vi.fn(),
  })),
}));

// Mock 文件系统
vi.mock('@/utils/fileSystem', () => ({
  pathExists: vi.fn(),
  ensureDir: vi.fn(),
  safeRemove: vi.fn(),
}));
```

## 测试场景覆盖

### 核心功能（必须覆盖）

- 规则源管理（增删改查）
- 规则同步（克隆、拉取、解析）
- 配置生成（单适配器、多适配器）
- 冲突解决（priority 策略）
- 用户规则保护

## 测试方法

### 高级功能（推荐覆盖）

- Git 认证（Token、SSH）
- 错误恢复机制
- 性能优化（大仓库、深目录）
- 边缘情况（网络失败、权限不足）

### 手动测试场景

某些场景难以自动化，需要手动验证：

- **交互式输入**：用户输入 URL、认证信息
- **网络异常**：断网、超时、代理
- **系统资源**：磁盘满、内存不足
- **权限问题**：只读文件、受保护目录

## 运行测试

### 单元测试

```bash
# 运行所有单元测试
pnpm test:unit

# 运行特定文件
pnpm test:unit GitManager

# 查看覆盖率
pnpm test:coverage
```

### 集成测试

```bash
# 运行所有集成测试
pnpm test:suite:mocha

# Linux 需要 xvfb
xvfb-run -a pnpm test:suite:mocha
```

### 测试开发模式

```bash
# 监听模式（单元测试）
pnpm test:unit -- --watch

# 调试模式
pnpm test:unit -- --inspect-brk
```

## 测试文件组织

```
src/test/
├── unit/                          # 单元测试
│   ├── adapters/
│   │   └── *.spec.ts             # 适配器测试
│   ├── commands/
│   │   └── *.spec.ts             # 命令测试
│   ├── parsers/
│   │   └── *.spec.ts             # 解析器测试
│   ├── services/
│   │   └── *.spec.ts             # 服务测试
│   ├── setup.ts                   # 测试环境设置
│   └── *.spec.ts                  # 其他单元测试
├── suite/                         # 集成测试
│   └── *.test.ts                  # VSCode 集成测试
└── runTests.ts                    # 测试运行器

sampleWorkspace/                   # 测试工作区
├── test.code-workspace           # 多工作区配置
├── rules-for-cursor/             # Cursor 测试场景
├── rules-for-copilot/            # Copilot 测试场景
├── rules-for-continue/           # Continue 测试场景
├── rules-for-default/            # 自定义适配器测试
├── rules-multi-source/           # 多源测试
└── rules-with-user-rules/        # 用户规则保护测试
```

## 编写新测试的步骤

### 1. 确定测试类型

- **单元测试**：测试单个函数/类的逻辑
- **集成测试**：测试完整功能流程

### 2. 创建测试文件

```bash
# 单元测试
touch src/test/unit/services/NewService.spec.ts

# 集成测试
touch src/test/suite/newFeature.test.ts
```

### 3. 编写测试框架

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('NewService 单元测试', () => {
  beforeEach(() => {
    // 初始化
  });

  describe('methodName', () => {
    it('应该处理正常情况', () => {
      // 测试逻辑
    });

    it('应该处理错误情况', () => {
      // 测试逻辑
    });
  });
});
```

### 4. 运行并调试

```bash
# 运行新测试
pnpm test:unit NewService

# 如果失败，检查：
# 1. Mock 是否正确
# 2. 数据结构是否匹配
# 3. 验证逻辑是否符合实际代码
```

### 5. 确保通过

- 所有断言都通过
- 没有警告或错误
- 覆盖了主要分支逻辑

## 常见问题与解决方案

### Mock 不生效

**问题**：vi.mock() 没有生效，仍然调用真实模块

**解决**：

- 确保 mock 在 import 之前
- 检查模块路径是否正确
- 使用 `vi.mocked()` 获取类型安全的 mock

### 异步测试超时

**问题**：测试超时失败

**解决**：

```typescript
it('async operation', async () => {
  // 增加超时时间
  vi.setConfig({ testTimeout: 10000 });
  await longRunningOperation();
});
```

### VSCode API Mock 问题

**问题**：vscode 模块 mock 不完整

**解决**：在 `setup.ts` 中补充 mock：

```typescript
vi.mock('vscode', () => ({
  window: {
    showInformationMessage: vi.fn(),
    // 添加需要的 API
  },
}));
```

### 测试间状态污染

**问题**：测试 A 影响测试 B 的结果

**解决**：

```typescript
afterEach(() => {
  vi.clearAllMocks(); // 清除 mock 调用记录
  vi.restoreAllMocks(); // 恢复原始实现
});
```

## 测试覆盖率目标

### 单元测试

- **目标**：80% 代码覆盖率
- **优先级**：
  1. 核心逻辑（GitManager、RulesValidator）
  2. 工具函数（validator、fileSystem）
  3. 适配器（格式转换）

### 集成测试

- **目标**：覆盖主要用户流程
- **场景**：
  1. 添加源并同步
  2. 多源冲突解决
  3. 用户规则保护
  4. 错误恢复

## CI/CD 集成

### GitHub Actions 配置

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install
        run: pnpm install

      - name: Unit Tests
        run: pnpm test:unit

      - name: Integration Tests
        run: xvfb-run -a pnpm test:suite:mocha

      - name: Coverage
        run: pnpm test:coverage
```

## 最佳实践总结

### ✅ DO（应该做）

1. **测试必须通过** - 100% 通过率
2. **基于实际代码** - 不测试理想情况
3. **独立隔离** - 每个测试可独立运行
4. **清晰命名** - 测试名称描述行为
5. **适当 Mock** - 只 mock 外部依赖
6. **边界测试** - 测试边界和异常情况

### ❌ DON'T（不应该做）

1. **不提交失败测试** - 修复或删除
2. **不过度 Mock** - 避免测试 mock 而不是代码
3. **不依赖顺序** - 测试间不应有依赖
4. **不忽略警告** - 警告可能是潜在问题
5. **不测试实现细节** - 测试行为而非实现
6. **不写脆弱测试** - 代码小改动不应导致测试失败

---

**记住**：测试的目的是保证代码质量和功能稳定性，而不是追求覆盖率数字。编写有价值的测试，而不是无意义的测试。

## 测试场景矩阵

| 测试场景              | 适配器         | 规则源数量 | 认证类型 | 测试重点                |
| --------------------- | -------------- | ---------- | -------- | ----------------------- |
| rules-for-cursor      | Cursor         | 1          | None     | 基本同步 + Cursor 输出  |
| rules-for-copilot     | Copilot        | 1          | None     | Copilot Markdown 输出   |
| rules-for-continue    | Continue       | 1          | None     | Continue JSON 输出      |
| rules-for-default     | Custom         | 1          | None     | 自定义适配器 + 目录输出 |
| rules-multi-source    | Cursor+Copilot | 2          | None     | 多源冲突解决            |
| rules-with-user-rules | Cursor         | 1          | None     | 用户规则保护            |

## 未覆盖场景（需要手动测试）

### 1. 认证相关

- ❌ HTTPS Token 实际认证（需要真实私有仓库）
- ❌ SSH Key 实际认证（需要配置 SSH key）
- ❌ Token/Key 保存到 Keychain

### 2. 交互式流程

- ❌ 用户输入 Git URL
- ❌ 用户输入认证信息
- ❌ 错误提示交互
- ❌ 冲突解决选择

### 3. 边缘情况

- ❌ 网络错误处理
- ❌ 磁盘空间不足
- ❌ 权限不足
- ❌ 极大规则文件数量 (>500)

### 4. 性能测试

- ❌ 大型仓库克隆 (>100MB)
- ❌ 深层目录递归 (>6 层)
- ❌ 高频同步操作

## 如何扩展测试

### 添加新测试场景

1. **创建新测试工作区目录**:

```bash
mkdir sampleWorkspace/rules-for-newscenario
```

2. **配置 `.vscode/settings.json`**:

```json
{
  "turbo-ai-rules.adapters.YOUR_ADAPTER.enabled": true,
  "turbo-ai-rules.sync.auto": false,
  "turbo-ai-rules.sync.onStartup": false,
  "turbo-ai-rules.sources": [...]
}
```

3. **更新 `test.code-workspace`**:

```json
{
  "folders": [
    ...,
    { "path": "rules-for-newscenario", "name": "Test: New Scenario" }
  ]
}
```

4. **创建测试文件**:

```typescript
// src/test/suite/newScenario.test.ts
describe('New Scenario Tests', () => {
  // ...
});
```

### 添加新断言

使用 Node.js `assert` 模块:

```typescript
import * as assert from 'assert';

assert.ok(value, 'Should be truthy');
assert.strictEqual(actual, expected, 'Should match');
assert.deepStrictEqual(obj1, obj2, 'Objects should match');
```

### 模拟外部依赖

单元测试中使用 Vitest 的 mock:

```typescript
import { vi } from 'vitest';

vi.mock('../../services/GitManager', () => ({
  GitManager: {
    getInstance: () => ({
      cloneRepo: vi.fn().mockResolvedValue(true),
    }),
  },
}));
```

## CI/CD 集成

### GitHub Actions 配置

`.github/workflows/test.yml`:

```yaml
- name: Run Tests (Linux)
  run: xvfb-run -a pnpm test:suite:mocha
  if: runner.os == 'Linux'

- name: Run Tests (Other OS)
  run: pnpm test:suite:mocha
  if: runner.os != 'Linux'
```

### 测试覆盖率

生成覆盖率报告:

```bash
pnpm test:coverage
```

查看报告:

```bash
open coverage/index.html
```

## 测试最佳实践

### 1. 测试隔离

- 每个测试独立运行
- 清理测试数据
- 不依赖全局状态

### 2. 超时设置

Git 操作需要更长超时:

```typescript
it('Should clone repo', async function () {
  this.timeout(60000); // 60秒
  // ...
});
```

### 3. 错误处理

验证错误场景:

```typescript
try {
  await command();
  assert.fail('Should throw error');
} catch (error: any) {
  assert.ok(error.message.includes('expected'));
}
```

### 4. 异步操作

使用 async/await:

```typescript
it('Should be async', async () => {
  const result = await asyncOperation();
  assert.ok(result);
});
```

## 总结

本测试套件提供了 **全面的插件功能覆盖**：

✅ **核心功能**: 同步、源管理、配置生成
✅ **适配器**: 4 种主要适配器 + 自定义适配器
✅ **高级功能**: 多源、冲突解决、用户规则保护
✅ **Git 操作**: 克隆、拉取、分支、SubPath
✅ **文件系统**: 生成、保护、gitignore
✅ **配置管理**: 多级配置、合并策略

⚠️ **需要手动测试**: 认证、交互、网络错误、性能

通过这些测试场景，可以确保插件在各种使用情况下的稳定性和正确性。
