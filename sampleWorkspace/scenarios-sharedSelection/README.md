# Scenarios: Shared Rule Selection

## 📋 测试信息

- **测试文件**: `src/test/suite/scenarios/scenarios-sharedSelection.test.ts`
- **测试目标**: 验证多工作区共享规则选择状态

## 🧪 测试场景

### 1. 全局选中状态
**步骤**:
- 在工作区 A 选中规则
- 切换到工作区 B

**验证**:
- ✅ 工作区 B 也显示选中
- ✅ 共享 globalState
- ✅ TreeView 同步

### 2. 独立工作区选择
**说明**: 配置为工作区级别时

**步骤**:
- 设置 selection.scope = "workspace"
- 在不同工作区选择规则

**验证**:
- ✅ 各工作区选择独立
- ✅ 使用 workspaceState
- ✅ 互不干扰

## ⚙️ 工作空间配置

```json
{
  "turbo-ai-rules.selection.scope": "global"
}
```

## 🎯 关键验证点

- ✅ 全局状态
- ✅ 工作区状态
- ✅ 状态隔离
- ✅ UI 同步

---
