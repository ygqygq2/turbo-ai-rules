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
    "directory": "ai-rules",
    "markers": {
      "begin": "<!-- TURBO-AI-RULES:BEGIN -->",
      "end": "<!-- TURBO-AI-RULES:END -->"
    }
  }
}
```

**字段说明**：
- `directory`: 用户规则目录（相对于工作区根目录）
- `markers`: 单文件模式下的内容标记
  - `begin`: 扩展生成内容的开始标记
  - `end`: 扩展生成内容的结束标记
  - 用于标识扩展自动生成的区域，便于后续更新识别
  - **注意**：单文件（`.cursorrules` 等）完全由扩展自动生成，不鼓励手动编辑
  - 用户自定义规则应放在 `directory` 目录中（默认 `ai-rules/`）

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

## 5. 版本控制

**推荐 .gitignore**：

```gitignore
# 提交用户规则
ai-rules/

# 忽略生成的规则缓存
rules/*
!ai-rules/
```

---

## 6. 参考

- [适配器设计](./21-adapter-design.md)
- [配置管理](../user-guide/02-configuration.zh.md)
