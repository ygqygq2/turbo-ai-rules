# 右键上下文菜单实施要点（Context Menu Commands）

对应源码：`src/commands/contextMenuCommands.ts`
目标：为源与规则项提供就地操作。

## 源操作

- editSourceConfig：打开配置文件并定位到目标源。
- testSourceConnection：使用 GitManager 测试连通性并提示结果。
- toggleSourceEnabled：切换启用状态并刷新视图。
- removeSource：删除源及其规则。

## 规则操作

- copyRuleContent：复制规则内容到剪贴板。
- exportRule：导出为 Markdown（含元数据）。
- ignoreRule：将路径加入 ignorePatterns。

## 菜单配置（package.json 要点）

- `view/item/context` + `when` 区分源/规则。
- `group` 控制分组与顺序，内联操作放 `inline`。

## 注意事项

- 所有命令捕获异常并 toast 友好提示。
- 日志记录关键上下文（sourceId/filePath），不含敏感信息。
