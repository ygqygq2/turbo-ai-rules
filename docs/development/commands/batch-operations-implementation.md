# 批量操作实施要点（batchOperations）

对应源码：`src/commands/batchOperations.ts`
目标：批量启用/禁用/导出/删除规则。

## 命令

- `batchDisableRulesCommand`：路径加入 `ignorePatterns`，二次确认。
- `batchEnableRulesCommand`：从 `ignorePatterns` 移除，刷新配置。
- `batchExportRulesCommand`：导出 JSON（含完整元数据与内容）。
- `batchDeleteRulesCommand`：从磁盘删除，二次确认、错误捕获与日志。
- `selectAllRulesCommand` / `deselectAllRulesCommand`：选择管理辅助。

## 注意事项

- 空选择与大批量操作的边界处理（并发/节流/进度提示）。
- 所有写操作前显示模态确认；失败时提供重试与查看日志入口。
