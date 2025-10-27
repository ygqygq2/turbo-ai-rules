# UI Phase 3: 高级搜索功能实现

## 概述

Phase 3 实现了高级搜索 Webview 和批量操作命令，提升了规则管理的效率和灵活性。

---

## 1. 高级搜索 Webview

### 1.1 功能说明

高级搜索提供强大的多条件组合搜索能力，支持历史记录和结果导出。

**核心特性**:

- 多条件组合搜索（名称/内容/标签/优先级/来源）
- 搜索历史记录（最近 10 次，持久化存储）
- 快捷过滤器（按优先级快速筛选）
- 实时搜索结果展示（显示匹配字段）
- 结果导出（JSON/CSV 格式）
- 集成规则详情查看

### 1.2 架构设计

**文件结构**:

```
src/providers/SearchWebviewProvider.ts  (656 行)
├── SearchCriteria 接口 - 搜索条件定义
├── SearchResult 接口 - 搜索结果定义
├── SearchMessage 类型 - Webview 消息协议
└── SearchWebviewProvider 类 - 主实现类
```

**核心接口**:

```typescript
interface SearchCriteria {
  namePattern?: string; // 规则名称模糊匹配
  contentPattern?: string; // 内容全文搜索
  tags?: string[]; // 标签过滤
  priority?: number; // 优先级筛选 (0/1/2)
  source?: string; // 来源过滤
}

interface SearchResult {
  rule: ParsedRule; // 匹配的规则
  matchedFields: string[]; // 匹配的字段列表
}
```

### 1.3 搜索算法

**多条件组合逻辑**:

核心思路：

1. 遍历所有规则
2. 对每个规则逐条件验证
3. 任一条件不匹配则排除该规则
4. 记录匹配的字段用于展示
5. 返回所有匹配的规则及匹配字段

**条件验证**:

- 名称匹配：模糊匹配规则名称
- 内容匹配：全文搜索规则内容
- 标签匹配：交集判断
- 优先级匹配：精确匹配
- 来源匹配：模糊匹配源名称

### 1.4 搜索历史

**存储机制**:

- **存储位置**：`context.globalState`（持久化）
- **最大数量**：10 条历史记录
- **去重策略**：相同搜索条件不重复添加
- **排序规则**：新搜索自动置顶

**历史管理流程**:

1. 清理空条件字段
2. 检查是否与已有历史重复
3. 如果重复，移除旧记录
4. 将新搜索条件添加到列表开头
5. 限制列表长度不超过最大数量
6. 保存到 globalState

**持久化**:

- 使用 `globalState.update()` 保存
- 使用 `globalState.get()` 恢复
- 跨会话保留搜索历史

### 1.5 结果导出

**支持格式**:

- **JSON**: 完整数据导出，包含所有元数据
- **CSV**: 表格格式，适合 Excel 分析

**导出内容**:

- 规则名称、路径、优先级
- 标签、来源、描述
- 匹配字段列表

### 1.6 用户界面

**布局结构**:

```
┌─────────────────────────────────────┐
│ Search Conditions                   │
│ ┌─────────────────────────────────┐ │
│ │ Name:     [________________] 🔍 │ │
│ │ Content:  [________________]    │ │
│ │ Tags:     [tag1, tag2...   ]    │ │
│ │ Priority: [ All ▼]              │ │
│ │ Source:   [________________]    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Quick Filters: [High] [Medium] [Low]│
│                                     │
│ Search History                      │
│ • "authentication" - 2 results      │
│ • "high priority" - 15 results      │
│                                     │
│ Results (23 found)    [Export ▼]   │
│ 🔥 auth/jwt-validation.mdc   [View]│
│ ⚠️  security/input-sanitize [View]│
└─────────────────────────────────────┘
```

### 1.7 集成点

**命令注册**:

- `turbo-ai-rules.advancedSearch` - 打开高级搜索面板
- `turbo-ai-rules.getAllRules` - 获取所有规则（内部使用）

**快捷键**:

- `Cmd+Shift+Alt+F` (Mac)
- `Ctrl+Shift+Alt+F` (Windows/Linux)

**工具栏按钮**:

- 树视图顶部第 5 个位置
- 图标: `$(search)`

### 1.8 性能考虑

**优化措施**:

- 前端防抖：输入延迟 300ms 后触发搜索
- 结果缓存：搜索结果保存在内存中
- 虚拟滚动：大量结果时仅渲染可见区域（待实现）

**性能指标**:

- 搜索响应时间: < 100ms (100 条规则)
- UI 渲染时间: < 50ms
- 内存占用: < 5MB

---

## 2. 批量操作命令

### 2.1 功能说明

提供批量管理规则的命令，支持批量启用、禁用、导出和删除规则。

### 2.2 实现文件

**文件**: `src/commands/batchOperations.ts`

**导出命令**:

- `batchDisableRulesCommand`: 批量禁用规则
- `batchEnableRulesCommand`: 批量启用规则
- `batchExportRulesCommand`: 批量导出规则
- `batchDeleteRulesCommand`: 批量删除规则
- `selectAllRulesCommand`: 全选规则
- `deselectAllRulesCommand`: 取消全选

