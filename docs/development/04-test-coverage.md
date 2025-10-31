# 集成测试完整性说明

## 测试覆盖范围

### 1. 核心功能测试

#### 同步功能 (syncRules.test.ts)

- ✅ 从预配置源同步规则
- ✅ 同步过程错误处理
- ✅ 生成适配器输出文件
- ✅ 验证配置文件存在

#### 源管理 (addSource.test.ts, removeSource.test.ts, manageSource.test.ts)

- ✅ 添加新规则源
- ✅ 删除已有规则源
- ✅ 管理多个规则源
- ✅ 启用/禁用规则源

#### 配置生成 (generateConfigs.test.ts)

- ✅ 重新生成配置文件（不重新同步）
- ✅ 多适配器同时生成
- ✅ 验证输出格式正确

### 2. 适配器测试

#### 单适配器测试

每个测试工作区测试一个主要适配器：

- **rules-for-cursor**: Cursor `.cursorrules` 目录输出
- **rules-for-copilot**: Copilot `.github/copilot-instructions.md` 单文件输出
- **rules-for-continue**: Continue `.continue/config.json` JSON 配置输出
- **rules-for-default**: 自定义适配器 `rules/` 目录输出

#### 多适配器测试 (multiSource.test.ts)

- ✅ 同时启用多个适配器
- ✅ 验证每个适配器独立工作
- ✅ 验证不同输出格式兼容性

### 3. 高级功能测试

#### 多源冲突解决 (multiSource.test.ts)

- ✅ 多个规则源配置
- ✅ 冲突策略 (`priority`) 测试
- ✅ 规则合并逻辑验证
- ✅ 重复 ID 处理

#### 用户规则保护 (userRulesProtection.test.ts)

- ✅ 用户手动创建的规则文件保护
- ✅ 同步后用户规则保持不变
- ✅ `.gitignore` 正确配置
- ✅ 混合规则管理

### 4. Git 功能测试

#### 认证类型

虽然集成测试只使用公开仓库（无需认证），但代码支持：

- 公开仓库（type: "none"）✅ 测试覆盖
- HTTPS Token 认证 ⚠️ 单元测试覆盖
- SSH Key 认证 ⚠️ 单元测试覆盖

#### Git 操作

- ✅ 克隆公开仓库
- ✅ 拉取更新 (git pull)
- ✅ 分支切换
- ✅ SubPath 过滤

### 5. 配置管理测试

#### 配置读取

- ✅ 工作区级别配置
- ✅ 多根工作区支持
- ✅ 配置合并策略

#### 配置存储

- ✅ 项目级配置 (`.turbo-ai-rules/`)
- ⚠️ 全局配置 (`~/.config/turbo-ai-rules/`) - 单元测试覆盖

### 6. 文件系统测试

#### 文件生成

- ✅ 适配器输出文件生成
- ✅ 目录结构创建
- ✅ 索引文件生成（自定义适配器）

#### 文件保护

- ✅ 用户规则不被覆盖
- ✅ `.gitignore` 自动更新
- ✅ 缓存目录管理

## 测试方法

### 单元测试 (Vitest)

**位置**: `src/test/unit/**/*.spec.ts`

**覆盖范围**:

- 工具函数 (utils/)
- 解析器 (parsers/)
- 服务类 (services/)
- 适配器 (adapters/)
- 类型验证 (types/)

**优势**:

- 快速执行
- 无需 VSCode 环境
- 高覆盖率
- 隔离测试

**运行**:

```bash
pnpm test:unit
```

### 集成测试 (Mocha + @vscode/test-electron)

**位置**: `src/test/suite/**/*.test.ts`

**覆盖范围**:

- 扩展激活
- 命令执行
- 配置读写
- 工作区交互
- 文件系统操作
- Git 操作

**优势**:

- 真实 VSCode 环境
- 端到端测试
- 实际 Git 操作
- 完整流程验证

**运行**:

```bash
pnpm test:suite:mocha
```

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
