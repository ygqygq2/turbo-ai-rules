# 数据模型

> 本文档描述 Turbo AI Rules 的核心数据结构、接口定义和类型约定。

---

## 1. 核心数据结构

### 1.1 RuleSource (规则源)

规则源是扩展的基本单元，表示一个 Git 仓库规则源：

**职责**:

- 定义规则源的标识和显示信息
- 配置 Git 仓库位置和认证
- 控制启用状态和同步策略

**关键字段**:

- `id`: 唯一标识（kebab-case，全局唯一）
- `name`: 显示名称（用户友好）
- `gitUrl`: Git 仓库 URL（https 或 git@）
- `branch`: 分支名（默认 main）
- `subPath`: 子目录路径（可选，相对于仓库根目录）
- `enabled`: 是否启用（控制同步和生成）
- `syncInterval`: 同步间隔（秒，0 表示手动同步）
- `auth`: 认证配置（type: none/token/ssh）

**设计考量**:

- ID 必须全局唯一，建议包含命名空间（如 `org-project-category`）
- 认证信息中 Token 不直接存储在配置中，使用 Secret Storage
- 支持子目录允许在大型仓库中只使用部分规则

---

### 1.2 ParsedRule (解析后的规则)

解析后的规则包含元数据和内容：

**职责**:

- 存储规则的完整信息
- 提供规则的元数据用于过滤和排序
- 保留原始 Markdown 内容用于生成配置

**关键字段**:

- `id`: 规则唯一标识（来自 frontmatter）
- `title`: 规则标题（用于显示）
- `version`: 语义化版本号（x.y.z）
- `content`: Markdown 内容（不含 frontmatter）
- `tags`: 标签数组（用于分类和过滤）
- `priority`: 优先级（1-10，用于冲突解决）
- `author`: 作者信息（可选）
- `lastModified`: 最后修改时间（ISO 8601）
- `description`: 简短描述（可选）
- `sourceId`: 来源规则源 ID（关联到 RuleSource）
- `filePath`: 文件路径（相对于规则源根目录）

**设计考量**:

- `id` 在规则源内唯一，跨源可能冲突（由冲突解决策略处理）
- `priority` 用于冲突解决时决定优先级
- `sourceId` 和 `filePath` 用于追溯规则来源

---

### 1.3 ExtensionConfig (扩展配置)

扩展的完整配置包含四大部分：

**职责**:

- 统一管理所有配置项
- 支持配置验证和默认值
- 提供配置的读写接口

**关键字段**:

- `sources`: 规则源列表（RuleSource[]）
- `storage`: 存储策略配置（StorageConfig）
- `adapters`: 适配器配置（AdaptersConfig）
- `sync`: 同步策略配置（SyncConfig）

**设计考量**:

- 配置分层：工作区 > 用户 > 默认
- 配置验证：读取后立即验证，无效配置使用默认值
- 配置迁移：支持旧版本配置自动迁移到新版本

---

## 2. 辅助数据结构

### 2.1 StorageConfig (存储配置)

**字段**:

- `globalCacheDir`: 全局缓存目录路径（默认 `~/.cache/.turbo-ai-rules`）

**设计考量**:

- 所有数据存储在全局缓存，不在项目目录创建文件
- 支持自定义缓存路径（高级用户）

---

### 2.2 AdaptersConfig (适配器配置)

**字段**:

- `cursor`: Cursor 适配器配置（CursorAdapterConfig）
- `copilot`: GitHub Copilot 适配器配置（CopilotAdapterConfig）
- `continue`: Continue.dev 适配器配置（ContinueAdapterConfig）
- `custom`: 自定义适配器配置数组（CustomAdapterConfig[]）

**通用适配器配置**:

- `enabled`: 是否启用（默认 false）
- `autoUpdate`: 是否自动更新配置文件（默认 true）
- `targetFile`: 目标文件路径（可选，使用默认值）
- `template`: 模板路径（可选，使用内置模板）

**设计考量**:

- 每个适配器独立配置，互不影响
- 自定义适配器支持数组，允许多个自定义工具
- `autoUpdate` 控制是否随同步自动生成配置

---

### 2.3 SyncConfig (同步配置)

**字段**:

- `auto`: 是否自动同步（默认 true）
- `interval`: 自动同步间隔（秒，默认 3600）
- `onStartup`: 启动时是否同步（默认 true）

**设计考量**:

- 默认开启自动同步，减少手动操作
- 间隔可配置，平衡及时性和性能
- 启动同步确保规则最新

---

### 2.4 GitAuth (Git 认证)

**字段**:

- `type`: 认证类型（'none' | 'token' | 'ssh'）
- `token`: Token 值（存储在 Secret Storage，配置中不保存）
- `sshKeyPath`: SSH Key 路径（可选，默认使用系统 SSH Key）

**设计考量**:

- Token 存储在 Secret Storage，配置中只保存类型
- SSH Key 支持自定义路径，适应不同环境
- 无认证适用于公开仓库

---

## 3. UI 相关数据结构

### 3.1 TreeViewItem (树视图项)

**字段**:

- `id`: 唯一标识
- `label`: 显示标签
- `type`: 类型（'source' | 'rule' | 'category'）
- `icon`: 图标（Codicon）
- `children`: 子项数组（可选）
- `contextValue`: 上下文值（用于右键菜单）
- `tooltip`: 提示信息（可选）

