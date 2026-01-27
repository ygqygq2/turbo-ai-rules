# 70. 集成测试设计

## 核心原则

1. **一个测试文件 = 一个工作空间** - 避免切换导致状态污染
2. **按真实场景组织** - 模拟完整的用户操作流程
3. **工作空间合理复用** - 多个测试可共享工作空间
4. **模拟 UI 操作结果** - 通过数据层面模拟 UI 交互

## 测试目录结构

```
src/test/suite/
├── workflows/          # 端到端工作流测试
├── scenarios/          # 特殊场景测试  
├── commands/           # 命令功能测试
└── .temp-disabled-old/ # 旧测试文件
```

## 工作空间分配

| 工作空间 | 用途 | 当前测试 |
|---------|------|---------|
| rules-for-cursor | Cursor 适配器、通用命令 | cursor-workflow.test.ts<br>source-management.test.ts |
| rules-multi-source | 多源、冲突解决 | multi-source-workflow.test.ts |
| rules-with-user-rules | 用户规则保护 | user-rules-workflow.test.ts |
| rules-for-skills | Skill 适配器 | (待添加) |
| 多工作空间 | 工作空间隔离 | workspace-isolation.test.ts |

## 关键测试场景

### 1. 适配器分类测试

**规则适配器** (isRuleType: true)
- Cursor, Copilot, Continue, Default 等
- 侧边栏快速同步（同步所有启用的规则适配器）
- 规则选择器（TreeView，有目录层级）

**Skill 适配器** (isRuleType: false)
- 通过仪表板规则同步页选择适配器同步
- 对 skill.md 的特殊处理

### 2. UI 数据流测试

**三处规则选择 UI 使用同一数据源**：
1. 侧边栏左侧 - 平铺视图（无层级）
2. 右击规则源 - 规则选择器（有层级）  
3. 仪表板 - 规则同步页

**测试要点**：
- 模拟规则选择并持久化
- 验证数据在三处实时同步
- 验证快速同步 vs 指定适配器同步

### 3. StatusBar 统计测试

验证状态栏显示：
- 规则源数量
- 已选规则数量
- 同步状态

## UI 操作模拟

```typescript
// 模拟规则选择（等同于 UI 勾选）
selectionStateManager.updateSelection(
  sourceId,
  selectedPaths,
  false,
  workspacePath
);
await selectionStateManager.persistToDisk(sourceId, workspacePath);

// 然后执行后续命令测试
await vscode.commands.executeCommand('turbo-ai-rules.generateConfigs');
```

详细实现见 [72-integration-test-reference.md](72-integration-test-reference.md)
