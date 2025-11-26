# 用户规则保护实施记录

**模块**: `src/services/FileGenerator.ts`, `src/utils/userRulesProtection.ts`  
**功能**: 保护用户自定义规则，防止在同步时被覆盖  
**创建日期**: 2024-11-26  
**当前版本**: v2.0.2  
**修复历史**:

- v2.0.1: 修复首次使用时用户规则被清空的问题
- v2.0.2: 添加关键集成测试，覆盖首次使用场景

---

## 功能概述

用户规则保护功能提供两种保护模式：

1. **目录模式**：基于文件名前缀（80000-99999）保护用户文件
2. **单文件模式**：使用块标记（`<!-- TURBO-AI-RULES:BEGIN/END -->`）区分自动生成和用户自定义内容

---

## 核心实现

### 配置结构

```typescript
interface UserRulesProtectionConfig {
  enabled: boolean; // 是否启用保护
  userPrefixRange?: { min: number; max: number }; // 目录模式：用户前缀范围
  blockMarkers?: { begin: string; end: string }; // 单文件模式：块标记
}
```

### 单文件模式保护逻辑

**关键方法**: `FileGenerator.writeSingleFileMode()`

#### 场景 1: 首次使用扩展（文件已存在，无块标记）

**问题**（修复前）：

- 用户已有 `.cursorrules` 或 `copilot-instructions.md`
- 启用 `protectUserRules: true`
- 生成时会**清空原有内容**，因为没有块标记，`extractUserContent()` 返回空

**解决方案**（v2.0.1+）：

```typescript
// 检查是否已经有块标记
const hasBlockMarkers = existingContent.includes(markers.begin);

if (hasBlockMarkers) {
  // 已有块标记：提取块外内容作为用户规则
  const extracted = extractUserContent(existingContent, this.protectionConfig);
  userContent = extracted.userContent;
} else {
  // 第一次使用扩展：将整个现有内容视为用户规则
  userContent = existingContent;
  Logger.info('First-time protection: treating entire existing file as user rules', {
    existingContentLength: existingContent.length,
    filePath,
  });
}
```

**结果**：

- ✅ 保留用户原有的全部内容
- ✅ 在文件顶部插入块标记和新生成的规则
- ✅ 原内容移到块标记之后

#### 场景 2: 已被扩展管理（有块标记）

```typescript
const { userContent } = extractUserContent(existingContent, this.protectionConfig);
mergedContent = mergeContent(newContent, userContent, this.protectionConfig);
```

**流程**：

1. 提取块标记外的用户内容
2. 更新块标记内的自动生成内容
3. 保留块标记外的用户内容

#### 场景 3: 首次生成（文件不存在）

```typescript
// 首次生成，添加用户区域模板
mergedContent = mergeContent(newContent, '', this.protectionConfig);
```

**生成模板**：

```markdown
<!-- TURBO-AI-RULES:BEGIN -->
<!-- ⚠️  WARNING: Auto-generated content - Will be overwritten on sync -->
<!-- ⚠️  警告：自动生成内容 - 同步时会被覆盖 -->
<!-- Last Sync: 2024-11-26 10:30:00 -->

（自动生成的规则）

<!-- TURBO-AI-RULES:END -->

<!-- ============================================== -->
<!-- 👤 User-Defined Rules Section -->
<!-- 用户自定义规则区域 -->
<!-- ============================================== -->
<!-- Add your custom rules below this line -->

## Your Custom Rules
```

---

## 测试覆盖

### 单元测试

**文件**: `src/test/unit/services/FileGenerator.spec.ts`

#### 测试用例 1: 首次保护（无块标记）

```typescript
it('should preserve existing content when protectUserRules is enabled and file has no markers');
```

**验证点**：

- ✅ 生成的文件包含块标记
- ✅ 保留原有用户内容
- ✅ 包含新生成的内容

#### 测试用例 2: 已有块标记

```typescript
it('should merge user content when file already has block markers');
```

**验证点**：

- ✅ 更新自动生成内容
- ✅ 保留用户自定义内容
- ✅ 不包含旧的自动生成内容

### 集成测试 (v2.0.2+)

**文件**: `src/test/suite/userRulesProtection.test.ts`

#### 测试用例 1: 首次使用保护（关键用户体验）

```typescript
it('Should preserve existing rule file content on first-time generation (Critical UX)');
```

**重要性**: ⭐⭐⭐⭐⭐ (极其重要 - 直接影响用户留存率)

**测试场景**:

- 用户已有 `.cursorrules` 文件（单文件模式）
- 内容包含重要的自定义规则
- 启用 `protectUserRules: true`
- 第一次执行 "Generate Config Files"

**验证点**:

