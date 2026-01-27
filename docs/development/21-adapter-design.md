# 适配器设计

> 本文档描述 Turbo AI Rules 的适配器架构、接口设计和扩展机制。

---

## 1. 适配器架构

### 1.1 适配器的作用

适配器是 Turbo AI Rules 的核心扩展点，负责：

- 将通用规则格式转换为 AI 工具特定格式
- 处理不同 AI 工具的配置文件位置和命名
- 支持自定义规则模板和渲染逻辑
- 提供工具特定的优化和增强

### 1.2 适配器分类（新架构）

**v2.0+ 配置驱动架构**：

```
┌────────────────────────────────────────────────────┐
│              AIToolAdapter (基类)                  │
│  • 定义通用接口和抽象方法                         │
│  • 提供默认实现和辅助方法                         │
└────────────────────────────────────────────────────┘
                      ↓
    ┌─────────────────┴──────────────────────┐
    ↓                                         ↓
┌──────────────────────────┐      ┌─────────────────────┐
│   预设适配器（配置驱动） │      │   自定义适配器       │
│ • PresetAdapter          │      │ • CustomAdapter     │
│   - 通过 PRESET_ADAPTERS │      │   (用户提供模板)    │
│     配置列表定义         │      │                     │
│   - 统一实现逻辑         │      │                     │
│   - 易于扩展新工具       │      │                     │
└──────────────────────────┘      └─────────────────────┘
```

**关键改进**：

- ✅ **配置化**: 预设适配器通过配置列表 `PRESET_ADAPTERS` 定义，不再需要为每个工具创建独立类
- ✅ **统一实现**: 所有预设适配器共享同一个 `PresetAdapter` 类，减少代码重复
- ✅ **易于扩展**: 添加新工具只需在配置列表中添加一项，无需修改代码逻辑
- ⚠️ **兼容性**: 旧的独立类（CursorAdapter, CopilotAdapter, ContinueAdapter）保留作为兼容层，将在下一主版本移除

### 1.3 适配器分类：规则 vs 技能

**v2.0+ 引入 `isRuleType` 标识**：

```typescript
interface AdapterConfig {
  id: string;
  enabled: boolean;
  isRuleType?: boolean;  // true=规则适配器, false=技能适配器
  // ...
}
```

**两种适配器类型**：

| 类型 | `isRuleType` | 用途 | 示例 | 特殊处理 |
|------|-------------|------|------|----------|
| **规则适配器** | `true`（默认） | AI 编程规则 | Cursor, Copilot, Continue | block markers 保护用户规则 |
| **技能适配器** | `false` | AI 技能/工具 | Skills, Custom Tools | skill.md 识别和目录保留 |

**核心差异**：

1. **快速同步支持**
   - 规则适配器：✅ 支持（sidebar 快速同步按钮）
   - 技能适配器：❌ 不支持（仅通过 dashboard sync page）

2. **用户内容保护**
   - 规则适配器：通过 `<!-- TURBO-AI-RULES:BEGIN/END -->` markers
   - 技能适配器：通过识别 `skill.md` 文件及其父目录

3. **清理策略**
   - 规则适配器：保留 markers 内的用户规则部分
   - 技能适配器：保留包含 `skill.md` 的完整目录

4. **输出模式**
   - 规则适配器：单文件或目录模式
   - 技能适配器：通常使用目录模式（`outputType: 'directory'`）

---

## 2. 适配器基类 (AIToolAdapter)

### 2.1 核心职责

- 定义适配器接口和生命周期
- 提供通用的规则过滤和排序逻辑
- 处理错误和日志记录
- 支持配置验证和默认值

### 2.2 关键方法

- `generate(rules: ParsedRule[]): Promise<GeneratedConfig>` - 生成配置内容
- `getFilePath(): string` - 返回目标文件路径
- `validate(content: string): boolean` - 验证生成的配置
- `enabled: boolean` - 是否启用
- `name: string` - 适配器名称

### 2.3 通用辅助方法

BaseAdapter 提供以下辅助方法供子类使用：

- `formatRules(rules: ParsedRule[]): string` - 格式化规则内容
- `generateMetadata(ruleCount: number): string` - 生成元数据注释
- `generateFileHeader(toolName: string, ruleCount: number): string` - 生成文件头部
- `generateTableOfContents(rules: ParsedRule[]): string` - 生成目录
- `sortByPriority(rules: ParsedRule[]): ParsedRule[]` - 按优先级排序
- `groupByTag(rules: ParsedRule[]): Map<string, ParsedRule[]>` - 按标签分组

