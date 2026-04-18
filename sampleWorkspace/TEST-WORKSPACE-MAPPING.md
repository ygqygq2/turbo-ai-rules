# 测试文件与工作空间映射关系

> 更新日期: 2026-01-27  
> 重组后的清晰分类结构

## 📋 命名规范

- **测试文件**: `{category}-{workspaceName}.test.ts`
- **工作空间**: `{category}-{workspaceName}/`
- **多工作空间共享**: `{category}-{baseName}-shared.test.ts`

## 🗂️ 完整映射表

### 📂 Commands 类别 (6 个工作空间 → 5 个测试文件)

| 工作空间 | 测试文件 | 说明 |
|---------|---------|------|
| `commands-addSource-empty/` | `commands/addSource-shared.test.ts` | 共享测试文件 |
| `commands-addSource-existing/` | `commands/addSource-shared.test.ts` | 共享测试文件 |
| `commands-contextMenu/` | `commands/commands-contextMenu.test.ts` | 独立测试 |
| `commands-removeSource/` | `commands/commands-removeSource.test.ts` | 独立测试 |
| `commands-searchRules/` | `commands/commands-searchRules.test.ts` | 独立测试 |
| `commands-sourceManagement/` | `commands/commands-sourceManagement.test.ts` | 独立测试 |

### 📂 Adapters 类别 (3 个工作空间 → 3 个测试文件)

| 工作空间 | 测试文件 | 说明 |
|---------|---------|------|
| `adapters-custom-rule/` | `adapters/adapters-custom-rule.test.ts` | 自定义规则适配器 |
| `adapters-custom-skills/` | `adapters/adapters-custom-skills.test.ts` | 自定义技能适配器 |
| `adapters-preset/` | `adapters/adapters-preset.test.ts` | 预设适配器 |

### 📂 Scenarios 类别 (11 个工作空间 → 8 个测试文件 + 1 手动夹具)

| 工作空间 | 测试文件 | 说明 |
|---------|---------|------|
| `scenarios-adapterTypes/` | `scenarios/scenarios-adapterTypes.test.ts` | 适配器类型 |
| `scenarios-errorHandling/` | `scenarios/scenarios-errorHandling.test.ts` | 错误处理 |
| `scenarios-performance/` | `scenarios/scenarios-performance.test.ts` | 性能测试 |
| `scenarios-preConfiguredSources/` | `scenarios/scenarios-preConfiguredSources.test.ts` | 预配置源 |
| `scenarios-sharedSelection/` | `scenarios/scenarios-sharedSelection.test.ts` | 共享选择 |
| `scenarios-statusbar/` | `scenarios/scenarios-statusbar.test.ts` | 状态栏 |
| `scenarios-workspaceIsolation-ws1/` | `scenarios/scenarios-workspaceIsolation-shared.test.ts` | 共享测试文件 |
| `scenarios-workspaceIsolation-ws2/` | `scenarios/scenarios-workspaceIsolation-shared.test.ts` | 共享测试文件 |
| `scenarios-workspaceSwitching-ws1/` | `scenarios/scenarios-workspaceSwitching-shared.test.ts` | 共享测试文件 |
| `scenarios-workspaceSwitching-ws2/` | `scenarios/scenarios-workspaceSwitching-shared.test.ts` | 共享测试文件 |
| `scenarios-multiAdapterUserProtection/` | `（手动夹具工作空间）` | 多适配器 + 用户保护场景，当前无独立自动测试 |

### 📂 Workflows 类别 (14 个工作空间 → 10 个测试文件 + 3 手动/预留工作空间)

