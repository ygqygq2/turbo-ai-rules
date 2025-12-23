# 配置与同步策略

> 本文档描述 Turbo AI Rules 的配置管理、同步调度和冲突解决策略。
>
> **设计原则**：遵循 VSCode 标准配置规范，用户可见可控，工作区隔离

---

## 1. 配置管理

### 1.1 配置层级

Turbo AI Rules 遵循 VSCode 标准配置体系，支持两层配置：

```
1. Workspace Settings (工作区配置)
   • 位置：<workspace>/.vscode/settings.json
   • 优先级：最高
   • 作用域：当前工作区
   • 用途：项目特定的规则源配置
   • 版本控制：可提交到 git，团队共享

2. User Settings (用户配置)
   • 位置：VSCode 用户设置
   • 优先级：次之
   • 作用域：全局所有工作区
   • 用途：个人默认规则源配置
   • 版本控制：不纳入版本控制

优先级规则：Workspace > User > Default
```

### 1.2 存储策略

#### Settings.json (配置存储)

- **sources**: 规则源列表（User/Workspace 两层）
- **storage**: 存储策略配置
- **adapters**: AI 工具适配器配置
- **sync**: 同步策略配置

#### workspaceState (状态存储)

**用途**：存储运行时临时状态，提升用户体验

- ✅ `lastSyncTime`: 各规则源的上次同步时间
- ✅ `sourceHashes`: 各规则源的内容哈希（用于增量检测）
- ✅ `uiState`: UI 状态（如 TreeView 展开/折叠状态）
- ✅ `cacheMetadata`: 缓存元数据（LRU 队列、过期时间）

**不存储**：

- ❌ sources 配置（改用 settings.json）
- ❌ 用户可见配置（改用 settings.json）

**数据结构示例**：

```typescript
// workspaceState 存储的临时状态
{
  "lastSyncTime": {
    "source-id-1": "2024-01-20T10:00:00Z",
    "source-id-2": "2024-01-20T10:05:00Z"
  },
  "sourceHashes": {
    "source-id-1": "abc123def456",
    "source-id-2": "789ghi012jkl"
  },
  "uiState": {
    "expandedNodes": ["source-id-1", "category-typescript"]
  }
}
```

### 1.3 配置读取策略

#### VS Code 配置优先级与数组合并策略

Turbo AI Rules **遵循 VS Code 原生配置优先级**，并对数组类型配置进行显式合并（因为 VS Code 不会自动合并数组）。

**优先级规则（由低到高）**：

```
1. Default Value (package.json 中的 default)
2. Global Value (用户全局 settings.json)
3. Workspace Value (.code-workspace 或单根工作区的 .vscode/settings.json)
4. Workspace Folder Value (多根工作区中某文件夹的 .vscode/settings.json)
```

**数组配置的合并规则（由扩展实现）**：

- ✅ 对以下数组配置执行显式合并：`turbo-ai-rules.sources`、`turbo-ai-rules.adapters.custom`
- 🔀 合并顺序与优先级：**Workspace Folder > Workspace (.code-workspace) > Global**
- 🧩 去重规则：按 `id` 去重；同 id 时，高优先级作用域覆盖低优先级

**示例**：

```typescript
// 全局配置（Global）
{
  "turbo-ai-rules.sources": [
    { "id": "global-1", "name": "Global Rule A" },
    { "id": "global-2", "name": "Global Rule B" }
  ]
}

// 项目配置（Workspace）
{
  "turbo-ai-rules.sources": [
    { "id": "project-1", "name": "Project Rule X" }
  ]
}

// 最终生效：只有 project-1
// global-1 和 global-2 被完全覆盖（这是 VS Code 原生行为）
```

**实现方式**：

```typescript
// 显式合并 sources：Folder > Workspace > Global
const cfg = vscode.workspace.getConfiguration('turbo-ai-rules', resource);
const ins = cfg.inspect<RuleSource[]>('sources');
const merged = mergeById(
  ins?.workspaceFolderValue ?? [],
  ins?.workspaceValue ?? [],
  ins?.globalValue ?? [],
);
```

#### 多项目共享规则源的推荐做法

如果需要"全局 + 项目"组合使用规则源：

**方案 1：在项目配置中写全**（推荐）

```json
// 项目 .vscode/settings.json
{
  "turbo-ai-rules.sources": [
    // 复制全局通用的源
    { "id": "common-rules", "name": "Company Standards" },
    // 加上项目特有的源
    { "id": "project-specific", "name": "Project Rules" }
  ]
}
```

