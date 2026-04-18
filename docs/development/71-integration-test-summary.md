# 71. 集成测试总结

## 测试组织

### 目录结构

```
src/test/suite/
├── workflows/          # 端到端流程（6个测试）
├── scenarios/          # 特殊场景（3个测试）
├── commands/           # 命令测试（1个测试）
└── .temp-disabled-old/ # 旧测试（已禁用）
```

### 已实现测试（10个）

**Workflows (6):**
- cursor-workflow - Cursor 完整流程（添加源 → 同步 → 选择 → 生成）
- multi-source-workflow - 多源管理、冲突解决、优先级
- user-rules-workflow - 用户规则保护、block markers
- user-skills-workflow - 用户技能、ai-skills/ 目录、skill.md 处理 ✨ 新增
- skills-workflow - Skill 适配器、dashboard sync、skill.md
- rule-selection-workflow - 三处 UI 数据同步（sidebar/右键/dashboard）

**Scenarios (3):**
- workspace-isolation - 工作区隔离、hash 计算
- adapter-types - Rule/Skill 适配器分类
- statusbar - StatusBar 统计显示

**Commands (1):**
- source-management - 源管理命令、URL 验证

## 工作空间分配

| 工作空间 | 测试文件 | 说明 |
|---------|---------|------|
| **rules-for-cursor** | cursor-workflow<br>source-management | Cursor 流程<br>源管理 |
| **rules-multi-source** | multi-source-workflow | 多源、冲突 |
| **rules-with-user-rules** | user-rules-workflow<br>user-skills-workflow | 用户规则<br>用户技能 ✨ |
| **rules-for-skills** | skills-workflow | Skill 适配器 |
| **rules-for-default** | rule-selection-workflow<br>adapter-types<br>statusbar | 规则选择<br>适配器分类<br>状态栏 |
| **多工作空间** | workspace-isolation | 隔离测试 |

## 测试覆盖

✅ 基础流程：添加源 → 同步 → 选择 → 生成  
✅ 多源管理：冲突解决、优先级、合并  
✅ 用户规则：保护、block markers  ✅ 用户技能：ai-skills/ 目录、skill.md 处理、清理保护 ✨ 新增  ✅ 适配器类型：Rule/Skill 分类、dashboard sync  
✅ UI 数据同步：三处 UI 共享数据  
✅ 工作空间隔离：hash、数据独立  
✅ StatusBar：统计显示

## 运行测试

```bash
# 运行所有集成测试
pnpm test:suite:mocha

# 运行单个工作流
pnpm test:suite:mocha -- --grep "Cursor workflow"

# 运行特定场景
pnpm test:suite:mocha -- --grep "Workspace isolation"
```

## 关键原则

1. **一测试一空间**：每个测试文件固定一个工作空间
2. **模拟 UI 操作**：通过数据持久化模拟用户点击
3. **真实场景**：端到端流程，避免过度 mock
4. **清理状态**：每个测试独立，不依赖其他测试


✅ **用户规则保护**:
- 用户内容保留
- 多适配器同时启用
- 块标记正确性
- 更新不覆盖用户规则

✅ **工作空间隔离**:
- 工作空间哈希
- 数据隔离
- 持久化到正确目录

✅ **命令功能**:
- 添加/删除源
- 启用/禁用源
- URL 验证
- 配置持久化

### 待实现的测试（基于旧测试迁移）

⏳ **适配器工作流**:
- [ ] copilot-workflow.test.ts (Copilot 适配器完整流程)
- [ ] continue-workflow.test.ts (Continue 适配器完整流程)
- [ ] default-workflow.test.ts (默认适配器 + rules/ 目录)
- [ ] skills-workflow.test.ts (技能适配器)
- [ ] shared-selection-workflow.test.ts (共享选择)


## 后续计划

### 其他适配器流程（可选）
- copilot-workflow.test.ts
- continue-workflow.test.ts  
- default-workflow.test.ts

### 高级功能（可选）
- error-handling.test.ts
- performance.test.ts
- custom-adapters.test.ts

### 清理验证
- 删除 .temp-disabled-old/ 旧文件
- 运行完整测试套件
- 验证覆盖率

4. **更快的调试**: 问题定位更容易
5. **更真实的测试**: 模拟真实用户操作流程

## 🔗 相关文档

- [集成测试设计方案](70-integration-test-design.md)
- [集成测试参考](72-integration-test-reference.md)
- [sampleWorkspace README](../../sampleWorkspace/README.md)
- [测试覆盖率分析](61-unit-test-coverage-analysis.md)

## 📝 注意事项

1. **不要在测试中切换工作空间**: 每个测试文件固定在一个工作空间
2. **模拟 UI 操作**: 通过数据层面模拟 UI 操作结果
3. **清理测试数据**: 每个测试后要清理自己的数据
4. **真实场景优先**: 测试应该反映真实的用户操作流程
5. **工作空间复用**: 多个测试文件可以共享同一个工作空间，但要确保互不干扰

## 🎉 已验证

- ✅ 新测试文件编译通过
- ✅ 类型定义正确
- ✅ 目录结构清晰
- ✅ 文档已更新
