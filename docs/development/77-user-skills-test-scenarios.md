# 77. 用户技能测试场景

## 测试文件

`src/test/suite/workflows/user-skills-workflow.test.ts`

## 工作空间

`sampleWorkspace/rules-with-user-rules`（复用用户规则工作空间）

## 测试覆盖

### 场景 1: 单文件用户技能

**目的**: 验证单文件 .md 技能的创建和输出

**步骤**:
1. 在 `ai-skills/` 创建 `quick-helper.md`
2. 执行生成命令
3. 验证输出到 `.skills/quick-helper.md`

**关键验证**:
- 文件正确生成
- 内容完整保留
- sourceId 为 `user-skills`

### 场景 2: 目录用户技能（包含 skill.md）

**目的**: 验证完整目录型技能的处理

**步骤**:
1. 创建 `ai-skills/data-processor/` 目录
2. 创建 `skill.md`、`processor.py`、`config.json`
3. 执行生成命令
4. 验证整个目录被复制

**关键验证**:
- 目录结构保持
- skill.md 正确输出
- 辅助文件（.py、.json）一起复制
- 所有文件内容完整

### 场景 3: skill.md 特殊处理

**目的**: 验证 skill.md 识别逻辑（只加载 skill.md）

**步骤**:
1. 创建包含多个 .md 的目录
   - `skill.md`（主文件）
   - `README.md`（辅助文件）
   - `DOCS.md`（辅助文件）
2. 执行生成命令

**关键验证**:
- 只有 `skill.md` 被解析为独立技能
- `README.md` 和 `DOCS.md` 作为辅助文件复制
- 不会出现多个技能条目

**设计原因**:
- 与远程 skill 源逻辑一致
- skill.md 是目录型技能的入口
- 其他 .md 文件是文档，不应作为独立技能

### 场景 4: 清理保护 - 保留用户技能（单文件）

**目的**: 验证用户单文件技能不被清理

**步骤**:
1. 创建用户技能 `my-custom-tool.md`
2. 第一次生成
3. 手动添加孤儿文件 `old-orphan-skill.md`
4. 第二次生成

**关键验证**:
- 用户技能保留
- 孤儿文件被清理
- sourceId 识别正确

### 场景 5: 清理保护 - 保留用户技能（目录）

**目的**: 验证用户技能目录不被清理

**步骤**:
1. 创建用户技能目录 `my-complex-tool/`（含 skill.md 和 helper.py）
2. 第一次生成
3. 手动添加孤儿目录 `old-remote-skill/`
4. 第二次生成

**关键验证**:
- 用户技能目录完整保留
- 辅助文件（helper.py）保留
- 孤儿目录被清理
- skillDirs 映射正确

### 场景 6: 混合场景 - 单文件 + 目录 + 远程技能

**目的**: 验证多种技能形式的共存

**步骤**:
1. 创建单文件用户技能
2. 创建目录用户技能
3. 可能已有远程技能（从 Git 同步）
4. 执行生成

**关键验证**:
- 所有技能都正确输出
- 没有相互干扰
- 输出目录结构正确

### 场景 7: 嵌套目录结构

**目的**: 验证嵌套目录中的技能识别

**步骤**:
1. 创建 `ai-skills/data-tools/csv-processor/skill.md`
2. 创建 `ai-skills/data-tools/json-validator/skill.md`
3. 执行生成

**关键验证**:
- 两个嵌套技能都被识别
- 输出路径正确（保持相对结构或平铺）
- 扫描递归正确

## 关键实现逻辑

### 1. 扫描逻辑 (`scanUserSkillsDirectory`)

```
ai-skills/
├── simple.md              → 加载（单文件技能）
├── tool-a/
│   ├── skill.md           → 加载（目录技能入口）
│   ├── helper.py          → 不加载（辅助文件，会被复制）
│   └── README.md          → 不加载（文档，会被复制）
└── nested/
    └── tool-b/
        └── skill.md       → 加载（递归识别）
```

**规则**:
- 顶层 .md → 加载
- 目录包含 skill.md → 只加载 skill.md，停止递归
- 目录不包含 skill.md → 递归扫描

### 2. 清理逻辑 (`getExpectedFilePaths`)

**用户技能识别**:
```typescript
if (rule.sourceId === 'user-skills') {
  if (isSkillFile) {
    // skill.md → 记录整个目录到 skillDirs
    const relativePath = path.relative(userSkillsDir, rule.filePath);
    const skillDirName = path.dirname(relativePath);
    skillDirs.set(skillDirName, path.dirname(rule.filePath));
  } else {
    // 单文件 → 记录到 filePaths
    filePaths.add(fileName);
  }
}
```

**清理保护**:
- 检查文件是否在 `filePaths` 中
- 检查目录是否在 `skillDirs` 中
- 都不在 → 删除（孤儿文件/目录）

## 测试数据

### 单文件技能示例

```markdown
---
id: quick-helper
title: Quick Helper Tool
priority: high
---

# Quick Helper

A simple single-file skill.
```

### 目录技能示例

```
data-processor/
├── skill.md       # 主文件
├── processor.py   # 辅助文件
└── config.json    # 配置文件
```

**skill.md**:
```markdown
---
id: data-processor
title: Data Processor
priority: high
---

# Data Processor

See processor.py for implementation.
```

## 预期输出

### 单文件
```
.skills/
└── quick-helper.md
```

### 目录
```
.skills/
└── data-processor/
    ├── skill.md
    ├── processor.py
    └── config.json
```

## 与远程技能的对比

| 特性 | 远程技能 | 用户技能 |
|------|---------|---------|
| **来源** | Git 仓库 | ai-skills/ 目录 |
| **sourceId** | 仓库 ID | `user-skills` |
| **扫描逻辑** | MdcParser | scanUserSkillsDirectory |
| **skill.md 处理** | ✅ 相同 | ✅ 相同 |
| **清理保护** | 基于 sourceId 映射 | 基于 `user-skills` sourceId |
| **路径计算** | getRelativePathFromSubPath | 相对于 ai-skills/ |
| **目录同步** | ✅ 完整复制 | ✅ 完整复制 |

## 常见问题

### Q1: 为什么 skill.md 目录只加载 skill.md？

**A**: 与远程 skill 源逻辑一致。skill.md 是入口文件，其他 .md 文件（README、DOCS 等）是辅助文档，会被完整复制但不作为独立技能解析。

### Q2: 如何区分用户技能和远程技能？

**A**: 通过 `sourceId`：
- 用户技能: `user-skills`
- 远程技能: Git 仓库 ID

### Q3: 清理时如何保护用户技能？

**A**: 在 `getExpectedFilePaths` 中：
- 检测到 `sourceId === 'user-skills'`
- 将文件/目录添加到期望列表
- 清理时跳过期望列表中的项

### Q4: 嵌套目录如何处理？

**A**: 递归扫描，遇到 skill.md 停止当前分支递归，继续其他分支。

## 测试超时配置

- 创建文件: 5s (SHORT)
- 生成配置: 20s (MEDIUM)
- 混合场景: 30s (LONG)
- 延迟等待: 2s

## 运行测试

```bash
# 单独运行
pnpm test:suite:mocha -- --grep "User Skills Workflow"

# 运行所有集成测试
pnpm test:suite:mocha
```
