# 存储策略设计

> 核心原则：项目目录零污染、全局缓存集中管理、配置隔离清晰

---

## 1. 设计原则

### 1.1 存储层次

```
Layer 1: 全局缓存 - 规则源（~/.cache/.turbo-ai-rules/sources/）
         ↓ Git 仓库 + 规则全文，多工作区共享
Layer 2: 全局缓存 - 工作区数据（~/.cache/.turbo-ai-rules/workspaces/<hash>/）
         ↓ 规则索引 + 搜索索引 + 生成清单，按路径哈希隔离
Layer 3: Workspace settings.json（.vscode/settings.json）
         ↓ 规则源配置，扩展只写此层
Layer 4: workspaceState（VSCode 内部）
         ↓ 同步元数据 + UI 状态（< 10KB）
Layer 5: 项目根目录（.cursorrules 等）
         ↓ 生成的 AI 配置文件
```

### 1.2 配置管理策略

- **读取**：自动合并 Workspace > Global > Default
- **写入**：扩展仅写 Workspace settings.json
- **全局配置**：用户可自行在 Global settings 添加共享规则源

---

## 2. 配置管理

### 2.1 读写策略

**读取**：自动合并 `inspection.workspaceValue` + `inspection.globalValue`（去重）  
**写入**：仅 `config.update(sources, ConfigurationTarget.Workspace)`  
**重复检测**：基于合并后配置，提示重复源所在位置

### 2.2 用户自行配置 Global

- Settings UI → User 标签 → `turbo-ai-rules.sources`
- 或直接编辑 User settings.json
- 全局源在所有项目可用，项目配置优先

---

## 3. 全局缓存目录

```
~/.cache/.turbo-ai-rules/
├── sources/{source-id}/          # 规则源（多工作区共享）
│   ├── .git/
│   ├── rules/*.mdc
│   └── meta.json                 # 元数据（gitUrl, branch, lastSync）
└── workspaces/{hash}/            # 工作区数据（SHA256 前 16 位）
    ├── rules.index.json          # 规则索引（id, title, tags, priority）
    ├── search.index.json         # 搜索倒排索引（keywords, tags）
    └── generation.manifest.json  # 生成清单（path, sha256, adapter）
```

**隔离机制**：工作区路径 → 规范化 → SHA256 → 前 16 位 → 目录名  
**清单用途**：追踪生成文件、检测手动修改（哈希对比）、决定是否重新生成

---

## 4. workspaceState 轻量级存储

**设计原则**：总大小 < 10KB，高频读写元数据，数据丢失不影响功能

**存储内容**：

- syncMetadata：lastSyncTime, sourceHashes（< 2KB）
- uiState：expandedNodes, selectedSource, sortOrder（< 2KB）
- cacheMetadata：lruQueue, lastCleanup（< 2KB）

**监控**：更新后计算大小，> 8KB 警告，> 10KB 拒绝写入并清理

---

## 5. AI 配置文件生成

### 5.1 生成流程

1. 读取规则源配置（Workspace > Global > Default）
2. 加载规则索引（全局缓存 workspaces/{hash}/rules.index.json）
3. 过滤排序（优先级、适配器分组）
4. 生成配置文件（项目根目录）
5. 更新生成清单（记录 sha256、size、policy）

### 5.2 覆盖策略

| 策略      | 行为       | 说明                           |
| --------- | ---------- | ------------------------------ |
| overwrite | 直接覆盖   | 默认，完全由扩展管理           |
| preserve  | 保留现有   | 用户手动创建                   |
| merge     | 智能合并   | 保留用户自定义                 |
| backup    | 备份后覆盖 | 不确定来源时，哈希不匹配时提示 |

### 5.3 元数据注释与 .gitignore

- 文件头部添加生成元数据注释（时间、来源、警告）
- .gitignore 添加标记 `# Turbo AI Rules - 自动生成`
- 用户移除标记后扩展不再自动管理

---

## 6. 性能优化

### 6.1 缓存策略

- **规则解析缓存**：LRU 100 条，避免重复解析
- **索引缓存**：首次加载后内存缓存，同步后失效
- **WorkspaceDataManager**：写穿 + 5s TTL，减少磁盘 IO 90%+

### 6.2 增量同步与并发

- 首次 `git clone`，后续 `git pull` + commit hash 判断变更
- 只解析变更文件，不重新解析全部
- 克隆并发限制 3 个，防止 IO 过载

### 6.3 清理策略

**触发条件**：缓存 > 1GB、工作区未访问 > 90 天、workspaceState > 8KB

**清理范围**：

- 工作区数据：基于文件访问时间自动清理
- 规则源：**不自动清理**（多工作区共享），仅手动命令
- workspaceState：清理已删除源元数据

**手动命令**：`turbo-ai-rules.clearCache`（全部/当前/指定源/过期数据）

---

## 7. 安全与跨平台

### 7.1 安全

- **路径验证**：规范化输入、防遍历攻击（检查 `..`）、限定目录范围
- **文件权限**：写入前检查、原子写入（临时文件 + 重命名）、失败清理
- **敏感数据**：Secret Storage > 用户配置（提示风险）、日志脱敏 `***`

### 7.2 跨平台

- **路径**：`path.join()`、Windows 长路径 `\\?\`、大小写规范化
- **缓存位置**：Linux `~/.cache/`、macOS `~/Library/Caches/`、Windows `%LOCALAPPDATA%`
- **权限**：Linux/macOS 执行权限、Windows 文件锁、符号链接支持

**错误码**：TAI-5001 路径遍历、TAI-5002 无权限、TAI-5003 state 超限、TAI-5004 磁盘满、TAI-5005 文件锁

---

## 8. Webview 通信与持久化

### 8.1 通信场景与方案

#### 场景 1: 规则选择实时同步（左侧树视图 ↔ 右侧 Webview）

**通信方式**：`MessageChannel` 专用通道

**流程**：

```
左侧勾选 → channelManager.updateMemoryState() → port1.postMessage()
  ↓ (实时，微秒级)