---

## 3. 预设适配器（新架构）

### 3.1 配置结构

预设适配器通过 `PresetAdapterConfig` 接口定义：

```typescript
export interface PresetAdapterConfig {
  id: string; // 适配器 ID (kebab-case)
  name: string; // 显示名称
  filePath: string; // 目标文件路径
  type: 'file' | 'directory'; // 文件类型
  defaultEnabled?: boolean; // 默认是否启用
  description?: string; // 工具描述
  website?: string; // 官网链接
}
```

### 3.2 当前支持的预设适配器

**IDE 集成类**：

| ID         | 名称           | 文件路径                          | 默认状态 |
| ---------- | -------------- | --------------------------------- | -------- |
| `cursor`   | Cursor         | `.cursorrules`                    | ✅ 启用  |
| `windsurf` | Windsurf       | `.windsurfrules`                  | ❌ 禁用  |
| `copilot`  | GitHub Copilot | `.github/copilot-instructions.md` | ❌ 禁用  |

**VSCode 扩展类**：

| ID          | 名称      | 文件路径         | 默认状态 |
| ----------- | --------- | ---------------- | -------- |
| `continue`  | Continue  | `.continuerules` | ❌ 禁用  |
| `cline`     | Cline     | `.clinerules`    | ❌ 禁用  |
| `roo-cline` | Roo-Cline | `.roorules`      | ❌ 禁用  |

**命令行工具**：

| ID      | 名称  | 文件路径          | 默认状态 |
| ------- | ----- | ----------------- | -------- |
| `aider` | Aider | `.aider.conf.yml` | ❌ 禁用  |

**Web 平台类**：

| ID         | 名称     | 文件路径         | 默认状态 |
| ---------- | -------- | ---------------- | -------- |
| `bolt`     | Bolt.new | `.bolt/prompt`   | ❌ 禁用  |
| `qodo-gen` | Qodo Gen | `.qodo/rules.md` | ❌ 禁用  |

### 3.3 通用配置方式

所有预设适配器的配置格式统一：

```json
{
  "turbo-ai-rules.adapters.{id}": {
    "enabled": true,
    "autoUpdate": true,
    "includeMetadata": true
  }
}
```

示例：

```json
{
  "turbo-ai-rules.adapters.cursor": {
    "enabled": true
  },
  "turbo-ai-rules.adapters.windsurf": {
    "enabled": true
  },
  "turbo-ai-rules.adapters.cline": {
    "enabled": true
  }
}
```

### 3.4 添加新的预设适配器

只需在 `src/adapters/PresetAdapter.ts` 的 `PRESET_ADAPTERS` 列表中添加配置：

```typescript
{
  id: 'new-tool',
  name: 'New AI Tool',
  filePath: '.newtoolrules',
  type: 'file',
  defaultEnabled: false,
  description: 'Description of the tool',
  website: 'https://example.com'
}
```

**无需额外步骤**：

- ❌ 不需要创建新的适配器类
- ❌ 不需要修改 FileGenerator
- ❌ 不需要修改 Provider
- ✅ 配置会自动被识别和使用

---

## 4. 自定义适配器 (CustomAdapter)

### 4.1 使用场景

- 团队内部的自定义 AI 工具
- 实验性 AI 工具
- 需要特殊格式转换的工具
- 多配置文件需求

### 4.2 配置格式

```json
{
  "turbo-ai-rules.adapters.custom": [
    {
      "id": "my-tool",
      "name": "My Custom Tool",
      "enabled": true,
      "outputPath": ".my-tool-rules",
      "outputType": "file",
      "fileTemplate": "# Rules\n\n{{content}}",
      "isRuleType": true
    }
  ]
}
```

### 4.3 配置字段说明

- `id`: 唯一标识（kebab-case）
- `name`: 显示名称
- `enabled`: 是否启用
- `outputPath`: 输出路径
- `outputType`: 输出类型（file 或 directory）
- `fileTemplate`: 文件模板（单文件模式）
- `isRuleType`: 是否为规则类型（true=参与规则同步，false=独立同步）

---

## 5. 规则转换流程

### 5.1 转换步骤

