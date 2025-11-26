# 配置指南

> Turbo AI Rules 完整配置指南

[English](./configuration.md) | [中文](./configuration.zh.md)

---

## ⚙️ 配置指南

### 📚 配置层级

Turbo AI Rules **完全遵循 VS Code 原生配置系统**，配置优先级从高到低：

1. **工作区设置** (`.vscode/settings.json`) - 项目级配置（最高优先级）
2. **用户设置** (VS Code User Settings) - 全局配置
3. **默认值** - 扩展内置默认配置

**重要：数组配置的合并规则**

- ✅ 本扩展对以下数组配置进行显式合并：
  - `turbo-ai-rules.sources`
  - `turbo-ai-rules.adapters.custom`
- 🔀 合并顺序与优先级：**工作区文件夹 > 多根工作区 (.code-workspace) > 全局 (User)**
- 🧩 根据 `id` 去重，按作用域顺序保序（文件夹优先，其次工作区，最后全局）

**示例说明**：

```jsonc
// 用户全局设置（Global）
{
  "turbo-ai-rules.sources": [
    { "id": "common-1", "name": "公司通用规则" }
  ]
}

// 项目设置（Workspace）
{
  "turbo-ai-rules.sources": [
    { "id": "project-1", "name": "项目专属规则" }
  ]
}

// ✅ 最终结果（由扩展显式合并）：common-1 + project-1
// - 同 id 时优先级：项目配置覆盖全局配置
```

**推荐配置策略**：

- **全局 + 项目组合**：通用源放全局，项目特定源放项目；扩展会自动合并
- **仅项目**：团队协作时全部放项目也可
- **仅全局**：个人习惯共享给所有项目

**配置作用域说明**：

扩展的大部分配置使用 VSCode 的 `resource` 作用域，这意味着：

- ✅ 可以在不同工作区/文件夹设置不同的配置
- ✅ 团队可以共享项目配置（通过 `.vscode/settings.json`）
- ✅ 个人可以有全局默认配置，项目级配置会覆盖
- 📌 例如：项目 A 启用 Cursor，项目 B 启用 Copilot

---

### 🔧 完整配置示例

在 `.vscode/settings.json` 或 VS Code 设置中添加：

```json
{
  // ========== 同步配置 ==========
  "turbo-ai-rules.sync.onStartup": true,
  "turbo-ai-rules.sync.interval": 60,
  "turbo-ai-rules.sync.conflictStrategy": "priority",

  // ========== 解析器配置 ==========
  "turbo-ai-rules.parser.strictMode": false,
  "turbo-ai-rules.parser.requireFrontmatter": false,

  // ========== 内置适配器 ==========
  "turbo-ai-rules.adapters.cursor.enabled": false,
  "turbo-ai-rules.adapters.copilot.enabled": true,
  "turbo-ai-rules.adapters.continue.enabled": false,

  // ========== 自定义适配器 ==========
  "turbo-ai-rules.adapters.custom": []
}
```

---

### 📊 配置选项详解

#### 1. 同步配置 (`sync`)

| 配置项             | 类型    | 默认值     | 说明                                         |
| ------------------ | ------- | ---------- | -------------------------------------------- |
| `onStartup`        | boolean | `true`     | VS Code 启动时自动同步规则                   |
| `interval`         | number  | `60`       | 自动同步间隔(分钟)，0 表示禁用自动同步       |
| `conflictStrategy` | enum    | `priority` | 冲突解决策略: `priority` / `skip-duplicates` |

**冲突解决策略说明**:

- **`priority`** (推荐):
  - 使用优先级最高的规则 (根据规则文件的 `priority` 字段)
  - 适合有明确规则优先级的场景
- **`skip-duplicates`**:
  - 保留第一个出现的规则，忽略后续重复
  - 适合规则源之间完全独立的场景

**示例**:

```json
{
  "turbo-ai-rules.sync.onStartup": true, // 启动时同步
  "turbo-ai-rules.sync.interval": 120, // 每 2 小时同步一次
  "turbo-ai-rules.sync.conflictStrategy": "priority"
}
```

---

#### 1.1 解析器配置 (`parser`)

| 配置项               | 类型    | 默认值  | 说明                                                      |
| -------------------- | ------- | ------- | --------------------------------------------------------- |
| `strictMode`         | boolean | `false` | 启用严格模式:要求所有规则必须包含 id、title 和有效元数据  |
| `requireFrontmatter` | boolean | `false` | 要求规则文件包含 YAML 前置元数据(禁用时可接受纯 Markdown) |

**模式说明**:

