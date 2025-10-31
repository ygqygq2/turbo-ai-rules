# 适配器设计

> 本文档描述 Turbo AI Rules 的适配器架构、接口设计和扩展机制。

---

## 1. 适配器架构

### 1.1 适配器的作用

适配器是 Turbo AI Rules 的核心扩展点，负责：

- 将通用规则格式转换为 AI 工具特定格式
- 处理不同 AI 工具的配置文件位置和命名
- 支持自定义规则模板和渲染逻辑
- 提供工具特定的优化和增强

### 1.2 适配器分类

```
┌────────────────────────────────────────────────────┐
│              AIToolAdapter (基类)                  │
│  • 定义通用接口和抽象方法                         │
│  • 提供默认实现和辅助方法                         │
└────────────────────────────────────────────────────┘
                      ↓
    ┌─────────────────┴─────────────────┐
    ↓                                     ↓
┌─────────────────────┐      ┌─────────────────────┐
│   内置适配器        │      │   自定义适配器       │
│ • CursorAdapter     │      │ • CustomAdapter     │
│ • CopilotAdapter    │      │   (用户提供模板)    │
│ • ContinueAdapter   │      │                     │
└─────────────────────┘      └─────────────────────┘
```

---

## 2. 适配器基类 (AIToolAdapter)

### 2.1 核心职责

- 定义适配器接口和生命周期
- 提供通用的规则过滤和排序逻辑
- 处理错误和日志记录
- 支持配置验证和默认值

### 2.2 关键方法

- `generate(rules: ParsedRule[]): string` - 生成配置内容
- `getTargetFile(): string` - 返回目标文件路径
- `validate(config: AdapterConfig): ValidationResult` - 验证配置
- `shouldEnable(): boolean` - 判断是否应启用
- `formatRules(rules: ParsedRule[]): ParsedRule[]` - 格式化规则

### 2.3 生命周期钩子

- `beforeGenerate()` - 生成前的准备工作
- `afterGenerate()` - 生成后的清理工作
- `onError(error: Error)` - 错误处理

---

## 3. 内置适配器

### 3.1 CursorAdapter

**目标文件**: `.cursorrules`

**特性**:

- 支持 Markdown 格式
- 支持分段规则（用 `---` 分隔）
- 自动添加元数据注释
- 支持优先级排序

**配置项**:

```json
{
  "turboAiRules.adapters.cursor": {
    "enabled": true,
    "autoUpdate": true,
    "template": "default",
    "includeMetadata": true
  }
}
```

### 3.2 CopilotAdapter

**目标文件**: `.github/copilot-instructions.md`

**特性**:

- 符合 GitHub Copilot 格式要求
- 支持多语言规则
- 自动分类和索引
- 支持代码块语法高亮

**配置项**:

```json
{
  "turboAiRules.adapters.copilot": {
    "enabled": true,
    "autoUpdate": true,
    "language": "en",
    "includeExamples": true
  }
}
```

### 3.3 ContinueAdapter

**目标文件**: `.continuerules`

**特性**:

- 支持 Continue.dev 特有语法
- 支持规则分组
- 支持条件规则（基于文件类型）
- 支持嵌入式代码片段

**配置项**:

```json
{
  "turboAiRules.adapters.continue": {
    "enabled": true,
    "autoUpdate": true,
    "groupByCategory": true,
    "includeCodeSnippets": true
  }
}
```

---

## 4. 自定义适配器 (CustomAdapter)

### 4.1 使用场景

- 团队内部的自定义 AI 工具
- 实验性 AI 工具
- 需要特殊格式转换的工具
- 多配置文件需求

### 4.2 配置格式

```json
{
  "turboAiRules.adapters.custom": [
    {
      "name": "My Custom Tool",
      "targetFile": ".my-tool-rules",
      "template": "path/to/template.hbs",
      "enabled": true,
      "autoUpdate": true,
      "options": {
        "format": "json",
        "indent": 2
      }
    }
  ]
}
```

### 4.3 模板语法 (Handlebars)

支持使用 Handlebars 模板引擎定义自定义格式：

```handlebars
{{! template.hbs }}
# Rules for
{{toolName}}

Generated at:
{{timestamp}}

{{#each rules}}
  ##
  {{title}}

  {{content}}

  ---
{{/each}}
```

### 4.4 可用变量

- `rules`: 规则数组 (`ParsedRule[]`)
- `sources`: 规则源信息 (`RuleSource[]`)
- `timestamp`: 生成时间戳
- `toolName`: 工具名称
- `version`: 扩展版本

---

## 5. 规则转换流程

### 5.1 转换步骤

```
1. 获取合并后的规则列表
   ↓
2. 适配器过滤规则 (tags, priority)
   ↓
3. 适配器排序规则
   ↓
4. 适配器格式化内容
   ↓
5. 应用模板 (如果有)
   ↓
6. 添加元数据注释
   ↓
7. 返回最终内容
```

### 5.2 过滤策略

- **按标签过滤**: 只包含特定标签的规则
- **按优先级过滤**: 高于指定阈值的规则
- **按来源过滤**: 只包含指定规则源的规则
- **自定义过滤**: 适配器实现自定义逻辑

### 5.3 排序策略

- **按优先级排序**: 数值越高越靠前
- **按来源排序**: 按规则源添加顺序
- **按字母排序**: 按规则标题字母顺序
- **自定义排序**: 适配器实现自定义逻辑

---

## 6. 冲突处理

### 6.1 规则冲突

当多个规则源包含相同 ID 的规则时：

- **priority 策略**: 高优先级覆盖低优先级
- **merge 策略**: 合并规则内容（需适配器支持）
- **skip-duplicates 策略**: 保留第一个，跳过重复

### 6.2 配置冲突

当多个适配器生成相同目标文件时：

- 提示用户配置错误
- 拒绝生成并记录错误
- 建议用户修改配置

### 6.3 冲突标记

在生成的配置文件中添加注释标记冲突来源：

```markdown
<!-- Conflict Detected: Rule 'typescript-strict' from multiple sources -->
<!-- Priority: typescript-official (10) > typescript-team (5) -->
```

---

## 7. 性能优化

### 7.1 模板缓存

- 编译后的模板缓存到内存
- 避免重复编译
- 支持模板热更新

### 7.2 增量生成

- 检测规则是否有变化
- 只有变化时才重新生成
- 保留未变化的配置文件

### 7.3 并行生成

- 多个适配器并行生成配置
- 使用 Promise.all 提高效率
- 控制并发数避免资源耗尽

---

## 8. 错误处理

### 8.1 错误类型

- **TAI-4001**: 生成目标文件失败（权限/磁盘空间）
- **TAI-4002**: 文件覆盖冲突（用户手动修改）
- **TAI-4003**: 模板渲染错误（语法错误）

### 8.2 错误恢复

- 生成失败时保留原文件
- 临时文件清理
- 记录详细日志供排查

### 8.3 用户反馈

- 提示具体错误原因
- 提供修复建议
- 支持跳过失败继续处理其他适配器

---

## 9. 扩展机制

### 9.1 适配器插件

未来可支持适配器插件机制：

- 独立 npm 包
- 通过配置安装和启用
- 热加载和卸载
- 沙箱执行

### 9.2 适配器市场

可建立适配器市场：

- 社区贡献的适配器
- 评分和评论
- 自动更新
- 安全审核

### 9.3 API 稳定性

- 适配器接口遵循语义化版本
- 主版本升级保持向后兼容
- 提供迁移指南

---

> **返回**: [01-design.md](./01-design.md) - 产品整体设计
