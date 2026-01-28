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
| `adapters-custom/` | `adapters/adapters-custom.test.ts` | 自定义适配器 |
| `adapters-preset/` | `adapters/adapters-preset.test.ts` | 预设适配器 |
| `adapters-skills/` | `adapters/adapters-skills.test.ts` | 技能卡适配器 |

### 📂 Scenarios 类别 (10 个工作空间 → 8 个测试文件)

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

### 📂 Workflows 类别 (8 个工作空间 → 7 个测试文件)

| 工作空间 | 测试文件 | 说明 |
|---------|---------|------|
| `workflows-cursor/` | `workflows/workflows-cursor.test.ts` | Cursor 工作流 |
| `workflows-generateRules/` | `workflows/workflows-generateRules.test.ts` | 生成规则 |
| `workflows-multiSource/` | `workflows/workflows-multiSource.test.ts` | 多源管理 |
| `workflows-ruleSelection/` | `workflows/workflows-ruleSelection.test.ts` | 规则选择 |
| `workflows-skills/` | `workflows/workflows-skills.test.ts` | 技能卡流程 |
| `workflows-syncRules/` | `workflows/workflows-syncRules.test.ts` | 同步规则 |
| `workflows-userRules/` | `workflows/workflows-userRules.test.ts` | 用户规则 |
| `workflows-userSkills/` | `workflows/workflows-userSkills.test.ts` | 用户技能卡 |

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
| Workflows | 8 | 7 | 0 |
| Rules | 5 | 0 | - |
| **总计** | **32** | **23** | **3** |

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

*此文档由测试重组脚本自动生成和维护*
