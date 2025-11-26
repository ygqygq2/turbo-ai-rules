# 常见问题 (FAQ)

> 常见问题解答和故障排查指南

[English](./faq.md) | [中文](./faq.zh.md)

---

## ❓ 常见问题 (FAQ)

### 基础问题

#### Q1: 私有仓库需要什么权限？

**A**: 需要具有**读取权限**的 Personal Access Token (PAT)。

**GitHub 创建 Token 步骤**:

1. 访问 GitHub Settings → Developer settings → Personal access tokens
2. 点击 **Generate new token** (classic)
3. 选择权限: `repo` (完整仓库访问)
4. 复制生成的 Token (格式: `ghp_xxxxxxxxxxxx`)
5. 在添加规则源时粘贴 Token

**注意**:

- Token 需妥善保管，不要提交到版本控制
- Token 过期后需在扩展中更新 (使用 `Manage Sources` 命令)

---

#### Q2: 规则文件必须是 `.md` 格式吗？

**A**: 是的，目前扩展仅解析 **Markdown 格式** (`.md`) 的规则文件。

文件需要满足：

- 文件扩展名: `.md`
- 格式: MDC (Markdown + YAML Frontmatter)
- 元数据: 至少包含 `id` 和 `title` 字段

未来可能支持其他格式 (如 `.mdx`, `.txt`)。

---

#### Q3: 可以手动编辑生成的配置文件吗？

**A**: **不建议**手动编辑生成的配置文件 (如 `.cursorrules`)。

**原因**:

- ⚠️ 下次同步会**覆盖**手动修改
- 难以追踪变更历史
- 无法在团队间共享修改

**正确做法**:

1. 修改规则源仓库中的规则文件
2. 提交到 Git
3. 运行 `Sync Rules` 重新生成配置

这样可以保证:

- ✅ 版本控制
- ✅ 团队共享
- ✅ 可追溯性

---

#### Q4: 如何调试同步问题？

**A**: 查看扩展的输出日志。

**步骤**:

1. 打开 VS Code **Output** 面板 (View → Output 或 `Ctrl+Shift+U`)
2. 在下拉菜单中选择 **Turbo AI Rules**
3. 查看详细同步日志

**日志示例**:

```
[Turbo AI Rules] Syncing rules from 3 sources...
[Turbo AI Rules] ✓ Synced: Company Rules (15 rules)
[Turbo AI Rules] ✗ Error: Failed to clone repository: Authentication failed
[Turbo AI Rules] ✓ Generated: .cursorrules
```

**常见错误**:

- `Authentication failed`: Token 无效或过期
- `Network error`: 网络连接问题
- `Parse error`: 规则文件格式错误

---

### 冲突和优先级

#### Q5: 多个规则源有相同 ID 的规则怎么办？

**A**: 扩展会根据配置的**冲突解决策略**处理重复规则。

**策略 1: `priority` (默认)**

- 使用 `priority` 字段最高的规则
- 优先级顺序: `critical` > `high` > `medium` > `low`
- 如果 `priority` 相同，使用第一个出现的规则

**示例**:

```yaml
# 源 A: typescript-naming (priority: high)
# 源 B: typescript-naming (priority: critical)
# 结果: 使用源 B (优先级更高)
```

**策略 2: `skip-duplicates`**

- 保留第一个出现的规则
- 跳过后续重复的规则
- 适合完全独立的规则源

**配置**:

```json
{
  "turbo-ai-rules.sync.conflictStrategy": "priority" // 或 "skip-duplicates"
}
```

---

### 适配器和配置

#### Q6: 如何禁用某个 AI 工具的配置生成？

**A**: 在 VS Code 设置中禁用对应的适配器。

**方法 1: 通过 UI**

1. 打开 VS Code Settings (`Ctrl+,`)
2. 搜索 `Turbo AI Rules`
3. 找到对应的适配器选项
4. 取消勾选 `Enabled`

**方法 2: 通过 JSON**

```json
{
  "turbo-ai-rules.adapters.cursor.enabled": false, // 禁用 Cursor
  "turbo-ai-rules.adapters.copilot.enabled": true, // 保留 Copilot
  "turbo-ai-rules.adapters.continue.enabled": false // 禁用 Continue
}
```

**效果**: 禁用后，同步时不会生成对应的配置文件。

---

#### Q7: 什么是自定义适配器？

