# 配置管理策略实施：Workspace-Only 写入

---

## 背景与目标

### 问题分析

之前的配置管理实现存在以下问题：

1. **配置作用域不明确**：没有明确区分 Global 和 Workspace 配置的读写策略
2. **跨项目污染风险**：不清楚扩展是否会修改 Global 配置，可能影响其他项目

### 设计决策

**核心原则**：扩展只写入 Workspace 配置，读取时使用 VSCode 自动处理的优先级

**理由**：

1. **避免跨项目污染**：Workspace 配置是项目独立的，修改不影响其他项目
2. **用户灵活性**：用户可以手动在 Global 配置中添加通用规则源，供所有项目共享
3. **VSCode 最佳实践**：遵循官方扩展（如 ESLint）的配置管理模式
4. **安全性**：扩展权限范围限定在当前工作区，降低意外修改全局配置的风险
5. **简化实现**：利用 VSCode API 自动处理优先级，无需手动合并

---

## 实现要点

### 1. 配置读取策略（getSources）

**核心认知**：VSCode 的 `WorkspaceConfiguration.get()` **已经自动处理配置优先级**：

- Workspace Folder > Workspace > Global
- 多工作区场景下，通过 `resource` 参数自动选择正确的配置

**实现**：

```typescript
public getSources(resource?: vscode.Uri): RuleSource[] {
  const vscodeConfig = this.getVscodeConfig(resource);
  // VSCode 的 get() 已经自动处理优先级和多工作区场景
  const sources = vscodeConfig.get<RuleSource[]>('sources', []);
  return sources;
}
```

**关键点**：

- ✅ 使用 `get()` 直接获取，VSCode 自动处理优先级
- ✅ 通过 `resource` 参数支持多工作区
- ✅ 不需要手动 `inspect()` 和合并
- ✅ 代码简洁清晰

---

### 2. 添加源策略（addSource）

**流程**：

1. **重复检测**：检查 `getSources()` 返回的生效源（VSCode 已处理优先级）
2. **Workspace 写入**：只获取 `workspaceValue`，追加新源后写入 Workspace

**关键代码**：

```typescript
// 1. 检查当前生效的源（VSCode 已处理优先级）
const allSources = this.getSources();
const existing = allSources.find((s) => s.id === source.id);

if (existing) {
  throw new ConfigError(
    `Source "${existing.name}" (ID: ${source.id}) already exists. ` +
      `Please use a different repository or edit the existing source.`,
    ErrorCodes.CONFIG_MISSING_FIELD,
  );
}

// 2. 只获取 Workspace 层级的源进行追加
const inspection = vscodeConfig.inspect<RuleSource[]>('sources');
const workspaceSources = inspection?.workspaceValue || [];
const newSources = [...workspaceSources, source];

// 3. 写入 Workspace
await this.updateConfig('sources', newSources, false); // false = Workspace
```

**说明**：

- 重复检测用 `getSources()`（自动合并的结果）
- 写入时只操作 `workspaceValue`（避免影响 Global）

---

### 3. 更新源策略（updateSource）

**设计考虑**：

- 扩展**不修改** Global 配置中的源
- 如果源不在 Workspace 中，提示用户手动修改

**流程**：

1. 检查源是否存在（从 `getSources()` 获取）
2. 检查源是否在 `workspaceValue` 中
3. 如果不在 Workspace：**拒绝修改**，提示用户手动操作
4. 如果在 Workspace：执行更新

**关键代码**：

```typescript
// 1. 检查源是否存在
const allSources = this.getSources();
const existingSource = allSources.find(s => s.id === id);
if (!existingSource) {
  throw new ConfigError(`Source with ID '${id}' not found`, ...);
}

// 2. 检查是否在 Workspace
const inspection = vscodeConfig.inspect<RuleSource[]>('sources');
const workspaceSources = inspection?.workspaceValue || [];
const inWorkspace = workspaceSources.some(s => s.id === id);

// 3. 拒绝修改非 Workspace 源
if (!inWorkspace) {
  throw new ConfigError(
    `Source "${existingSource.name}" (ID: ${id}) is not in workspace settings. ` +
    `This extension only modifies workspace settings. ` +
    `Please edit the source manually via File > Preferences > Settings.`,
    ...
  );
}

// 4. 更新 Workspace 中的源
const updated = workspaceSources.map(s => s.id === id ? {...s, ...updates} : s);
await this.updateConfig('sources', updated, false);
```

