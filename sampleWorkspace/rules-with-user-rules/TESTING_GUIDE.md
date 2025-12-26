# 用户规则测试工作区

此工作区用于测试用户规则功能。

## 配置

在 `.vscode/settings.json` 中配置适配器启用用户规则：

```json
{
  "turbo-ai-rules.adapters.cursor": {
    "enabled": true,
    "userRules": {
      "enabled": true,
      "directory": "ai-rules"
    }
  }
}
```

## 用户规则

用户规则存放在 `ai-rules/` 目录中，包含：

- `my-project-rule.md` - 项目特定规则
- `team-conventions.md` - 团队编码约定

## 测试步骤

1. 添加规则源（远程仓库）
2. 同步规则
3. 生成配置文件
4. 检查生成的 `.cursorrules` 文件是否包含用户规则
