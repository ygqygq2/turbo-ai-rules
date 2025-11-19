# 状态栏实施要点（StatusBarProvider）

对应源码：`src/providers/StatusBarProvider.ts`
目标：以简洁状态机反映扩展当前状态，点击打开侧边栏。

## 初始化优化

### 性能考虑

- **不在启动时同步**：避免影响 VSCode 启动性能
- **异步加载缓存**：从 `WorkspaceStateManager` 读取最后同步时间
- **立即显示状态**：基于缓存数据显示规则统计

### 加载流程

1. 构造函数创建状态栏，显示 "Loading..."
2. 异步调用 `loadLastSyncTime()` 从 workspace state 读取
3. 1 秒后转为 idle 状态，显示缓存的规则数和最后同步时间
4. 用户手动同步时才真正拉取更新

## 点击行为

- **点击状态栏**：直接打开侧边栏扩展视图（`workbench.view.extension.turbo-ai-rules`）
- **简化交互**：不再显示下拉菜单，直接跳转到扩展主界面
- **统一入口**：所有操作通过侧边栏完成

## 状态机

- 状态：`initializing | idle | syncing | success | error`。
- 转换：
  - `initializing → idle(1s)` - 初始化完成
  - `idle → syncing` - 开始同步
  - `syncing → success → idle(3s)` - 同步成功后短暂显示成功状态
  - `syncing → error → idle(10s)` - 同步失败后较长时间显示错误状态
- 进度：同步时显示 `current/total`，如 "Syncing 2/5"

## 状态显示

每种状态的图标和文本（紧凑格式）：

- **initializing**: `⏳ Loading...` - 沙漏表示加载中
- **idle**: `⚡ NR·MS` - 闪电表示快速/强大的工具
  - 示例：`⚡ 156R·2S` = 156 个规则，2 个启用源
  - 有冲突时：`⚠️ 156R·2S` - 警告图标
- **syncing**: `$(sync~spin) Syncing N/M` - 旋转同步图标（codicon）
- **success**: `✅ NR·MS` - 绿色勾表示成功（3 秒后转 idle）
- **error**: `$(error) Sync Failed` - 错误图标（10 秒后转 idle）

## Tooltip 提示

### Idle 状态

```
Turbo AI Rules

📚 Total Rules: 156
📦 Sources: 2/3 enabled
💾 Cache: 156
⚠️  Conflicts: 2  (如果有)

🕒 Last sync: 2m ago

Click to open Turbo AI Rules panel
```

### Syncing 状态

```
Syncing AI rules from configured sources

Progress: 2/3 sources
Current: company-rules
Operation: Syncing rules
```

### Success 状态

```
✓ Sync completed successfully

📚 Total Rules: 156
📦 Sources: 2/3 enabled
💾 Cache: 156

🕒 Just now

Click to open Turbo AI Rules panel
```

### Error 状态

```
Failed to sync AI rules. Click to retry or view details.
```

## 集成实现

### 单例模式

为了让其他命令能够访问状态栏实例，采用单例模式：

```typescript
export class StatusBarProvider {
  private static instance: StatusBarProvider | undefined;

  private constructor(private rulesManager: RulesManager) {
    // ...初始化代码
  }

  public static getInstance(rulesManager?: RulesManager): StatusBarProvider {
    if (!StatusBarProvider.instance) {
      if (!rulesManager) {
        throw new Error('RulesManager is required for first initialization');
      }
      StatusBarProvider.instance = new StatusBarProvider(rulesManager);
    }
    return StatusBarProvider.instance;
  }
}
```

### 命令集成

在 `syncRulesCommand` 中调用状态更新：

- **开始同步**：`setSyncStatus('syncing', { completed: 0, total: N })`
- **更新进度**：`setSyncStatus('syncing', { completed, total, currentSource, operation })`
- **同步成功**：`setSyncStatus('success')` - 3 秒后自动转 idle
- **同步失败**：`setSyncStatus('error')` - 10 秒后自动转 idle

### 状态流转

1. **初始化** → `initializing` (1 秒后自动转 `idle`)
2. **开始同步** → `idle` → `syncing` (显示进度信息)
3. **同步成功** → `syncing` → `success` (3 秒后自动转 `idle`)
4. **同步失败** → `syncing` → `error` (10 秒后自动转 `idle`)

## 注意事项

- 定时器清理防止内存泄漏。
- 长文案裁剪，Tooltip 展示完整信息。
- 错误与冲突使用主题警示色，辅助辨识。
- **单例模式保证全局唯一实例，命令可直接访问**。
- **状态更新调用贯穿整个同步流程，实时反映当前状态**。
