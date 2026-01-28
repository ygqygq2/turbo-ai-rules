# Adapters: Custom Adapters

## 📋 测试信息

- **测试文件**: `src/test/suite/adapters/adapters-custom-rule.test.ts`
- **测试目标**: 验证规则类型自定义适配器（isRuleType: true）的配置加载、规则同步和文件生成功能
- **工作空间配置**: `.vscode/settings.json` 包含预配置的 Git 源和空的自定义适配器列表

## 🧪 测试场景

### 测试准备（before 钩子）
**步骤**:
1. 使用 `switchToWorkspace('Adapters: Custom')` 切换到测试工作空间
2. 自动打开 `README.md` 激活工作空间上下文
3. 等待 VSCode 完成上下文切换（1 秒）

**技术要点**:
- ✅ 使用公共辅助函数 `switchToWorkspace`
- ✅ 通过打开 README 激活工作空间
- ✅ 超时设置：`TEST_TIMEOUTS.LONG` (120 秒)

### 1. 加载自定义适配器配置
**步骤**:
- 读取 `turbo-ai-rules.adapters.custom` 配置
- 验证配置为数组类型
- 如果有配置，验证必需字段（id/name/outputPath/outputType）

**验证**:
- ✅ 配置可正常读取
- ✅ 数据结构符合预期
- ✅ 必需字段完整

**执行时间**: ~100ms

### 2. 同步规则成功
**步骤**:
1. 执行 `turbo-ai-rules.syncRules` 命令
2. 使用 `waitForRulesLoaded(rulesManager, 1)` 轮询等待规则加载
   - 最多 5 次重试，每次间隔 1 秒
   - 条件：至少加载 1 条规则
3. 验证规则数量 > 0

**验证**:
- ✅ 同步命令执行成功
- ✅ Git 仓库克隆/拉取成功
- ✅ 规则解析完成

**容错处理**:
- ❌ 如果网络失败或首次克隆超时 → 跳过测试（不失败）
- 💡 使用轮询机制代替固定 sleep，性能更优（4-5 秒完成）

**执行时间**: 4-5 秒（优化后，原 16 秒）

### 3. 使用自定义适配器生成文件
**步骤**:
1. 创建测试适配器配置：
   ```json
   {
     "id": "test-custom-basic",
     "name": "Test Custom Basic",
     "enabled": true,
     "outputPath": "test-custom-adapter-output",
     "outputType": "directory",
     "fileExtensions": ["*.md"],
     "organizeBySource": true,
     "generateIndex": false,
     "isRuleType": true
   }
   ```
2. 更新工作区配置添加适配器
3. 等待配置生效（500ms）
4. 从已同步的规则中选择前 3 条
5. 调用 `updateSelection` 标记选中状态
6. 执行 `turbo-ai-rules.generateRules` 命令
7. 等待文件生成（2 秒）
8. 验证输出目录是否创建

**验证**:
- ✅ 适配器配置动态添加成功
- ✅ 规则选择状态更新
- ✅ 生成命令正常执行
- ✅ 输出目录检查完成

**清理**:
- 🧹 finally 块恢复原始配置
- 🧹 afterEach 钩子删除 `test-custom-adapter-output` 目录

**执行时间**: 3-4 秒（优化后，原 21 秒）

## 🎯 关键验证点

- ✅ **工作空间切换**: 通过打开 README 激活上下文
- ✅ **配置加载**: 自定义适配器配置读取
- ✅ **规则同步**: 轮询机制等待 Git 克隆和规则解析
- ✅ **动态配置**: 运行时添加/删除适配器
- ✅ **规则选择**: SelectionStateManager 状态管理
- ✅ **文件生成**: CustomAdapter 输出验证
- ✅ **资源清理**: 测试后恢复配置和删除输出文件

## ⚡ 性能优化

| 优化项 | 优化前 | 优化后 | 提升 |
|--------|--------|--------|------|
| 同步规则等待 | 固定 sleep 10 秒 | waitForRulesLoaded 轮询 | 16s → 4s |
| 文件生成等待 | 固定 sleep 3 秒 | TEST_DELAYS.LONG (2s) | 3s → 2s |
| 重复同步 | before + 测试内各同步一次 | 仅 before 同步 | 省 10s |
| **总测试时间** | **27 秒** | **10 秒** | **63% 提升** |

## 🔧 技术实现

### 使用的测试辅助函数
```typescript
// 工作空间切换（打开 README 激活上下文）
switchToWorkspace(name: string): Promise<WorkspaceFolder>

// 轮询等待规则加载（最多 5 次 × 1 秒）
waitForRulesLoaded(rulesManager, minCount): Promise<Rule[]>

// 延迟工具（使用常量）
sleep(TEST_DELAYS.SHORT)  // 500ms
sleep(TEST_DELAYS.LONG)   // 2000ms
```

### 容错机制
- 网络异常或首次克隆超时 → 跳过测试而非失败
- 使用 try-catch 捕获轮询超时异常
- finally 块保证配置恢复

---
