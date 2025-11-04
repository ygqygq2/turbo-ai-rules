# 存储策略设计

> 本文档描述 Turbo AI Rules 的数据存储策略、目录结构和文件管理方案。

---

## 1. 设计原则

### 1.1 核心理念

**项目目录零污染**：

- ✅ 不在项目目录创建任何隐藏目录（如 `.ai-rules/`）
- ✅ 不创建任何缓存文件或索引文件
- ✅ 只生成 AI 工具所需的配置文件（可提交到 git）

**全局缓存集中管理**：

- ✅ 所有规则源 Git 仓库存储在全局缓存
- ✅ 所有工作区索引数据存储在全局缓存（按路径哈希隔离）
- ✅ 统一管理，方便清理和维护

**轻量级状态管理**：

- ✅ VSCode workspaceState 只存储轻量级元数据（< 10KB）
- ✅ 高频读写的小数据（同步时间、UI 状态）
- ✅ 自动按工作区隔离，无需手动管理

### 1.2 存储层次

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: 全局缓存 - 规则源（多工作区共享）            │
│  位置: ~/.cache/.turbo-ai-rules/sources/               │
│  内容: Git 仓库 + 规则全文                            │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 2: 全局缓存 - 工作区数据（按路径哈希隔离）      │
│  位置: ~/.cache/.turbo-ai-rules/workspaces/<hash>/     │
│  内容: 规则索引 + 搜索索引 + 生成清单                 │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 3: workspaceState（VSCode 内部，轻量级）        │
│  内容: 同步元数据 + UI 状态 + 缓存元数据（< 10KB）    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 4: 项目根目录（AI 配置文件）                    │
│  位置: .cursorrules, .github/copilot-instructions.md   │
│  内容: 生成的 AI 工具配置（可提交到 git）             │
└─────────────────────────────────────────────────────────┘
```

---

---

## 2. 全局缓存目录结构

### 2.1 完整目录树

```
~/.cache/.turbo-ai-rules/
├── sources/                          # 规则源（多工作区共享）
│   ├── source-id-1/
│   │   ├── .git/                     # Git 仓库数据
│   │   ├── rules/                    # 规则文件（按源仓库结构）
│   │   │   ├── typescript.mdc
│   │   │   └── react.mdc
│   │   └── meta.json                 # 规则源元数据
│   └── source-id-2/
│       └── ...
│
└── workspaces/                       # 工作区数据（按路径哈希隔离）
    ├── a1b2c3d4e5f6g7h8/             # 工作区 A 的哈希
    │   ├── rules.index.json          # 规则索引
    │   ├── search.index.json         # 搜索索引
    │   └── generation.manifest.json  # 生成清单
    └── h8g7f6e5d4c3b2a1/             # 工作区 B 的哈希
        └── ...
```

### 2.2 规则源目录 (sources/)

**用途**：存储从 Git 克隆的规则源完整数据

**特点**：

- 多工作区共享，避免重复克隆
- 独立目录，互不影响
- 手动清理或通过命令清理

**meta.json 示例**：

```json
{
  "sourceId": "typescript-rules",
  "gitUrl": "https://github.com/example/ts-rules.git",
  "branch": "main",
  "subPath": "/rules",
  "lastSyncedAt": "2025-01-23T10:00:00Z",
  "schemaVersion": 1
}
```

### 2.3 工作区目录 (workspaces/)

**用途**：存储特定工作区的索引和生成清单

**隔离策略**：

- 工作区路径 → SHA256 哈希前 16 位 → 目录名
- 不同工作区自动隔离，无冲突
- 路径变化（移动项目）不影响数据关联

**哈希计算（伪代码）**：

```
function getWorkspaceHash(workspacePath: string): string {
  normalized = normalize(resolve(workspacePath))  // 规范化路径
  hash = sha256(normalized)                       // 计算 SHA256
  return hash.substring(0, 16)                    // 取前 16 位
}
```

**数据文件**：

#### rules.index.json（规则索引）

```json
{
  "version": 1,
  "workspacePath": "/path/to/project",
  "lastUpdated": "2025-01-23T10:00:00Z",
  "rules": [
    {
      "id": "ts-best-practices",
      "title": "TypeScript 最佳实践",
      "sourceId": "typescript-rules",
      "tags": ["typescript", "best-practices"],
      "priority": 10,
      "hash": "abc123"
    }
  ]
}
```

**用途**：规则摘要，用于快速列表和过滤

#### search.index.json（搜索索引）

```json
{
  "version": 1,
  "lastUpdated": "2025-01-23T10:00:00Z",
  "keywords": {
    "typescript": ["ts-best-practices", "ts-config"],
    "react": ["react-hooks", "react-performance"]
  },
  "tags": {
    "best-practices": ["ts-best-practices"],
    "performance": ["react-performance"]
  }
}
```

**用途**：倒排索引，用于关键词搜索

#### generation.manifest.json（生成清单）

```json
{
  "version": 1,
  "workspacePath": "/path/to/project",
  "lastGenerated": "2025-01-23T10:00:00Z",
  "artifacts": [
    {
      "path": ".cursorrules",
      "sha256": "abc123...",
      "size": 15234,
      "policy": "overwrite",
      "adapter": "cursor",
      "generatedAt": "2025-01-23T10:00:00Z"
    },
    {
      "path": ".github/copilot-instructions.md",
      "sha256": "def456...",
      "size": 8912,
      "policy": "overwrite",
      "adapter": "copilot",
      "generatedAt": "2025-01-23T10:00:00Z"
    }
  ]
}
```

**用途**：

- 追踪生成的文件及其元数据
- 检测文件是否被手动修改（哈希不匹配）
- 决定是否需要重新生成

---

## 3. workspaceState 轻量级存储

### 3.1 设计原则

**核心理念**：

- 仅存储高频读写、小体积的元数据和状态
- 总大小严格控制在 **10KB 以内**
- 数据丢失不影响功能，仅影响 UI 便利性

**适合存储的数据**：

- ✅ 最近同步时间（每个源）
- ✅ UI 展开/折叠状态
- ✅ 用户选择偏好（排序方式等）
- ✅ 缓存元数据（LRU 队列）

**不适合存储的数据**：

- ❌ 规则源配置（存 settings.json）
- ❌ 规则索引（存全局缓存）
- ❌ 规则全文（存全局缓存）
- ❌ 搜索索引（存全局缓存）

### 3.2 数据结构定义

```typescript
/**
 * workspaceState 完整数据结构
 * 严格控制大小：< 10KB
 */
