# Commands: Add Source - Existing Sources

## 📋 测试信息

- **测试文件**: `src/test/suite/commands/addSource-shared.test.ts`
- **测试目标**: 验证在已有源的情况下添加新源

## 🧪 测试场景

### 1. 添加第二个源
**说明**: 工作空间已有一个源

**步骤**:
- 执行添加源命令
- 输入新源信息

**验证**:
- ✅ 新源添加成功
- ✅ 原有源配置保留
- ✅ TreeView 显示多个源
- ✅ StatusBar 更新源数量

### 2. 重复ID检测
**步骤**:
- 尝试添加已存在的源 ID

**验证**:
- ✅ 显示错误提示 "ID 已存在"
- ✅ 拒绝添加
- ✅ 引导输入不同 ID

### 3. 重复URL检测
**步骤**:
- 尝试添加已存在的 Git URL

**验证**:
- ✅ 显示警告提示
- ✅ 可选择覆盖或取消

## ⚙️ 工作空间配置

```json
{
  "turbo-ai-rules.sources": [
    {
      "id": "existing-source",
      "name": "Existing Source",
      "gitUrl": "https://github.com/user/existing.git",
      "branch": "main",
      "enabled": true
    }
  ]
}
```

## 🎯 关键验证点

- ✅ 多源管理
- ✅ ID 唯一性
- ✅ URL 去重
- ✅ 配置不丢失

---