- **宽松模式** (默认 - `strictMode: false`, `requireFrontmatter: false`):
  - ✅ 最大兼容性,接受所有格式的规则文件
  - ✅ 自动从文件名生成 ID 和 Title
  - ✅ 适合使用社区现有规则库
  - ⚠️ 有限的冲突控制能力
- **严格模式** (`strictMode: true`, `requireFrontmatter: true`):
  - ✅ 强制元数据,精确控制规则
  - ✅ 必需字段:id、title 必须在 frontmatter 中显式声明
  - ✅ 适合企业级规则库管理
  - ⚠️ 需要手动维护元数据

**示例**:

```json
{
  // 宽松模式(默认,推荐)
  "turbo-ai-rules.parser.strictMode": false,
  "turbo-ai-rules.parser.requireFrontmatter": false
}
```

**何时使用严格模式**:

- 企业级规则库,需要精确的优先级控制
- 多团队协作,需要规则审计和版本管理
- 自定义规则库,需要可追踪性

**何时使用宽松模式**:

- 使用社区规则(awesome-cursorrules 等)
- 快速原型和测试
- 个人项目或小团队
- 不需要复杂规则管理

---

#### 2. 内置适配器配置 (`adapters`)

| 适配器   | 配置项             | 默认值  | 输出文件                          |
| -------- | ------------------ | ------- | --------------------------------- |
| Copilot  | `copilot.enabled`  | `true`  | `.github/copilot-instructions.md` |
| Cursor   | `cursor.enabled`   | `false` | `.cursorrules`                    |
| Continue | `continue.enabled` | `false` | `.continuerules`                  |

**Continue 目录支持说明**:

Continue 也支持从 `.continue/rules/` 目录加载规则，**完全支持递归子目录扫描**：

- ✅ 单文件：`.continuerules` (根目录)
- ✅ 目录：`.continue/rules/*.md` (支持递归子目录扫描)
- ✅ 示例：`.continue/rules/backend/api/rules.md` 完全支持

**💡 推荐做法**：对于多文件或目录结构的规则，**推荐使用自定义适配器**而非内置 Continue 适配器：

- 自定义适配器支持 `directory` 输出类型和按源组织
- 更好地控制文件结构和索引生成
- 可以过滤特定文件类型并生成索引文件
- 配置示例：

```json
{
  "turbo-ai-rules.adapters.continue.enabled": false,
  "turbo-ai-rules.adapters.custom": [
    {
      "id": "continue-rules",
      "name": "Continue 规则目录",
      "enabled": true,
      "outputPath": ".continue/rules",
      "outputType": "directory",
      "fileExtensions": [".md"],
      "organizeBySource": true,
      "generateIndex": true
    }
  ]
}
```

**示例**:

```json
{
  "turbo-ai-rules.adapters.cursor.enabled": false,
  "turbo-ai-rules.adapters.copilot.enabled": true,
  "turbo-ai-rules.adapters.continue.enabled": false
}
```

**何时禁用适配器**:

- 不使用某个 AI 工具时禁用对应适配器
- 减少不必要的配置文件生成
- 避免与其他扩展冲突

---

---

#### 3. 自定义适配器配置 (`adapters.custom`)

自定义适配器是 Turbo AI Rules 的核心特性之一，

##### 配置结构

```typescript
{
  "turbo-ai-rules.adapters.custom": [
    {
      "id": "unique-id",              // 唯一标识符 (kebab-case)
      "name": "Display Name",         // 显示名称
      "enabled": true,                // 是否启用
      "autoUpdate": true,             // 同步后自动更新
      "outputPath": "path/to/output", // 输出路径 (相对工作区根目录)
      "outputType": "file",           // 输出类型: "file" | "directory"
      "fileExtensions": [".md"],      // 文件过滤 (可选)
      "organizeBySource": true,       // 按源组织 (仅 directory 模式)
      "generateIndex": true,          // 生成索引 (仅 directory 模式)
      "indexFileName": "index.md"     // 索引文件名 (仅 directory 模式)
    }
  ]
}
```

##### 参数详解

