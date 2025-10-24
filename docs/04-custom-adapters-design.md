# 自定义适配器设计方案

## 1. 需求分析

### 1.1 核心需求

- **多样性**: AI 工具多种多样,无法全部内置支持
- **灵活性**: 允许用户配置多个自定义适配器
- **通用性**: 现有的 `rules/` 目录功能实际上是自定义适配器的一个特例
- **可扩展性**: 输出目标可以是文件或目录,支持文件过滤

### 1.2 设计目标

1. 将 `RulesAdapter` 重构为通用的 `CustomAdapter`
2. 支持用户配置多个自定义输出目标
3. 支持文件和目录两种输出模式
4. 支持文件后缀过滤(如 `.md`, `.mdc`)
5. 保持向后兼容(默认的 `rules/` 目录仍然可用)

## 2. 架构设计

### 2.1 配置结构

```typescript
/**
 * 自定义适配器配置
 */
export interface CustomAdapterConfig extends AdapterConfig {
  /** 适配器唯一标识 */
  id: string;
  /** 适配器显示名称 */
  name: string;
  /** 输出目标路径(相对于工作区根目录) */
  outputPath: string;
  /** 输出类型 */
  outputType: 'file' | 'directory';
  /** 文件过滤规则(文件后缀,如 ['.md', '.mdc']), 为空则不过滤 */
  fileExtensions?: string[];
  /** 是否按源ID组织子目录(仅对 directory 类型有效) */
  organizeBySource?: boolean;
  /** 是否生成索引文件(仅对 directory 类型有效) */
  generateIndex?: boolean;
  /** 索引文件名(默认 'index.md') */
  indexFileName?: string;
}

/**
 * 适配器配置集合(更新)
 */
export interface AdaptersConfig {
  cursor?: AdapterConfig;
  copilot?: AdapterConfig;
  continue?: AdapterConfig;
  /** 自定义适配器列表 */
  custom?: CustomAdapterConfig[];
}
```

### 2.2 配置示例

#### 示例 1: 默认 rules/ 目录(向后兼容)

```json
{
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
      // fileExtensions 不设置 = 同步所有文件,不过滤
    }
  ]
}
```

#### 示例 2: 单个配置文件输出

```json
{
  "turbo-ai-rules.adapters.custom": [
    {
      "id": "my-ai-tool",
      "name": "My AI Tool Config",
      "enabled": true,
      "autoUpdate": true,
      "outputPath": ".my-ai-tool.md",
      "outputType": "file",
      "fileExtensions": [".md", ".mdc"]
    }
  ]
}
```

#### 示例 3: 多个自定义适配器

```json
{
  "turbo-ai-rules.adapters.custom": [
    {
      "id": "rules",
      "name": "Rules Directory",
      "enabled": true,
      "autoUpdate": true,
      "outputPath": "rules",
      "outputType": "directory",
      "organizeBySource": true,
      "generateIndex": true
    },
    {
      "id": "windsurf",
      "name": "Windsurf AI",
      "enabled": true,
      "autoUpdate": true,
      "outputPath": ".windsurfrules",
      "outputType": "file",
      "fileExtensions": [".md"]
    },
    {
      "id": "docs-ai",
      "name": "Documentation AI Rules",
      "enabled": true,
      "autoUpdate": true,
      "outputPath": "docs/ai-rules",
      "outputType": "directory",
      "fileExtensions": [".md", ".mdc"],
      "organizeBySource": false,
      "generateIndex": true,
      "indexFileName": "README.md"
    }
  ]
}
```

### 2.3 类层次结构

```
BaseAdapter (抽象基类)
├── CursorAdapter (内置)
├── CopilotAdapter (内置)
├── ContinueAdapter (内置)
└── CustomAdapter (通用自定义适配器)
    ├── 文件模式: 合并所有规则到单个文件
    └── 目录模式: 按源或平铺组织多个文件
```

## 3. 实现要点

### 3.1 CustomAdapter 核心功能

