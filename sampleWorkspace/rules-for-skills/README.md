# Skills 适配器测试工作区

测试 Skills 适配器的同步和生成功能。

## 测试目标

1. 验证技能适配器能否正确生成到指定目录
2. 验证技能规则与普通规则的区分
3. 验证规则同步页能否选择技能适配器进行同步
4. 验证快速同步不同步到技能适配器

## 配置说明

### 规则源配置

添加包含技能规则的规则源：

```json
{
  "turboAiRules.sources": [
    {
      "id": "turbo-skills-source",
      "name": "Turbo AI Skills",
      "gitUrl": "https://github.com/ygqygq2/ai-rules.git",
      "branch": "main",
      "subPath": "1300-skills",
      "enabled": true
    }
  ]
}
```

### Skills 适配器配置

使用自定义适配器添加技能适配器：

```json
{
  "turboAiRules.adapters.custom": [
    {
      "id": "dev-skills",
      "name": "Development Skills",
      "enabled": true,
      "sourceId": "turbo-skills-source",
      "subPath": "",
      "outputPath": ".skills",
      "outputType": "directory",
      "isRuleType": false,
      "description": "开发技能包括 Python、TypeScript、调试和代码审查"
    }
  ]
}
```

## 测试步骤

### 1. 添加规则源

1. 打开仪表板或点击"添加规则源"
2. 输入包含技能规则的 Git 仓库 URL
3. 设置 `subPath` 为 `1300-skills`
4. 保存并同步

### 2. 配置 Skills 适配器

1. 打开"管理适配器"
2. 切换到"自定义适配器"标签
3. 点击"添加自定义适配器"
4. 配置 `isRuleType: false`、输出路径和描述
5. 启用该适配器

### 3. 测试规则同步页

1. 点击"规则同步页"按钮
2. 验证技能适配器出现在适配器列表中
3. 勾选技能适配器复选框
4. 点击"同步"按钮
5. 验证技能规则生成到指定路径

### 4. 测试快速同步

1. 点击"快速同步规则"命令
2. 验证技能适配器**未被**同步
3. 验证只有常规规则适配器（Copilot/Cursor/Continue）被更新

## 预期结果

### 规则同步页行为

- ✅ 可以看到技能适配器选项
- ✅ 可以勾选/取消勾选技能适配器
- ✅ 勾选时，同步会生成技能规则文件
- ✅ 取消勾选时，不会生成

### 快速同步行为

- ✅ 只同步到预设适配器（copilot/cursor/continue）和自定义规则适配器
- ✅ **不会**同步到技能适配器
- ✅ 状态栏显示正确的同步状态

### 文件生成

```
.skills/
├── 1303.md
├── 1304.md
└── ...
```

## 注意事项

1. **技能与规则的区别**：

   - 规则：编码标准、最佳实践，自动应用
   - 技能：可复用的代码片段、模板，按需调用

2. **同步策略差异**：

   - 规则同步页：用户明确选择，可以同步技能
   - 快速同步：只同步规则，排除技能

3. **输出路径建议**：
   - 技能文件应放在独立目录（如 `.skills/`）
   - 与规则文件（`.github/copilot-instructions.md` 等）分开管理

## 集成测试脚本

```bash
# 1. 打开测试工作区
code sampleWorkspace/rules-for-skills

# 2. 执行命令测试
# - 打开仪表板
# - 添加规则源
# - 配置技能适配器
# - 测试规则同步页
# - 测试快速同步

# 3. 验证生成的文件
ls -la .skills/
cat .skills/1303.md
```

## 相关文档

- [适配器设计文档](../../docs/development/21-adapter-design.md)
- [Skills 目录](../../ai-rules/1300-skills/)
- [自定义适配器设计](../../docs/development/23-custom-adapters-design.md)
- [规则同步页设计](../../docs/development/webview/规则同步页实施文档.md)
