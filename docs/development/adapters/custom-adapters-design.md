# 自定义适配器设计方案

# 自定义适配器设计

## 目标

- 将 `RulesAdapter` 抽象为通用 `CustomAdapter`，支持多适配器并存。
- 输出模式：`file`（单文件合并）与 `directory`（多文件组织）。
- 过滤：可选 `fileExtensions`；不配置=不过滤。
- 组织：目录模式可按源 ID 分目录（默认 false 为平铺），支持生成索引。
- **Skills 支持**：通过 `isRuleType: false` 标识技能类型，使用 `sourceId + subPath` 复用已有规则源配置。

## 配置结构（摘录）

```ts
export interface CustomAdapterConfig extends AdapterConfig {
  id: string;
  name: string;
  outputPath: string;
  outputType: 'file' | 'directory';
  fileExtensions?: string[];
  organizeBySource?: boolean; // 默认 false
  useOriginalFilename?: boolean; // 默认 true
  generateIndex?: boolean;
  indexFileName?: string;

  // Skills 适配器配置（isRuleType=false 时使用）
  sourceId?: string; // 复用已有规则源的 ID
  subPath?: string; // 技能文件在源仓库中的子目录
}
```

### Skills 配置说明

- **skills**: 布尔值，设为 `true` 表示这是一个技能适配器
- **sourceId**: 引用已配置的规则源 ID，复用其 Git 仓库、分支、认证等配置
- **subPath**: 可选，指定技能文件在源仓库中的子目录（相对于仓库根目录，如 `/skills`）

**工作原理**：

- 技能适配器通过 `sourceId` 复用已有规则源的 Git 仓库配置
- `subPath` 直接指定仓库中的路径，**不与**源的 `subPath` 拼接
- 例如：源配置了 `subPath: '/rules'`，技能适配器配置 `subPath: '/skills'`，则：
  - 源同步 `仓库根/rules` 的内容
  - 技能适配器同步 `仓库根/skills` 的内容

**示例**：

```json
{
  "id": "claude-skills",
  "name": "Claude Skills",
  "enabled": true,
  "autoUpdate": true,
  "outputPath": ".claude/skills",
  "outputType": "directory",
  "skills": true,
  "sourceId": "my-ai-repo",
  "subPath": "/skills"
}
```

这个配置会从 `my-ai-repo` 源的 `/skills` 子目录同步技能文件到 `.claude/skills` 目录。

## 关键行为

- 文件模式：合并规则到单文件；按优先级排序；可过滤后缀。
- 目录模式：可按源组织；可生成索引（`indexFileName`）。
- 向后兼容：无自定义配置时，自动注入默认 `rules/` 目录适配器。
- **Skills 模式**：
  - 当 `skills: true` 时，适配器从指定的 `sourceId` 源获取文件
  - `subPath` 是相对于**仓库根目录**的路径，与源的 `subPath` 独立配置
  - 技能文件通常保持独立（目录模式），不合并
  - 技能文件直接复制，不进行规则合并或格式转换
  - 适用场景：AI 工具的知识库/技能库（如 Claude Skills、Cursor Skills）

## 用户自定义规则保护（摘要）

- 目录模式：`00000-79999` 自动生成区；`80000-99999` 用户区（不覆盖）。
- 单文件模式：自动块 `<!-- TURBO-AI-RULES:BEGIN/END -->` 外保留用户内容。

## Schema（package.json 摘录）

- `turbo-ai-rules.adapters.custom[]`：数组；`id/name/outputPath/outputType` 必填。
- `fileExtensions`：可选；不填=同步所有文件。
- `organizeBySource/generateIndex/indexFileName`：仅目录模式生效。
- **Skills 字段**：
  - `skills`：可选布尔值，默认 `false`
  - `sourceId`：当 `skills: true` 时建议配置，指定要复用的规则源 ID
  - `subPath`：可选，指定技能文件在源中的子目录路径

## 测试建议

- 单元：两种模式与过滤；用户区保护；块标记解析。
- 集成：多个自定义适配器并存与向后兼容。
