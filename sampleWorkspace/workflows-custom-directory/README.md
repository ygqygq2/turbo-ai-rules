# rules for custom adapters

## 📋 测试信息

- **测试文件**: `src/test/suite/（示例工作空间）`
- **测试内容**: 自定义适配器配置示例

---

# 自定义适配器与目录结构保持测试工作区

测试自定义适配器的 `preserveDirectoryStructure` 配置功能。

## 测试目标

1. 验证 `preserveDirectoryStructure=true` 时保持原始目录结构
2. 验证 `preserveDirectoryStructure=false` 时平铺所有文件
3. 验证索引文件中的相对路径正确性
4. 验证自定义适配器的目录组织功能

## 配置说明

本工作区预配置了以下测试适配器（默认禁用）：

### 1. test-preserve-true（保持目录结构）

```json
{
  "id": "test-preserve-true",
  "name": "Test Preserve Structure",
  "enabled": false,
  "outputPath": "test-preserve-structure/true",
  "outputType": "directory",
  "preserveDirectoryStructure": true,
  "organizeBySource": false,
  "generateIndex": true,
  "isRuleType": true
}
```

**预期行为**：

- 在 `test-preserve-structure/true/{sourceId}/` 下保持原始目录结构
- 例如：规则源中的 `1000-general/1001-naming.md` → `test-preserve-structure/true/{sourceId}/1000-general/1001-naming.md`

### 2. test-preserve-false（平铺文件）

```json
{
  "id": "test-preserve-false",
  "name": "Test Flatten Structure",
  "enabled": false,
  "outputPath": "test-preserve-structure/false",
  "outputType": "directory",
  "preserveDirectoryStructure": false,
  "organizeBySource": false,
  "generateIndex": true,
  "isRuleType": true
}
```

**预期行为**：

- 所有文件平铺在 `test-preserve-structure/false/{sourceId}/` 目录下
- 例如：规则源中的 `1000-general/1001-naming.md` → `test-preserve-structure/false/{sourceId}/1001-naming.md`

### 3. test-preserve-index（索引路径测试）

```json
{
  "id": "test-preserve-index",
  "name": "Test Index Paths",
  "enabled": false,
  "outputPath": "test-preserve-structure/index",
  "outputType": "directory",
  "preserveDirectoryStructure": true,
  "generateIndex": true,
  "indexFileName": "index.md",
  "isRuleType": true
}
```

**预期行为**：

- 生成 `test-preserve-structure/index/index.md` 索引文件
- 索引中的链接使用相对路径：`./turbo-ai-rules-source/1001-naming.md`
- 不应包含输出路径本身：**错误**: `./test-preserve-structure/index/...`

## 测试步骤

### 自动化测试

运行集成测试：

```bash
pnpm test:suite:mocha
```

测试文件：`src/test/suite/preserveDirectoryStructure.test.ts`

### 手动测试步骤

#### 1. 同步规则源

```bash
# 在 VSCode 命令面板中运行
Turbo AI Rules: Sync Rules
```

等待同步完成（约 3-5 秒）。

#### 2. 测试保持目录结构

1. 打开工作区配置：`.vscode/settings.json`
2. 启用 `test-preserve-true` 适配器：

```json
{
  "id": "test-preserve-true",
  "enabled": true // 改为 true
}
```

3. 运行命令：`Turbo AI Rules: Generate Rules`
4. 检查输出目录：`test-preserve-structure/true/ai-rules-7008d805/`
5. 验证目录结构是否保持（应有子目录）

#### 3. 测试平铺文件

1. 禁用 `test-preserve-true`，启用 `test-preserve-false`
2. 运行 `Turbo AI Rules: Generate Rules`
3. 检查 `test-preserve-structure/false/ai-rules-7008d805/`
4. 验证所有 `.md` 文件是否直接在源目录下（无子目录）

#### 4. 测试索引路径

1. 启用 `test-preserve-index`
2. 运行 `Turbo AI Rules: Generate Rules`
3. 打开 `test-preserve-structure/index/index.md`
4. 验证链接格式：
   - ✅ 正确：`./turbo-ai-rules-source/1001-naming.md`
   - ❌ 错误：`./test-preserve-structure/index/turbo-ai-rules-source/...`

## 预期结果

### preserveDirectoryStructure=true

```
test-preserve-structure/true/
└── ai-rules-7008d805/
    ├── 1000-general/
    │   ├── 1001-naming.md
    │   └── 1002-formatting.md
    └── 2000-typescript/
        └── 2001-types.md
```

### preserveDirectoryStructure=false

```
test-preserve-structure/false/
└── ai-rules-7008d805/
    ├── 1001-naming.md
    ├── 1002-formatting.md
    └── 2001-types.md
```

### 索引文件内容

```markdown
# AI Rules Index

## turbo-ai-rules-source

- [Naming Conventions](./turbo-ai-rules-source/1001-naming.md)
- [Code Formatting](./turbo-ai-rules-source/1002-formatting.md)
```

## 清理测试数据

测试后删除生成的文件：

```bash
rm -rf test-preserve-structure/
```

或者运行清理脚本：

```bash
pnpm run clean:cache
```