---

### 4. 删除源策略（removeSource）

**设计原则**：同 `updateSource`，不操作 Global 配置

**流程**：

1. 检查源是否存在
2. 检查源是否在 Workspace
3. 如果不在 Workspace：提示手动删除
4. 如果在 Workspace：执行删除并清理 Token

**Token 清理**：

- 使用 Secret Storage 的 Token 在删除源时一并清理
- Token key 格式：`turboAiRules.token.${sourceId}`
  const allSources = this.getSources(); // 已包含 Global + Workspace 合并
  const existing = allSources.find((s) => s.id === source.id);

if (existing) {
// 判断重复源在哪个层级
const inspection = vscodeConfig.inspect<RuleSource[]>('sources');
const inWorkspace = inspection?.workspaceValue?.some((s) => s.id === sourceId);
const location = inWorkspace
? 'workspace settings (.vscode/settings.json)'
: 'global user settings';

throw new ConfigError(
`Source "${existing.name}" (ID: ${source.id}) already exists in ${location}. ` +
`Please use a different repository or edit the existing source.`,
ErrorCodes.CONFIG_MISSING_FIELD,
);
}

// 只写入 Workspace
const workspaceSources = inspection?.workspaceValue || [];
const newSources = [...workspaceSources, source];
await this.updateConfig('sources', newSources, false); // false = Workspace

````

---

### 3. 更新源策略（updateSource）

**设计考虑**：

- 扩展**不修改** Global 配置中的源
- 如果用户尝试更新 Global 源，提示手动修改

**流程**：

1. 检查源是否存在（从合并源中查找）
2. 判断源在 Global 还是 Workspace
3. 如果在 Global 但不在 Workspace：**拒绝修改**，提示用户手动操作
4. 如果在 Workspace：执行更新

**关键提示消息**：

