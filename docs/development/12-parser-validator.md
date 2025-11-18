# 解析与验证

> 本文档描述 Turbo AI Rules 的规则文件解析、验证和错误处理机制。

---

## 1. 规则文件格式 (MDC)

### 1.1 MDC 格式概述

MDC (Markdown with Frontmatter) 格式包含两部分：

- **Frontmatter**: YAML 格式的元数据（用 `---` 包裹）
- **Markdown Content**: 规则的主体内容

### 1.2 标准格式示例

````markdown
---
id: typescript-strict-mode
title: TypeScript Strict Mode
version: 1.0.0
tags: [typescript, strict, best-practice]
priority: 10
author: Example Team
lastModified: 2025-01-23
description: Enable TypeScript strict mode for better type safety
---

# TypeScript Strict Mode

Always enable strict mode in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```
````

```

### 1.3 必需字段

- `id`: 唯一标识符（kebab-case，建议包含命名空间）
- `title`: 规则标题（用于显示）
- `version`: 语义化版本号（格式：x.y.z）

### 1.4 可选字段

- `tags`: 标签数组（用于分类和过滤）
- `priority`: 优先级（数值，默认 5，范围 1-10）
- `author`: 作者信息
- `lastModified`: 最后修改时间（ISO 8601 格式）
- `description`: 简短描述
- `category`: 分类（typescript/react/python 等）
- `language`: 适用的编程语言
- `aiTools`: 适用的 AI 工具（cursor/copilot/continue）

---

## 2. 解析流程 (MdcParser)

### 2.1 解析步骤

```

1. 读取文件内容
   • 检测文件编码（UTF-8/UTF-16/GBK）
   • 处理 BOM
   ↓
2. 分离 Frontmatter 和 Content
   • 使用正则表达式匹配 `---` 包裹的部分
   • 提取 YAML 和 Markdown 部分
   ↓
3. 解析 Frontmatter
   • 使用 gray-matter 库解析 YAML
   • 验证必需字段
   ↓
4. 验证元数据
   • 类型检查
   • 范围验证
   • 格式验证
   ↓
5. 处理 Markdown Content
   • 保留原始 Markdown
   • 提取内联元数据（如果有）
   ↓
6. 构建 ParsedRule 对象
   • 合并元数据和内容
   • 添加来源信息
   ↓
7. 返回解析结果

````

### 2.2 错误处理

- **TAI-3001**: MDC 文件格式错误（frontmatter 语法错误）
- **TAI-3002**: 必需元数据缺失（id, title）
- **TAI-3003**: 语义校验失败（规则内容为空）
- **TAI-3004**: 文件编码错误（非 UTF-8）

### 2.3 容错机制

- **部分解析**: 元数据错误时尝试保留内容
- **默认值填充**: 缺少可选字段时使用默认值
- **警告而非错误**: 非关键错误降级为警告
- **继续处理**: 单个文件错误不影响其他文件

---

## 3. 验证规则 (RulesValidator)

### 3.1 元数据验证

**ID 验证**:
- 格式: `^[a-z0-9][a-z0-9-]*$` (纯数字、kebab-case 或组合)
- 示例: `102`, `typescript-naming`, `102-typescript`
- 长度: 1-100 字符
- 唯一性: 在规则源内唯一
- 注意: YAML 中纯数字 ID 会被自动转换为字符串

**Title 验证**:
- 长度: 1-200 字符
- 不为空白字符

**Version 验证**:
- 格式: `x.y.z` (语义化版本)
- 正则: `^\d+\.\d+\.\d+$`

**Tags 验证**:
- 类型: 字符串数组
- 每个标签: `^[a-z0-9-]+$`
- 最多: 20 个标签

**Priority 验证**:
- 类型: 数值
- 范围: 1-10
- 默认: 5

**Date 验证**:
- 格式: ISO 8601 (YYYY-MM-DDTHH:mm:ssZ)
- 有效日期范围

### 3.2 内容验证

**非空验证**:
- Markdown 内容不为空
- 不是纯空白字符
- 至少包含 10 个非空白字符

**结构验证**:
- 包含至少一个标题（`#`）
- 段落结构合理
- 代码块闭合正确

**语义验证**:
- 内容与元数据一致
- 标签与内容相关
- 语言标记正确

### 3.3 跨规则验证

**ID 冲突检测**:
- 同一规则源内 ID 唯一
- 跨规则源 ID 冲突记录到日志

