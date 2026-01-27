# 用户规则设计

> 本文档描述用户自定义规则的设计和实现方案

---

## 1. 背景和需求

### 1.1 问题

当前扩展只支持从 Git 仓库同步规则，用户无法添加自己的本地规则。

### 1.2 需求

支持用户在本地添加自定义规则，这些规则应该：

- ✅ 存储在工作区的特定目录下（默认 `ai-rules/`）
- ✅ 纳入 Git 版本控制（项目级别的规则管理）
- ✅ 在生成配置时自动合并到最终输出
- ✅ 支持适配器级别的启用控制和排序配置

---

## 2. 设计方案

### 2.1 核心概念

**用户规则（User Rules）**：由用户在本地创建和维护的规则文件。

**关键特性**：

- **顶层配置**：用户规则目录在顶层配置，所有适配器共享
- **适配器控制**：每个适配器独立配置是否启用用户规则
- **统一排序**：所有适配器支持排序配置（sortBy + sortOrder）
- **智能去重**：基于排序的去重策略，自然解决ID冲突

### 2.2 配置结构

**顶层配置**（所有适配器共享）：

```json
{
  "turbo-ai-rules.userRules": {
    "directory": "ai-rules"
  },
  "turbo-ai-rules.blockMarkers": {
    "begin": "<!-- TURBO-AI-RULES:BEGIN -->",
    "end": "<!-- TURBO-AI-RULES:END -->"
  },
  "turbo-ai-rules.userRules.markers": {
    "begin": "<!-- USER-RULES:BEGIN -->",
    "end": "<!-- USER-RULES:END -->"
  }
}
```

**字段说明**：
- `directory`: 用户规则目录（相对于工作区根目录）
  - **特殊说明**：对于 Skills 适配器（`isRuleType: false`），此目录中的 `SKILL.md` 文件会被特殊处理
  - 同步规则时会保留用户创建的 skill.md 及其父目录
  - 清理时会识别并排除用户的 skill.md 文件
- `blockMarkers`: 全局内容标记（外层）
  - `begin`: 扩展生成内容的开始标记
  - `end`: 扩展生成内容的结束标记
  - 作用：标识扩展自动生成的全部内容区域，用于文件管理检测
  - **如果文件存在但不包含这些标记，扩展会停止生成并警告用户手动清理**
- `userRules.markers`: 用户规则标记（内层，嵌套在 blockMarkers 内部）
  - `begin`: 用户规则内容的开始标记
  - `end`: 用户规则内容的结束标记
  - 作用：仅标识 sourceId='user-rules' 的规则内容，使用户规则易于识别

**两层标记系统**：
1. **blockMarkers**（外层）：包裹所有扩展生成的内容，用于文件管理检测
2. **userRulesMarkers**（内层）：嵌套在 blockMarkers 内部，仅标识用户规则区域

**示例结构**：
```markdown
<!-- TURBO-AI-RULES:BEGIN -->

<!-- 远程规则 1 -->
...

<!-- USER-RULES:BEGIN -->
<!-- 用户规则 -->
...
<!-- USER-RULES:END -->

<!-- 远程规则 2 -->
...

<!-- TURBO-AI-RULES:END -->
```

**适配器配置**：

```json
{
  "turbo-ai-rules.adapters.cursor": {
    "enabled": true,
    "enableUserRules": true,
    "sortBy": "priority",
    "sortOrder": "asc"
  }
}
```

**字段说明**：
- `enableUserRules`: 是否启用用户规则（默认 `true`）
  - `true`: 合并 `userRules.directory` 中的规则，并使用 `markers` 保护用户内容
  - `false`: 不读取用户规则，不保护用户内容

---

## 3. 实现细节

### 3.1 合并和去重策略

**流程**：

1. 解析远程规则
2. 加载用户规则（如果适配器启用）
3. 合并所有规则
4. 按适配器配置排序（sortBy + sortOrder）
5. 按 ID 去重（保留排序后的第一个）

**排序配置**：

- `sortBy: "priority"` - 按优先级排序（high > medium > low）
- `sortBy: "id"` - 按规则 ID 字母顺序
- `sortBy: "none"` - 不排序
- `sortOrder: "asc"` - 升序（默认，低→高，高优先级在文件末尾）
- `sortOrder: "desc"` - 降序（高→低，高优先级在文件开头）

> **近因效应（Recency Bias）**：LLM 会将文件末尾的指令视为"最新补充"或"最终修正案"，因此**高优先级规则应放在文件末尾**，配置为 `sortOrder: "asc"`。

**ID 冲突处理**：
排序后自然解决冲突。例如：

- 远程规则: `id="naming"`, `priority="medium"`
- 用户规则: `id="naming"`, `priority="high"`
- 配置: `sortBy="priority"`, `sortOrder="asc"`
- 排序后: `[远程规则(medium), 用户规则(high)]` ← 高优先级在后（近因效应）
- 去重后: `[远程规则(medium)]` ← 保留第一个
- **最终效果**: 虽然去重保留了远程规则，但在单文件中用户规则会因为在后面而实际生效（LLM 近因效应）