| 参数               | 类型     | 必填 | 默认值     | 说明                                                                       |
| ------------------ | -------- | ---- | ---------- | -------------------------------------------------------------------------- |
| `id`               | string   | ✅   | -          | 唯一标识符，使用 kebab-case (如 `windsurf`, `my-custom-ai`)                |
| `name`             | string   | ✅   | -          | 显示名称，出现在日志和 UI 中                                               |
| `enabled`          | boolean  | ❌   | `true`     | 是否启用该适配器                                                           |
| `autoUpdate`       | boolean  | ❌   | `true`     | 同步规则后是否自动更新输出                                                 |
| `outputPath`       | string   | ✅   | -          | 输出路径，相对于工作区根目录                                               |
| `outputType`       | enum     | ✅   | -          | `"file"`: 单文件输出<br>`"directory"`: 目录结构输出                        |
| `fileExtensions`   | string[] | ❌   | `[]`       | 文件扩展名过滤 (如 `[".md", ".mdc"]`)<br>**空数组或不配置 = 同步所有文件** |
| `organizeBySource` | boolean  | ❌   | `true`     | (仅 `directory` 模式) 是否按源 ID 创建子目录                               |
| `generateIndex`    | boolean  | ❌   | `true`     | (仅 `directory` 模式) 是否生成索引文件                                     |
| `indexFileName`    | string   | ❌   | `index.md` | (仅 `directory` 模式) 索引文件名                                           |
| `skills`           | boolean  | ❌   | `false`    | (技能模式) 是否为技能适配器，技能文件直接复制不解析                        |
| `sourceId`         | string   | ❌   | -          | (技能模式) 复用的规则源 ID，复用其 Git 仓库、分支、认证配置                |
| `subPath`          | string   | ❌   | `/`        | (技能模式) 技能文件在仓库中的子目录（相对于仓库根目录，如 `/skills`）      |

---

##### 配置场景示例

**场景 1: 默认 `rules/` 目录** (已内置，无需额外配置)

```json
{
  "id": "default-rules",
  "name": "Generic Rules",
  "enabled": true,
  "autoUpdate": true,
  "outputPath": "rules",
  "outputType": "directory",
  "organizeBySource": true,
  "generateIndex": true,
  "indexFileName": "index.md"
  // 不设置 fileExtensions = 同步所有文件
}
```

**输出结构**:

```
rules/
├── index.md                   # 规则索引
├── company-rules/             # 源 1
│   ├── typescript.md
│   └── react.md
└── personal-rules/            # 源 2
    └── best-practices.md
```

---

**场景 2: 单文件输出 (Windsurf, Cline, Aide)**

```json
{
  "id": "windsurf",
  "name": "Windsurf AI",
  "enabled": true,
  "autoUpdate": true,
  "outputPath": ".windsurfrules",
  "outputType": "file",
  "fileExtensions": [".md"]
}
```

**输出**:

- 单个文件 `.windsurfrules`
- 包含所有 `.md` 规则，按优先级排序
- 自动添加分隔符和元数据

---

**场景 3: 完整目录同步 (所有文件类型)**

```json
{
  "id": "full-sync",
  "name": "Full Directory Sync",
  "enabled": true,
  "autoUpdate": true,
  "outputPath": "ai-rules-full",
  "outputType": "directory",
  "organizeBySource": true,
  "generateIndex": true
  // 不设置 fileExtensions = 同步 .md, .mdc, .txt, .json 等所有文件
}
```

**输出**:

- 保留原始目录结构
- 包含所有文件类型 (`.md`, `.mdc`, `.txt`, `.json`, ...)
- 适合需要完整规则库的场景

---

**场景 4: 文档站点 AI 规则**

```json
{
  "id": "docs-ai",
  "name": "Documentation AI Rules",
  "enabled": true,
  "autoUpdate": true,
  "outputPath": "docs/ai-rules",
  "outputType": "directory",
  "fileExtensions": [".md", ".mdc"],
  "organizeBySource": false, // 平铺结构，不按源分组
  "generateIndex": true,
  "indexFileName": "README.md" // 使用 README.md 作为索引
}
```

**输出**:

```
docs/ai-rules/
├── README.md                  # 索引文件
├── typescript.md
├── react.md
├── best-practices.md
└── ...
```

---

**场景 5: AI Skills 技能库同步**

```json
{
  "id": "claude-skills",
  "name": "Claude Skills",
  "enabled": true,
  "autoUpdate": true,
  "outputPath": ".claude/skills",
  "outputType": "directory",
  "organizeBySource": false,
  "generateIndex": false,
  // Skills 专用配置
  "skills": true,
  "sourceId": "my-ai-repo",
  "subPath": "/skills"
}
```

**工作原理**:

- ✅ 通过 `sourceId` 复用已有规则源的 Git 配置（仓库 URL、分支、认证）
- ✅ 通过 `subPath` 指定技能文件在仓库中的位置（相对于仓库根目录）
- ✅ 技能文件直接复制，不进行规则解析和合并
- ✅ 适用于 AI 工具的知识库/技能库（如 Claude Skills, Cursor Skills）

