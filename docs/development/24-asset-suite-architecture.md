# 资产化与适配器综合体架构设计

> **关联文档**: [10-data-model.md](./10-data-model.md), [20-architecture.md](./20-architecture.md), [21-adapter-design.md](./21-adapter-design.md)

---

## 1. 背景与问题

Turbo AI Rules v2.x 的核心模型是：

- `Rule`（规则）
- `Adapter`（适配器）
- `Rule Adapter` / `Skill Adapter` 二分

该模型在只处理 `.md` / `.mdc` 规则和 `SKILL.md` 目录时运作良好，但随着 Claude、Copilot 及其他 AI 工具持续引入新的运行时概念，系统开始面临以下问题：

1. **语义失真**：不是所有可同步对象都是“规则”
   - `CLAUDE.md`
   - `.instructions.md`
   - `.agent.md`
   - `.prompt.md`
   - `SKILL.md`
   - `.json/.yaml` 配置片段

2. **概念追逐**：如果按 AI 工具或产品命名持续新增预设，扩展将被各工具的术语体系牵着走。

3. **用户操作复杂**：同一个工具往往需要多个原子适配器，用户在同步页中逐个勾选成本高。

4. **展示层过窄**：当前规则列表本质是“规则/技能”二分，无法自然承载更多资产类型。

因此，v3.0.0 的核心目标不是继续增加“某工具专属适配器”，而是将系统升级为：

> **面向 AI 资产（Asset）的通用同步与安装框架**。

---

## 2. v3 核心目标

### 2.1 总体目标

将 Turbo AI Rules 从“AI 规则生成器”升级为：

> **AI Asset Sync / AI Asset Installer**

### 2.2 设计目标

- **通用性**：未来新增概念时，优先表现为新增资产类型，而不是新增一整套工具分支
- **稳定性**：原子适配器继续负责最小安装行为，避免重新引入大而全的工具适配器
- **可扩展性**：支持 `markdown / mdc / json / yaml / directory` 等多种输入资产
- **易操作性**：通过 `Adapter Suite`（适配器综合体）降低同步页选择复杂度
- **可迁移性**：v2.x 的自定义适配器能力最大化复用

---

## 3. 新的四层模型

v3 采用四层模型：

```text
Asset → Adapter → Adapter Suite → Sync Plan
```

### 3.1 Asset（资产）

表示从规则源扫描出的一个“可同步单元”。

它不再强制被称为 Rule，而是按语义分类。

### 3.2 Adapter（原子适配器）

最小安装单元，描述：

- 接收哪些资产
- 使用什么安装模式
- 输出到哪个目标路径

### 3.3 Adapter Suite（适配器综合体）

由多个原子适配器组成的编组，用于同步页和用户操作层。

例如：

- `claude-core`
- `copilot-core`
- `shared-core`

### 3.4 Sync Plan（同步计划）

描述一次同步操作的执行上下文：

- 选中了哪些资产
- 选中了哪些 Suite / Adapter
- 冲突策略是什么
- 是否 dry-run

---

## 4. 资产模型（Asset Model）

### 4.1 资产类型

建议的核心资产类型：

```ts
type AssetKind =
  | 'rule'
  | 'instruction'
  | 'skill'
  | 'agent'
  | 'prompt'
  | 'command'
  | 'hook'
  | 'mcp'
  | 'unknown';
```

### 4.2 数据结构

```ts
interface ParsedAsset {
  id: string;
  sourceId: string;
  filePath: string;
  relativePath: string;
  kind: AssetKind;
  format: 'markdown' | 'mdc' | 'json' | 'yaml' | 'directory';
  title?: string;
  metadata?: Record<string, unknown>;
  rawContent?: string;
  rootDir?: string;
  entryFile?: string;
}
```

### 4.3 设计原则

- `ParsedRule` 在 v3 中降级为 `ParsedAsset(kind='rule')` 的特例
- Skill、Agent、Prompt、Command 等被视为同级资产，不再被“规则模型”硬塞进去
- 目录型资产（如 `SKILL.md` 所在目录）必须能被完整表达

