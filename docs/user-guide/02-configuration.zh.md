# 配置指南

> Turbo AI Rules 完整配置指南

[English](./configuration.md) | [中文](./configuration.zh.md)

---

## ⚙️ 配置指南

### 📚 配置层级

Turbo AI Rules 支持多层级配置，优先级从高到低:

1. **工作区设置** (`.vscode/settings.json`) - 项目级配置
2. **用户设置** (VS Code User Settings) - 全局配置
3. **默认值** - 扩展内置默认配置

推荐:团队项目使用工作区设置,个人使用用户设置。

**配置作用域说明**:

扩展的大部分配置使用 VSCode 的 `resource` 作用域，这意味着:

- ✅ 可以在不同工作区/文件夹设置不同的配置
- ✅ 团队可以共享项目配置(通过 `.vscode/settings.json`)
- ✅ 个人可以有全局默认配置,项目级配置会覆盖
- 📌 例如:项目 A 启用 Cursor,项目 B 启用 Copilot

---

### 🔧 完整配置示例

在 `.vscode/settings.json` 或 VS Code 设置中添加：

```json
{
  // ========== 存储配置 ==========
  "turbo-ai-rules.storage.useGlobalCache": true,

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

#### 1. 存储配置 (`storage`)

| 配置项           | 类型    | 默认值 | 说明                                         |
| ---------------- | ------- | ------ | -------------------------------------------- |
| `useGlobalCache` | boolean | `true` | 使用全局缓存 (`~/.turbo-ai-rules/`) 存储规则 |

**建议**:

- ✅ 保持默认 `true`，多个工作区共享规则缓存
- ❌ 设为 `false` 会在每个工作区独立存储，占用更多空间

---

#### 2. 同步配置 (`sync`)

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

#### 2.1 解析器配置 (`parser`)

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

#### 3. 内置适配器配置 (`adapters`)

| 适配器   | 配置项             | 默认值  | 输出文件                          |
| -------- | ------------------ | ------- | --------------------------------- |
| Copilot  | `copilot.enabled`  | `true`  | `.github/copilot-instructions.md` |
| Cursor   | `cursor.enabled`   | `false` | `.cursorrules`                    |
| Continue | `continue.enabled` | `false` | `.continuerules`                  |

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

#### 4. 自定义适配器配置 (`adapters.custom`)

自定义适配器是 Turbo AI Rules 最强大的功能，支持为**任何 AI 工具**配置输出格式。

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

**场景 5: 多 AI 工具同时支持**

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