```typescript
if (inGlobal && !inWorkspace) {
  throw new ConfigError(
    `Source "${existingSource.name}" (ID: ${id}) exists in global user settings. ` +
      `This extension only modifies workspace settings. ` +
      `Please edit global settings manually via File > Preferences > Settings.`,
    ErrorCodes.CONFIG_INVALID_FORMAT,
  );
}
````

---

### 4. 删除源策略（removeSource）

**设计原则**：同 `updateSource`，不操作 Global 配置

**流程**：

1. 检查源是否存在
2. 判断源在 Global 还是 Workspace
3. 如果只在 Global：提示手动删除
4. 如果在 Workspace：执行删除并清理 Token

**Token 清理**：

- 使用 Secret Storage 的 Token 在删除源时一并清理
- Token key 格式：`turboAiRules.token.${sourceId}`

---

## 用户影响

### 1. 配置文件变化

**Workspace Settings** (`.vscode/settings.json`)：

- 扩展会写入和修改此文件
- 建议加入版本控制（如果需要团队共享配置）

**Global Settings**：

- 扩展**不会**修改此文件
- 用户可以手动添加通用规则源，供所有项目共享
- Global 中的源会被 VSCode 自动合并到项目配置中

### 2. UI 交互变化

**添加源**：

- 检查生效源（VSCode 已合并 Global + Workspace）
- 如果源已存在，提示用户"使用不同的仓库或编辑现有源"

**编辑/删除源**：

- 只能操作 Workspace 中的源
- 如果源不在 Workspace（说明来自 Global），提示用户手动操作

### 3. 配置优先级行为

**VSCode 自动处理优先级**：

- Workspace Folder > Workspace > Global
- 用户无需关心合并逻辑，扩展使用 `get()` 即可获取最终生效的配置

**示例场景**：

- Global Settings 包含源 A、B
- Workspace Settings 包含源 C
- **最终显示**：A + B + C（VSCode 自动合并）
- **用户添加源 D**：只写入 Workspace，不影响 Global

---

## 测试建议

### 单元测试（ConfigManager.test.ts）

1. **getSources 基本功能**：

   - Mock `vscodeConfig.get()` 返回测试数据
   - 验证返回结果符合预期

2. **addSource 重复检测**：

   - 源已存在 → 抛出错误
   - 源不存在 → 成功添加到 Workspace
   - 验证 `updateConfig` 调用参数正确（target = Workspace）

3. **updateSource 权限检查**：

   - 源不在 Workspace → 拒绝修改，提示手动操作
   - 源在 Workspace → 成功更新
   - 验证只操作 `workspaceValue`

4. **removeSource 权限检查**：

   - 源不在 Workspace → 拒绝删除，提示手动操作
   - 源在 Workspace → 成功删除并清理 Token

### 集成测试（manageSource.spec.ts）

1. **UI 交互流程**：

   - 添加源 → 验证写入 .vscode/settings.json
   - 手动在 Global 添加源 → 验证扩展可见但不可修改

2. **错误提示验证**：
   - 添加重复源 → 验证错误消息
   - 尝试编辑 Global 源 → 验证提示手动操作

---

## 后续优化

1. **UI 可视化区分**：

   - TreeView 中用图标区分 Global 和 Workspace 源
   - 例如：🌍 Global 源（只读），📁 Workspace 源（可编辑）

2. **批量操作提示**：

   - 批量删除时，如果包含 Global 源，提示用户手动处理

3. **配置迁移工具**：

   - 提供命令将 Global 源复制到 Workspace（方便团队共享）

4. **文档更新**：
   - 用户指南添加 Global vs Workspace 配置说明
   - FAQ 添加"为什么无法删除某个源"等常见问题

---

## 相关文件

### 修改的文件

- `src/services/ConfigManager.ts`：核心逻辑修改
  - `getSources()` - 使用 `get()` 直接获取，VSCode 自动处理优先级
  - `addSource()` - 检查生效源，只写入 Workspace
  - `updateSource()` - 只更新 Workspace 中的源
  - `removeSource()` - 只删除 Workspace 中的源

### 更新的文档

- `docs/development/01-04-storage-strategy.md`：存储策略设计文档

  - 添加"## 2. 规则源配置管理"章节
  - 详细说明读写策略

- `.github/copilot-instructions.md`：开发规范
  - 更新"存储策略"章节
  - 明确 Workspace-only 写入原则

### 新增的文档

- `docs/development/implementation/01-config-workspace-only-write.md`：本实施文档

---

## 验证清单

- [x] `getSources()` 使用 `get()` 直接获取（VSCode 自动处理优先级）
- [x] `addSource()` 检查生效源，只写入 Workspace
- [x] `updateSource()` 只操作 Workspace 中的源，拒绝修改 Global 源
- [x] `removeSource()` 只删除 Workspace 中的源，拒绝删除 Global 源
- [x] `updateConfig()` 默认使用 Workspace 目标
- [x] 编译通过无错误（pnpm compile）
- [x] 日志记录关键操作
- [x] 设计文档同步更新
- [x] 开发规范同步更新
- [ ] 单元测试覆盖新逻辑（待实施）
- [ ] 集成测试验证 UI 交互（待实施）
- [ ] 用户文档更新（待实施）

---

## 总结

本次修改实现了清晰的配置管理策略：

- **读取**：使用 `get()` 直接获取，VSCode 自动处理优先级（Workspace Folder > Workspace > Global）
- **写入**：仅操作 Workspace，不修改 Global
- **用户体验**：错误消息明确告知操作限制和建议
- **简化实现**：不需要手动合并配置，利用 VSCode API 自动处理

这种策略符合 VSCode 扩展的最佳实践，同时保持代码简洁清晰。

## 总结

本次修改实现了清晰的配置管理策略：

- **读取**：合并 Global + Workspace，Workspace 优先
- **写入**：仅操作 Workspace，不修改 Global
- **用户体验**：错误消息明确告知源位置和操作建议
- **安全性**：降低扩展权限范围，避免意外修改全局配置

这种策略符合 VSCode 扩展的最佳实践，同时为用户提供了灵活的配置管理方式。