---

## 5. 资产分类器（Asset Classifier）

### 5.1 核心职责

系统不再只按扩展名解析，而是先**扫描候选文件**，再做**语义分类**。

### 5.2 分类依据

#### 文件名规则

- `SKILL.md` → `skill`
- `*.agent.md` → `agent`
- `*.prompt.md` → `prompt`
- `CLAUDE.md` → `instruction`
- `AGENTS.md` → `instruction`

#### 目录规则

- `.claude/skills/<name>/SKILL.md` → `skill`
- `.github/skills/<name>/SKILL.md` → `skill`
- `.github/prompts/*.prompt.md` → `prompt`
- `.github/agents/*.agent.md` → `agent`
- `.github/hooks/*.json` → `hook`
- `.vscode/mcp.json` → `mcp`

#### 内容规则

- frontmatter 含 `applyTo` → 倾向 `instruction`
- frontmatter 含 `tools` / `agents` → 倾向 `agent`
- JSON 根对象含 `hooks` → `hook`
- JSON 根对象含 `servers` 且文件名为 `mcp.json` → `mcp`

### 5.3 扫描格式扩展

v3 资产扫描默认应支持：

- `.md`
- `.mdc`
- `.json`
- `.yaml`
- `.yml`

说明：

- “支持扫描”不等于“全部作为规则解析”
- 解析器应按资产类型分发，而不是继续由 `MdcParser` 独占入口

---

## 6. 原子适配器模型（Adapter Model）

### 6.1 核心思想

适配器不再主要按“工具名”抽象，而是按“安装行为”抽象。

### 6.2 建议的安装模式

```ts
type InstallMode =
  | 'aggregate-file'
  | 'copy-file'
  | 'copy-directory'
  | 'merge-json'
  | 'merge-yaml';
```

### 6.3 数据结构

```ts
interface AdapterInput {
  kinds?: AssetKind[];
  sourceIds?: string[];
  formats?: string[];
  includePatterns?: string[];
  excludePatterns?: string[];
}

interface AdapterOutput {
  path: string;
  mode: InstallMode;
  preserveDirectoryStructure?: boolean;
  organizeBySource?: boolean;
  sortBy?: 'id' | 'priority' | 'none';
  sortOrder?: 'asc' | 'desc';
}

interface AdapterDefinition {
  id: string;
  name: string;
  enabled: boolean;
  input: AdapterInput;
  output: AdapterOutput;
}
```

### 6.4 与 v2 CustomAdapter 的关系

v2 的 `CustomAdapter` 不是被废弃，而是被提升为 v3 的基础能力：

- `fileExtensions` → 将逐步让位于 `input.kinds` + `formats`
- `outputPath`、`outputType`、`organizeBySource`、`preserveDirectoryStructure` 等配置继续保留
- 技能目录复制逻辑将推广为通用 `copy-directory` 能力

---

## 7. 适配器综合体（Adapter Suite）

### 7.1 定义

`Adapter Suite` 是多个原子适配器的编组，用于降低同步页的选择复杂度。

它是**用户操作层的抽象**，不是新的文件写入器。

### 7.2 数据结构

```ts
interface AdapterSuite {
  id: string;
  name: string;
  description?: string;
  adapterIds: string[];
  enabled?: boolean;
  tags?: string[];
}
```

### 7.3 示例

```yaml
suites:
  - id: claude-minimal
    name: Claude Minimal
    adapterIds:
      - claude-md
      - claude-rules

  - id: claude-core
    name: Claude Core
    adapterIds:
      - claude-md
      - claude-rules
      - claude-skills
      - claude-agents
      - claude-commands

  - id: copilot-core
    name: Copilot Core
    adapterIds:
      - copilot-instructions-root
      - copilot-instructions-files
      - copilot-skills
      - copilot-agents
      - copilot-prompts
```

### 7.4 设计边界

Adapter Suite 只负责：

- 编组原子适配器
- 提供产品层语义
- 减少同步页的用户操作成本

Adapter Suite **不负责**：