1. **文件模式** (`outputType: 'file'`)

   - 合并所有符合过滤条件的规则到单个文件
   - 支持文件后缀过滤
   - 按优先级排序

2. **目录模式** (`outputType: 'directory'`)
   - 支持按源 ID 组织子目录 (`organizeBySource: true`)
   - 支持平铺结构 (`organizeBySource: false`)
   - 可选生成索引文件
   - 支持文件后缀过滤

### 3.2 文件过滤逻辑

```typescript
function shouldIncludeRule(rule: ParsedRule, extensions?: string[]): boolean {
  // 未配置过滤规则,包含所有规则(同步所有文件)
  if (!extensions || extensions.length === 0) {
    return true;
  }

  // 检查规则的源文件是否匹配任一后缀
  return extensions.some((ext) => rule.filePath?.endsWith(ext));
}
```

**关键点**:

- 不配置 `fileExtensions` 或设置为空数组 = **不过滤,同步所有文件**
- 配置了 `fileExtensions` = 只同步匹配的文件后缀

### 3.3 向后兼容

为保持向后兼容,在扩展初始化时:

1. 检查是否有自定义适配器配置
2. 如果没有,自动添加默认的 "rules" 适配器(相当于旧的 RulesAdapter)
3. 用户可以通过配置禁用或修改默认适配器

## 4. 配置 Schema (package.json)

```json
{
  "turbo-ai-rules.adapters.custom": {
    "type": "array",
    "default": [
      {
        "id": "default-rules",
        "name": "Generic Rules",
        "enabled": true,
        "autoUpdate": true,
        "outputPath": "rules",
        "outputType": "directory",
        "fileExtensions": [".md"],
        "organizeBySource": true,
        "generateIndex": true,
        "indexFileName": "index.md"
      }
    ],
    "items": {
      "type": "object",
      "required": ["id", "name", "outputPath", "outputType"],
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^[a-z0-9-]+$",
          "description": "Unique identifier (kebab-case)"
        },
        "name": {
          "type": "string",
          "description": "Display name"
        },
        "enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable this adapter"
        },
        "autoUpdate": {
          "type": "boolean",
          "default": true,
          "description": "Auto-update after sync"
        },
        "outputPath": {
          "type": "string",
          "description": "Output path relative to workspace root"
        },
        "outputType": {
          "type": "string",
          "enum": ["file", "directory"],
          "description": "Output as single file or directory"
        },
        "fileExtensions": {
          "type": "array",
          "items": {
            "type": "string",
            "pattern": "^\\.[a-z0-9]+$"
          },
          "description": "Filter by file extensions (e.g., ['.md', '.mdc']). Omit or leave empty to sync all files."
        },
        "organizeBySource": {
          "type": "boolean",
          "default": true,
          "description": "Organize files by source ID (directory mode only)"
        },
        "generateIndex": {
          "type": "boolean",
          "default": true,
          "description": "Generate index file (directory mode only)"
        },
        "indexFileName": {
          "type": "string",
          "default": "index.md",
          "description": "Index file name (directory mode only)"
        }
      }
    },
    "description": "Custom adapter configurations"
  }
}
```

## 5. 用户体验

### 5.1 默认行为

- 开箱即用,自动生成 `rules/` 目录(向后兼容)
- 用户无需配置即可使用通用规则功能

### 5.2 自定义配置

1. 打开 VS Code 设置
2. 搜索 "Turbo AI Rules"
3. 找到 "Custom Adapters" 配置项
4. 添加/编辑/删除自定义适配器
5. 同步规则后自动应用

### 5.3 配置验证

- 扩展加载时验证配置
- ID 必须唯一(kebab-case)
- outputPath 不能冲突
- 无效配置显示警告,不影响其他适配器

## 6. 迁移计划

### 6.1 代码迁移

1. ✅ 保留 `RulesAdapter.ts` 作为参考
2. ✅ 创建新的 `CustomAdapter.ts`
3. ✅ 更新 `FileGenerator.ts` 加载逻辑
4. ✅ 更新类型定义 `config.ts`
5. ✅ 更新配置 schema `package.json`

