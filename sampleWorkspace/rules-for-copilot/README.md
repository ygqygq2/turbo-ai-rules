# Copilot Rules Test Workspace

这是用于测试 GitHub Copilot 适配器的工作区。

## 测试场景

1. 添加带 HTTPS Token 的私有仓库
2. 同步规则并生成 `.github/copilot-instructions.md` 文件
3. 验证认证和文件生成

## 使用步骤

1. 打开命令面板
2. 运行 `Turbo AI Rules: Add Source`
3. 输入 HTTPS Git 仓库 URL (私有仓库)
4. 选择 "HTTPS Token" 认证
5. 输入 Personal Access Token
6. 选择保存范围（Global 或 Project）
7. 运行 `Turbo AI Rules: Sync Rules`
8. 检查生成的 `.github/copilot-instructions.md` 文件