**方案 2：只在全局配置**

```json
// 用户全局 settings.json
{
  "turbo-ai-rules.sources": [{ "id": "my-default-rules", "name": "My Default Rules" }]
}
// 项目不配置 sources，自动使用全局配置
```

#### 配置来源追踪（可选）

UI 可通过 `inspect` API 查看配置来源：

```typescript
const inspected = config.inspect<RuleSource[]>('sources');
// inspected.globalValue - 全局配置
// inspected.workspaceValue - 工作区配置
// inspected.workspaceFolderValue - 文件夹配置
```

### 1.4 配置结构

### 1.4 配置结构

完整的配置结构包含四大部分：

```
ExtensionConfig (存储在 settings.json)
├── sources[]           # 规则源配置列表
│   ├── id             # 唯一标识 (kebab-case)
│   ├── name           # 显示名称
│   ├── gitUrl         # Git 仓库 URL
│   ├── branch         # 分支名 (默认 main)
│   ├── subPath        # 子目录路径 (可选)
│   ├── enabled        # 是否启用
│   ├── syncInterval   # 同步间隔 (秒)
│   └── auth           # 认证配置
│       ├── type       # none | token | ssh
│       └── tokenKey   # Token 引用 (存于 Secret Storage)
│
├── storage            # 存储策略
│   └── globalCacheDir    # 全局缓存目录（默认 ~/.cache/.turbo-ai-rules）
│
├── adapters           # 适配器配置
│   ├── cursor         # Cursor 适配器
│   ├── copilot        # GitHub Copilot 适配器
│   ├── continue       # Continue.dev 适配器
│   └── custom[]       # 自定义适配器列表
│
└── sync               # 同步策略
    ├── auto           # 是否自动同步
    ├── interval       # 自动同步间隔 (秒)
    └── onStartup      # 启动时同步
```

### 1.5 配置示例

**Workspace Settings** (.vscode/settings.json):

```jsonc
{
  "turboAiRules.sources": [
    {
      "id": "company-standards",
      "name": "Company Coding Standards",
      "gitUrl": "https://github.com/company/coding-standards.git",
      "branch": "main",
      "enabled": true,
      "syncInterval": 7200,
      "auth": { "type": "token" },
    },
  ],
  "turboAiRules.adapters": {
    "cursor": { "enabled": true, "autoUpdate": true },
    "copilot": { "enabled": true, "autoUpdate": true },
  },
}
```

**User Settings**:

```jsonc
{
  "turboAiRules.sources": [
    {
      "id": "personal-snippets",
      "name": "My Personal Rules",
      "gitUrl": "https://github.com/user/ai-rules.git",
      "enabled": true,
      "auth": { "type": "none" },
    },
  ],
  "turboAiRules.storage": {
    "globalCacheDir": "~/.cache/.turbo-ai-rules",
  },
  "turboAiRules.sync": {
    "auto": true,
    "interval": 3600,
    "onStartup": true,
  },
}
```

**最终合并结果**：

```
显示的规则源列表：
1. company-standards (Workspace) - enabled
2. personal-snippets (User) - enabled

TreeView 显示格式：
├─ Company Coding Standards (Workspace)
└─ My Personal Rules (User)
```

### 1.6 UI 交互设计

#### 添加规则源流程

```
1. 用户触发命令 "Add Rule Source"
   ↓
2. 提示选择存储目标
   • Workspace Settings (.vscode/settings.json)
   • User Settings (全局配置)
   ↓
3. 输入 Git URL 和其他配置
   ↓
4. 写入对应的 settings.json
   通过 vscode.workspace.getConfiguration().update(...)
   ↓
5. 刷新 TreeView 显示
```

#### TreeView 显示策略

```
规则源列表
├─ [Workspace] Company Standards ⚡ (enabled)
│  ├─ 规则统计：15 条
│  ├─ 上次同步：2 小时前
│  └─ 来源分支：main
│
└─ [User] Personal Rules (disabled)
   ├─ 规则统计：8 条
   └─ 未启用
```

**设计要点**：

- ✅ 标注来源：[Workspace] 或 [User]
- ✅ 状态图标：⚡ 启用 / 🚫 禁用
- ✅ 右键菜单：提供"移动到 Workspace/User"操作

### 1.7 配置迁移策略

如果检测到旧版本的 workspaceState 中存有 sources 数据：

