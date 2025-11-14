# 自定义适配器设计方案

# 自定义适配器设计

## 目标

- 将 `RulesAdapter` 抽象为通用 `CustomAdapter`，支持多适配器并存。
- 输出模式：`file`（单文件合并）与 `directory`（多文件组织）。
- 过滤：可选 `fileExtensions`；不配置=不过滤。
- 组织：目录模式可按源 ID 分目录，支持生成索引。

## 配置结构（摘录）

```ts
export interface CustomAdapterConfig extends AdapterConfig {
  id: string;
  name: string;
  outputPath: string;
  outputType: 'file' | 'directory';
  fileExtensions?: string[];
  organizeBySource?: boolean;
  generateIndex?: boolean;
  indexFileName?: string;
}
```

## 关键行为

- 文件模式：合并规则到单文件；按优先级排序；可过滤后缀。
- 目录模式：可按源组织；可生成索引（`indexFileName`）。
- 向后兼容：无自定义配置时，自动注入默认 `rules/` 目录适配器。

## 用户自定义规则保护（摘要）

- 目录模式：`000-799` 自动生成区；`800-999` 用户区（不覆盖）。
- 单文件模式：自动块 `<!-- TURBO-AI-RULES:BEGIN/END -->` 外保留用户内容。

## Schema（package.json 摘录）

- `turbo-ai-rules.adapters.custom[]`：数组；`id/name/outputPath/outputType` 必填。
- `fileExtensions`：可选；不填=同步所有文件。
- `organizeBySource/generateIndex/indexFileName`：仅目录模式生效。

## 测试建议

- 单元：两种模式与过滤；用户区保护；块标记解析。
- 集成：多个自定义适配器并存与向后兼容。
