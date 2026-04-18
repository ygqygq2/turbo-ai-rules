# Workflows: Claude Composite

## 📋 测试目的

这个工作区用于验证 Claude 相关的复合资产工作流，重点覆盖：

- `claude-commands`
- `claude-agents`
- `claude-hooks`
- `claude-hooks-settings`

## ✅ 验证点

- 首次同步后可生成命令、Agent、Hook 脚本和 hook settings
- 关键产物路径符合资产语义，不只是“目录存在”
- 取消 hook 资产选择后，再生成会正确清理 `.claude/hooks` 并移除 settings 中的托管 hooks

## 🧪 对应测试文件

- `src/test/suite/workflows/workflows-claude-composite.test.ts`