```
迁移流程：
1. 检测 workspaceState.get('sources')
   ↓
2. 如果存在且非空
   ↓
3. 提示用户：
   "检测到旧版本配置，是否迁移到 Workspace Settings？"
   [迁移到 Workspace] [迁移到 User] [取消]
   ↓
4. 根据用户选择写入 settings.json
   ↓
5. 清除 workspaceState 中的 sources
   ↓
6. 刷新 UI
```

---

## 2. 同步调度 (AutoSyncService)

### 2.1 触发机制

同步可通过以下方式触发：

- **手动触发**: 用户执行 `turbo-ai-rules.syncRules` 命令
- **定时触发**: 根据 `syncInterval` 配置定时同步
- **启动触发**: 扩展激活时根据 `onStartup` 配置同步
- **文件监听触发**: 监听配置文件变化自动同步

### 2.2 规则选择与同步行为

#### 规则选择的默认行为

**核心原则**：新添加的规则源默认不选择任何规则，需要用户手动勾选

- ✅ **新规则源初始化**：选择状态为空（0 条规则被选中）
- ✅ **用户主动选择**：通过 TreeView 复选框、Webview 界面或文件树视图勾选规则
- ✅ **选择状态持久化**：选择结果保存在工作区数据目录（`workspaces/{hash}/rule-selections.json`）

**设计考量**：

- 避免默认包含所有规则导致的配置文件冗余
- 用户明确知道哪些规则会被包含在生成的配置中
- 新规则源同步后，状态栏显示 "0 Synced"，提醒用户进行选择

**选择状态清空行为**：

- ✅ **用户取消所有规则**：在规则同步页面不选择任何规则进行同步时，该规则源的选择状态会被清空
- ✅ **持久化空选择**：空选择状态会被保存到磁盘，下次同步不会恢复之前的选择
- ✅ **用户主动控制**：用户可以通过不选择任何规则来清空该规则源的所有规则，只保留自定义规则
- 📝 **使用场景**：用户希望暂时禁用某个规则源的所有规则，但不删除规则源本身

#### 已同步规则的定义

**"已同步规则"** 指被用户勾选的规则，具体包括：

- ✅ 用户在 TreeView、Webview 或文件树中勾选的规则
- ✅ 这些规则会被包含在生成的配置文件中（`.cursorrules`、`.github/copilot-instructions.md` 等）
- ❌ 未勾选的规则虽然从 Git 仓库拉取并解析，但不会出现在配置文件中

**统计逻辑**：

```typescript
// 伪代码示例
let totalSelectedRules = 0;
for (const source of enabledSources) {
  const selectedPaths = selectionStateManager.getSelection(source.id);
  totalSelectedRules += selectedPaths.length;
}
// totalSelectedRules 即为状态栏显示的"已同步规则数"
```

**WorkspaceState 统计字段**：

```typescript
rulesStats: {
  totalRules: number; // 所有规则源的规则总数
  selectedRules: number; // 用户已选择（已勾选）的规则总数
  sourceCount: number; // 规则源总数
  enabledSourceCount: number; // 已启用的规则源数量
}
```

#### 状态栏显示逻辑

- **格式**：`{selectedRules} Synced·{enabledSourceCount}S`
- **示例**：`30 Synced·2S`（已同步 30 条规则，启用 2 个规则源）
- **Tooltip**：详细信息
  - 中文：`已同步规则: 30\n规则源: 2/3 已启用`
  - 英文：`Synced Rules: 30\nRule Sources: 2/3 enabled`

### 2.3 同步流程

```
1. 检查是否需要同步
   • 距离上次同步是否超过间隔
   • 是否有未同步的规则源
   ↓
2. 遍历启用的规则源
   • 跳过禁用的源
   • 检查网络连接
   ↓
3. 拉取 Git 更新
   • 使用 GitManager 拉取
   • 处理认证和冲突
   ↓
4. 增量解析规则
   • 只解析变化的文件
   • 更新规则索引
   • **初始化规则选择状态（新源默认不选择任何规则）**
   ↓
5. 统计已选择的规则
   • 遍历所有规则源，读取选择状态
   • 计算 selectedRules 总数
   • 更新 WorkspaceState.rulesStats
   ↓
6. 合并已选择的规则
   • **只对用户勾选的规则进行合并**
   • 处理规则冲突
   • 应用冲突解决策略
   ↓
7. 生成配置文件
   • **只包含已选择的规则**
   • 调用启用的适配器
   • 写入目标文件
   ↓
8. 更新 UI
   • 刷新 TreeView（显示选择状态）
   • **更新状态栏（显示已选择规则数）**
   ↓
9. 通知用户
   • 显示同步结果（已选择规则数 / 总规则数）
   • 报告错误和警告
```