```
1. 获取合并后的规则列表
   ↓
2. 适配器过滤规则 (如果需要)
   ↓
3. 适配器排序规则（优先级）
   ↓
4. 生成文件头部（元数据 + 标题）
   ↓
5. 生成目录（Table of Contents）
   ↓
6. 格式化规则内容
   ↓
7. 返回最终内容
```

### 5.2 统一输出格式

所有预设适配器生成的文件格式统一：

```markdown
<!-- Generated by Turbo AI Rules at 2024-01-01T00:00:00.000Z -->
<!-- Total rules: 10 -->

# AI Coding Rules for {Tool Name}

> This file is automatically generated by Turbo AI Rules extension.
> Do not edit manually - changes will be overwritten on next sync.

> **{Tool Name}**: {Tool Description}
> **Website**: {Tool Website}

## Table of Contents

- [Rule 1](#rule-1)
- [Rule 2](#rule-2)
  ...

---

{Rule Content 1}

---

{Rule Content 2}

...
```

---

## 6. 规则源标记设计（单文件部分更新支持）

### 6.1 问题背景

对于**单文件适配器**（如 Copilot 的 `copilot-instructions.md`），当一个适配器的规则来自多个规则源时，如果用户只想更新某个规则源的规则，系统需要能够：

1. 识别文件中哪些内容来自哪个规则源
2. 精确替换目标规则源的内容，保留其他内容
3. 保留用户手动添加的内容

### 6.2 标记格式设计

使用 **HTML 注释标记** 来标识每条规则的边界和来源：

```markdown
<!-- Generated by Turbo AI Rules at 2025-12-03T10:00:00.000Z -->
<!-- Total rules: 5 | Sources: team-rules, personal-rules -->

# GitHub Copilot Instructions

<!-- BEGIN_SOURCE source="team-rules" count="3" -->

<!-- BEGIN_RULE source="team-rules" id="typescript-naming" priority="high" -->

## TypeScript Naming Convention

Use camelCase for variables and functions...

<!-- END_RULE -->

<!-- BEGIN_RULE source="team-rules" id="logging" priority="medium" -->

## Logging Standards

Use structured logging with appropriate levels...

<!-- END_RULE -->

<!-- END_SOURCE source="team-rules" -->

<!-- BEGIN_SOURCE source="personal-rules" count="2" -->

<!-- BEGIN_RULE source="personal-rules" id="error-handling" priority="high" -->

## Error Handling

Always use try-catch for async operations...

<!-- END_RULE -->

<!-- END_SOURCE source="personal-rules" -->

<!-- USER-RULES:BEGIN -->
<!-- BEGIN_SOURCE source="user-rules" count="1" -->
<!-- BEGIN_RULE source="user-rules" id="custom-rule" -->

## My Custom Rule

This rule is from ai-rules/ directory.

<!-- END_RULE -->
<!-- END_SOURCE source="user-rules" -->
<!-- USER-RULES:END -->
```

### 6.3 标记说明

| 标记                                      | 说明                                                      | 是否可配置                       |
| ----------------------------------------- | --------------------------------------------------------- | -------------------------------- |
| `BEGIN_SOURCE` / `END_SOURCE`             | 规则源区块边界，包含该源的所有规则                        | ❌ 硬编码                        |
| `BEGIN_RULE` / `END_RULE`                 | 单条规则边界，包含 sourceId、ruleId、priority             | ❌ 硬编码                        |
| `USER-RULES:BEGIN` / `USER-RULES:END`     | 用户规则源外层包裹标记（包裹 sourceId='user-rules' 区域） | ✅ 可配置（`userRules.markers`） |
| `BEGIN_USER_CONTENT` / `END_USER_CONTENT` | 保留未来扩展，当前未使用                                  | ❌ 硬编码                        |

### 6.4 标记属性

- `source`: 规则源 ID（必需）
- `id`: 规则 ID（必需）
- `priority`: 规则优先级（可选）
- `count`: 区块内规则数量（仅 SOURCE 标记）

### 6.5 部分更新流程

```
┌─────────────────────────────────────────────────────────────┐
│  部分更新流程（只更新指定规则源）                            │
├─────────────────────────────────────────────────────────────┤
│  1. 读取现有配置文件                                        │
│  2. 解析 BEGIN_SOURCE/END_SOURCE 标记，提取区块             │
│  3. 识别要更新的规则源区块                                   │
│  4. 保留其他规则源区块和用户内容                             │
│  5. 生成新的目标规则源区块                                   │
│  6. 按规则源顺序重新组装文件                                 │
│  7. 写回文件                                                │
└─────────────────────────────────────────────────────────────┘
```

