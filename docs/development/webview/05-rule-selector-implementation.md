# 05 - 规则选择器（Rule Selector）实施文档

本文记录 SuperDesign 生成的 HTML 如何集成到 VS Code 扩展，并说明与侧边栏 TreeView 的同步方案。

- 设计文档：`.superdesign/design_docs/05-rule-selector.md`
- UI 原型：`.superdesign/design_iterations/05-rule-selector_1.html`
- Provider：`src/providers/RuleSelectorWebviewProvider.ts`

## 集成要点

1. HTML 引入与 CSP

   - 生产版本 HTML 路径：`out/webview/src/webview/rule-selector/index.html`
   - 通过 `BaseWebviewProvider.getCspSource()` 注入 CSP 源，使用 `webview.asWebviewUri` 重写资源路径

2. 消息协议（与设计一致）

   - Webview → Extension：
     - `selectionChanged`：{ sourceId, selectedPaths }
     - `saveRuleSelection`：{ sourceId, selection: { paths: string[] } }
     - `loadRuleTree`：{ sourceId }（MVP 仅返回占位统计）
   - Extension → Webview：
     - `saveSuccess`：保存成功
     - `treeData`：占位统计或未来的真实树数据
     - `selectionUpdated`：返回已选统计

3. 数据持久化策略（已更正）

   - ⚠️ **重要**：规则选择数据存储在**全局缓存**，而非 workspaceState
   - 存储位置：`~/.cache/.turbo-ai-rules/workspaces/<hash>/rule-selections.json`
   - 原因：选择数据可能包含数百条文件路径（40KB+），超过 workspaceState 的 10KB 限制
   - 接口：`WorkspaceDataManager` 提供 `getRuleSelection / setRuleSelection / deleteRuleSelection` 等方法
   - 数据结构：
     ```typescript
     {
       version: 1,
       workspacePath: '/path/to/workspace',
       lastUpdated: '2024-01-01T00:00:00.000Z',
       selections: {
         'source-id': {
           mode: 'include', // or 'exclude'
           paths: ['path1', 'path2'],
           excludePaths?: ['exclude1']
         }
       }
     }
     ```

4. 与侧边栏同步
   - MVP：保存/变更后执行命令 `turbo-ai-rules.refresh` 触发 `RulesTreeProvider` 刷新
   - P1：TreeView 增加复选框后，通过 `treeSelectionSync` 双向同步（见设计文档第 12 节）

## 代码变更

- `src/providers/RuleSelectorWebviewProvider.ts`

  - 实现 `handleMessage`：处理 `selectionChanged`、`saveRuleSelection`、`loadRuleTree`
  - **已更正**：使用 `WorkspaceDataManager` 而非 `WorkspaceStateManager`
  - 写入全局缓存并刷新 TreeView
  - 错误码：写入失败 `TAI-5003`

- `src/services/WorkspaceDataManager.ts`

  - 新增接口：`RuleSelection`、`RuleSelections`
  - 新增方法：`readRuleSelections()`、`writeRuleSelections()`、`getRuleSelection(sourceId)`、`setRuleSelection(workspacePath, sourceId, selection)`、`deleteRuleSelection(sourceId)`
  - `clearWorkspaceData()` 增加清理 `rule-selections.json`

- `src/services/WorkspaceStateManager.ts`

  - **已移除**：`uiState.ruleSelections` 字段（规则选择不再存储在 workspaceState）
  - **已移除**：`getRuleSelection / setRuleSelection / deleteRuleSelection / getAllRuleSelections` 方法

- `.superdesign/design_docs/05-rule-selector.md`

  - 调整快捷操作与截图一致（全选/清除/重置）
  - 新增第 12 节：与侧边栏同步
  - 扩展消息协议与状态反馈

- `.superdesign/design_docs/05-tree-view.md`

  - 新增"与 Rule Selector 的同步"章节

- `.superdesign/design_iterations/05-rule-selector_1.html`
  - 调整工具栏按钮与统计数字
  - 在树区域增加"规则树区域，待实现"占位说明

## 测试要点

- 触发 `selectionChanged` 能够写入全局缓存（检查 `~/.cache/.turbo-ai-rules/workspaces/<hash>/rule-selections.json`）
- 调用 `saveRuleSelection` 后能收到 `saveSuccess` 且侧边栏刷新
- 当路径数组非常大时能够正确保存（无 workspaceState 大小限制）
- 工作区删除后，对应的 `rule-selections.json` 会被 `clearWorkspaceData()` 清理

## 后续计划

- 增加真实的仓库扫描与目录树构建（基于 GitManager 的本地缓存目录）
- RulesTreeProvider 增加文件/目录复选框并支持三态
- 增加单元测试：WorkspaceDataManager 的规则选择读写、Provider 消息处理
