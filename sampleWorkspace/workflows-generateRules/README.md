# Workflows: Generate Rules Configuration

## 📋 测试信息

- **测试文件**: `src/test/suite/workflows/workflows-generateRules.test.ts`
- **测试目标**: 验证规则配置文件生成的完整流程

## 🧪 测试场景

### 1. 端到端生成流程
**步骤**:
- 确认规则源已同步
- 选择目标适配器（Cursor）
- 执行生成命令
- 等待文件写入完成

**验证**:
- ✅ .cursorrules 文件存在
- ✅ 文件内容正确（frontmatter + 规则）
- ✅ 显示成功提示
- ✅ StatusBar 更新状态

### 2. 多适配器并行生成
**步骤**:
- 启用 Cursor + Copilot + Continue
- 执行全局生成命令

**验证**:
- ✅ .cursorrules 生成
- ✅ .github/copilot-instructions.md 生成
- ✅ .continuerules 生成
- ✅ 三个文件内容独立正确

### 3. 空规则处理
**步骤**:
- 清空规则源
- 执行生成命令

**验证**:
- ✅ 显示警告 "无可用规则"
- ✅ 不生成空文件
- ✅ 引导用户添加源

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
  "turbo-ai-rules.adapters.cursor.enabled": true,
  "turbo-ai-rules.adapters.copilot.enabled": false,
  "turbo-ai-rules.adapters.continue.enabled": false
}
```

## 🎯 关键验证点

- ✅ 文件生成逻辑
- ✅ 多适配器支持
- ✅ 空规则处理
- ✅ 错误提示
- ✅ 进度显示

---