### 3.2 代码实现

**BaseAdapter**：

- `enableUserRules: boolean` - 是否启用用户规则
- `sortBy: 'id' | 'priority' | 'none'` - 排序方式
- `sortOrder: 'asc' | 'desc'` - 排序顺序
- `loadUserRules()` - 加载用户规则
- `sortRules()` - 统一排序逻辑
- `mergeWithUserRules()` - 合并并去重

**工具函数**：

- `getUserRulesDirectory()` - 从顶层配置 `userRules.directory` 获取目录
- `getMarkers()` - 从顶层配置 `userRules.markers` 获取标记
- `loadUserRules()` - 扫描并解析规则
- `isUserRule(rule)` - 判断是否为用户规则

---

## 4. 使用示例

### 4.1 配置

```json
{
  "turbo-ai-rules.userRules": {
    "directory": "ai-rules",
    "markers": {
      "begin": "<!-- TURBO-AI-RULES:BEGIN -->",
      "end": "<!-- TURBO-AI-RULES:END -->"
    }
  },
  "turbo-ai-rules.adapters.cursor": {
    "enabled": true,
    "enableUserRules": true,
    "sortBy": "priority",
    "sortOrder": "asc"
  }
}
```

### 4.2 创建用户规则

创建 `ai-rules/my-rule.md`:

```markdown
---
id: my-project-rule
title: 项目特定规则
priority: high
---

# 项目特定规则

使用 camelCase 命名变量
```

### 4.3 生成配置

运行 `Generate Config Files` 命令，生成的文件会包含用户规则。

---

## 5. Skill 适配器的特殊处理

### 5.1 skill.md 识别和保留

**背景**：Skills 适配器（`isRuleType: false`）需要保留用户创建的 skill.md 文件及其父目录结构。

**实现机制**：

1. **规则识别**（RulesManager）
   - 识别 `skill.md` 文件（不区分大小写）
   - 将其父目录标记为 SKILL 目录

2. **同步保留**（FileGenerator）
   - 同步规则时检测用户规则目录中的 skill.md
   - 保留整个 skill.md 父目录结构
   - 合并到最终输出，不会被远程规则覆盖

3. **清理排除**（CustomAdapter）
   - 清理输出目录时识别 skill.md 文件
   - 排除包含 skill.md 的目录（用户创建的 skill）
   - 只清理远程同步的 skill 目录

**配置示例**：

```json
{
  "turbo-ai-rules.adapters.custom": [
    {
      "id": "skills",
      "enabled": true,
      "isRuleType": false,  // ✅ 标记为 Skills 适配器
      "outputType": "directory",
      "outputPath": ".skills",
      "enableUserRules": false,  // Skills 通常不需要用户规则合并
      "organizeBySource": false
    }
  ]
}
```

**工作流程**：

```
用户创建：ai-rules/my-skill/skill.md
                     ↓
         RulesManager 识别为用户 skill
                     ↓
      FileGenerator 同步时保留该目录
                     ↓
        合并到 .skills/my-skill/skill.md
                     ↓
       清理时排除 my-skill/ 目录
```

### 5.2 与规则适配器的区别

| 特性 | 规则适配器 (`isRuleType: true`) | Skills 适配器 (`isRuleType: false`) |
|------|--------------------------------|-------------------------------------|
| 用户内容保留 | 通过 block markers | 通过 skill.md 识别 |
| 输出模式 | 单文件或目录 | 通常为目录 |
| 清理策略 | 保留 markers 内的用户规则 | 保留包含 skill.md 的目录 |
| 适用场景 | AI 编程规则 | AI 技能/工具配置 |
| 快速同步支持 | ✅ 支持 | ❌ 不支持（仅通过 dashboard） |

---

## 6. 版本控制

**推荐 .gitignore**：

```gitignore
# 提交用户规则
ai-rules/

# 忽略生成的规则缓存
rules/*
!ai-rules/
```

---

## 7. 注意事项

1. **不要在测试中切换工作空间**: 每个测试文件固定在一个工作空间
2. **模拟 UI 操作**: 通过数据层面模拟 UI 操作结果
3. **skill.md 文件命名**: 不区分大小写，SKILL.md、skill.md、Skill.md 都会被识别
4. **用户规则目录结构**: 对于 skills，建议使用 `ai-rules/<skill-name>/skill.md` 结构
5. **Skills 适配器配置**: 
   - 必须设置 `isRuleType: false`
   - 通常使用 `outputType: 'directory'`
   - 建议 `enableUserRules: false`（skill.md 已自动保留）
6. **Block Markers**: 规则适配器使用 markers 保护用户内容，Skills 适配器使用 skill.md 识别

---

## 8. 参考

- [适配器设计](./21-adapter-design.md)
- [配置管理](../user-guide/02-configuration.zh.md)