### 6.2 文档更新

1. ✅ 更新 README.md
2. ✅ 更新 02-development.md
3. ✅ 添加自定义适配器配置示例

### 6.3 测试

1. ✅ 单元测试: CustomAdapter 各种模式
2. ✅ 集成测试: 多个自定义适配器并存
3. ✅ 回归测试: 确保向后兼容

## 7. 未来扩展

### 7.1 模板系统

支持自定义输出模板(Handlebars/Mustache):

```json
{
  "id": "custom",
  "outputType": "file",
  "template": "{{#rules}}## {{title}}\n{{content}}\n{{/rules}}"
}
```

### 7.2 后处理钩子

支持自定义后处理脚本:

```json
{
  "id": "custom",
  "postProcess": "node scripts/format-rules.js"
}
```

### 7.3 条件过滤

支持更复杂的规则过滤:

```json
{
  "id": "custom",
  "filter": {
    "tags": ["typescript", "security"],
    "priority": "high",
    "sourceIds": ["my-team-rules"]
  }
}
```

## 8. 用户自定义规则保护机制

### 8.1 设计原则

**核心理念**: 程序管理自动生成区域，用户管理自定义区域，**职责分明，互不干涉**。

**目标**:

1. ✅ 保护用户手动创建的规则文件/内容
2. ✅ 避免同步时意外覆盖用户的修改
3. ✅ 提供清晰的规则，让用户知道如何安全地扩展
4. ✅ 确保用户自定义规则具有**最高优先级**

### 8.2 目录模式：文件名前缀规避

#### 8.2.1 设计方案

**命名约定**：

- `000-799` 前缀范围：**自动生成区域**（程序管理）
- `800-999` 前缀范围：**用户自定义区域**（用户管理）

**工作原理**：

```
.cursor/rules/
├── 001-project-overview.mdc        ← 自动生成（会被覆盖/删除）
├── 200-typescript-style.mdc        ← 自动生成（会被覆盖/删除）
├── 500-react-guidelines.mdc       ← 自动生成（会被覆盖/删除）
├── 800-team-conventions.mdc       ← 用户创建（程序不碰）
└── 900-project-specific.mdc       ← 用户创建（程序不碰）
```

**同步行为**：

1. 程序仅删除/覆盖 `000-799` 前缀的文件
2. `800-999` 前缀的文件**完全不受影响**
3. 无前缀或其他前缀的文件保持不变（向后兼容）

#### 8.2.2 优先级机制

**不同 AI 工具的优先级规则（官方确认状态）**：

