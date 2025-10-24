# Continue Rules Test Workspace

这是用于测试 Continue 适配器的工作区。

## 测试场景

1. 添加 SSH 私有仓库（使用默认 SSH key）
2. 同步规则并生成 `.continue/config.json` 文件
3. 验证 SSH 认证和递归解析

## 使用步骤

1. 确保已配置 SSH key (`~/.ssh/id_rsa` 或 `~/.ssh/id_ed25519`)
2. 打开命令面板
3. 运行 `Turbo AI Rules: Add Source`
4. 输入 SSH Git 仓库 URL (git@github.com:user/repo.git)
5. 选择 "SSH Key" 认证
6. 选择 "Default SSH Key"
7. 运行 `Turbo AI Rules: Sync Rules`
8. 检查生成的 `.continue/config.json` 文件
