# Workflows: Preset Single File

## 📋 测试信息

- **测试文件**: `src/test/suite/workflows/workflows-preset-single-file.test.ts`
- **测试目标**: 验证预设单文件适配器的完整工作流程（以 Cursor 为例）

## 🧪 测试场景

### 1. 完整端到端工作流
**测试**: `Should complete full end-to-end workflow`
- **步骤**:
  1. 添加新的 Git 规则源（动态添加，使用唯一 ID）
  2. 执行规则同步命令
  3. 等待规则加载完成
  4. 模拟用户全选规则
  5. 生成 `.cursorrules` 配置文件
- **验证**:
  - ✅ 源成功添加到配置
  - ✅ 规则成功同步并加载
  - ✅ `.cursorrules` 文件生成

### 2. 配置文件格式验证
**测试**: `Should generate correct .cursorrules format`
- **步骤**:
  1. 使用预配置的规则源
  2. 全选规则
  3. 生成 `.cursorrules` 文件
- **验证**:
  - ✅ 文件包含 `<!-- TURBO-AI-RULES:BEGIN -->` 标记
  - ✅ 文件包含 `<!-- TURBO-AI-RULES:END -->` 标记
  - ✅ BEGIN 和 END 标记各只出现一次
  - ✅ 文件内容长度 >100 字符

### 3. 增量同步
**测试**: `Should handle incremental sync`
- **步骤**:
  1. 第一次同步规则
  2. 记录规则数量
  3. 第二次增量同步
  4. 再次记录规则数量
- **验证**:
  - ✅ 增量同步后规则数量不变（不重复）

### 4. 空选择处理
**测试**: `Should handle empty selection gracefully`
- **步骤**:
  1. 清空规则选择
  2. 生成配置文件
- **验证**:
  - ✅ 系统正常处理空选择（不崩溃）
  - ✅ 生成空的或最小化的配置文件

## ⚙️ 工作空间配置

```json
{
  "turbo-ai-rules.sources": [
    {
      "id": "ai-rules",
      "gitUrl": "https://github.com/ygqygq2/ai-rules.git",
      "enabled": true
    }
  ],
  "turbo-ai-rules.adapters.custom": [
    {
      "id": "cursor-workflow",
      "outputPath": ".cursorrules",
      "isRuleType": true
    }
  ]
}
```

⚠️ **注意**: 当前使用自定义适配器进行测试，测试验证单文件输出格式（.cursorrules）

## 🎯 关键验证点

- ✅ 动态添加源不冲突（使用时间戳 ID）
- ✅ 规则同步完整性
- ✅ 配置文件格式正确
- ✅ 增量同步不重复
- ✅ 边界情况处理（空选择）

---
