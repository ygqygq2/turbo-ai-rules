# 状态栏界面设计文档

## 页面概述

**页面名称**: Status Bar (状态栏)  
**页面类型**: VS Code StatusBarItem  
**实现文件**: `src/providers/StatusBarProvider.ts`  
**位置**: VS Code 窗口底部状态栏（右侧）

---

## 设计目标

- 📊 快速查看规则统计信息
- 🔄 显示当前同步状态
- ⚡ 提供快捷操作菜单
- ⚠️ 突出显示冲突和错误

---

## 视觉设计

### 状态显示

```
┌──────────────────────────────────────────────────────┐
│ ... | $(file-code) 156R·2/3S | $(warning) 156R·2/3S │
└──────────────────────────────────────────────────────┘
                ↑                        ↑
            状态栏项                  冲突警告
```

### 图标映射

| 状态           | 图标              | 文本示例        | 颜色     |
| -------------- | ----------------- | --------------- | -------- |
| `idle`         | `$(file-code)`    | 156R·2/3S       | 默认     |
| `syncing`      | `$(sync~spin)`    | Syncing 2/3     | 默认     |
| `success`      | `$(check)`        | 156R·2/3S       | 绿色     |
| `error`        | `$(error)`        | Sync Failed     | 红色背景 |
| `conflict`     | `$(warning)`      | 156R·2/3S       | 黄色背景 |
| `initializing` | `$(loading~spin)` | Initializing... | 默认     |

### 颜色方案

```typescript
// 正常状态
backgroundColor: undefined;
color: undefined; // 使用默认前景色

// 错误状态
backgroundColor: new vscode.ThemeColor('statusBarItem.errorBackground');
color: new vscode.ThemeColor('statusBarItem.errorForeground');

// 警告状态（冲突）
backgroundColor: new vscode.ThemeColor('statusBarItem.warningBackground');
color: new vscode.ThemeColor('statusBarItem.warningForeground');
```

---

## 状态机设计

### 状态转换流程

```
[Initializing]
    ↓
[Idle] ─────sync────→ [Syncing] ───┬─→ [Success] ───3s──→ [Idle]
  ↑                                 │
  └─────────────────────────────────┘
                                    ├─→ [Error] ───10s──→ [Idle]
                                    └─→ [Conflict] ──click──→ [Idle]
```

### 状态定义

```typescript
type StatusState = 'initializing' | 'idle' | 'syncing' | 'success' | 'error' | 'conflict';

interface StatusUpdate {
  state: StatusState;
  message?: string; // 自定义消息
  currentSource?: string; // 当前处理的源
  progress?: {
    current: number;
    total: number;
  };
}
```

---

## 快捷菜单设计

### 菜单结构

**Idle 状态菜单**:

```
┌─────────────────────────────────────────┐
│  $(sync) Sync Rules                     │
│  $(add) Add Source                      │
│  $(search) Search Rules                 │
│  $(file-code) Generate Configs          │
│  $(settings-gear) Manage Sources        │
│  $(graph) Show Statistics               │
│  $(question) Help & Documentation       │
└─────────────────────────────────────────┘
```

**Syncing 状态菜单**:

```
┌─────────────────────────────────────────┐
│  $(stop-circle) Cancel Sync             │
│  $(output) View Logs                    │
└─────────────────────────────────────────┘
```

**Error 状态菜单**:

```
┌─────────────────────────────────────────┐
│  $(refresh) Retry Sync                  │
│  $(output) View Logs                    │
│  $(settings-gear) Open Settings         │
│  $(question) Get Help                   │
└─────────────────────────────────────────┘
```

**Conflict 状态菜单**:

```
┌─────────────────────────────────────────┐
│  $(eye) View Conflicts                  │
│  $(check-all) Auto Resolve              │
│  $(search) Search Rules                 │
│  $(graph) Show Statistics               │
└─────────────────────────────────────────┘
```

### 菜单快捷键

| 菜单项           | 快捷键           |
| ---------------- | ---------------- |
| Sync Rules       | Ctrl+Shift+R     |
| Add Source       | Ctrl+Shift+A     |
| Search Rules     | Ctrl+Shift+Alt+F |
| Generate Configs | Ctrl+Shift+G     |

---