**输出**:

```
.claude/skills/
├── python-expert.md
├── database-design.md
├── api-integration.md
└── ...
```

**与普通规则的区别**:

| 特性     | 普通规则 (Rules)                     | 技能 (Skills)                        |
| -------- | ------------------------------------ | ------------------------------------ |
| 内容类型 | 编码规范、项目约定                   | 专业知识、技能模块                   |
| 文件处理 | 解析 frontmatter、合并规则           | 直接复制文件                         |
| 输出格式 | 可合并为单文件或目录                 | 通常保持独立文件                     |
| 配置复用 | 通过规则源配置                       | 通过 `sourceId` 复用规则源 Git 配置  |
| 路径配置 | 使用规则源的 `subPath`               | 使用适配器的 `subPath`（独立配置）   |
| 典型应用 | `.cursorrules`, `.github/copilot-\*` | `.claude/skills/`, `.cursor/skills/` |

---

**场景 6: 多 AI 工具同时支持**

```json
{
  "turbo-ai-rules.adapters.custom": [
    {
      "id": "windsurf",
      "name": "Windsurf AI",
      "enabled": true,
      "outputPath": ".windsurfrules",
      "outputType": "file",
      "fileExtensions": [".md"]
    },
    {
      "id": "cline",
      "name": "Cline AI",
      "enabled": true,
      "outputPath": ".clinerules",
      "outputType": "file",
      "fileExtensions": [".md"]
    },
    {
      "id": "aide",
      "name": "Aide AI",
      "enabled": true,
      "outputPath": ".aide/rules.md",
      "outputType": "file",
      "fileExtensions": [".md"]
    }
  ]
}
```

**效果**: 同时为 Windsurf、Cline、Aide 生成配置文件。

---

### 🎨 推荐配置组合

#### 配置 1: 最小化配置 (默认)

```json
{
  "turbo-ai-rules.adapters.cursor.enabled": false,
  "turbo-ai-rules.adapters.copilot.enabled": true
}
```

**适用**: 只使用 Cursor 和 Copilot 的用户。

---

#### 配置 2: 全功能配置

```json
{
  "turbo-ai-rules.sync.onStartup": true,
  "turbo-ai-rules.sync.interval": 120,
  "turbo-ai-rules.adapters.cursor.enabled": false,
  "turbo-ai-rules.adapters.copilot.enabled": true,
  "turbo-ai-rules.adapters.continue.enabled": true,
  "turbo-ai-rules.adapters.custom": [
    {
      "id": "default-rules",
      "name": "Generic Rules",
      "enabled": true,
      "outputPath": "rules",
      "outputType": "directory",
      "organizeBySource": true,
      "generateIndex": true
    },
    {
      "id": "windsurf",
      "name": "Windsurf AI",
      "enabled": true,
      "outputPath": ".windsurfrules",
      "outputType": "file",
      "fileExtensions": [".md"]
    }
  ]
}
```

**适用**: 使用多个 AI 工具，需要完整规则管理的团队。

---

#### 配置 3: 离线/低频更新

```json
{
  "turbo-ai-rules.sync.onStartup": false,
  "turbo-ai-rules.sync.interval": 0,
  "turbo-ai-rules.adapters.cursor.enabled": false,
  "turbo-ai-rules.adapters.copilot.enabled": true
}
```

**适用**: 网络受限环境，手动控制同步时机。

---

### 💡 配置最佳实践

1. **团队协作**:
   - 将配置放在 `.vscode/settings.json` 中
   - 提交到版本控制，团队共享配置
2. **规则源管理**:
   - 使用清晰的显示名称 (`name` 字段)
   - 为私有仓库妥善保管 Token (不要提交到版本控制)
3. **性能优化**:
   - 合理设置 `sync.interval`，避免过于频繁
   - 禁用不需要的适配器减少文件生成
4. **文件过滤**:

   - 大部分情况不需要设置 `fileExtensions` (默认同步所有)
   - 仅在需要特定文件类型时配置过滤

5. **自定义适配器**:
   - 为新 AI 工具优先使用 `file` 输出类型
   - `directory` 模式适合需要完整规则库的场景

---

## 📚 相关文档

- [01. 命令详解](./01-commands.zh.md) - 所有可用命令
- [03. 规则文件格式](./03-rule-format.zh.md) - 如何编写规则
- [04. 常见问题](./04-faq.zh.md) - 常见问题解答

---

[⬅️ 返回用户指南](./README.zh.md)