### 2.3 防抖与节流

- **防抖 (Debounce)**: 文件监听使用 300ms 防抖，避免频繁触发
- **节流 (Throttle)**: 自动同步使用 60 秒节流，避免过度请求
- **并发控制**: 限制同时同步的规则源数量（默认 3 个）

---

## 3. 冲突解决策略

### 3.1 冲突类型

- **规则 ID 冲突**: 多个规则源包含相同 ID 的规则
- **文件路径冲突**: 多个适配器生成相同目标文件
- **Git 冲突**: 拉取时本地有未提交的修改
- **配置冲突**: 工作区和用户配置不一致

### 3.2 规则冲突解决

支持三种冲突解决策略：

**1. priority (默认策略)**

- 高优先级规则覆盖低优先级规则
- 相同优先级时，先添加的规则源优先
- 在生成的配置中添加注释说明冲突来源

**2. merge**

- 合并规则内容（需适配器支持）
- 保留所有规则的元数据
- 标记合并来源

**3. skip-duplicates**

- 保留第一个规则
- 跳过重复的规则
- 记录跳过的规则 ID

### 3.3 配置冲突解决

- **工作区优先**: 工作区配置覆盖用户配置
- **验证合并**: 合并前验证配置有效性
- **冲突提示**: 冲突时提示用户选择

### 3.4 Git 冲突解决

- **Stash 策略**: 拉取前 stash 本地修改
- **Reset 策略**: 强制重置到远程分支（可选）
- **手动解决**: 提示用户手动解决冲突

---

## 4. 增量同步

### 4.1 变更检测

- **Git 状态检测**: 使用 `git status` 检测文件变化
- **时间戳比对**: 比对文件修改时间
- **哈希校验**: 使用文件哈希检测内容变化

### 4.2 增量处理

- **只解析变化的文件**: 跳过未修改的文件
- **增量索引更新**: 只更新变化的规则索引
- **部分生成**: 只重新生成受影响的配置

### 4.3 缓存利用

- **解析缓存**: 缓存解析结果，避免重复解析
- **索引缓存**: 缓存规则索引，避免重复读取
- **Git 缓存**: 利用 Git 的 delta 压缩机制

---

## 5. 网络处理

### 5.1 网络检测

- **连接检测**: 同步前检测网络连接
- **超时处理**: 设置合理的超时时间（默认 30 秒）
- **重试机制**: 网络失败时自动重试（最多 3 次）

### 5.2 离线模式

- **离线检测**: 检测网络不可用时切换到离线模式
- **使用缓存**: 离线时使用本地缓存的规则
- **延迟同步**: 网络恢复后自动同步

### 5.3 代理支持

- **代理配置**: 支持配置 HTTP/HTTPS 代理
- **环境变量**: 自动读取 `HTTP_PROXY` 和 `HTTPS_PROXY`
- **认证代理**: 支持需要认证的代理服务器

---

## 6. 认证管理

### 6.1 认证类型

- **无认证 (none)**: 公开仓库，无需认证
- **Token 认证 (token)**: 使用 Personal Access Token
- **SSH 认证 (ssh)**: 使用 SSH Key

### 6.2 Token 存储

- **Secret Storage**: 使用 VSCode Secret Storage 加密存储
- **存储格式**: `turboAiRules.token.${sourceId}`
- **自动清理**: 删除规则源时自动清理 Token

### 6.3 SSH Key 管理

- **系统 SSH Key**: 使用系统默认 SSH Key
- **自定义路径**: 支持配置自定义 SSH Key 路径
- **Passphrase**: 提示用户输入 SSH Key 密码

---

## 7. 错误处理

### 7.1 同步错误

- **TAI-2002**: 克隆失败（网络/权限/URL 错误）
- **TAI-2003**: 拉取失败（网络中断/冲突）
- **TAI-2004**: 认证失败（Token 过期/SSH Key 错误）

### 7.2 错误恢复

- **自动重试**: 网络错误自动重试
- **降级处理**: 失败时跳过该源继续处理其他源
- **通知用户**: 显示错误信息和建议操作

### 7.3 日志记录

- **详细日志**: 记录同步的每个步骤
- **错误上下文**: 记录错误发生时的上下文信息
- **性能指标**: 记录同步耗时和文件数量

---

## 8. 性能优化

### 8.1 并行同步