## 交互设计

### 点击行为

**单击**: 显示快捷菜单（根据当前状态）

**右键**: 显示完整菜单（包含更多选项）

### Tooltip 信息

**Idle 状态**:

```
AI Rules (156 total)
• 2/3 sources enabled
• Last sync: 2m ago
Click for more actions
```

**Syncing 状态**:

```
Syncing AI Rules (2/3)
• Current: company-rules
• Progress: 67%
Click to cancel
```

**Error 状态**:

```
Sync Failed
• Error: Connection timeout
• Source: company-rules
Click to retry
```

**Conflict 状态**:

```
⚠️ Rule Conflicts Detected (2)
• ts-naming vs react-naming
• Click to resolve
```

---

## 消息通知集成

### 同步成功通知

```
┌─────────────────────────────────────────────┐
│ ✓ Successfully synced 156 rules             │
│   [View Rules]  [Generate Configs]          │
└─────────────────────────────────────────────┘
```

### 同步失败通知

```
┌─────────────────────────────────────────────┐
│ ✗ Failed to sync: Connection timeout        │
│   [Retry]  [View Logs]  [Help]              │
└─────────────────────────────────────────────┘
```

### 冲突警告通知

```
┌─────────────────────────────────────────────┐
│ ⚠️  Found 2 rule conflicts                   │
│   [Resolve]  [View Details]  [Ignore]       │
└─────────────────────────────────────────────┘
```

---

## 状态更新接口

### 更新方法

```typescript
class StatusBarProvider {
  // 更新状态
  updateStatus(update: StatusUpdate): void;

  // 显示进度
  showProgress(current: number, total: number, message?: string): void;

  // 显示错误
  showError(message: string): void;

  // 显示成功
  showSuccess(message?: string): void;

  // 显示冲突
  showConflict(count: number): void;

  // 重置为 idle
  reset(): void;
}
```

### 使用示例

```typescript
// 开始同步
statusBar.updateStatus({
  state: 'syncing',
  progress: { current: 0, total: 3 },
});

// 更新进度
statusBar.showProgress(1, 3, 'Syncing company-rules');

// 同步成功
statusBar.showSuccess('Synced 156 rules');

// 3 秒后自动重置
setTimeout(() => statusBar.reset(), 3000);
```

---

## 动画效果

### 旋转图标

```typescript
// Syncing 状态使用 ~spin 修饰符
icon = '$(sync~spin)';

// Initializing 状态使用 ~spin 修饰符
icon = '$(loading~spin)';
```

### 状态过渡

```
状态变化时的视觉反馈:
1. 图标立即更新
2. 背景色淡入（200ms）
3. 文本淡入（200ms）
```

---

## 性能考虑

### 节流更新

```typescript
// 避免频繁更新
let updateTimeout: NodeJS.Timeout;

function throttleUpdate(update: StatusUpdate) {
  clearTimeout(updateTimeout);
  updateTimeout = setTimeout(() => {
    applyUpdate(update);
  }, 100); // 100ms 节流
}
```

### 自动清理

```typescript
// 成功状态 3 秒后自动重置
if (state === 'success') {
  setTimeout(() => this.reset(), 3000);
}

// 错误状态 10 秒后自动重置
if (state === 'error') {
  setTimeout(() => this.reset(), 10000);
}
```

---

## 与其他组件集成

### 与 TreeProvider 集成

- TreeProvider 刷新时更新规则数量
- 源变化时更新源计数

### 与 RulesManager 集成

- 同步开始/结束时更新状态
- 检测到冲突时显示警告

### 与命令集成

- 快捷菜单项调用对应命令
- 命令执行时更新状态

---

## 无障碍支持

```typescript
// 设置 Tooltip（屏幕阅读器可读）
statusBarItem.tooltip = 'AI Rules: 156 total, 2 of 3 sources enabled. Click for more actions.';

// 使用清晰的文本而非仅图标
statusBarItem.text = '$(file-code) 156 Rules'; // ✅
statusBarItem.text = '$(file-code)'; // ❌
```

---

## 性能指标

- **更新延迟**: < 50ms
- **菜单打开**: < 100ms
- **内存占用**: < 1MB

---

_设计版本: 2.0_  
_最后更新: 2025-10-27_
