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

**核心机制**：直接使用 VSCode API 的自动优先级处理

**优先级顺序**：

- Workspace Folder > Workspace > Global
- 多工作区场景下，通过 `resource` 参数自动选择正确的配置

**关键设计**：

- ✅ 使用 `WorkspaceConfiguration.get()` 直接获取最终生效的配置
- ✅ VSCode 自动处理多层级合并，无需手动 `inspect()` 和合并
- ✅ 支持多工作区场景（通过 resource 参数）
- ✅ 简化实现，避免手动优先级计算错误

---

### 2. 添加源策略（addSource）

**实现流程**：

1. **重复检测**：检查所有生效源（包括 Global + Workspace 合并后的结果）
2. **判断来源**：确定重复源位于哪个配置层级（用于错误提示）
3. **Workspace 写入**：只获取 Workspace 层级的现有源，追加新源后写入

**关键设计**：

- **读取全局状态**：使用 `getSources()` 检查重复（自动合并的结果）
- **只写 Workspace**：使用 `inspect().workspaceValue` 获取当前 Workspace 配置
- **避免污染**：不修改 Global 配置，只操作 Workspace
- **友好提示**：告知用户重复源所在位置（workspace 或 global）

---

### 3. 更新源策略（updateSource）

**设计原则**：

- 扩展**不修改** Global 配置中的源
- 如果源不在 Workspace 中，拒绝操作并提示用户手动修改

**实现流程**：

1. **存在性检查**：从所有生效源中查找目标源
2. **权限检查**：确认源是否在 Workspace 配置中
3. **拒绝跨界操作**：如果源仅在 Global 配置，抛出错误并引导用户
4. **执行更新**：只更新 Workspace 中的源

**关键设计**：

- **双重检查**：先确认存在，再确认位置
- **明确拒绝**：不修改 Global 配置，清晰告知用户原因
- **友好引导**：错误消息包含手动操作路径

---

### 4. 删除源策略（removeSource）

**设计原则**：与 `updateSource` 一致，不操作 Global 配置

**实现流程**：

1. **存在性检查**：确认源存在于生效配置中
2. **权限检查**：确认源在 Workspace 配置中
3. **拒绝跨界操作**：如果源仅在 Global，拒绝删除
4. **执行删除**：从 Workspace 配置中移除源
5. **清理关联数据**：删除 Secret Storage 中的 Token

**Token 清理机制**：

- Token 存储在 VSCode Secret Storage 中
- Key 格式：`turboAiRules.token.${sourceId}`
- 删除源时自动清理对应 Token，避免遗留敏感数据

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
- 如果源已存在，提示用户源所在位置（workspace 或 global）
- 引导用户选择不同仓库或编辑现有源

**编辑/删除源**：

- 只能操作 Workspace 中的源
- 如果源不在 Workspace（说明来自 Global），提示用户手动操作
- 错误消息明确告知操作路径（File > Preferences > Settings）

### 3. 配置优先级行为

**VSCode 自动处理优先级**：

- Workspace Folder > Workspace > Global
- 用户无需关心合并逻辑，扩展使用 `get()` 即可获取最终生效的配置

**典型场景**：

- Global Settings 包含源 A、B
- Workspace Settings 包含源 C
- **最终显示**：A + B + C（VSCode 自动合并）
- **用户添加源 D**：只写入 Workspace，不影响 Global

---

## 测试建议

### 单元测试覆盖点

**ConfigManager 核心方法测试**：

1. **getSources**：

   - 验证能正确获取合并后的配置
   - 验证多工作区场景下的资源参数处理

2. **addSource**：

   - 源已存在 → 抛出错误，消息包含位置信息
   - 源不存在 → 成功添加到 Workspace
   - 验证只操作 workspaceValue

3. **updateSource**：

   - 源不在 Workspace → 拒绝修改，提示手动操作
   - 源在 Workspace → 成功更新
   - 验证不影响 Global 配置

4. **removeSource**：
   - 源不在 Workspace → 拒绝删除，提示手动操作
   - 源在 Workspace → 成功删除并清理 Token
   - 验证 Secret Storage 清理

### 集成测试场景

**配置隔离测试**：

- 手动在 Global 添加源 → 验证扩展可见但不可修改
- 添加源到 Workspace → 验证写入 .vscode/settings.json
- 验证 Global + Workspace 正确合并

**错误提示测试**：

- 添加重复源 → 验证错误消息准确
- 尝试编辑 Global 源 → 验证提示手动操作路径

---

## 后续优化方向

1. **UI 可视化区分**：

   - TreeView 中用图标区分 Global 和 Workspace 源
   - 例如：🌍 Global 源（只读），📁 Workspace 源（可编辑）

2. **批量操作增强**：

   - 批量删除时，如果包含 Global 源，提示用户手动处理
   - 支持批量迁移 Global 源到 Workspace

3. **配置迁移工具**：

   - 提供命令将 Global 源复制到 Workspace（方便团队共享）
   - 支持导入/导出规则源配置

4. **文档完善**：
   - 用户指南添加 Global vs Workspace 配置说明
   - FAQ 添加"为什么无法删除某个源"等常见问题

---

## 相关文件

**核心实现**：

- `src/services/ConfigManager.ts` - 配置管理服务

**设计文档**：

- `docs/development/11-storage-strategy.md` - 存储策略设计
- `.github/copilot-instructions.md` - 开发规范

**测试文件**：

- `src/test/unit/services/ConfigManager.test.ts` - 单元测试
- `src/test/suite/manageSource.spec.ts` - 集成测试

---

## 总结

**核心策略**：

- **读取**：使用 `get()` 直接获取，VSCode 自动处理优先级
- **写入**：仅操作 Workspace，不修改 Global
- **安全**：降低扩展权限范围，避免跨项目污染
- **用户体验**：清晰的错误提示，引导手动操作

**设计优势**：

- 符合 VSCode 扩展最佳实践
- 代码简洁，无需手动合并配置
- 为用户提供灵活的配置管理方式
- 团队协作友好（Workspace 配置可共享）
