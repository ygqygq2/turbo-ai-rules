# Rules for Continue Adapter

## 📋 测试信息

- **测试文件**: `src/test/suite/（示例工作空间）`
- **测试内容**: Continue 适配器配置示例和 SSH 认证测试

## 🧪 测试场景

### 1. SSH 私有仓库认证
**步骤**:
- 确保已配置 SSH key (`~/.ssh/id_rsa` 或 `~/.ssh/id_ed25519`)
- 添加 SSH 仓库源 (git@github.com:user/repo.git)
- 选择 "SSH Key" 认证
- 选择 "Default SSH Key"

**验证**:
- ✅ SSH 认证成功
- ✅ 克隆私有仓库
- ✅ 规则同步完成

### 2. Continue 配置文件生成
**步骤**:
- 同步规则
- 生成 `.continue/config.json`

**验证**:
- ✅ 文件生成在 .continue 目录
- ✅ JSON 格式正确
- ✅ 包含所有规则内容
- ✅ 符合 Continue 规范

### 3. 递归解析测试
**步骤**:
- 源包含嵌套规则文件
- 执行同步

**验证**:
- ✅ 递归扫描子目录
- ✅ 所有规则被发现
- ✅ 路径正确解析

## ⚙️ 工作空间配置

```json
{
  "turbo-ai-rules.sources": [
    {
      "id": "continue-test",
      "name": "Continue Test Source",
      "gitUrl": "git@github.com:user/private-repo.git",
      "branch": "main",
      "authType": "ssh",
      "enabled": true
    }
  ],
  "turbo-ai-rules.adapters.continue.enabled": true
}
```

## 🎯 关键验证点

- ✅ SSH 认证流程
- ✅ 默认 SSH key 检测
- ✅ 私有仓库访问
- ✅ .continue/config.json 生成
- ✅ 递归规则解析

---
