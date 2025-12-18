# 规则同步页实施文档

## 概述

规则同步页 (`RuleSyncPageWebviewProvider`) 提供了一个统一的界面，允许用户选择规则和适配器并执行同步操作。

## 核心功能

### 1. 规则选择

- 支持多规则源的文件树展示
- 支持文件/目录级别的勾选
- 与左侧树视图的选择状态实时同步

### 2. 适配器选择

- 支持预置适配器（copilot、cursor、continue）
- 支持自定义适配器
- 规则类型与技能类型适配器互斥选择

### 3. 同步执行

- 只为用户选择的适配器生成配置文件
- 临时修改配置，避免影响其他功能
- 同步完成后恢复原始配置

## 关键实现

### 适配器过滤机制

**问题**：之前的实现中，`handleSyncInternal` 方法直接调用 `turbo-ai-rules.syncRules` 命令，导致为所有启用的适配器生成配置，而不是只为用户选择的适配器生成。

**解决方案**：

1. **临时配置**：在同步前创建临时适配器配置，只启用用户选择的适配器
2. **执行同步**：调用 `turbo-ai-rules.syncRules` 命令（此时只会为选中的适配器生成配置）
3. **恢复配置**：使用 `try-finally` 确保配置被正确恢复

```typescript
// 备份原始配置
const config = vscode.workspace.getConfiguration('turboAiRules');
const originalAdaptersConfig = config.get('adapters');

try {
  // 应用临时配置（只启用选中的适配器）
  await this.applyTemporaryAdapterConfig(adapters, workspaceFolders[0].uri);

  // 执行同步
  await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
} finally {
  // 恢复原始配置
  await config.update('adapters', originalAdaptersConfig, vscode.ConfigurationTarget.Workspace);
}
```

### 适配器配置处理

`applyTemporaryAdapterConfig` 方法负责创建临时配置：

- **预置适配器**：直接修改 `enabled` 属性
- **自定义适配器**：映射数组，修改每个适配器的 `enabled` 属性

## 消息协议

### RPC 方法

1. **getInitialData**: 获取初始数据（规则树、适配器列表）
2. **selectionChanged**: 通知选择变更
3. **sync**: 执行同步（传递 `rules` 和 `adapters` 数组）
4. **close**: 关闭页面

### 事件推送

1. **selectionChanged**: 选择状态变更（从扩展推送到 Webview）
2. **syncComplete**: 同步完成通知

## 测试要点

### 场景 1：单适配器同步

1. 选择规则 A
2. 选择适配器 copilot
3. 执行同步
4. **验证**：只为 copilot 生成配置，其他适配器配置不变

### 场景 2：多适配器同步

1. 选择规则 A、B
2. 选择适配器 copilot 和 cursor
3. 执行同步
4. **验证**：为 copilot 和 cursor 生成配置，continue 配置不变

### 场景 3：连续同步不同适配器

1. 第一次同步：选择规则 A，适配器 copilot
2. 第二次同步：选择规则 B，适配器 cursor
3. **验证**：
   - 第一次只为 copilot 生成配置
   - 第二次只为 cursor 生成配置
   - 配置文件内容正确（copilot 包含规则 A，cursor 包含规则 B）

### 场景 4：配置恢复

1. 修改适配器配置（启用/禁用某些适配器）
2. 执行同步
3. **验证**：同步完成后，适配器配置恢复到原始状态

## 已知问题

无

## 改进建议

1. **性能优化**：考虑批量更新配置，减少 I/O 操作
2. **用户体验**：同步过程中显示进度条，明确当前正在处理的适配器
3. **错误处理**：更详细的错误提示，区分不同类型的错误（配置错误、同步错误等）

## 相关文件

- Provider: `src/providers/RuleSyncPageWebview/RuleSyncPageWebviewProvider.ts`
- Store: `src/webview/rule-sync-page/store.ts`
- Component: `src/webview/rule-sync-page/App.tsx`
- Command: `src/commands/syncRules.ts`
- Service: `src/services/FileGenerator.ts`

## 更新历史

- 2025-12-18: 修复适配器过滤问题，确保只为选中的适配器生成配置