| AI 工具            | 优先级机制                                                                            | 官方确认        | 数据来源                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Cursor**         | 文件名数字越小优先级越高（001 > 999）<br/>最后读取的文件用于覆盖前面的                | ⚠️ **社区经验** | 社区讨论，**无官方文档确认**<br/>需实际测试验证                                                                  |
| **GitHub Copilot** | 所有指令合并使用<br/>冲突时行为不确定<br/>优先级: 个人 > 仓库 > 组织                  | ✅ **已确认**   | [官方文档](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot) |
| **Continue**       | 按字典序加载规则<br/>优先级: Hub 助手 > 引用 Hub > 本地 > 全局<br/>支持 `alwaysApply` | ✅ **已确认**   | [GitHub 源码](https://github.com/continuedev/continue)<br/>文档明确说明                                          |
| **Windsurf**       | 待确认                                                                                | ❌ **无文档**   | 无官方资料                                                                                                       |
| **Cline**          | 优先级: 语言偏好 > 全局 > 本地 > 外部规则<br/>相同层级按路径排序                      | ✅ **已确认**   | [GitHub 源码](https://github.com/cline/cline)<br/>代码实现可查                                                   |
| **Aide**           | 待确认                                                                                | ❌ **无文档**   | 无官方资料                                                                                                       |

**图例说明**：

- ✅ **已确认**: 有官方文档或开源代码证实
- ⚠️ **社区经验**: 社区讨论和使用经验，但缺乏官方确认，**建议实际测试验证**
- ❌ **无文档**: 完全无官方资料，仅提供保守策略

**Cursor 的具体行为（基于社区经验，未经官方确认）**：

```
优先级顺序（社区观察）：
001-xxx.mdc  →  最高优先级（首先读取）
500-xxx.mdc  →  中等优先级
800-xxx.mdc  →  用户自定义区
999-xxx.mdc  →  最后读取
```

**⚠️ 重要警告**: 由于 Cursor 的优先级机制**未经官方确认**，我们采用**保守策略**：

- `000-799` 前缀范围：自动生成区域（程序管理）
- `800-999` 前缀范围：用户自定义区域（用户管理，程序不碰）
- 这样无论 Cursor 实际优先级如何，都能保证用户规则不被覆盖

**推荐策略**：

- 如果用户想让自定义规则**优先级更高**，使用 `800-849` 范围
- 如果只是补充规则，使用 `850-899` 范围
- 如果是兜底规则，使用 `900-999` 范围

**其他工具的差异**：

- **Continue**: 按字典序加载，建议用数字前缀（`01-`, `02-`）控制顺序
- **GitHub Copilot**: 没有文件排序概念，所有指令会被合并

**最佳实践**: 如果自定义规则需要覆盖自动规则，建议在规则内容中**显式声明**：

```markdown
---
id: team-typescript-naming
title: 团队 TypeScript 命名约定
priority: critical # 使用最高优先级
---

> ⚠️ **注意**: 此规则覆盖默认的 TypeScript 命名规范

# 团队特殊命名约定

我们团队使用 snake_case 命名数据库字段相关变量...
```

#### 8.2.3 用户指南

**创建自定义规则文件**：

```bash
# 1. 进入 rules 目录
cd .cursor/rules

# 2. 创建自定义规则文件（使用 800-999 前缀）
touch 850-my-team-rules.mdc

# 3. 编辑文件
code 850-my-team-rules.mdc
```

**文件命名建议**：

| 前缀范围  | 用途                                   | 示例                            |
| --------- | -------------------------------------- | ------------------------------- |
| `800-849` | 高优先级自定义规则（可能覆盖自动规则） | `820-team-overrides.mdc`        |
| `850-899` | 常规自定义规则                         | `850-project-specific.mdc`      |
| `900-949` | 补充规则和最佳实践                     | `900-code-review-checklist.mdc` |
| `950-999` | 低优先级规则、FAQ                      | `990-faq.mdc`                   |

### 8.3 单文件模式：块标记保护

#### 8.3.1 设计方案

**块标记格式**：

```markdown
<!-- TURBO-AI-RULES:BEGIN -->
<!-- ⚠️  WARNING: Auto-generated content - Will be overwritten on sync -->
<!-- ⚠️  警告：自动生成内容 - 同步时会被覆盖 -->
<!-- Last Sync: 2025-10-24 10:30:00 -->
<!-- Sources: company-rules (15), personal-rules (8) | Total: 23 rules -->

# TypeScript 编码规范

## 命名约定

- 使用 camelCase 命名变量和函数
- 使用 PascalCase 命名类和接口
  ...

# React 最佳实践

...

<!-- TURBO-AI-RULES:END -->

<!-- ================================================================ -->
<!-- 🎯 自定义规则区域（优先级最高） -->
<!-- ✅ 在下方添加你的自定义规则 -->
<!-- ✅ 此区域内容不会被同步覆盖 -->
<!-- ✅ 可以覆盖上方自动生成的规则 -->
<!-- ✅ AI 会优先遵循此区域的规则 -->
<!-- ================================================================ -->

# 🎯 我的自定义规则

## 项目特定约定

### API 调用规范

我们项目所有 API 调用必须：

1. 使用统一的 `apiClient` 封装
2. 添加 loading 状态管理
3. 实现请求取消功能
   ...
```

#### 8.3.2 同步逻辑

**生成算法**：

```typescript
function generateSingleFile(rules: Rule[], outputPath: string): string {
  // 1. 生成自动内容块
  const autoContent = generateAutoContent(rules);
  const autoBlock = wrapWithBlockMarkers(autoContent);

  // 2. 检查是否存在现有文件
  if (!fs.existsSync(outputPath)) {
    // 首次生成：自动块 + 用户区域模板
    return autoBlock + '\n\n' + USER_SECTION_TEMPLATE;
  }

  // 3. 提取用户自定义内容（块外的所有内容）
  const existingContent = fs.readFileSync(outputPath, 'utf-8');
  const userContent = extractUserContent(existingContent);

  // 4. 合并：新的自动块 + 保留的用户内容
  return autoBlock + '\n\n' + userContent;
}

/**
 * 提取用户自定义内容（移除块标记区域）
 */
function extractUserContent(content: string): string {
  const blockRegex = /<!--\s*TURBO-AI-RULES:BEGIN\s*-->[\s\S]*?<!--\s*TURBO-AI-RULES:END\s*-->/g;
  const userContent = content.replace(blockRegex, '').trim();

  // 如果用户内容为空，返回模板
  return userContent || USER_SECTION_TEMPLATE;
}
```

**关键特性**：

- ✅ **精确提取**：仅移除块标记之间的内容
- ✅ **格式保留**：用户内容的所有格式、空行、注释完全保留
- ✅ **零干预**：程序不对用户内容做任何处理（连格式化都不做）

#### 8.3.3 优先级机制

**AI 读取顺序**：

虽然文件是自上而下的，但我们通过**内容提示**确保 AI 优先考虑用户规则：

```markdown
<!-- TURBO-AI-RULES:BEGIN -->

> 📌 **优先级说明**:
> 本文件底部的"🎯 自定义规则"部分拥有**最高优先级**。
> 如果自定义规则与此处规则冲突，请**优先遵循自定义规则**。

# TypeScript 规范

使用 camelCase 命名变量...

<!-- TURBO-AI-RULES:END -->

# 🎯 我的自定义规则（⚠️ 最高优先级）

## 团队命名约定

我们团队对数据库字段使用 snake_case 命名...
```

**工作原理**：

1. AI 读取整个文件内容
2. 看到明确的优先级说明
3. 优先应用标记为"最高优先级"的规则
4. 如有冲突，自定义规则覆盖自动规则

#### 8.3.4 用户指南

**编辑单文件配置**：

```bash
# 打开配置文件
code .github/.copilot-instructions.md

# 或 code .cursorrules
```

**编辑规则**：

1. ✅ **在块外添加内容**（推荐在文件底部）

   ```markdown
   <!-- TURBO-AI-RULES:END -->

   # 🎯 我的规则

   ...
   ```

2. ❌ **不要修改块内内容**（会被覆盖）

   ```markdown
   <!-- TURBO-AI-RULES:BEGIN -->

   ❌ 不要在这里修改

   <!-- TURBO-AI-RULES:END -->
   ```

3. ✅ **自定义内容位置灵活**

   ```markdown
   # 开头的自定义内容也会保留

   <!-- TURBO-AI-RULES:BEGIN -->

   ...

   <!-- TURBO-AI-RULES:END -->

   # 中间的自定义内容

   # 结尾的自定义内容（推荐）
   ```

### 8.4 最佳实践建议

#### 8.4.1 目录模式

**推荐结构**：

```
.cursor/rules/
├── 001-project-overview.mdc       ← 自动：项目概览
├── 100-coding-style.mdc           ← 自动：编码规范
├── 200-typescript.mdc             ← 自动：TypeScript 规则
├── 300-react.mdc                  ← 自动：React 规则
├── 820-team-overrides.mdc         ← 用户：团队覆盖规则（高优先级）
├── 850-project-specific.mdc      ← 用户：项目特定规则
└── 900-code-review.mdc            ← 用户：代码审查清单
```

**命名技巧**：

- 使用描述性名称：`820-team-typescript-overrides.mdc`
- 同一主题使用相近前缀：`850-api-conventions.mdc`, `851-api-error-handling.mdc`
- 避免与自动生成文件同名

#### 8.4.2 单文件模式

**推荐结构**：

```markdown
<!-- 自动生成的通用规则 -->
<!-- TURBO-AI-RULES:BEGIN -->

[通用规则...]

<!-- TURBO-AI-RULES:END -->

<!-- 分隔线 -->
<!-- ================================================ -->

<!-- 团队/项目特定规则 -->

# 🎯 [项目名] 自定义规则

## 1. 架构约定

## 2. API 规范

## 3. 代码审查标准

## 4. 特殊工具使用
```

**编写技巧**：

- 使用醒目的标题（如 `🎯` emoji）
- 在规则开头声明优先级
- 提供具体的代码示例
- 引用项目实际代码位置

### 8.5 冲突处理

**场景 1: 目录模式文件名冲突**

```
问题: 用户创建了 500-my-rules.mdc (在自动生成范围内)
解决:
1. 同步时检测到文件名冲突
2. 显示警告提示用户重命名
3. 暂时跳过覆盖该文件
4. 建议用户重命名为 800+ 前缀
```

**场景 2: 单文件模式块内修改**

```
问题: 用户修改了块内的内容
解决:
1. 同步时检测到块内容被修改
2. 显示警告消息
3. 询问用户：
   - 选项 A: 覆盖（丢弃修改）
   - 选项 B: 备份块内修改到文件底部
   - 选项 C: 取消同步
```

**场景 3: 规则内容冲突**

```
问题: 自动规则和自定义规则给出相反的建议
解决:
1. 在生成的文件中明确标注优先级
2. 由 AI 根据优先级标记决定
3. 用户可以在自定义规则中显式声明"覆盖"
```

### 8.6 实现检查清单

**目录模式**：

- [ ] 实现前缀范围检测（000-799 vs 800-999）
- [ ] 同步前扫描现有文件，识别用户文件
- [ ] 跳过用户前缀范围的文件（800-999）
- [ ] 检测文件名冲突并警告用户
- [ ] 更新索引生成逻辑（可选包含用户文件）
- [ ] 提供配置选项：用户前缀范围（默认 800-999）

**单文件模式**：

- [ ] 实现块标记解析（正则提取块外内容）
- [ ] 实现用户内容提取和保存
- [ ] 实现智能合并逻辑（块内自动 + 块外用户）
- [ ] 首次生成时添加用户区域模板和说明
- [ ] 检测块内修改并警告用户（可选）
- [ ] 提供块标记自定义配置

**通用功能**：

- [ ] 添加 `protectUserRules` 配置选项
- [ ] 提供用户规则检测工具函数
- [ ] 生成时添加警告注释（自动生成区域）
- [ ] 支持不同 AI 工具的特定配置

**文档和测试**：

- [x] 设计文档：标注官方确认和未确认的优先级
- [ ] README 添加用户自定义规则指南（Q10-Q11）
- [ ] 提供目录模式命名建议和示例
- [ ] 提供单文件模式编辑示例
- [ ] 说明不同 AI 工具的优先级差异
- [ ] 添加单元测试：前缀检测、块标记解析
- [ ] 添加集成测试：用户文件保护

**注意事项**：

- ⚠️ Cursor 的优先级机制未经官方确认，采用保守策略
- ✅ 确保向后兼容：无配置时不影响现有行为
- ✅ 用户文件检测要准确，避免误删
- ✅ 提供清晰的错误提示和建议

## 9. 总结

这个设计方案:

- ✅ 满足多样性需求(支持任意数量的自定义适配器)
- ✅ 满足灵活性需求(文件/目录、过滤规则、组织方式)
- ✅ 复用现有逻辑(RulesAdapter 变为 CustomAdapter 特例)
- ✅ 向后兼容(默认行为不变)
- ✅ 易于配置(清晰的 JSON schema)
- ✅ 可扩展(预留模板、钩子等扩展点)
- ✅ **保护用户内容**(目录前缀 + 单文件块标记)
- ✅ **优先级明确**(用户规则最高优先级)
- ✅ **职责分明**(程序管自动区，用户管自定义区)