- **限制并发**: 限制同时同步的规则源数量（默认 3 个）
- **优先级队列**: 高优先级规则源优先同步
- **工作队列**: 使用工作队列模式控制并发

### 8.2 缓存策略

- **LRU 缓存**: 使用 LRU 算法缓存解析结果
- **缓存大小**: 默认缓存 100 个规则文件
- **缓存过期**: 支持配置缓存过期时间

### 8.3 资源管理

- **内存限制**: 监控内存使用，避免内存溢出
- **磁盘空间**: 检查磁盘空间，不足时提示清理
- **进程管理**: 使用子进程执行 Git 操作，避免阻塞主进程

---

## 9. workspaceState 使用规范

### 9.1 存储原则

**✅ 适合存储的数据**：

- 运行时临时状态
- UI 状态（展开/折叠/选中）
- 性能优化数据（缓存元数据）
- 用户不需要直接编辑的数据

**❌ 不适合存储的数据**：

- 用户配置（使用 settings.json）
- 业务核心数据（使用 settings.json 或文件）
- 需要版本控制的数据
- 需要跨工作区共享的数据

### 9.2 存储内容定义

```
workspaceState 存储内容（轻量级，< 10KB）：

├── syncMetadata          # 同步元数据
│   ├── lastSyncTime     # Map<sourceId, timestamp>
│   └── sourceHashes     # Map<sourceId, contentHash>
│
├── uiState              # UI 状态
│   ├── expandedNodes    # TreeView 展开的节点 ID[]
│   ├── selectedSource   # 当前选中的源 ID
│   └── sortOrder        # 排序方式
│
└── cacheMetadata        # 缓存元数据
    ├── lruQueue         # LRU 缓存队列（规则 ID 列表）
    └── lastCleanup      # 上次缓存清理时间
```

**较大数据存储在全局缓存**（按工作区路径哈希隔离）：

```
~/.cache/.turbo-ai-rules/workspaces/<workspace-hash>/
├── rules.index.json          # 规则索引（完整）
├── search.index.json         # 搜索索引（倒排）
└── generation.manifest.json  # 生成清单
```

**数据分配原则**：

| 数据类型          | 存储位置          | 判断依据           |
| ----------------- | ----------------- | ------------------ |
| 频繁读写 + 小数据 | workspaceState    | 同步时间、UI 状态  |
| 大数据 + 按需读取 | 全局缓存          | 规则索引、搜索索引 |
| 共享数据          | 全局缓存 sources/ | Git 仓库、规则全文 |

### 9.3 工作区哈希策略

**哈希计算**：

```
function getWorkspaceHash(workspacePath: string): string {
  // 使用 SHA256 前 16 位作为目录名
  return sha256(normalize(workspacePath)).substring(0, 16);
}
```

**路径规范化**：

- 统一路径分隔符（`/`）
- 解析软链接到真实路径
- 转换为绝对路径
- 确保跨平台一致性

**冲突处理**：

- SHA256 前 16 位碰撞概率极低（2^64 种可能）
- 如发生碰撞，通过 `workspacePath` 字段验证
- 不匹配时警告用户并重新生成

### 9.4 数据生命周期

```
生命周期管理：
1. 创建：首次激活时初始化
2. 更新：运行时按需更新
3. 清理：
   • 用户卸载扩展时自动清理
   • 提供手动清理命令（调试用）
4. 迁移：版本升级时迁移旧数据
```

### 9.4 数据生命周期

```
生命周期管理：

workspaceState（轻量级）:
  1. 创建：首次激活工作区时初始化
  2. 更新：同步完成、UI 交互时更新
  3. 清理：VSCode 关闭工作区时自动保存
  4. 删除：工作区删除时自动清理

全局缓存索引（按工作区隔离）:
  1. 创建：首次同步规则时创建工作区哈希目录
  2. 更新：规则变化时增量更新索引文件
  3. 验证：启动时验证 workspacePath 是否匹配
  4. 清理：
     • 自动：检测到工作区不存在时标记待删
     • 手动：提供命令清理孤立工作区数据
     • 定期：超过 N 天未访问的工作区数据
```

### 9.5 性能考虑

**workspaceState 读写**：

- 读取频率：TreeView 刷新、同步检查
- 写入频率：同步完成、UI 交互
- 数据大小：< 10KB（元数据级别）
- 读写性能：内存操作，毫秒级

**全局缓存索引读写**：

- 读取频率：启动、搜索、规则详情查看
- 写入频率：同步完成、规则更新
- 数据大小：无限制（磁盘文件）
- 读写性能：文件 IO，需缓存优化

