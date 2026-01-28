# Workflows: Multi-Source Management

## 📋 测试信息

- **测试文件**: `src/test/suite/workflows/workflows-multiSource.test.ts`
- **测试目标**: 验证多规则源场景下的源管理、同步、配置生成和冲突处理

## 🧪 测试场景

### 1. 添加多个规则源
**步骤**:
- 添加源 1: ygqygq2/ai-rules (main 分支)
- 添加源 2: user/custom-rules (dev 分支)
- 验证两个源都添加成功

**验证**:
- ✅ 两个源配置正确保存
- ✅ TreeView 显示两个源节点
- ✅ StatusBar 显示源数量

### 2. 同步所有源
**步骤**:
- 执行全局同步命令
- 等待所有源同步完成

**验证**:
- ✅ 源 1 规则克隆成功
- ✅ 源 2 规则克隆成功
- ✅ 缓存目录包含两份规则
- ✅ 进度提示正确显示

### 3. 生成合并配置
**步骤**:
- 选择 Cursor 适配器
- 执行生成命令

**验证**:
- ✅ .cursorrules 文件生成
- ✅ 包含源 1 的规则
- ✅ 包含源 2 的规则
- ✅ 规则按优先级排序
- ✅ 源注释正确标注

### 4. ID 冲突检测
**步骤**:
- 模拟两个源包含相同 ID 的规则
- 执行同步和生成

**验证**:
- ✅ 检测到 ID 冲突
- ✅ 显示冲突警告
- ✅ 后添加的源优先（或可配置策略）

## ⚙️ 工作空间配置

```json
{
  "turbo-ai-rules.sources": [
    {
      "id": "ai-rules",
      "name": "AI Rules",
      "gitUrl": "https://github.com/ygqygq2/ai-rules.git",
      "branch": "main",
      "enabled": true
    },
    {
      "id": "custom-rules",
      "name": "Custom Rules",
      "gitUrl": "https://github.com/user/custom-rules.git",
      "branch": "dev",
      "enabled": true
    }
  ],
  "turbo-ai-rules.adapters.cursor.enabled": true
}
```

## 🎯 关键验证点

- ✅ 多源并存
- ✅ 源独立同步
- ✅ 规则合并
- ✅ ID 冲突处理
- ✅ 优先级排序
- ✅ 源标注

---