**版本一致性**:
- 同名规则版本递增
- 版本号符合语义化规范

**依赖检测**:
- 检测规则间依赖关系（如果支持）
- 验证依赖规则存在

---

## 4. 错误码体系

### 4.1 解析类错误 (TAI-300x)

- **TAI-3001**: MDC 文件格式错误
  - 原因: frontmatter 语法错误、YAML 解析失败
  - 建议: 检查 `---` 分隔符和 YAML 语法

- **TAI-3002**: 必需元数据缺失
  - 原因: 缺少 `id` 或 `title` 字段
  - 建议: 添加必需字段

- **TAI-3003**: 语义校验失败
  - 原因: 规则内容为空或不符合预期
  - 建议: 检查规则内容是否有效

- **TAI-3004**: 文件编码错误
  - 原因: 文件不是 UTF-8 编码
  - 建议: 转换文件编码为 UTF-8

### 4.2 验证类错误 (TAI-400x)

- **TAI-4001**: 生成目标文件失败
  - 原因: 权限不足或磁盘空间不足
  - 建议: 检查文件权限和磁盘空间

- **TAI-4002**: 文件覆盖冲突
  - 原因: 用户手动修改了生成的文件
  - 建议: 备份文件或选择覆盖

- **TAI-4003**: 模板渲染错误
  - 原因: 模板语法错误或变量缺失
  - 建议: 检查模板文件和变量绑定

---

## 5. 性能优化

### 5.1 批量解析

- **并行解析**: 多个文件并行解析（限制并发数）
- **流式读取**: 大文件使用流式读取
- **增量解析**: 只解析变化的文件

### 5.2 缓存策略

- **解析结果缓存**: LRU 缓存解析结果（最多 100 个）
- **文件哈希缓存**: 缓存文件哈希避免重复计算
- **元数据索引**: 内存中建立快速索引

### 5.3 内存管理

- **流式处理**: 避免一次性加载所有文件
- **分块处理**: 大文件分块处理
- **及时释放**: 处理完毕立即释放内存

---

## 6. 扩展性设计

### 6.1 自定义解析器

支持用户自定义解析器：

```typescript
interface CustomParser {
  parse(filePath: string): Promise<ParsedRule>;
  validate(rule: ParsedRule): ValidationResult;
}
````

注册自定义解析器：

```json
{
  "turboAiRules.parsers.custom": [
    {
      "name": "JSON Rules Parser",
      "extensions": [".json"],
      "parser": "path/to/parser.js"
    }
  ]
}
```

### 6.2 自定义验证规则

支持用户自定义验证规则：

```typescript
interface ValidationRule {
  name: string;
  validate(rule: ParsedRule): ValidationResult;
}
```

注册验证规则：

```json
{
  "turboAiRules.validators.custom": [
    {
      "name": "Team ID Convention",
      "rule": "id.startsWith('team-')"
    }
  ]
}
```

### 6.3 插件机制

未来可支持解析器插件：

- 独立 npm 包
- 动态加载
- 沙箱执行
- 热更新

---

## 7. 测试覆盖

### 7.1 单元测试

- **有效 MDC 文件**: 测试标准格式解析
- **缺失字段**: 测试必需字段缺失处理
- **格式错误**: 测试 YAML 语法错误处理
- **边界情况**: 测试空文件、超大文件、特殊字符

### 7.2 集成测试

- **批量解析**: 测试多文件并行解析
- **增量解析**: 测试只解析变化文件
- **错误恢复**: 测试部分文件错误时的恢复

### 7.3 性能测试

- **大文件解析**: 测试 MB 级文件解析性能
- **批量解析**: 测试 1000+ 文件解析性能
- **内存使用**: 测试内存占用和泄漏

---

## 8. 日志与调试

### 8.1 日志记录

- **解析开始**: 记录文件路径和大小
- **解析完成**: 记录耗时和结果
- **错误详情**: 记录错误码、原因和堆栈
- **验证结果**: 记录通过/失败的验证规则

### 8.2 调试信息

- **详细模式**: 开启详细日志记录所有步骤
- **性能分析**: 记录各阶段耗时
- **缓存命中率**: 记录缓存命中率统计

### 8.3 错误追踪

- **上下文信息**: 记录错误发生时的上下文
- **堆栈跟踪**: 记录完整的错误堆栈
- **用户反馈**: 支持用户报告错误和提供反馈

---

> **返回**: [03-design.md](./03-design.md) - 产品整体设计