- 直接写文件
- 自己做聚合/复制/合并
- 替代适配器底层逻辑

---

## 8. 同步计划（Sync Plan）

```ts
interface SyncPlan {
  selectedAssetIds: string[];
  selectedSuiteIds: string[];
  selectedAdapterIds?: string[];
  conflictStrategy?: 'overwrite' | 'merge' | 'skip';
  dryRun?: boolean;
}
```

### 8.1 原则

- 默认用户只选择 `Suite`
- 高级模式才展开到原子 `Adapter`
- `SyncPlan` 是一次执行任务，不是长期配置本身

---

## 9. 同步页（Rule Sync Page）重构建议

### 9.1 左侧：资产浏览器

由“规则树”升级为“资产树”，按资产类型分组：

- Rules
- Instructions
- Skills
- Agents
- Prompts
- Commands
- Hooks
- MCP
- Unknown

每组下再按：

- sourceId
- 目录层级

### 9.2 右侧：目标选择器

默认展示 `Adapter Suite`：

- Claude Core
- Copilot Core
- Shared Core

高级模式支持展开到原子 Adapter，例如：

```text
Claude Core
  ✓ claude-md
  ✓ claude-rules
  ✓ claude-skills
  ✓ claude-agents
  ☐ claude-commands
```

### 9.3 用户收益

- 普通用户不需要面对大量原子适配器
- 高级用户仍可精细控制
- Suite 成为同步页主入口，Adapter 成为高级展开层

---

## 10. 对 ai-rules 仓库的影响

该架构的一个重要好处是：

> 内容仓库保持中立，安装仓库负责目标工具编排。

也就是说，`ai-rules` 应优先提供通用资产，而不是直接按某个工具的目录强耦合组织。

长期建议：

- 通用规则资产与运行时 AI 资产分层
- 通过 Turbo AI Rules 的分类器和适配器安装到目标工具目录
- 避免在内容仓库中硬编码过多工具专属入口

---

## 11. 分阶段实施建议

### Phase 1：资产化基础

- 引入 `ParsedAsset` 与 `AssetKind`
- 扩展扫描格式到 `md/mdc/json/yaml`
- 新增 `AssetClassifier`
- 保持现有 `CustomAdapter` 能力继续可用

### Phase 2：UI 重构

- 规则列表升级为资产列表
- 支持按资产类型分类展示
- 统一 `rule-selections.json` / `skill-selections.json` 到更通用的资产选择存储（可分阶段过渡）

### Phase 3：Adapter Suite

- 引入 `AdapterSuite` 数据模型
- 同步页以 Suite 为主要目标选择入口
- 支持展开查看/控制内部原子适配器

### Phase 4：结构化安装

- 引入 `merge-json` / `merge-yaml` 等安装模式
- 支持 `hook`、`mcp` 等结构化资产
- 增强 dry-run、预览、冲突报告能力

---

## 12. 为什么这是 3.0.0

这是典型的主版本升级，原因包括：

1. **核心模型变化**：`Rule` 中心模型升级为 `Asset` 中心模型
2. **展示层变化**：同步页和选择器语义发生根本变化
3. **配置语义扩展**：适配器将逐步支持 `input.kinds`、Suite 等新配置
4. **内部边界重构**：解析器入口、状态存储、UI 数据结构都将受到影响

因此，这不是一次普通功能增强，而是：

> **Turbo AI Rules 从“规则同步器”向“AI 资产同步器”的主版本演进。**

---

## 13. 结论

v3.0.0 的核心不是新增更多“某工具适配器”，而是建立一套更稳定的通用抽象：

- Asset 负责表达内容语义
- Adapter 负责最小安装行为
- Adapter Suite 负责用户操作层编组
- Sync Plan 负责一次执行任务

该模型能够让系统未来面对新的 AI 工具或新概念时，只需新增资产类型、分类规则或安装映射，而无需被各家术语体系反复拉扯。

---

> **返回**: [03-design.md](./03-design.md) · [20-architecture.md](./20-architecture.md) · [21-adapter-design.md](./21-adapter-design.md)
