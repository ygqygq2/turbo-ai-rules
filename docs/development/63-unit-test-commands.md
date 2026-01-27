# 测试命令速查表

## 快速测试

### 常规测试（可能受缓存影响）

```bash
# 单元测试（Vitest）
pnpm test:unit

# 集成测试（Mocha）- 所有文件
pnpm test:suite:mocha

# 集成测试（Mocha）- 单个文件（推荐开发时使用，快速）
TEST_FILE=presetAdapters pnpm test:suite:mocha:file
TEST_FILE=userRules pnpm test:suite:mocha:file

# 全部测试
pnpm test
```

**可用的测试文件名**：
`workspaceSwitching`, `userRules`, `syncRules`, `skillsAdapter`, `sharedSelection`, `searchRules`, `removeSource`, `presetAdapters`, `preConfiguredSources`, `performance`, `multiSource`, `generateConfigs`, `errorHandling`, `customAdapters`, `contextMenuCommands`, `addSource`

### 干净环境测试（推荐 - 重现 CI）

```bash
# 清理缓存 + 集成测试（推荐）
pnpm run test:suite:clean

# 等同于
pnpm run clean:cache
pnpm run test:suite:mocha
```

## 缓存管理

### 清理所有缓存

```bash
pnpm run clean:cache
```

这会清理：

- ✅ `~/.cache/.turbo-ai-rules` - 全局缓存（Git 仓库、工作区数据）
- ✅ `.vscode-test` - VSCode 测试运行时状态
- ✅ `out` - 编译输出
- ✅ `sampleWorkspace/*` - 测试工作区生成的文件
- ✅ `/tmp/tmp-*` - 临时测试目录
- ✅ `node_modules/.vite` - Vite 缓存
- ✅ `coverage` - 测试覆盖率

### 手动清理特定缓存

```bash
# 只清理全局缓存（最重要）
rm -rf ~/.cache/.turbo-ai-rules

# 只清理 VSCode 测试状态
rm -rf .vscode-test

# 只清理编译输出
pnpm run clean
```

## 测试场景

### 场景 1: 日常开发测试

```bash
# 快速运行测试（使用现有缓存）
pnpm test:suite:mocha
```

### 场景 2: 提交前验证

```bash
# 清理缓存后测试（重现 CI 环境）
pnpm run test:suite:clean
```

### 场景 3: 调试测试失败

```bash
# 1. 清理缓存
pnpm run clean:cache

# 2. 重新编译并测试
pnpm run test-compile
pnpm run test:suite:mocha
```

### 场景 4: 单元测试开发

```bash
# 监听模式
pnpm test:unit

# 覆盖率报告
pnpm run test:coverage
```

## 常见问题

### Q: 本地测试通过，但 CI 失败？

**A**: 本地缓存污染，运行 `pnpm run test:suite:clean`

### Q: 测试卡住不动？

**A**: 可能是 VSCode 实例未关闭，Ctrl+C 终止后再试

### Q: 测试失败但不知道原因？

**A**: 按以下顺序排查：

1. 清理缓存：`pnpm run clean:cache`
2. 重新编译：`pnpm run test-compile`
3. 运行测试：`pnpm run test:suite:mocha`
4. 查看日志：检查 `/tmp/tmp-*/logs/` 目录

## 测试文件位置

```
src/test/
├── unit/                 # 单元测试（Vitest）
│   ├── parsers/
│   ├── services/
│   └── utils/
├── suite/                # 集成测试（Mocha）
│   ├── workflows/        # 端到端流程
│   │   ├── cursor-workflow.test.ts
│   │   ├── multi-source-workflow.test.ts
│   │   ├── user-rules-workflow.test.ts
│   │   ├── skills-workflow.test.ts
│   │   └── rule-selection-workflow.test.ts
│   ├── scenarios/        # 特殊场景
│   │   ├── workspace-isolation.test.ts
│   │   ├── adapter-types.test.ts
│   │   └── statusbar.test.ts
│   └── commands/         # 命令测试
│       └── source-management.test.ts
├── runTests.ts           # 测试入口
└── ready.ts              # 测试环境准备
```

## CI 行为

GitHub Actions CI 每次运行都是**干净环境**：

- ✅ 全新检出代码
- ✅ 全新安装依赖
- ✅ 没有缓存污染
- ✅ 三平台测试（macOS、Ubuntu、Windows）

因此 CI 失败通常表示真实问题，不是偶发性故障。

## 相关文档

- 详细说明：[docs/development/62-unit-test-cache-cleanup.md](./62-unit-test-cache-cleanup.md)
- 测试覆盖率：[docs/development/60-unit-test-coverage.md](./60-unit-test-coverage.md)
- 开发指南：[docs/development/40-development.md](./40-development.md)
