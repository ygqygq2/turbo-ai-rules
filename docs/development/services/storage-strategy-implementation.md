# 存储策略实施要点（Workspace\*Manager）

对应源码：

- `src/services/WorkspaceStateManager.ts`
- `src/services/WorkspaceDataManager.ts`

目标：项目根目录零污染；全局缓存隔离不同工作区；轻量化状态存储。

## 目录与路径

- 全局缓存根：`~/.cache/.turbo-ai-rules/`（跨平台封装 `resolveCachePath()`）。
- 工作区数据：`workspaces/<workspace-hash>/`（路径哈希前 16 位）。
- VS Code workspaceState：<10KB，UI/同步元数据。

## 核心 API

- WorkspaceStateManager：
  - `setLastSyncTime(sourceId, ISO)`、`setSourceHash()`；
  - UI 状态：展开节点/选中源/排序/过滤；
  - LRU 队列（最大 100），越界自动清理。
- WorkspaceDataManager：
  - `writeRulesIndex()/readRulesIndex()`；
  - `writeSearchIndex()/readSearchIndex()`；
  - `addArtifact()` 记录生成清单。

## 集成点

- `extension.ts` 激活时初始化工作区目录与清理失效源。
- `ConfigManager.removeSource()` 同步清理 Secret token。
- 后续：FileGenerator 记录生成清单；RulesManager 读写索引。

## 注意事项

- workspaceState 超过阈值发警告，超过上限拒写并清理。
- 严禁在日志输出 token/路径明细（安全）。
- 旧 `.turbo-ai-rules/` 目录标记废弃，不再使用。