**优化策略**：

- 索引文件使用 LRU 缓存（内存）
- 增量更新，避免全量重写
- 异步写入，不阻塞 UI
- 批量操作，减少 IO 次数

### 9.6 数据迁移策略

如果检测到旧版本数据需要迁移：

```
迁移流程：
1. 检测旧数据格式（version 字段）
   ↓
2. 读取旧数据并转换为新格式
   ↓
3. 验证新数据完整性
   ↓
4. 写入新格式数据
   ↓
5. 清理旧格式数据
   ↓
6. 记录迁移日志
```

---

## 10. 配置冲突场景与处理

### 10.1 ID 冲突

**场景**：Workspace 和 User settings 配置了相同 ID 的源

```jsonc
// User Settings
{ "id": "common-rules", "gitUrl": "https://user-repo.git" }

// Workspace Settings
{ "id": "common-rules", "gitUrl": "https://workspace-repo.git" }
```

**处理策略**：

```
1. Workspace 优先（标准 VSCode 行为）
2. UI 显示：
   ├─ [Workspace] Common Rules (active) ⚡
   └─ [User] Common Rules (overridden) 🚫
3. Tooltip 提示：
   "此源被 Workspace 配置覆盖，点击查看详情"
```

### 10.2 多工作区文件夹场景

**场景**：多根工作区（Multi-root Workspace）

```
workspace.code-workspace
├─ folder-A/.vscode/settings.json
│  └─ sources: [source-A]
│
└─ folder-B/.vscode/settings.json
   └─ sources: [source-B]
```

**当前实现（v2.0.2+）**：

```
简化策略（有限支持）：
1. 仅使用第一个 WorkspaceFolder
2. 激活时显示警告（一次性提示）
3. 同步/生成时需用户确认
4. 规则选择状态全局共享（不按文件夹隔离）

原因：
- 保持架构简单性和可靠性
- 避免工作空间上下文丢失问题
- 主要使用场景是单工作空间
```

**未来可能的完整支持策略**：

```
聚合显示策略（待实现）：
1. 读取所有 WorkspaceFolder 的配置
2. 合并显示，标注来源 Folder
3. TreeView 结构：
   ├─ [Folder A] Source A
   ├─ [Folder B] Source B
   └─ [User] Source C
4. 按工作空间隔离规则选择状态
```

> **注意**: 完整的多工作空间支持需要重新设计 `SelectionStateManager` 和 `WorkspaceContextManager`，
> 以支持按工作空间隔离的状态管理。当前版本优先保证单工作空间场景的稳定性。

### 10.3 配置变更检测

**监听机制**：

```
vscode.workspace.onDidChangeConfiguration((e) => {
  if (e.affectsConfiguration('turboAiRules')) {
    // 1. 重新读取配置
    // 2. 比对变化
    // 3. 刷新 TreeView
    // 4. 如果 sources 变化 → 触发增量同步
  }
})
```

---

## 11. 最佳实践建议

### 11.1 团队协作场景

**推荐做法**：

```jsonc
// .vscode/settings.json（提交到 git）
{
  "turboAiRules.sources": [
    {
      "id": "team-standards",
      "gitUrl": "https://github.com/company/standards.git",
      "enabled": true
    }
  ]
}

// 个人 User Settings（不提交）
{
  "turboAiRules.sources": [
    {
      "id": "personal-preferences",
      "gitUrl": "https://github.com/me/preferences.git",
      "enabled": true
    }
  ]
}
```

**效果**：

- ✅ 团队成员共享统一规范（team-standards）
- ✅ 个人保留自定义规则（personal-preferences）
- ✅ 配置透明可审查

### 11.2 个人项目场景

**推荐做法**：

- 将常用规则源配置在 User Settings
- 项目特定规则配置在 Workspace Settings
- 善用 `enabled` 字段临时禁用某些源

### 11.3 CI/CD 集成场景

**场景**：在 CI 环境中使用扩展

```bash
# .github/workflows/lint.yml
steps:
  - name: Install VSCode Extension
    run: code --install-extension ygqygq2.turbo-ai-rules

  - name: Configure via settings.json
    run: |
      mkdir -p .vscode
      echo '{
        "turboAiRules.sources": [{
          "id": "ci-rules",
          "gitUrl": "${{ secrets.RULES_REPO }}",
          "enabled": true
        }]
      }' > .vscode/settings.json
```

---

> **返回**: [01-design.md](./01-design.md) - 产品整体设计