### 6.6 实现要点

**解析器**:

```typescript
interface SourceBlock {
  sourceId: string;
  startLine: number;
  endLine: number;
  rules: RuleBlock[];
  rawContent: string;
}

interface RuleBlock {
  sourceId: string;
  ruleId: string;
  priority?: string;
  startLine: number;
  endLine: number;
  rawContent: string;
}

// 解析函数签名
function parseSourceBlocks(content: string): SourceBlock[];
function parseUserContent(content: string): string | null;
```

**生成器**:

```typescript
// 生成带标记的规则内容
function generateMarkedRuleContent(rule: ParsedRule): string;

// 生成带标记的规则源区块
function generateSourceBlock(sourceId: string, rules: ParsedRule[]): string;

// 合并区块（部分更新）
function mergeSourceBlocks(
  existingBlocks: SourceBlock[],
  newBlocks: SourceBlock[],
  targetSourceIds: string[],
): string;
```

### 6.7 目录适配器的处理

对于**目录适配器**（如 Cursor 的 `.cursor/rules/`），每条规则是独立文件，天然支持部分更新：

- 文件名可包含规则源前缀：`{sourceId}--{ruleId}.mdc`
- 或在 frontmatter 中标记 `sourceId`
- 删除/更新时按 sourceId 过滤文件
- **目录结构保持** (`preserveDirectoryStructure`)：
  - true（默认）: 保持相对于规则源 `subPath` 的完整目录层级
    - 示例：`subPath=1300-skills/`，文件 `1300-skills/a/b/c/file.md` → `.skills/a/b/c/file.md`
  - false: 平铺所有文件到输出目录（或按源组织时的源子目录）
    - 示例：`1300-skills/a/b/c/file.md` → `.skills/file.md` 或 `.skills/sourceId/file.md`
- **索引文件路径引用**: 自动使用实际生成的文件路径，确保链接正确

### 6.8 兼容性考虑

- 旧版本生成的文件（无标记）：全量覆盖
- 新版本生成的文件（有标记）：支持部分更新
- 标记使用 HTML 注释，不影响 AI 工具解析
- 用户手动编辑标记区域外的内容会被保留

---

## 7. 冲突处理

### 7.1 规则冲突

当多个规则源包含相同 ID 的规则时：

- **priority 策略**: 高优先级覆盖低优先级
- **merge 策略**: 合并规则内容（需适配器支持）
- **skip-duplicates 策略**: 保留第一个，跳过重复

### 7.2 配置冲突

当多个适配器生成相同目标文件时：

- 提示用户配置错误
- 拒绝生成并记录错误
- 建议用户修改配置

### 7.3 冲突标记

在生成的配置文件中添加注释标记冲突来源：

```markdown
<!-- Conflict Detected: Rule 'typescript-strict' from multiple sources -->
<!-- Priority: typescript-official (10) > typescript-team (5) -->
```

---

## 8. 性能优化

### 8.1 模板缓存

- 编译后的模板缓存到内存
- 避免重复编译
- 支持模板热更新

### 8.2 增量生成

- 检测规则是否有变化
- 只有变化时才重新生成
- 保留未变化的配置文件

### 8.3 并行生成

- 多个适配器并行生成配置
- 使用 Promise.all 提高效率
- 控制并发数避免资源耗尽

---

## 9. 错误处理

### 9.1 错误类型

- **TAI-4001**: 生成目标文件失败（权限/磁盘空间）
- **TAI-4002**: 文件覆盖冲突（用户手动修改）
- **TAI-4003**: 模板渲染错误（语法错误）

### 9.2 错误恢复

- 生成失败时保留原文件
- 临时文件清理
- 记录详细日志供排查

### 9.3 用户反馈

- 提示具体错误原因
- 提供修复建议
- 支持跳过失败继续处理其他适配器

---

## 10. 扩展机制

### 10.1 适配器插件

未来可支持适配器插件机制：

- 独立 npm 包
- 通过配置安装和启用
- 热加载和卸载
- 沙箱执行

### 10.2 适配器市场

可建立适配器市场：

- 社区贡献的适配器
- 评分和评论
- 自动更新
- 安全审核

### 10.3 API 稳定性

- 适配器接口遵循语义化版本
- 主版本升级保持向后兼容
- 提供迁移指南

---

> **返回**: [01-design.md](./01-design.md) - 产品整体设计