| 工作空间 | 测试文件 | 说明 |
|---------|---------|------|
| `workflows-cursor/` | `workflows/workflows-cursor.test.ts` | Cursor 工作流 |
| `workflows-generateRules/` | `workflows/workflows-generateRules.test.ts` | 生成规则 |
| `workflows-adapter-suites/` | `workflows/workflows-adapterSuites.test.ts` | 适配器综合体 |
| `workflows-multiSource/` | `workflows/workflows-multiSource.test.ts` | 多源管理 |
| `workflows-preset-single-file/` | `workflows/workflows-preset-single-file.test.ts` | 预设单文件工作流 |
| `workflows-preset-directory/` | `（预留工作空间）` | 目录型 preset 工作流夹具，当前无独立自动测试 |
| `workflows-preset-skills/` | `workflows/workflows-preset-skills.test.ts` | 预设 skills 工作流 |
| `workflows-custom-single-file/` | `（预留工作空间）` | 单文件 custom 工作流夹具，当前无独立自动测试 |
| `workflows-custom-directory/` | `（预留工作空间）` | 目录型 custom 工作流夹具，当前无独立自动测试 |
| `workflows-custom-skills/` | `workflows/workflows-custom-skills.test.ts` | 自定义 skills 工作流 |
| `workflows-custom-mcp/` | `workflows/workflows-custom-mcp.test.ts` | 自定义 MCP merge-json 工作流 |
| `workflows-custom-user-rules/` | `workflows/workflows-custom-user-rules.test.ts` | 自定义适配器 + 用户规则 |
| `workflows-ruleSelection/` | `workflows/workflows-ruleSelection.test.ts` | 规则选择 |
| `workflows-syncRules/` | `workflows/workflows-syncRules.test.ts` | 同步规则 |
| `workflows-claude-composite/` | `workflows/workflows-claude-composite.test.ts` | Claude commands / agents / hooks / settings 综合工作流 |

### 📂 Rules 类别 (5 个示例工作空间)

| 工作空间 | 测试文件 | 说明 |
|---------|---------|------|
| `rules-for-continue/` | `（示例工作空间）` | Continue 配置示例 |
| `rules-for-copilot/` | `（示例工作空间）` | Copilot 配置示例 |
| `rules-for-custom-adapters/` | `（示例工作空间）` | 自定义适配器示例 |
| `rules-for-default/` | `（示例工作空间）` | 默认配置示例 |
| `rules-generate-test/` | `（示例工作空间）` | 生成测试示例 |

## 📊 统计汇总

| 分类 | 工作空间数 | 测试文件数 | 共享测试数 |
|-----|-----------|-----------|-----------|
| Commands | 6 | 5 | 1 (addSource) |
| Adapters | 3 | 3 | 0 |
| Scenarios | 10 | 8 | 2 (isolation, switching) |
| Workflows | 10 | 10 | 0 |
| Rules | 5 | 0 | - |
| **总计** | **34** | **26** | **3** |

## 🔍 共享测试说明

### 1. addSource-shared.test.ts
- **工作空间**: 
  - `commands-addSource-empty` - 空工作空间场景
  - `commands-addSource-existing` - 已有源场景
- **共享原因**: 测试相同命令的不同初始状态

### 2. scenarios-workspaceIsolation-shared.test.ts
- **工作空间**:
  - `scenarios-workspaceIsolation-ws1` - 工作空间 1
  - `scenarios-workspaceIsolation-ws2` - 工作空间 2
- **共享原因**: 测试工作空间隔离需要两个工作空间配合

### 3. scenarios-workspaceSwitching-shared.test.ts
- **工作空间**:
  - `scenarios-workspaceSwitching-ws1` - 工作空间 1
  - `scenarios-workspaceSwitching-ws2` - 工作空间 2
- **共享原因**: 测试工作空间切换需要两个工作空间配合

## ✅ 重组优势

1. **命名一致性**: 文件名直接对应工作空间名
2. **分类清晰**: 通过前缀快速识别类别
3. **易于查找**: 一对一映射关系明确
4. **减少冗余**: 合并了重复的测试文件
5. **可维护性**: 新增测试遵循统一规范

## 📝 运行测试

### 运行单个类别
```bash
# Commands
pnpm test:suite:mocha --grep "Commands"

# Adapters
pnpm test:suite:mocha --grep "Adapters"

# Scenarios
pnpm test:suite:mocha --grep "Scenarios"

# Workflows
pnpm test:suite:mocha --grep "Workflows"
```

### 运行特定测试文件
```bash
# 使用文件路径
TEST_FILE=commands/commands-contextMenu pnpm test:suite:mocha:file

# 使用工作空间名
TEST_FILE=workflows/workflows-cursor pnpm test:suite:mocha:file
```

---

*此文档需要与 `test.code-workspace` 和 `src/test/suite/**` 保持同步。*
