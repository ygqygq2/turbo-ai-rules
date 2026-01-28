# Scenarios: Workspace Isolation (Workspace 1)

## 📋 测试信息

- **测试文件**: `src/test/suite/scenarios/scenarios-workspaceIsolation-shared.test.ts`
- **测试目标**: 验证工作区配置隔离 - 工作区 1

## 🧪 测试场景

### 1. 独立配置
**步骤**:
- 检查当前工作区配置

**验证**:
- ✅ 配置仅影响本工作区
- ✅ 不影响工作区 2
- ✅ 使用独立缓存目录

### 2. 独立规则源
**验证**:
- ✅ 工作区 1 有特定规则源
- ✅ 与工作区 2 不同

## ⚙️ 工作空间配置

```json
{
  "turbo-ai-rules.sources": [
    {
      "id": "ws1-source",
      "name": "Workspace 1 Source",
      "gitUrl": "https://github.com/user/ws1-rules.git",
      "branch": "main",
      "enabled": true
    }
  ]
}
```

## 🎯 关键验证点

- ✅ 配置隔离
- ✅ 缓存隔离
- ✅ 源独立
- ✅ 互不干扰

## 📝 相关说明

- 需与 scenarios-workspaceIsolation-ws2 配合测试

---
