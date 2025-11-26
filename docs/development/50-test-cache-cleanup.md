# 测试缓存清理指南

## 问题背景

### 症状

本地运行 `pnpm test:suite:mocha` 测试通过，但在 GitHub Actions CI 环境中（macOS、Ubuntu、Windows）测试失败，错误信息如下：

```
4 failing

1) Sync Rules Tests - Should sync rules from pre-configured source:
   AssertionError: Should generate .cursorrules file after sync

2) Sync Rules Tests - Should generate adapter output files:
   AssertionError: Cursor rules file should be generated after sync

3) Multi-Source Integration Tests - Should sync rules from multiple sources:
   AssertionError: At least one adapter output should exist

4) Generate Config Files Tests - Should generate adapter config files:
   AssertionError: Adapter config file should exist after generateConfigs
```

### 根本原因

本地测试环境存在**缓存污染**，导致测试依赖于缓存的中间状态而通过，但在 CI 的干净环境中失败。

主要缓存位置包括：

1. **全局缓存目录** - `~/.cache/.turbo-ai-rules/`
   - Git 仓库克隆缓存 (`sources/`)
   - 工作区数据缓存 (`workspaces/`)
2. **VSCode 测试运行时** - `.vscode-test/`
   - 扩展状态（`globalState`、`workspaceState`）
   - VSCode 实例缓存
3. **编译输出** - `out/`
   - 可能包含旧的编译产物
4. **测试工作区生成文件** - `sampleWorkspace/*/`
   - `.cursorrules`、`.github/`、`rules/` 等

## 解决方案

### 快速清理（推荐）

使用提供的清理脚本：

```bash
pnpm run clean:cache
```

或直接执行：

```bash
bash scripts/clean-test-cache.sh
```

### 清理脚本功能

清理脚本 `scripts/clean-test-cache.sh` 会自动清理以下内容：

1. ✅ 全局缓存目录 (`~/.cache/.turbo-ai-rules`)
2. ✅ 全局配置目录 (`~/.config/.turbo-ai-rules`)
3. ✅ VSCode 测试目录 (`.vscode-test`)
4. ✅ 编译输出目录 (`out`)
5. ✅ 测试工作区生成文件 (`sampleWorkspace/*/.cursorrules` 等)
6. ✅ 临时测试目录 (`/tmp/tmp-*/logs/*/exthost/ygqygq2.turbo-ai-rules`)
7. ✅ Vite 缓存 (`node_modules/.vite`)
8. ✅ 测试覆盖率目录 (`coverage`)

### 手动清理

如果需要手动清理特定缓存：

```bash
# 清理全局缓存（最重要）
rm -rf ~/.cache/.turbo-ai-rules

# 清理 VSCode 测试运行时
rm -rf .vscode-test

# 清理编译输出
rm -rf out

# 清理测试工作区生成文件
rm -f sampleWorkspace/*/.cursorrules
rm -rf sampleWorkspace/*/.github
rm -rf sampleWorkspace/*/.continue
rm -rf sampleWorkspace/*/rules
```

## 测试流程最佳实践

### 本地测试流程

为了重现 CI 环境，本地测试前应该：

1. **清理所有缓存**：

   ```bash
   pnpm run clean:cache
   ```

2. **重新编译并运行测试**：

   ```bash
   pnpm run test-compile
   pnpm run test:suite:mocha
   ```

3. **或使用一键命令**（如果配置）：
   ```bash
   pnpm run test:clean  # 清理 + 编译 + 测试
   ```

### CI 环境

GitHub Actions CI 环境默认是干净的，每次运行都会：

- 全新检出代码
- 全新安装依赖
- 没有任何缓存污染

因此 CI 环境能暴露真实的测试问题。

## 缓存位置详解

### 1. 全局缓存目录

**位置**：

- Linux: `~/.cache/.turbo-ai-rules/`
- macOS: `~/Library/Caches/.turbo-ai-rules/`
- Windows: `%LOCALAPPDATA%\.turbo-ai-rules\`

**内容**：

```
.turbo-ai-rules/
├── sources/           # Git 仓库克隆缓存
│   └── ai-rules-7008d805/
└── workspaces/        # 工作区数据缓存
    └── <workspace-hash>/
```

**作用**：

- 缓存 Git 仓库克隆，避免重复下载
- 缓存工作区级别的数据（规则解析结果等）

**为什么会污染测试**：

- Git 仓库缓存可能包含旧的分支状态
- 工作区数据缓存可能包含旧的规则索引
- 测试可能依赖"规则已同步"的假设

### 2. VSCode 测试运行时

**位置**：`.vscode-test/`

**内容**：

```
.vscode-test/
├── extensions/              # 扩展状态
└── vscode-linux-x64-1.88.0/  # VSCode 实例
```

**作用**：

- 存储扩展的 `globalState` 和 `workspaceState`
- 存储 VSCode 测试实例

**为什么会污染测试**：

- `workspaceState` 可能缓存了选择状态（`SelectionStateManager`）
- `globalState` 可能缓存了规则源的同步状态

### 3. 临时测试目录

**位置**：`/tmp/tmp-*/`

**内容**：每次运行测试时，`createSettings()` 会创建临时的用户数据目录

**作用**：避免测试影响真实的 VSCode 配置

**为什么会污染测试**：多次运行测试会积累大量临时目录，可能占用磁盘空间

## 常见问题

### Q1: 为什么本地测试通过但 CI 失败？

**A**: 本地环境存在缓存污染，测试依赖了缓存的中间状态。使用 `pnpm run clean:cache` 清理后再测试。

### Q2: 清理缓存会影响正常使用吗？

**A**: 不会。清理缓存只是删除临时数据，下次同步时会重新克隆 Git 仓库。对于开发测试没有影响。

### Q3: 我应该多久清理一次缓存？

**A**: 建议在以下情况清理：

- 提交 PR 前
- 测试失败但不确定原因时
- 修改了 Git 或缓存相关代码后
- 发现测试行为不一致时

### Q4: 如何在 CI 中避免缓存问题？

**A**: CI 环境默认是干净的，无需额外清理。但如果启用了 CI 缓存（如 `actions/cache`），需要注意：

```yaml
# 不推荐缓存这些目录
- ~/.cache/.turbo-ai-rules
- .vscode-test

# 只缓存依赖
- node_modules
- ~/.pnpm-store
```

## 测试设计建议

为避免缓存依赖，测试应该：

1. ✅ **每个测试独立**：不依赖其他测试的副作用
2. ✅ **显式清理**：在 `afterEach` 中清理生成的文件
3. ✅ **显式初始化**：在 `beforeEach` 中初始化状态
4. ❌ **避免依赖全局状态**：除非显式清理
5. ❌ **避免依赖缓存**：测试应该能在干净环境运行

## 参考

- 错误码：`TAI-200x`（Git 类错误）
- 相关服务：`GitManager`、`WorkspaceDataManager`、`WorkspaceStateManager`
- 相关文档：`docs/development/40-development.md`