- ✅ 原有文件内容完整保留（所有标题、段落、注释）
- ✅ 块标记正确添加（`<!-- TURBO-AI-RULES:BEGIN/END -->`）
- ✅ 用户内容位于块标记之后（不在块内）
- ✅ 自动生成内容位于块标记内
- ✅ 文件结构正确（块标记 → 自动内容 → 用户内容）

**失败影响**:

- ❌ 用户丢失所有自定义规则
- ❌ 用户对扩展失去信任
- ❌ 高概率卸载扩展

#### 测试用例 2: 后续更新保护

```typescript
it('Should preserve user content when file already has block markers');
```

**测试场景**:

- 文件已被扩展管理（有块标记）
- 包含用户自定义内容（块标记外）
- 执行后续同步和生成

**验证点**:

- ✅ 用户自定义内容完整保留
- ✅ 自动生成内容正确更新
- ✅ 旧的自动生成内容被替换
- ✅ 块标记结构保持完整

**运行方法**:

```bash
# 运行所有用户规则保护集成测试
pnpm test:suite:mocha -- --grep "User Rules Protection"

# 只运行首次使用测试
pnpm test:suite:mocha -- --grep "first-time generation"
```

---

## 用户配置

### 启用保护

```json
{
  "turbo-ai-rules.protectUserRules": true
}
```

### 自定义前缀范围（可选）

```json
{
  "turbo-ai-rules.userPrefixRange": {
    "min": 80000,
    "max": 99999
  }
}
```

### 自定义块标记（可选）

```json
{
  "turbo-ai-rules.blockMarkers": {
    "begin": "<!-- CUSTOM-BEGIN -->",
    "end": "<!-- CUSTOM-END -->"
  }
}
```

---

## 使用建议

### 推荐场景

1. **新用户**：保持默认关闭，遵循 80000-99999 前缀命名
2. **团队协作**：如果成员可能不遵循命名规范，建议启用
3. **首次迁移**：已有规则文件时，**必须启用**以保护原有内容

### 最佳实践

1. **首次使用扩展前**：

   - 如果已有规则文件，先启用 `protectUserRules: true`
   - 再执行 "Generate Config Files"

2. **日常使用**：

   - 在块标记外添加自定义规则
   - 不要手动修改块标记内的内容（会被覆盖）

3. **团队共享**：
   - 将 `.cursorrules` 等文件添加到 `.gitignore`
   - 或使用块标记分离自动生成和团队共享部分

---

## 技术决策

### 为什么区分"有块标记"和"无块标记"？

**原因**：

- 无块标记 = 用户可能是第一次使用扩展，已有文件应全部保留
- 有块标记 = 文件已被扩展管理，只保留块外内容

**替代方案**（已拒绝）：

- 方案 1：总是覆盖（❌ 会丢失用户内容）
- 方案 2：总是保留全部（❌ 无法更新自动生成内容）
- 方案 3：提示用户选择（❌ 增加交互复杂度）

### 为什么使用块标记而不是单独文件？

**单文件模式的优势**：

- ✅ 符合 Cursor、Copilot 等工具的规范（单文件配置）
- ✅ 用户无需维护多个文件
- ✅ 可在同一文件中同时使用自动生成和自定义规则

**目录模式的优势**：

- ✅ 更清晰的文件分离
- ✅ 更容易管理大量规则
- ✅ 支持工具（如 Continue）的目录结构

**决策**：根据适配器类型自动选择合适的模式。

---

## 问题记录

### Issue: 启用保护后首次生成仍清空用户规则

**日期**: 2024-11-26  
**报告**: 用户反馈启用 `protectUserRules: true` 后，生成配置文件仍会清空原有内容

**根本原因**：

- `extractUserContent()` 只提取块标记外的内容
- 首次使用时文件无块标记，返回空字符串
- 导致原有内容丢失

**修复**：

- 检查文件是否包含块标记
- 无块标记时，将整个文件内容视为用户规则
- 添加日志记录首次保护行为

**测试**：

- 添加单元测试 `should preserve existing content when protectUserRules is enabled and file has no markers`
- 验证首次保护场景

**影响**：

- 修复后，用户首次使用扩展时原有规则会被完整保留
- 兼容已有块标记的文件（不影响现有用户）

---

## 相关文档

- **用户文档**: `docs/user-guide/04-faq.zh.md` - Q12: protectUserRules 配置说明
- **设计文档**: `docs/development/03-design.md` - 文件生成服务设计
- **工具函数**: `src/utils/userRulesProtection.ts` - 保护逻辑实现

---

## 维护提示

1. **修改块标记格式时**：同步更新 `BLOCK_MARKERS` 常量和用户文档
2. **添加新适配器时**：确认其输出类型（目录/单文件）以选择正确的保护模式
3. **更新保护逻辑时**：必须添加对应的单元测试
4. **修改默认配置时**：需要更新用户文档和迁移指南
