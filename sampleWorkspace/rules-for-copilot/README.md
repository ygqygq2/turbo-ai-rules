# Rules for GitHub Copilot Adapter

## 📋 测试信息

- **测试文件**: `src/test/suite/（示例工作空间）`
- **测试内容**: GitHub Copilot 适配器配置示例和 HTTPS Token 认证测试

## 🧪 测试场景

### 1. HTTPS Token 私有仓库认证
**步骤**:
- 添加 HTTPS 私有仓库源
- 选择 "HTTPS Token" 认证
- 输入 Personal Access Token (PAT)
- 选择保存范围（Global 或 Project）

**验证**:
- ✅ Token 认证成功
- ✅ 访问私有仓库
- ✅ Token 安全存储（VSCode Secrets API）
- ✅ 规则同步完成

### 2. Copilot 指令文件生成
**步骤**:
- 同步规则
- 生成 `.github/copilot-instructions.md`

**验证**:
- ✅ 文件生成在 .github 目录
- ✅ Markdown 格式正确
- ✅ 包含所有规则内容
- ✅ 符合 GitHub Copilot 规范

### 3. Token 安全管理
**步骤**:
- 保存 Token 到 Global 范围
- 检查日志输出

**验证**:
- ✅ Token 不出现在日志
- ✅ 使用 VSCode Secrets API
- ✅ 跨工作区共享（Global 模式）
- ✅ 工作区隔离（Project 模式）

## ⚙️ 工作空间配置

```json
{
  "turbo-ai-rules.sources": [
    {
      "id": "copilot-test",
      "name": "Copilot Test Source",
      "gitUrl": "https://github.com/user/private-repo.git",
      "branch": "main",
      "authType": "https",
      "enabled": true
    }
  ],
  "turbo-ai-rules.adapters.copilot.enabled": true
}
```

## 🎯 关键验证点

- ✅ HTTPS Token 认证流程
- ✅ Personal Access Token (PAT) 管理
- ✅ Token 安全存储（不记录日志）
- ✅ .github/copilot-instructions.md 生成
- ✅ Global vs Project 范围选择

---
