# Workflows: User-Defined Rules

## 📋 测试信息

- **测试文件**: `src/test/suite/workflows/workflows-userRules.test.ts`
- **测试目标**: 验证用户自定义规则的管理和合并

## 🧪 测试场景

### 1. 创建用户规则
**步骤**:
- 在 .ai-rules/ 创建用户规则文件
- 编写 frontmatter + Markdown 内容
- 执行同步命令

**验证**:
- ✅ 用户规则被识别
- ✅ 自动分配唯一 ID
- ✅ TreeView 显示用户规则节点
- ✅ 与远程规则分组显示

### 2. 用户规则优先级
**步骤**:
- 用户规则和远程规则有相同 ID
- 执行生成配置

**验证**:
- ✅ 用户规则优先
- ✅ 覆盖远程规则
- ✅ 日志记录优先级决策

### 3. 用户规则热更新
**步骤**:
- 修改用户规则文件
- 保存文件

**验证**:
- ✅ 自动检测文件变化
- ✅ TreeView 自动刷新
- ✅ 无需手动同步

## ⚙️ 工作空间配置

```json
{
  "turbo-ai-rules.sources": [
    {
      "id": "ai-rules",
      "gitUrl": "https://github.com/ygqygq2/ai-rules.git",
      "branch": "main",
      "enabled": true
    }
  ],
  "turbo-ai-rules.userRules.enabled": true,
  "turbo-ai-rules.userRules.path": ".ai-rules"
}
```

## 🎯 关键验证点

- ✅ 用户规则识别
- ✅ 优先级策略
- ✅ 热更新
- ✅ 规则合并
- ✅ 文件监听

---
