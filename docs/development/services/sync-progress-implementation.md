# 同步进度与可取消操作（RulesManager）

对应源码：`src/services/RulesManager.ts`
目标：通过 VS Code Progress API 提供可取消的同步体验，并与状态栏联动。

## 核心实现

- 进度弹窗：`withProgress({ location: Notification, cancellable: true })`。
- 进度上报：`progress.report({ increment, message })`，按源计算百分比。
- 取消机制：检查 `token.isCancellationRequested`，及时中断并清理。
- 状态联动：同步更新 `StatusBarProvider`（状态与当前源）。

## 成功/失败反馈

- 成功：提供“查看规则/生成配置”操作按钮。
- 失败：提供“重试/查看日志/打开设置”。

## 注意事项

- 保证 finally 分支复位状态（避免悬挂为 syncing）。
- 捕获异常并写日志（含上下文：sourceId/count）。
- 长任务分段上报，避免 UI 卡顿。