interface WorkspaceState {
  /** 同步元数据（< 2KB） */
  syncMetadata: {
    lastSyncTime: { [sourceId: string]: string }; // ISO 时间戳
    sourceHashes: { [sourceId: string]: string }; // 内容哈希
  };

  /** UI 状态（< 2KB） */
  uiState: {
    expandedNodes: string[]; // TreeView 展开节点
    selectedSource: string | null; // 当前选中源
    sortOrder: 'priority' | 'name' | 'recent'; // 排序方式
    filterTags: string[]; // 过滤标签
  };

  /** 缓存元数据（< 2KB） */
  cacheMetadata: {
    lruQueue: string[]; // 最近访问的规则 ID
    lastCleanup: string; // 最后清理时间
  };

  /** 版本信息（< 1KB） */
  schemaVersion: number; // 数据结构版本
}
```

### 3.3 使用方式

通过 `context.workspaceState.get()` 读取，`context.workspaceState.update()` 更新。

### 3.4 大小监控

**监控策略**：

- 每次更新后计算 JSON 序列化大小
- 超过 8KB 触发警告日志
- 超过 10KB 拒绝写入并自动清理最旧数据

---

## 4. AI 配置文件生成策略

### 4.1 核心原则

**零污染**：项目根目录仅保留必要的 AI 配置文件，无中间数据

**生成位置**：

```
<workspace-root>/
├── .cursorrules                          # Cursor AI 配置
├── .github/
│   └── copilot-instructions.md           # GitHub Copilot 配置
├── .continue/
│   └── config.json                       # Continue.dev 配置
└── .ai/                                  # 自定义适配器目录（可选）
    └── custom-tool-config.yaml
```

**关键特性**：

- ✅ 只在项目根目录生成最终配置文件
- ✅ 不创建中间目录（如 .ai-rules/）
- ✅ 不生成索引、缓存或其他工作文件
- ✅ 自动添加到 .gitignore（用户可选择移除）

### 4.2 生成流程

**5 个关键步骤**：

1. **读取规则源配置** - 从 settings.json 的 Workspace 和 User 层合并配置，Workspace 优先
2. **加载规则索引** - 从全局缓存的工作区哈希目录读取 rules.index.json
3. **过滤和排序** - 按优先级排序，按适配器类型分组
4. **生成配置文件** - 调用对应适配器生成特定格式内容并写入项目根目录
5. **更新生成清单** - 记录文件元数据（路径、哈希、大小、策略）到全局缓存

### 4.3 文件覆盖策略

#### 策略类型

| 策略          | 行为         | 适用场景                     |
| ------------- | ------------ | ---------------------------- |
| **overwrite** | 直接覆盖     | 完全由扩展管理的文件（默认） |
| **preserve**  | 保留现有文件 | 用户手动创建的文件           |
| **merge**     | 智能合并     | 需要保留用户自定义内容       |
| **backup**    | 备份后覆盖   | 不确定文件来源时             |

#### 检测用户修改

**检测机制**：

- 计算现有文件的 SHA256 哈希与清单对比
- 不匹配时提示用户选择：覆盖 / 备份后覆盖 / 跳过 / 查看差异

### 4.4 元数据注释

**作用**：

- 标识文件为自动生成
- 记录生成时间和来源
- 警告用户手动修改风险

**示例（Markdown 格式）**：

```markdown
<!--
  Auto-generated by Turbo AI Rules
  Generated at: 2025-01-23T10:00:00Z
  Sources: typescript-rules (v1.2.0), react-best-practices (v2.0.1)
  Conflict Resolution: priority

  ⚠️ This file is auto-generated and will be overwritten on sync.
  To customize rules, either:
  - Edit source configurations in settings.json
  - Create a custom adapter for local rules