**A**: 自定义适配器允许你为**任何 AI 工具**配置输出格式。

**特性**:

- 📄 **文件模式**: 合并所有规则到单个文件 (如 `.windsurfrules`, `.clinerules`)
- 📁 **目录模式**: 生成完整的目录结构 (如 `rules/`, `docs/ai-rules`)
- 🔍 **文件过滤**: 只包含特定后缀的规则文件 (如 `.md`, `.mdc`)
- 🗂️ **灵活组织**: 可按源组织子目录，或使用平铺结构

**应用场景**:

- 支持新的 AI 工具 (Windsurf, Cline, Aide, ...)
- 为文档站点导出规则
- 团队内部规则分发

**配置示例** → 参考 [配置指南 - 自定义适配器](#4-自定义适配器配置-adapterscustom)

---

#### Q8: 如何为新的 AI 工具 (如 Windsurf, Cline) 添加支持？

**A**: 在设置中添加自定义适配器配置。

**步骤**:

1. 查看目标 AI 工具的文档，确认配置文件路径和格式
2. 在 VS Code 设置中添加自定义适配器

**示例 1: Windsurf** (单文件配置)

```json
{
  "turbo-ai-rules.adapters.custom": [
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

**示例 2: Cline** (目录结构)

```json
{
  "turbo-ai-rules.adapters.custom": [
    {
      "id": "cline",
      "name": "Cline AI",
      "enabled": true,
      "autoUpdate": true,
      "outputPath": ".cline/rules",
      "outputType": "directory",
      "organizeBySource": false,
      "generateIndex": true
    }
  ]
}
```

3. 运行 `Generate Config Files` 命令
4. 验证生成的配置文件

详细配置说明 → [配置指南 - 自定义适配器](#4-自定义适配器配置-adapterscustom)

---

#### Q9: 默认的 `rules/` 目录可以修改或禁用吗？

**A**: 可以！`rules/` 目录实际上是一个默认的**自定义适配器**。

**修改配置**:

```json
{
  "turbo-ai-rules.adapters.custom": [
    {
      "id": "default-rules",
      "name": "Generic Rules",
      "enabled": true,
      "outputPath": "my-custom-rules", // 修改输出路径
      "outputType": "directory",
      "fileExtensions": [".md", ".mdc"], // 添加文件过滤
      "organizeBySource": false, // 改为平铺结构
      "generateIndex": true,
      "indexFileName": "README.md" // 改为 README.md
    }
  ]
}
```

**禁用**:

```json
{
  "turbo-ai-rules.adapters.custom": [
    {
      "id": "default-rules",
      "enabled": false // 禁用默认 rules/ 目录
    }
  ]
}
```

**删除**: 从 `adapters.custom` 数组中完全移除该配置。

---

### 用户自定义规则

#### Q10: 如何添加我自己的规则而不被同步覆盖？

**A**: 根据输出模式不同，有两种方法：

---

**方法 1: 目录模式（如 `.cursor/rules/`）- 文件名前缀规避**

**核心机制**: 扩展只管理 `000-799` 前缀的文件，使用 `800-999` 前缀的文件不会被修改或删除。

**为什么推荐 800-999 前缀？**

- 🛡️ **避免冲突**: 自动生成文件使用 `000-799` 前缀，你的文件使用 `800-999` 前缀，完全不会冲突
- 📋 **清晰管理**: 一眼就能区分哪些是自动生成，哪些是用户自定义
- 🔒 **自动保护**: 同步时会自动跳过 `800-999` 前缀的文件，无需额外配置

> 💡 **注意**: `800-999` 前缀**不是强制要求**，只是为了避免与自动生成文件冲突的**推荐命名规范**。
> 如果启用了 `protectUserRules` 配置（默认关闭），扩展会更智能地检测用户文件。

**操作步骤**：

```bash
# 1. 进入 rules 目录
cd .cursor/rules

# 2. 创建自定义规则文件（使用 800-999 前缀）
touch 850-my-team-rules.mdc

# 3. 编辑文件
code 850-my-team-rules.mdc
```

**命名建议**：

| 前缀范围  | 用途                                | 优先级   | 示例                       |
| --------- | ----------------------------------- | -------- | -------------------------- |
| `000-799` | 🤖 自动生成（**会被覆盖/删除**）    | 自动规则 | `200-typescript.mdc`       |
| `800-849` | ✍️ 高优先级自定义（可覆盖自动规则） | 最高     | `820-team-overrides.mdc`   |
| `850-899` | ✍️ 常规自定义规则                   | 高       | `850-project-specific.mdc` |
| `900-949` | ✍️ 补充规则                         | 中       | `900-code-review.mdc`      |
| `950-999` | ✍️ FAQ、参考                        | 低       | `990-faq.mdc`              |

**示例文件结构**：

```
.cursor/rules/
├── 001-project-overview.mdc        ← 🤖 自动生成
├── 200-typescript.mdc              ← 🤖 自动生成
├── 300-react.mdc                   ← 🤖 自动生成
├── 820-team-overrides.mdc          ← ✍️ 你创建（安全）
├── 850-api-conventions.mdc         ← ✍️ 你创建（安全）
└── 900-code-review-checklist.mdc   ← ✍️ 你创建（安全）
```

**⚠️ 重要提示**：

**关于文件优先级的说明**：

| AI 工具        | 优先级机制                     | 确认状态        | 数据来源             |
| -------------- | ------------------------------ | --------------- | -------------------- |
| GitHub Copilot | 所有文件合并，无顺序区分       | ✅ 官方文档确认 | GitHub Docs          |
| Continue       | 按字典序加载                   | ✅ 源代码确认   | Continue GitHub 仓库 |
| Cline          | 优先级层次：用户 > 项目 > 全局 | ✅ 源代码确认   | Cline GitHub 仓库    |
| **Cursor**     | **数字小优先级高？**           | ⚠️ **社区经验** | **无官方文档**       |
| Windsurf       | 未知                           | ❌ 无文档       | -                    |
| Aide           | 未知                           | ❌ 无文档       | -                    |

> 📌 **设计策略说明**：
>
> - 虽然 **Cursor** 的"数字小优先级高"广泛流传于社区，但**未找到官方文档确认**
> - 本扩展采用**保守策略**：使用 `800-999` 前缀保护用户自定义文件
> - 即使 Cursor 实际优先级与社区传闻不同，该策略仍能有效保护用户文件不被覆盖
> - 建议**实际测试**你所用 AI 工具的优先级行为，并在规则内容中**显式声明优先级**

**如果需要覆盖自动规则，建议在内容中显式声明**：

```markdown
---
id: team-naming-conventions
title: 团队命名约定
priority: critical # 最高优先级
---

> ⚠️ **注意**: 此规则覆盖默认的命名规范

# 我们的特殊命名规则

我们团队数据库字段相关变量使用 snake_case...
```

---

**方法 2: 单文件模式（如 `.cursorrules`、`copilot-instructions.md`）- 块标记保护**

单文件配置使用**块标记**分隔自动生成和用户自定义区域。

> ⚠️ **重要**: 需要启用 `protectUserRules` 配置才会生成块标记!

**启用块标记保护**:

```json
{
  "turbo-ai-rules.protectUserRules": true
}
```

**文件结构**：

```markdown
<!-- TURBO-AI-RULES:BEGIN -->
<!-- ⚠️  WARNING: Auto-generated content - Will be overwritten on sync -->
<!-- ⚠️  警告：自动生成内容 - 同步时会被覆盖 -->

# TypeScript 规范

使用 camelCase 命名变量...

# React 最佳实践

...

<!-- TURBO-AI-RULES:END -->

<!-- ============================================== -->
<!-- 🎯 自定义规则区域（优先级最高） -->
<!-- ✅ 在下方添加你的自定义规则 -->
<!-- ✅ 此区域不会被同步覆盖 -->
<!-- ============================================== -->

# 🎯 我的自定义规则

## 项目 API 规范

所有 API 调用必须：

1. 使用统一的 `apiClient` 封装
2. 添加 loading 状态
3. 实现请求取消

## 代码审查标准

...
```

**使用规则**：

1. ✅ **在块标记外添加内容**（推荐在文件底部）
2. ❌ **不要修改块内内容**（会被下次同步覆盖）
3. ✅ 你的自定义内容**优先级最高**，可以覆盖自动规则

**优先级说明**：

- 自动生成的块内会包含优先级提示
- AI 会优先遵循标记为"最高优先级"的自定义规则
- 如有冲突，自定义规则覆盖自动规则

**示例**（覆盖默认规则）：

````markdown
<!-- TURBO-AI-RULES:BEGIN -->

# TypeScript 命名规范

使用 camelCase 命名变量...

<!-- TURBO-AI-RULES:END -->

# 🎯 团队规范（⚠️ 覆盖上方规则）

## 命名约定

我们团队对数据库字段变量使用 `snake_case`：

```typescript
const user_id = getUserId(); // ✅ 正确
const userId = getUserId(); // ❌ 错误
```
````

````

---

#### Q11: 为什么我的自定义规则没有生效？

**A**: 检查以下几点：

**目录模式**：
1. ✅ 文件名使用了 `800-999` 前缀吗？
2. ✅ 文件格式正确（MDC 格式，包含 frontmatter）吗？
3. ✅ 文件编码是 UTF-8 吗？
4. ✅ 规则内容清晰明确吗？

**单文件模式**：
1. ✅ 已启用 `protectUserRules` 配置吗？（如果没有块标记，需要先启用）
2. ✅ 自定义内容在块标记**外**吗？
3. ✅ 使用了明确的标题和优先级声明吗？
4. ✅ 最近有同步过规则吗？（确保文件是最新的）

> 💡 **提示**: 如果生成的单文件中没有 `<!-- TURBO-AI-RULES:BEGIN -->` 块标记，说明 `protectUserRules` 未启用。
> 启用后重新同步即可生成块标记，然后就能在标记外安全添加自定义规则了。

**通用检查**：
1. ✅ 规则内容是否足够具体？（模糊的规则 AI 可能忽略）
2. ✅ 有没有与自动规则冲突但没有明确声明覆盖？
3. ✅ 尝试在规则开头添加"此规则优先级最高"的声明

**AI 工具差异**：
不同 AI 工具对规则优先级的处理方式不同（参见 Q10 表格）：

- **GitHub Copilot**: 合并所有 `.github/copilot-instructions.md`，无文件顺序区分
- **Continue**: 按字典序加载配置文件，后加载的覆盖先加载的
- **Cline**: 按层次覆盖（用户级 > 项目级 > 全局级）
- **Cursor**: 社区普遍认为"数字小优先级高"，但**未经官方确认**，建议实际测试

**调试方法**：
```markdown
# 在自定义规则开头添加测试
> ⚠️ **测试标记**: 如果你看到这条信息，说明规则文件已被读取

# 我的规则
...
````

然后询问 AI："你读取到测试标记了吗？"以验证规则是否被加载。

**如果仍不生效**：

1. 检查文件路径是否正确（参考 Q3 配置路径说明）
2. 重启 AI 工具或 VS Code
3. 查看 AI 工具的输出/日志面板，确认规则文件是否被加载
4. 尝试简化规则内容，测试是否是内容解析问题

---

#### Q12: `protectUserRules` 配置是什么？

**A**: 这是一个**智能保护功能**（v2.0.2+ 默认启用），用于检测和保护用户自定义规则文件。

**默认行为（`protectUserRules: true`，推荐）**：

- 🔍 **智能检测**：会读取文件内容，检查是否包含用户自定义标记
- 🛡️ **双重保护**：同时检查前缀 + 内容标记
- 📦 **块标记生成**：单文件模式（`.cursorrules`、`copilot-instructions.md`等）会自动添加块标记，区分自动生成和用户自定义区域
- ⚠️ **冲突提示**：发现潜在冲突时会显示警告，避免误删
- 🎯 **首次保护**：如果文件已存在但没有块标记（第一次使用扩展时），**整个现有文件内容会被视为用户规则并保留**

**禁用后（`protectUserRules: false`）**：

- ✅ 简单直接：只根据文件名前缀判断（`800-999` = 用户文件）
- ✅ 性能更好：不需要读取文件内容
- ⚠️ **注意**：首次使用时可能会覆盖已有规则，不推荐

**块标记示例**（单文件模式）:

启用后，生成的文件会包含块标记:

```markdown
<!-- TURBO-AI-RULES:BEGIN -->
<!-- Generated by Turbo AI Rules at 2024-11-26T10:30:00.000Z -->
<!-- Total rules: 5 -->
<!-- ⚠️  WARNING: Auto-generated content - Will be overwritten on sync -->
<!-- ⚠️  警告：自动生成内容 - 同步时会被覆盖 -->

（此处是自动生成的规则内容）

<!-- TURBO-AI-RULES:END -->

<!-- ============================================== -->
<!-- 👤 User-Defined Rules Section -->
<!-- 用户自定义规则区域 -->
<!-- ============================================== -->
<!-- Add your custom rules below this line -->
<!-- 在下方添加你的自定义规则 -->

## Your Custom Rules

（此处添加你的自定义内容，同步时不会被覆盖）
```

**首次使用场景**：

如果你已经有一个 `.cursorrules` 或 `copilot-instructions.md` 文件，并且启用了 `protectUserRules: true`：

1. ✅ **第一次生成时**：扩展会检测到文件没有块标记
2. ✅ **保留原有内容**：整个现有文件内容会被视为用户自定义规则
3. ✅ **添加块标记**：在文件顶部插入块标记和新生成的规则
4. ✅ **原内容后移**：你的原有内容会被移到块标记之后，完全保留

这样你就能安全地在块标记外添加自定义内容，同步时不会被覆盖。

**如何启用**：

```json
{
  "turbo-ai-rules.sync.protectUserRules": true,
  "turbo-ai-rules.sync.userPrefixRange": [800, 999] // 可自定义范围
}
```

**使用建议**：

- 🆕 新用户：保持默认关闭，遵循 `800-999` 前缀命名即可
- 👥 团队协作：如果团队成员可能不遵循命名规范，建议启用
- 🔧 复杂场景：需要更精细的保护控制时启用

---

### 性能和同步

#### Q13: 同步很慢怎么办？

**A**: 优化同步性能的几个方法:

**1. 调整同步间隔**

```json
{
  "turbo-ai-rules.sync.interval": 0 // 禁用自动同步，仅手动同步
}
```

**2. 减少规则源数量**

- 移除不常用的规则源
- 合并相似的规则源

**3. 使用子路径**

```
# 仅同步子目录，减少文件数量
子路径: best-practices/
```

**4. 检查网络**

- 确保稳定的网络连接
- 考虑使用国内 Git 镜像

**5. 查看日志**

```
Output → Turbo AI Rules
# 找出慢的步骤 (Clone/Parse/Generate)
```

---

#### Q14: 可以离线使用吗？

**A**: 可以，但有限制。

**首次同步**: 需要网络连接从 Git 仓库克隆规则

**后续使用**:

- ✅ 可以离线生成配置文件 (使用缓存的规则)
- ✅ 可以离线搜索规则
- ❌ 无法同步最新规则 (需要网络)

**离线配置建议**:

```json
{
  "turbo-ai-rules.sync.onStartup": false,
  "turbo-ai-rules.sync.interval": 0
}
```

---

### 高级问题

#### Q15: 如何在 CI/CD 中使用？

**A**: 可以在 CI/CD 流程中自动生成配置文件。

**示例 (GitHub Actions)**:

```yaml
name: Sync AI Rules

on:
  schedule:
    - cron: '0 0 * * *' # 每天同步
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install VS Code Extension
        run: code --install-extension turbo-ai-rules

      - name: Sync Rules
        run: code --command turbo-ai-rules.syncRules

      - name: Commit Changes
        run: |
          git config user.name "Bot"
          git config user.email "bot@example.com"
          git add .cursorrules .github/ rules/
          git commit -m "Update AI rules [skip ci]"
          git push
```

---

#### Q16: 如何贡献规则到社区？

**A**: 创建一个公开的 Git 仓库分享你的规则。

**步骤**:

1. **创建仓库**

```bash
mkdir my-ai-rules
cd my-ai-rules
git init
```

2. **添加规则文件**

```markdown
## <!-- rules/typescript-best-practices.md -->

id: typescript-best-practices
title: TypeScript Best Practices
priority: high
tags: [typescript, best-practices]

---

# TypeScript Best Practices

...
```

3. **创建 README**

```markdown
# My AI Rules

Usage:

1. Add as source: `https://github.com/username/my-ai-rules.git`
2. Sync rules
3. Enjoy!
```

4. **推送到 GitHub**

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

5. **分享**: 在社区中分享你的仓库 URL

---

---

## 📚 相关文档

- [01. 命令详解](./01-commands.zh.md) - 所有可用命令
- [02. 配置指南](./02-configuration.zh.md) - 配置选项
- [03. 规则文件格式](./03-rule-format.zh.md) - 如何编写规则

---

[⬅️ 返回用户指南](./README.zh.md)
