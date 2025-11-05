# 状态栏实施要点（StatusBarProvider）

对应源码：`src/providers/StatusBarProvider.ts`
目标：以简洁状态机反映扩展当前状态并提供快捷入口。

## 状态机

- 状态：`initializing | idle | syncing | success | error | conflict`。
- 转换：
  - `syncing → success → idle(3s)`
  - `syncing → error → idle(10s)`
  - `conflict` 点击后回到 `idle`。
- 进度：显示当前源与 `current/total`。

## 快捷菜单

- Idle：同步、添加源、生成配置、搜索。
- Syncing：取消同步。
- Error：重试、查看日志、打开设置。
- Conflict：查看冲突、自动解决（占位）。

## 注意事项

- 定时器清理防止内存泄漏。
- 长文案裁剪，Tooltip 展示完整信息。
- 错误与冲突使用主题警示色，辅助辨识。
