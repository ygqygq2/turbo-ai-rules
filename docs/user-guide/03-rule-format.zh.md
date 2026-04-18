# 规则文件格式 (MDC)

> 使用 Markdown、MDC 及相关元数据编写规则 / 指令 / skill 风格内容的说明

---

## 📖 规则文件格式概述

Turbo AI Rules 主要解析 **Markdown 系资产**。具体来说：

- 宽松模式下支持纯 Markdown 文件
- 宽松模式和严格模式都支持带 YAML frontmatter 的 MDC 风格文件
- 同一套元数据约定可用于规则、指令以及很多 skill 风格文档

对于 skills 这类目录型资产，核心入口文件（通常是 `skill.md`）仍遵循本页描述的解析规则。

Turbo AI Rules 支持两种解析模式,以适应不同的使用场景:

### 官方约定 vs 扩展字段

- **官方约定**: `description`, `globs` 等 Cursor/Copilot 官方支持的字段
- **扩展字段**: `id`, `title`, `priority`, `tags`, `version`, `author` 等本扩展特有字段

两种字段可以**共存**,互不冲突。

---

## ⚙️ 解析模式

### 宽松模式(默认)

**配置**:

```json
{
  "turbo-ai-rules.parser.strictMode": false,
  "turbo-ai-rules.parser.requireFrontmatter": false
}
```

**特点**:

- ✅ 接受纯 Markdown 文件(无 frontmatter)
- ✅ Frontmatter 可选
- ✅ 自动从文件名生成 `id` (kebab-case)
- ✅ 自动从 `# 标题` 或文件名生成 `title`
- ✅ 完全兼容 Cursor/Copilot 生态的规则文件
- ⚠️ 规则冲突时可能无法精确控制优先级

**适用场景**:

- 使用社区现有的规则文件(如 awesome-cursorrules)
- 快速原型和测试
- 不需要复杂的规则管理

**示例 1: 纯 Markdown**

```markdown
# Clean Code Guidelines

## Constants Over Magic Numbers

- Replace hard-coded values with named constants
- Use descriptive constant names

## Meaningful Names

- Variables should reveal their purpose
```

**解析结果**:

- `id`: `clean-code-guidelines` (从文件名生成)
- `title`: `Clean Code Guidelines` (从第一个 # 标题提取)
- `content`: 完整的 Markdown 内容

**示例 2: 官方约定格式**

```markdown
---
description: Guidelines for writing clean, maintainable code
globs: **/*.{ts,js,tsx,jsx}
---

# Clean Code Guidelines

## Constants Over Magic Numbers

- Replace hard-coded values with named constants
```

**解析结果**:

- `id`: `clean-code-guidelines` (从文件名生成)
- `title`: `Clean Code Guidelines` (从 # 标题提取)
- `metadata.description`: `"Guidelines for writing clean, maintainable code"`
- `metadata.globs`: `"**/*.{ts,js,tsx,jsx}"`

---

### 严格模式

**配置**:

```json
{
  "turbo-ai-rules.parser.strictMode": true,
  "turbo-ai-rules.parser.requireFrontmatter": true
}
```

**特点**:

- ✅ 强制要求 YAML frontmatter
- ✅ 必须包含 `id` 和 `title` 字段
- ✅ 支持 `priority` 和 `tags` 元数据
- ✅ 精确的规则冲突解决
- ✅ 更好的规则可追踪性
- ⚠️ 需要手动维护规则元数据

**适用场景**:

- 企业级规则库管理
- 多团队协作环境
- 需要精确控制规则优先级
- 规则版本管理和审计

**示例: 完整元数据**

```markdown
---
id: typescript-clean-code
title: TypeScript Clean Code Guidelines
priority: high
tags: [typescript, clean-code, best-practices]
version: 1.0.0
author: Your Team
description: Clean code guidelines for TypeScript projects
globs: **/*.{ts,tsx}
---

# TypeScript Clean Code Guidelines

## Type Safety First

- Use explicit types for function parameters
- Avoid `any` unless absolutely necessary
```

**解析结果**:

- `id`: `typescript-clean-code` (frontmatter 明确指定)
- `title`: `TypeScript Clean Code Guidelines`
- `priority`: `high`
- `tags`: `["typescript", "clean-code", "best-practices"]`
- `metadata.description`: 官方字段
- `metadata.globs`: 官方字段

---

## 📖 规则文件格式

规则文件使用 MDC (Markdown + YAML Frontmatter) 格式:

```markdown
---
id: typescript-naming
title: TypeScript 命名规范
priority: high
tags: [typescript, naming, conventions]
version: 1.0.0
author: Your Name
description: TypeScript 项目的命名约定
---

# TypeScript 命名规范

## 变量命名

- 使用 camelCase 命名变量和函数
- 使用 PascalCase 命名类和接口
- 使用 UPPER_SNAKE_CASE 命名常量

## 示例

\`\`\`typescript
// 好的命名
const userName = 'John';
class UserService {}
const MAX_RETRY_COUNT = 3;

// 避免
const user_name = 'John'; // ❌
class userservice {} // ❌
\`\`\`
```

---

## ⚙️ 配置指南

### 📚 配置层级

Turbo AI Rules 支持多层级配置，优先级从高到低：

1. **工作区设置** (`.vscode/settings.json`) - 项目级配置
2. **用户设置** (VS Code User Settings) - 全局配置
3. **默认值** - 扩展内置默认配置

推荐：团队项目使用工作区设置，个人使用用户设置。

---

### 🔧 完整配置示例

在 `.vscode/settings.json` 或 VS Code 设置中添加：

```json
{
  // ========== 同步配置 ==========
  "turbo-ai-rules.sync.onStartup": true,
  "turbo-ai-rules.sync.interval": 60,
  "turbo-ai-rules.sync.conflictStrategy": "priority",

  // ========== 预设适配器 ==========
  // 注意：预设适配器通过 "Manage Adapters" 命令管理，无需手动配置

  // ========== 自定义适配器 ==========
  "turbo-ai-rules.adapters.custom": [
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
    },
    {
      "id": "windsurf",
      "name": "Windsurf AI",
      "enabled": true,
      "autoUpdate": true,
      "outputPath": ".windsurfrules",
      "outputType": "file",
      "fileExtensions": [".md"]
    }
  ]
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

#### 2. 预设适配器配置 (`adapters`)

扩展内置了 10 个主流 AI 工具的预设适配器（8 个 rules + 2 个 skills）：

| 适配器         | 配置项 (通过 Manage Adapters 管理) | 默认值  | 输出文件                          |
| -------------- | ---------------------------------- | ------- | --------------------------------- |
| Cursor         | 预设适配器                         | `true`  | `.cursorrules`                    |
| Windsurf       | 预设适配器                         | `false` | `.windsurfrules`                  |
| GitHub Copilot | 预设适配器                         | `false` | `.github/copilot-instructions.md` |
| Continue       | 预设适配器                         | `false` | `.continuerules`                  |
| Cline          | 预设适配器                         | `false` | `.clinerules`                     |
| Roo-Cline      | 预设适配器                         | `false` | `.roorules`                       |
| Aider          | 预设适配器                         | `false` | `.aider.conf.yml`                 |
| Bolt.new       | 预设适配器                         | `false` | `.bolt/prompt`                    |
| Qodo Gen       | 预设适配器                         | `false` | `.qodo/rules.md`                  |

**管理方式**：

- 使用命令 `Turbo AI Rules: Manage Adapters` 打开适配器管理界面
- 在界面中可视化地启用/禁用预设适配器
- 配置会自动保存到工作区或用户设置

**注意**：

- 预设适配器的配置通过 **Manage Adapters** 界面管理，不需要手动编辑 JSON
- 只有自定义适配器需要在 `settings.json` 中配置

**何时禁用适配器**:

- 不使用某个 AI 工具时禁用对应适配器
- 减少不必要的配置文件生成
- 避免与其他扩展冲突

---

#### 3. 自定义适配器配置 (`adapters.custom`)

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
  // 预设适配器通过 "Manage Adapters" 命令管理
  // 默认启用 Cursor，其他适配器按需启用
}
```

**适用**: 只使用单个 AI 工具的用户，通过界面启用对应适配器即可。

---

#### 配置 2: 全功能配置

```json
{
  "turbo-ai-rules.sync.onStartup": true,
  "turbo-ai-rules.sync.interval": 120,
  // 预设适配器通过 "Manage Adapters" 命令管理
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
  "turbo-ai-rules.sync.interval": 0
  // 预设适配器通过 "Manage Adapters" 命令管理
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

## 📖 规则文件格式 (MDC)

规则文件使用 **MDC** (Markdown + YAML Frontmatter) 格式，结合了 YAML 元数据和 Markdown 内容。

### 基本结构

```markdown
---
id: rule-unique-id
title: 规则标题
priority: high
tags: [tag1, tag2, tag3]
version: 1.0.0
author: 作者名
description: 规则简短描述
---

# 规则详细内容

规则的详细说明和示例...
```

---

### 元数据字段说明

| 字段          | 类型     | 必填 | 说明                                        |
| ------------- | -------- | ---- | ------------------------------------------- |
| `id`          | string   | ✅   | 规则唯一标识符 (kebab-case)                 |
| `title`       | string   | ✅   | 规则标题                                    |
| `priority`    | enum     | ❌   | 优先级: `low`, `medium`, `high`, `critical` |
| `tags`        | string[] | ❌   | 标签数组，用于分类和搜索                    |
| `version`     | string   | ❌   | 规则版本号 (语义化版本)                     |
| `author`      | string   | ❌   | 规则作者                                    |
| `description` | string   | ❌   | 规则简短描述                                |

#### ID 格式说明

- **数据类型**: 支持 `string` 或 `number` 类型
- **格式要求**: 字母、数字、连字符的组合
- **支持格式**:
  - 纯数字: `102`, `001` (常用于文件排序)
  - kebab-case: `typescript-naming`, `react-hooks`
  - 组合: `102-typescript`, `001-overview`
- **类型处理**: YAML 会将纯数字解析为 number 类型,扩展完全支持,无需手动转换

**示例**:

```yaml
# ✅ 推荐 - 纯数字 (YAML 解析为 number)
id: 102
id: 001
id: 200

# ✅ 推荐 - 数字前缀字符串
id: 102-typescript
id: 001-overview

# ✅ 推荐 - 描述性ID
id: typescript-naming
id: react-hooks-best-practices

# ✅ 可接受 - 纯数字加引号 (YAML 解析为 string)
id: "102"

# ❌ 错误格式
id: TypeScript_Naming  # 包含大写和下划线
id: react hooks        # 包含空格
id: -102              # 以连字符开头
```

---

### 完整示例

```markdown
---
id: typescript-naming
title: TypeScript 命名规范
priority: high
tags: [typescript, naming, conventions, best-practices]
version: 1.0.0
author: Your Name
description: TypeScript 项目的命名约定和最佳实践
---

# TypeScript 命名规范

## 变量命名

### 规则

- 使用 **camelCase** 命名变量和函数
- 使用 **PascalCase** 命名类和接口
- 使用 **UPPER_SNAKE_CASE** 命名常量
- 使用 **\_prefix** 命名私有成员

### ✅ 好的示例

\`\`\`typescript
// 变量和函数
const userName = 'John';
function getUserName() { ... }

// 类和接口
class UserService { ... }
interface IUserData { ... }

// 常量
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';

// 私有成员
class User {
private \_id: string;
private \_password: string;
}
\`\`\`

### ❌ 避免

\`\`\`typescript
// 错误：变量使用下划线分隔
const user_name = 'John'; // ❌

// 错误：类名使用 camelCase
class userservice {} // ❌

// 错误：常量使用 camelCase
const maxRetryCount = 3; // ❌
\`\`\`

## 类型命名

### 接口

- 接口名使用 `I` 前缀 (可选但推荐)
- 或使用描述性名称，以 `able` 结尾表示能力

\`\`\`typescript
// 方式 1: I 前缀
interface IUser { ... }
interface IUserService { ... }

// 方式 2: 描述性名称
interface Serializable { ... }
interface Comparable { ... }
\`\`\`

### 类型别名

使用 `Type` 后缀区分类型别名和接口

\`\`\`typescript
type UserIdType = string | number;
type CallbackType = (data: any) => void;
\`\`\`

## 文件命名

- 使用 **kebab-case** 命名文件
- 组件文件使用 **PascalCase** (React/Vue)

\`\`\`
✅ user-service.ts
✅ api-client.ts
✅ UserProfile.tsx (React 组件)
❌ UserService.ts (避免)
❌ api_client.ts (避免)
\`\`\`

## 总结

遵循统一的命名规范可以提高代码可读性和可维护性。团队应该在项目开始时就确定命名规范，并通过 ESLint 等工具强制执行。
```

---

### 规则编写建议

1. **结构清晰**:
   - 使用标题层级组织内容
   - 每个规则专注一个主题
2. **代码示例**:
   - 提供 ✅ 好的示例和 ❌ 错误示例
   - 使用代码块高亮
3. **元数据完整**:
   - 设置合理的 `priority`
   - 添加相关的 `tags` 便于搜索
4. **版本管理**:
   - 使用语义化版本号
   - 重大更新时更新 `version`

---

---

## 📚 相关文档

- [01. 命令详解](./01-commands.zh.md) - 所有可用命令
- [02. 配置指南](./02-configuration.zh.md) - 配置选项
- [04. 常见问题](./04-faq.zh.md) - 常见问题解答

---

[⬅️ 返回用户指南](./README.zh.md)
