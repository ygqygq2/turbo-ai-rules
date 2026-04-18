# 70. 集成测试设计

## 核心原则

1. **一个测试文件 = 一个工作空间** - 避免切换导致状态污染
2. **按真实场景组织** - 模拟完整的用户操作流程
3. **工作空间合理复用** - 多个测试可共享工作空间
4. **模拟 UI 操作结果** - 通过数据层面模拟 UI 交互
5. **Workflow 必测闭环固定化** - 至少覆盖“首次同步成功 → 修改选择 → 再次同步成功 → 输出正确 → 隔离恢复”

## 测试分类规则

### 1. `commands/`

- 目标：验证单个命令是否可调用、参数是否生效、基本副作用是否正确
- 特点：范围小、断言集中、允许使用定向清理

### 2. `adapters/`

- 目标：验证适配器配置解析、生成路径、类型差异、目录/单文件行为
- 特点：围绕 adapter contract 断言，不追求完整用户旅程

### 3. `scenarios/`

- 目标：验证跨模块特殊场景、边界情况、状态同步、异常与回退逻辑
- 特点：通常是“某一种风险”的聚焦测试，比如共享选择、工作区切换、状态栏统计

### 4. `workflows/`

- 目标：验证真实用户闭环，确保“同步、选择、生成、再同步、清理/恢复”这一整条链路不断裂
- 特点：优先使用工作区快照恢复，避免一轮测试污染下一轮

## 测试目录结构

```
src/test/suite/
├── workflows/   # 端到端工作流闭环
├── scenarios/   # 特殊场景 / 边界 / 回退
├── adapters/    # 适配器契约与产物形态
└── commands/    # 单命令行为
```

## Workflow 闭环必测项

所有 `workflows/**` 测试，不要求每个文件都覆盖所有可能组合，但**至少要在该类工作空间中形成完整闭环**。

| 阶段 | 必测问题 | 典型断言 |
|------|---------|---------|
| 首次同步成功 | 源是否拉取成功、规则是否装载 | `rulesManager.getRulesBySource(sourceId).length > 0` |
| 初始选择与生成 | 选择结果是否进入输出 | 生成文件存在、规则块数量正确、目标目录正确 |
| 修改选择 | 改动选择后状态是否持久化 | `selectionStateManager.persistToDisk()` 后可重新读取 |
| 再次同步成功 | 第二次同步是否保留新选择而不是回退旧状态 | 重新同步后 selection 仍是更新后的 paths |
| 输出正确 | 再生成后是否只保留当前应有内容 | 规则块数量变化正确、被移除规则不再出现 |
| 隔离恢复 | 一轮测试后是否恢复基线 | `restoreWorkspaceSnapshot()` 或明确 cleanup |

> 其中“首次同步成功 → 修改选择 → 再次同步成功”是当前最核心的回归链路，新功能若影响同步页、选择状态、生成逻辑，必须补到这条链里。

## 工作空间与隔离策略

建议以 `sampleWorkspace/test.code-workspace` + `sampleWorkspace/TEST-WORKSPACE-MAPPING.md` 为准，本文只强调策略：

| 类别 | 推荐隔离策略 | 说明 |
|------|-------------|------|
| Workflows | `createWorkspaceSnapshot` + `restoreWorkspaceSnapshot` | 优先，最适合真实闭环 |
| Scenarios | 定向清理或快照 | 视改动面大小决定 |
| Adapters | 定向清理 | 聚焦产物与配置 |
| Commands | 定向清理 | 聚焦命令副作用 |

## 什么时候新增测试文件，什么时候补已有 workflow

- **已有工作流只是少一个阶段**：优先补进现有 workflow 文件
- **新增的是独立风险模型**：放到 `scenarios/`
- **新增的是适配器协议差异**：放到 `adapters/`
- **新增的是完整用户旅程**：放到 `workflows/`

## 关键测试场景

### 1. 适配器分类测试

**规则适配器** (isRuleType: true)
- Cursor, Copilot, Continue, Default 等
- 侧边栏快速同步（同步所有启用的规则适配器）
- 规则选择器（TreeView，有目录层级）

**Skill 适配器** (isRuleType: false)
- 通过仪表板规则同步页选择适配器同步
- 对 skill.md 的特殊处理

**新资产类型适配器**
- `agent` / `command` / `hook`：不能只测“目录存在”，还要测关键产物路径与代表性内容
- `merge-json`（如 `mcp`、hook settings）：至少要测首次生成和缩减选择后的再生成结果
- `hook` 与 `mcp` 虽然都可能是 JSON，但语义不同，测试不能只靠扩展名覆盖

### 2. UI 数据流测试

**三处规则选择 UI 使用同一数据源**：
1. 侧边栏左侧 - 平铺视图（无层级）
2. 右击规则源 - 规则选择器（有层级）  
3. 仪表板 - 规则同步页

**测试要点**：
- 模拟规则选择并持久化
- 验证数据在三处实时同步
- 验证快速同步 vs 指定适配器同步
- 验证“修改选择后再次同步”不会把用户最新选择冲掉

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