Webview port2.onmessage → useRuleSelectorStore.setState() → UI 更新

右侧勾选 → port2.postMessage() → port1.onmessage
  ↓ (实时，微秒级)
channelManager.updateMemoryState() → 延时500ms落盘
```

**持久化策略**：

- 左侧：延时 500ms 落盘（防抖合并写入）
- 右侧：点击"确认"按钮时落盘
- 通信完全不依赖磁盘，专用端口直连

**优点**：

- **微秒级延迟**（不经过主消息队列）
- **专用通道**（不受其他消息影响）
- **双向实时**（左右完全对等）
- 避免频繁磁盘 IO
- 用户可控的持久化时机

---

#### 场景 2: Webview 请求-响应（配置加载、数据查询）

**通信方式**：postMessage + RPC

- 适用：< 10 msg/s、请求-响应模式
- 实现：requestId 映射、30s 超时、错误传播
- 示例：`getInitialData`、`saveRuleSelection`

**持久化**：根据操作类型决定

- 查询操作：不持久化
- 保存操作：立即持久化到文件缓存

---

#### 场景 3: 高频数据流（暂未使用，预留）

**通信方式**：MessageChannel

- 适用：≥ 10 msg/s、流式数据
- 实现：专用端口、背压控制、端口关闭释放
- 场景：实时搜索建议、大数据流式加载

---

### 8.2 持久化矩阵

| 数据类型     | 大小     | 通信方式                | 持久化方式     | 位置                         | 时机                    |
| ------------ | -------- | ----------------------- | -------------- | ---------------------------- | ----------------------- |
| 规则选择状态 | 10-100KB | MessageChannel 专用通道 | 文件缓存       | ~/.cache/.turbo-ai-rules/... | 左侧延时 500ms/右侧确认 |
| UI 临时状态  | < 10KB   | vscode.setState         | Webview 内存   | Webview 内存                 | 实时                    |
| 轻量配置     | < 50KB   | workspaceState          | VSCode 内部    | VSCode 内部                  | 实时                    |
| 规则索引     | > 500KB  | postMessage + RPC       | 文件缓存       | ~/.cache/.turbo-ai-rules/... | 同步后立即              |
| 敏感凭据     | < 10KB   | secrets API             | VSCode Secrets | VSCode Secrets               | 立即                    |

### 8.3 通信层抽象

**扩展侧**：

- `SelectionChannelManager` - MessageChannel 管理器（规则选择实时同步）
  - 创建和管理 MessageChannel 端口
  - 内存状态管理（Map<sourceId, Set<paths>>）
  - 延时落盘调度（500ms 防抖）
  - 端口生命周期管理（创建/关闭/清理）
- `ExtensionMessenger` - RPC 通信（请求-响应）

**Webview 侧**：

- `MessagePort` - 规则选择实时同步专用端口
  - port.postMessage() - 发送选择变更
  - port.onmessage - 接收选择变更
  - 微秒级延迟，不经过主消息队列
- `WebviewRPC` - request/on/notify（与扩展通信）
- Zustand store - 本地状态管理（UI 状态）
  - selectionChannelPort - 保存 MessageChannel port 引用
  - selectNode/selectAll/clearAll - 通过 port 实时同步

### 8.4 内存缓存优化

**SelectionChannelManager**：MessageChannel + 延时落盘

- 实时同步：微秒级响应（专用通道，不经过主消息队列）
- 延时落盘：500ms 防抖（避免频繁 IO）
- 内存占用：< 10KB (Map<sourceId, Set<paths>>)
- 端口管理：按源创建/关闭，自动清理

**WorkspaceDataManager**：写穿 + 5s TTL

- 减少磁盘读 90%+
- 内存占用 < 100KB
- 写操作立即穿透

### 8.5 决策边界

| 维度       | < 阈值 | ≥ 阈值             | 实际使用场景           |
| ---------- | ------ | ------------------ | ---------------------- |
| 实时性要求 | 高     | MessageChannel     | 规则选择同步（微秒级） |
| 消息频率   | 10/s   | postMessage / Chan | 配置查询 / 流式数据    |
| 数据量     | 100KB  | 分块传输           | 规则索引               |
| 持久化时机 | 立即   | 延时/手动          | 左侧延时/右侧手动确认  |

---

## 9. 总结

**数据流向**：

```
用户配置 → Workspace settings.json（扩展） + Global settings.json（用户）
Git 克隆 → sources/（多工作区共享）
解析索引 → workspaces/{hash}/（路径哈希隔离）
状态数据 → workspaceState（< 10KB）
AI 配置 → 项目根目录
```

**关键决策**：

- Workspace settings 存源配置 → 项目独立、团队共享、可版本控制
- 扩展不操作 Global → 权限隔离、用户自主
- 路径哈希隔离 → 自动隔离、路径变化不影响
- **MessageChannel 专用通道** → 规则选择实时同步（微秒级，不经过主消息队列）
- postMessage + RPC → 请求-响应通信、超时控制
- 内存缓存 + 写穿 → 减少 IO 90%+、保持一致
- 延时落盘 + 手动确认 → 避免频繁磁盘写入

**维护策略**：

- 规则源仅手动清理、工作区自动清理（90 天）、state 清理已删源元数据
- 扩展写 Workspace、用户管 Global、缓存 5s TTL
- 规则选择：左侧 500ms 延时落盘、右侧用户确认落盘

---

> **返回**: [03-design.md](./03-design.md)
