# Default Rules Test Workspace

这是用于测试通用规则适配器（RulesAdapter）的工作区。

## 测试场景

1. 添加带自定义 SSH key 的私有仓库
2. 配置 subPath 为 `/docs` 或 `/rules`
3. 测试递归解析（深度 6，最大 500 文件）
4. 验证 `rules/` 目录生成

## 使用步骤

1. 准备自定义 SSH key（如 `~/.ssh/id_ed25519_custom`）
2. 打开命令面板
3. 运行 `Turbo AI Rules: Add Source`
4. 输入 SSH Git 仓库 URL
5. 配置 subPath 为 `/rules` 或其他路径
6. 选择 "SSH Key" 认证
7. 选择 "Custom SSH Key"
8. 输入 SSH key 路径
9. 运行 `Turbo AI Rules: Sync Rules`
10. 检查生成的 `rules/<sourceId>/<ruleId>.md` 文件和 `rules/index.md`

## 预期结果

- `rules/` 目录包含所有源的规则文件
- 每个源有独立的子目录
- 生成 `rules/index.md` 索引文件
- 递归解析所有子目录（最多 6 层）