**设计考量**:

- 支持多级树结构（规则源 → 分类 → 规则）
- `contextValue` 用于动态显示右键菜单
- `icon` 使用 VSCode Codicon 保持一致性

---

### 3.2 StatusBarInfo (状态栏信息)

**字段**:

- `text`: 显示文本
- `tooltip`: 提示信息
- `command`: 点击命令（可选）
- `color`: 文本颜色（可选）
- `backgroundColor`: 背景颜色（可选）

**设计考量**:

- 简洁显示同步状态和规则数量
- 支持点击快速执行常用命令
- 颜色标识同步状态（绿色=成功，红色=失败）

---

### 3.3 WebviewMessage (Webview 消息)

**字段**:

- `command`: 命令类型（字符串）
- `data`: 消息数据（any，具体类型由命令决定）

**常用命令**:

- `initialize`: 初始化 Webview
- `update`: 更新数据
- `action`: 用户操作（如点击按钮）
- `error`: 错误通知

**设计考量**:

- 统一的消息格式，简化 Webview 与扩展通信
- `command` 字符串便于扩展新消息类型
- `data` 灵活性高，适应不同消息内容

---

## 4. 验证与错误类型

### 4.1 ValidationResult (验证结果)

**字段**:

- `valid`: 是否有效（boolean）
- `errors`: 错误数组（ValidationError[]）
- `warnings`: 警告数组（ValidationWarning[]）

**ValidationError**:

- `code`: 错误码（TAI-xxxx）
- `message`: 错误消息
- `field`: 出错字段（可选）
- `suggestion`: 修复建议（可选）

**ValidationWarning**:

- `message`: 警告消息
- `field`: 警告字段（可选）

**设计考量**:

- 区分错误和警告，错误阻断流程，警告仅提示
- 错误码标准化，便于文档查询和国际化
- 提供修复建议，提升用户体验

---

### 4.2 CustomError (自定义错误)

**字段**:

- `name`: 错误名称（如 'ParseError'）
- `message`: 错误消息
- `code`: 错误码（TAI-xxxx）
- `cause`: 原始错误（可选）
- `context`: 上下文信息（可选）

**设计考量**:

- 继承 Error 类，保留堆栈跟踪
- `code` 统一错误码体系
- `cause` 保留原始错误链
- `context` 提供调试信息

---

## 5. 事件与回调

### 5.1 SyncEvent (同步事件)

**字段**:

- `type`: 事件类型（'start' | 'progress' | 'complete' | 'error'）
- `sourceId`: 规则源 ID（可选）
- `progress`: 进度信息（0-100，可选）
- `message`: 事件消息（可选）
- `error`: 错误信息（可选）

**设计考量**:

- 支持进度通知，提升用户体验
- 错误事件提供详细错误信息
- 事件类型可扩展，适应未来需求

---

### 5.2 RuleChangeEvent (规则变化事件)

**字段**:

- `type`: 变化类型（'add' | 'update' | 'delete'）
- `ruleId`: 规则 ID
- `sourceId`: 规则源 ID
- `oldRule`: 旧规则（可选，仅 update 和 delete）
- `newRule`: 新规则（可选，仅 add 和 update）

**设计考量**:

- 支持细粒度的规则变化监听
- 提供新旧规则对比信息
- 适用于增量更新和 UI 刷新

---

## 6. 类型约定

### 6.1 命名约定

- **接口**: PascalCase，描述性名词（如 `RuleSource`, `ParsedRule`）
- **类型别名**: PascalCase，功能性描述（如 `AuthType`, `ConflictStrategy`）
- **枚举**: PascalCase，复数名词（如 `EventTypes`, `ErrorCodes`）
- **字面量类型**: 小写字符串（如 `'none' | 'token' | 'ssh'`）

### 6.2 可选性约定

- 必需字段无 `?` 标记
- 可选字段用 `?` 标记
- 默认值在类型定义中注释说明

### 6.3 注释约定

- 接口和类型必须有 JSDoc 注释
- 字段注释说明用途和限制
- 复杂类型提供使用示例

---

## 7. 类型导出

所有类型定义统一从 `src/types/index.ts` 导出：

```typescript
// 配置相关
export * from './config';

// 规则相关
export * from './rules';

// Git 相关
export * from './git';

// 错误相关
export * from './errors';

// UI 相关
export * from './ui';

// 事件相关
export * from './events';
```

**设计考量**:

- 统一导出点，简化导入语句
- 分文件组织，避免单文件过大
- 按功能模块分类，便于维护

---

## 8. 类型扩展性

### 8.1 泛型支持

对于可扩展的类型，使用泛型：

```typescript
interface AdapterConfig<T = any> {
  enabled: boolean;
  autoUpdate: boolean;
  options?: T; // 适配器特定选项
}
```

### 8.2 联合类型扩展

使用联合类型支持未来扩展：

```typescript
type AuthType = 'none' | 'token' | 'ssh' | (string & {}); // 允许自定义类型
```

### 8.3 可选字段预留

为未来功能预留可选字段：

```typescript
interface RuleSource {
  // 现有字段...
  metadata?: Record<string, any>; // 预留元数据字段
}
```

---

> **返回**: [01-design.md](./01-design.md) - 产品整体设计