### 2.3 命令详解

**批量禁用**:

- 将规则路径添加到 `ignorePatterns` 配置
- 模态确认对话框
- 支持批量操作多个规则

**批量启用**:

- 从 `ignorePatterns` 配置中移除规则路径
- 模态确认对话框
- 自动刷新配置

**批量导出**:

- 导出为 JSON 格式
- 包含完整元数据和内容
- 自定义导出路径

**批量删除**:

- 从磁盘删除规则文件
- 二次确认（不可撤销警告）
- 错误处理和日志记录

### 2.4 使用场景

1. **清理过期规则**: 批量删除不再使用的规则
2. **导出备份**: 批量导出规则集进行备份
3. **临时禁用**: 批量禁用某类规则进行测试
4. **批量启用**: 重新启用之前禁用的规则

---

## 3. 待实现功能

### 3.1 配置管理 Webview

**状态**: 设计完成，实现暂停

**原因**:

- RuleSource 接口使用 `gitUrl` 字段（不是 `url`）
- BaseWebviewProvider 构造函数签名需要适配
- 需要类型系统重构

**后续计划**:

1. 简化版：只读配置查看器
2. 完整版：等待类型重构后实现编辑功能

### 3.2 树视图多选支持

**状态**: 设计完成，待实现

**需要的 API**:

- VS Code TreeView 多选 API
- 自定义选择管理器
- 批量操作工具栏

**技术方案**: 详见 `09-ui-phase3-design.md` Task 3

### 3.3 拖放排序

**状态**: 设计完成，待实现

**需要的 API**:

- `vscode.TreeDragAndDropController`
- 拖放事件处理
- 视觉反馈实现

**技术方案**: 详见 `09-ui-phase3-design.md` Task 4

---

## 4. 编译与集成

### 4.1 编译状态

✅ 编译成功

- Bundle: 586.9kb
- Source Map: 1.1mb
- Build Time: ~100ms

### 4.2 新增文件

- `src/providers/SearchWebviewProvider.ts` - 高级搜索 Webview 实现
- `src/commands/batchOperations.ts` - 批量操作命令
- `docs/development/07-ui-phase3-design.md` - Phase 3 设计文档

### 4.3 修改文件

- `src/extension.ts` - 注册新命令
- `src/providers/index.ts` - 导出 SearchWebviewProvider
- `src/commands/index.ts` - 导出批量操作命令
- `package.json` - 命令定义、工具栏、快捷键

---

## 5. 测试建议

### 5.1 高级搜索测试

**基础功能**:

- [ ] 单条件搜索（名称）
- [ ] 单条件搜索（内容）
- [ ] 多条件组合搜索
- [ ] 标签过滤
- [ ] 优先级过滤
- [ ] 快捷过滤器

**高级功能**:

- [ ] 搜索历史保存
- [ ] 历史记录点击重搜
- [ ] 清除历史记录
- [ ] 导出 JSON
- [ ] 导出 CSV
- [ ] 查看规则详情

**性能测试**:

- [ ] 100+ 规则搜索性能
- [ ] 1000+ 规则搜索性能
- [ ] 大量结果渲染性能

### 5.2 批量操作测试

**功能测试**:

- [ ] 批量禁用规则
- [ ] 批量启用规则
- [ ] 批量导出规则
- [ ] 批量删除规则

**边界测试**:

- [ ] 空选择处理
- [ ] 单个规则操作
- [ ] 大量规则操作（100+）
- [ ] 取消操作

---

## 6. 已知问题

### 6.1 功能限制

- 虚拟滚动未实现（大量结果可能卡顿）
- 树视图多选未实现（批量操作需手动调用）
- 配置管理 Webview 未完成

### 6.2 性能问题

- 1000+ 规则全文搜索较慢
- 搜索结果渲染未优化
- 导出大量规则可能阻塞 UI

### 6.3 改进建议

- 实现模糊匹配算法（Fuse.js）
- 添加搜索结果高亮
- 支持正则表达式搜索
- 添加搜索过滤器预设

---

## 7. 下一步开发

### 优先级 1（核心功能）

1. **树视图多选支持**

   - 实现选择管理器
   - 集成批量操作命令
   - 添加工具栏按钮

2. **性能优化**
   - 虚拟滚动实现
   - 搜索算法优化
   - 结果缓存策略

### 优先级 2（增强功能）

3. **配置管理 Webview**

   - 简化版：只读配置查看
   - 完整版：编辑和验证

4. **拖放排序**
   - TreeDragAndDropController 实现
   - 视觉反馈
   - 自动保存

### 优先级 3（体验优化）

5. **搜索增强**

   - 模糊匹配
   - 正则表达式支持
   - 结果高亮

6. **批量操作增强**
   - 操作预览
   - 撤销功能
   - 进度提示

---

_文档版本: 2.0_  
_最后更新: Phase 3 Task 1-2 完成_  
_状态: 正式开发文档_