-->

# Your AI Assistant Rules

...
```

### 4.5 .gitignore 管理

#### 自动管理策略

**添加时机**：首次生成配置文件时

**管理规则**：

- 在 .gitignore 中添加标记注释 `# Turbo AI Rules - 自动生成`
- 用户移除标记后，扩展不再自动管理
- 支持用户自主决定是否将 AI 配置纳入版本控制

---

---

## 5. 性能优化策略

### 5.1 缓存策略

**规则解析缓存（内存）**：

- 使用 LRU 缓存机制
- 缓存最近访问的 100 个已解析规则
- 避免重复解析相同规则文件

**索引缓存（内存）**：

- 首次加载后缓存到内存
- 后续查询直接从内存读取
- 同步后自动失效并重新加载

### 5.2 增量同步

**基本策略**：

- 首次克隆完整 Git 仓库
- 后续使用 `git pull` 仅拉取差异
- 通过 commit hash 判断是否有变更
- 只解析变更的规则文件，不重新解析全部

### 5.3 并发控制

**克隆并发限制**：

- 限制同时克隆的规则源数量（建议 3 个）
- 防止网络和磁盘 IO 过载
- 使用队列机制管理等待任务

### 5.4 清理策略

#### 触发条件

- 全局缓存大小超过阈值（如 1GB）
- 工作区数据长期未访问（如 90 天）
- workspaceState 接近大小限制（> 8KB）

#### 清理范围

**工作区数据清理**：

- 删除长期未访问的工作区哈希目录
- 基于文件访问时间判断

**规则源清理**：

- ⚠️ **不自动清理规则源**（多工作区共享）
- 仅通过手动命令清理
- 用户明确选择要删除的源

**workspaceState 清理**：

- 清理已删除源的元数据
- 保持 workspaceState 大小在 10KB 以内

#### 手动清理命令

`turbo-ai-rules.clearCache` 提供选项：

1. 清理所有缓存
2. 清理当前工作区数据
3. 清理指定规则源
4. 清理过期工作区数据

---

## 6. 安全与跨平台

### 6.1 路径安全

**路径验证**：

- 规范化所有用户输入路径
- 防止目录遍历攻击（检查 `..`）
- 确保路径在允许的目录范围内

**检查点**：

- 规则源 subPath 配置
- 自定义适配器路径
- 生成的配置文件路径

### 6.2 文件权限

**写入保护**：

- 写入前检查目录权限
- 使用原子写入（先写临时文件，再重命名）
- 写入失败时清理临时文件

### 6.3 敏感数据保护

**凭据存储**：

- 优先使用 VSCode Secret Storage
- 可选存储在用户配置（需提示风险）
- 检测并提示迁移不安全的存储方式

**日志脱敏**：

- 日志中不输出 token、password 等敏感字段
- 自动替换为 `***`

### 6.4 跨平台兼容

**路径处理**：

- 使用 `path.sep` 和 `path.join()` 统一路径分隔符
- Windows 长路径支持（`\\?\` 前缀）
- 规范化大小写（Windows 不区分）

**全局缓存位置**：

- Linux: `~/.cache/.turbo-ai-rules/`
- macOS: `~/Library/Caches/.turbo-ai-rules/`
- Windows: `%LOCALAPPDATA%\.turbo-ai-rules\`

**权限处理**：

- Linux/macOS 检查执行权限
- Windows 文件锁机制适配
- 符号链接跨平台支持

### 6.5 错误码参考

| 错误码   | 分类 | 说明                    |
| -------- | ---- | ----------------------- |
| TAI-5001 | 安全 | 路径遍历攻击检测        |
| TAI-5002 | 权限 | 无写入权限              |
| TAI-5003 | 系统 | workspaceState 大小超限 |
| TAI-5004 | 系统 | 磁盘空间不足            |
| TAI-5005 | 系统 | 文件锁冲突              |

---

## 7. 总结

**数据流向**：

- 用户配置规则源 → settings.json（透明可控）
- Git 克隆规则源 → 全局缓存 sources/（多工作区共享）
- 解析生成索引 → 全局缓存 workspaces/（按哈希隔离）
- 高频状态数据 → workspaceState（轻量快速）
- 生成 AI 配置 → 项目根目录（标准位置）

**关键决策及原因**：

- **settings.json 替代 workspaceState 存储源配置** → 用户可见可编辑，符合 VSCode 规范
- **全局缓存替代项目本地目录** → 避免污染项目、支持多工作区共享
- **路径哈希隔离工作区数据** → 自动隔离、无需手动配置、路径变化不影响
- **workspaceState 只存元数据 < 10KB** → 避免超限、提升读写性能

**维护策略**：

- 规则源：仅手动清理（多工作区共享，不自动删除）
- 工作区数据：自动清理过期数据（基于访问时间）
- workspaceState：自动清理已删除源的元数据

---

> **返回**: [01-design.md](./01-design.md) - 产品整体设计
