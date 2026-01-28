# Workflows: Cursor 完整工作流测试

## 📋 测试信息

- **测试文件**: `src/test/suite/workflows/workflows-cursor.test.ts`
- **测试目标**: Cursor 适配器完整工作流测试，从添加源到生成配置的端到端流程
- **工作空间配置**: 空配置起始（sources: []），测试完整添加流程

## 🧪 测试场景

### 测试准备（before 钩子）
**步骤**:
1. 使用 `switchToWorkspace('Workflows: Cursor')` 切换工作空间
2. 验证 Cursor 适配器已启用（adapterType: 'rules'）
3. 创建工作空间快照
4. 激活扩展并获取服务实例（RulesManager、SelectionStateManager）

**技术要点**:
- ✅ 端到端工作流测试（完整套件级快照）
- ✅ 超时设置：`TEST_TIMEOUTS.EXTRA_LONG` (300 秒)
- ✅ 单次快照备份和恢复（提升性能）

### 1. 完整端到端工作流
**步骤**:
1. 添加新规则源（使用唯一 ID 避免冲突）：
   - URL: `https://github.com/ygqygq2/ygqygq2.git`
   - ID: `ygqygq2-profile-${timestamp}`
2. 同步规则（`syncRules` 命令）
3. 等待规则加载完成
4. 生成 `.cursorrules` 配置

**验证**:
- ✅ 源成功添加
- ✅ 规则同步成功（数量 > 0）
- ✅ `.cursorrules` 文件生成
- ✅ 块标记正确（1 个 BEGIN，1 个 END）
- ✅ 内容长度 > 100 字符

**设计原因**:
- 使用时间戳 ID 确保唯一性，避免重复运行冲突
- 验证块标记确保格式正确（支持增量更新）

**执行时间**: ~30s

### 2. 增量同步
**步骤**:
1. 第一次同步规则，记录规则数量
2. 第二次同步规则（增量）
3. 对比两次规则数量

**验证**:
- ✅ 规则数量一致（不会重复添加）
- ✅ 增量同步机制正常

**设计原因**:
- 验证 Git 增量拉取机制
- 避免重复解析和存储

**执行时间**: ~20s

### 3. 空选择处理
**步骤**:
1. 同步规则
2. 清空选择（`updateSelection` with 空数组）
3. 生成配置

**验证**:
- ✅ 不报错（容错处理）
- ✅ 可能生成空文件或不生成文件
- ✅ 如生成文件，包含块标记

**设计原因**:
- 验证边界条件处理
- 用户体验：即使空选择也不应崩溃

**执行时间**: ~15s

## 🎯 关键验证点

- ✅ 端到端流程（添加源 → 同步 → 生成）
- ✅ Cursor 配置格式（`.cursorrules` 文件）
- ✅ 块标记系统（支持增量更新）
- ✅ 增量同步机制
- ✅ 空选择容错
- ✅ ID 唯一性保证

## 🔄 快照策略

- **套件级快照**: before 钩子创建一次，after 钩子恢复一次
- **测试级清理**: 只恢复 mocks（不恢复文件系统）
- **性能优化**: 避免每个测试都备份/恢复文件系统

## 📝 相关命令

- `turbo-ai-rules.syncRules` - 同步所有规则源
- `turbo-ai-rules.generateRules` - 生成适配器配置
- ConfigManager.addSource() - 添加新规则源

---
