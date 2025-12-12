# 适配器配置格式迁移说明

> **版本**: 下个版本引入新配置格式  
> **兼容性**: 保持 3 个版本兼容（计划在发布后 3 个版本内支持旧格式）  
> **废弃时间**: 发布 3 个版本后将移除旧格式支持

---

## 📋 背景

为了支持配置驱动的预设适配器架构，适配器配置格式进行了优化。新格式采用嵌套对象方式，避免为每个新适配器都需要在 package.json 中定义配置项。

---

## 🔄 配置格式变更

### 旧格式（当前版本及之前）

```jsonc
{
  "turbo-ai-rules.adapters.cursor.enabled": true,
  "turbo-ai-rules.adapters.cursor.autoUpdate": false,
  "turbo-ai-rules.adapters.copilot.enabled": true,
  "turbo-ai-rules.adapters.copilot.autoUpdate": false,
  "turbo-ai-rules.adapters.continue.enabled": false,
  "turbo-ai-rules.adapters.continue.autoUpdate": true,
  "turbo-ai-rules.adapters.custom": []
}
```

**缺点**:

- 每增加一个预设适配器，都需要修改 package.json
- 配置项数量随适配器增加而线性增长
- 不支持动态扩展

### 新格式（下个版本开始）

```jsonc
{
  "turbo-ai-rules.adapters": {
    "cursor": {
      "enabled": true,
      "autoUpdate": false
    },
    "copilot": {
      "enabled": true,
      "autoUpdate": false
    },
    "continue": {
      "enabled": false,
      "autoUpdate": true
    },
    "windsurf": {
      "enabled": false
    },
    "cline": {
      "enabled": false
    }
    // 可动态添加新适配器，无需修改 package.json
  },
  "turbo-ai-rules.adapters.custom": []
}
```

**优点**:

- 配置驱动，添加新适配器无需修改 package.json
- 结构清晰，易于管理
- 支持动态扩展，从 3 个预设适配器扩展到 9 个

---

## 🛠️ 自动迁移机制

### 迁移时机

扩展在以下情况自动触发配置迁移：

1. **打开适配器管理页面时**: 调用 `getAdapterData()` 方法时检测并迁移
2. **检测到旧格式配置**: 仅迁移原有的 3 种预设适配器（cursor, copilot, continue）

### 迁移逻辑

```typescript
/**
 * 迁移旧配置格式到新格式
 * 仅迁移原有的3种预设适配器：cursor, copilot, continue
 *
 * @deprecated 此方法将在 v1.7.0 移除
 */
private async migrateOldAdapterConfig(
  vscodeConfig: vscode.WorkspaceConfiguration,
): Promise<void> {
  const legacyAdapters = ['cursor', 'copilot', 'continue'] as const;
  const currentAdapters = vscodeConfig.get<Record<string, any>>('adapters', {});

  for (const adapterId of legacyAdapters) {
    const oldEnabledKey = `adapters.${adapterId}.enabled`;
    const inspection = vscodeConfig.inspect(oldEnabledKey);

    // 如果存在旧格式配置，且新格式中不存在，则迁移
    if (inspection && !currentAdapters[adapterId]) {
      const enabled = inspection.workspaceFolderValue ??
                     inspection.workspaceValue ??
                     inspection.globalValue;

      if (enabled !== undefined) {
        currentAdapters[adapterId] = { enabled };
        needsMigration = true;
      }
    }
  }

  if (needsMigration) {
    await vscodeConfig.update('adapters', currentAdapters, target);
    // 显示一次性迁移提示
  }
}
```

### 迁移特点

- ✅ **自动执行**: 用户无感知，自动完成迁移
- ✅ **仅迁移一次**: 通过 `globalState` 记录已迁移状态
- ✅ **自动清理**: 迁移完成后自动删除旧配置键
- ✅ **非破坏性**: 仅在新格式不存在时才迁移
- ✅ **全作用域清理**: 清理 Workspace/WorkspaceFolder/Global 所有作用域的旧配置

---

## 📅 兼容性时间表

| 版本              | 状态       | 说明                       |
| ----------------- | ---------- | -------------------------- |
| **v1.3.x 及之前** | 旧格式     | 仅支持旧格式配置           |
| **v1.4.0**        | 引入新格式 | 同时支持新旧格式，自动迁移 |
| **v1.5.0**        | 兼容期     | 继续支持新旧格式           |
| **v1.6.0**        | 兼容期     | 继续支持新旧格式，废弃警告 |
| **v1.7.0**        | 移除旧格式 | 仅支持新格式，移除迁移代码 |

---

## 🔧 手动迁移指南

如果自动迁移未生效，可以手动修改配置：

### 步骤 1: 打开 settings.json

```bash
# Workspace 配置
.vscode/settings.json

# 或 User 配置
~/.config/Code/User/settings.json
```

### 步骤 2: 修改配置格式

**旧格式**:

```jsonc
{
  "turbo-ai-rules.adapters.cursor.enabled": true,
  "turbo-ai-rules.adapters.copilot.enabled": false
}
```

**新格式**:

```jsonc
{
  "turbo-ai-rules.adapters": {
    "cursor": { "enabled": true },
    "copilot": { "enabled": false }
  }
}
```

### 步骤 3: 重新加载窗口

按 `Ctrl+Shift+P`（macOS: `Cmd+Shift+P`），输入 "Reload Window" 重新加载编辑器。

**注意**: 旧配置键会在迁移时自动清理，无需手动删除。

---

## ⚠️ 注意事项

### 兼容性范围

- **仅迁移 3 种旧适配器**: cursor, copilot, continue
- **新增适配器**: windsurf, cline, roo-cline, aider, bolt, qodo-gen 直接使用新格式
- **自定义适配器**: `adapters.custom` 配置键保持不变

### 升级建议

1. **立即迁移**: 虽然会自动迁移，但建议手动检查确认
2. **删除旧配置**: 在 v1.7.0 之前，可以删除旧配置键，避免混淆
3. **测试验证**: 迁移后在适配器管理页面确认配置正确

### 常见问题

**Q: 新旧配置同时存在会怎样？**  
A: 新格式优先。如果 `adapters.cursor` 存在，则忽略 `adapters.cursor.enabled`

**Q: 旧配置会自动删除吗？**  
A: 不会。为保证兼容性，旧配置键不会被删除

**Q: v1.7.0 后旧配置还能用吗？**  
A: 不能。v1.7.0 会移除旧格式支持，需要使用新格式

---

## 📝 开发者注意事项

### 移除兼容代码计划（v1.7.0）

在 v1.7.0 版本时，需要执行以下清理工作：

1. **删除迁移方法**:

   ```typescript
   // 删除 AdapterManagerWebviewProvider.ts 中的:
   private async migrateOldAdapterConfig() { ... }
   ```

2. **移除 package.json 中的旧配置定义**:

   ```jsonc
   // 如果还存在，删除这些配置项：
   // "turbo-ai-rules.adapters.cursor.enabled"
   // "turbo-ai-rules.adapters.copilot.enabled"
   // "turbo-ai-rules.adapters.continue.enabled"
   ```

3. **更新文档**:
   - 移除兼容性说明
   - 更新配置示例
   - 添加 CHANGELOG 说明

### 代码标记

所有兼容性相关代码已使用 `@deprecated` 标记：

```typescript
/**
 * @deprecated 此方法将在 3 个版本后移除（计划在 v1.7.0 移除）
 */
private async migrateOldAdapterConfig() { ... }
```

---

**最后更新**: 2025-12-11  
**下次审查**: v1.6.0 发布时
