# 规则选择器页面设计文档

## 1. 页面概述

### 功能定位
为已添加的规则源提供细粒度的规则选择功能，允许用户指定同步哪些目录/文件。

### 使用场景
- 用户添加规则源后，希望只同步部分规则
- 用户希望排除某些不需要的规则目录
- 用户需要管理大型规则仓库的同步范围

### 入口
- 欢迎页面：添加"选择规则"按钮
- Source Detail 页面：在工具栏添加"选择规则"操作

---

## 2. 功能需求

### 2.1 核心功能

#### 规则树展示
- 显示规则源的目录/文件树形结构
- 支持展开/收起目录
- 显示每个节点的类型（目录/文件）
- 显示文件的规则数量

#### 选择功能
- 复选框选择机制（支持单选/全选/反选）
- 默认全选（同步整个仓库根目录）
- 选择父目录时，自动选择所有子项
- 取消父目录时，自动取消所有子项
- 部分选择状态（子项部分选中时，父项显示为半选状态）

#### 搜索与过滤
- 支持按文件名/路径搜索
- 支持按规则标签过滤
- 显示搜索结果的匹配项

#### 统计信息
- 显示总规则数
- 显示已选择的规则数
- 显示排除的规则数
- 实时更新统计

### 2.2 用户交互

#### 快捷操作
- "全选"按钮：选择所有规则
- "清除"按钮：取消所有选择
- "反选"按钮：反转当前选择状态
- "重置"按钮：恢复为默认状态（全选）

#### 保存与取消
- "保存"按钮：保存选择配置
- "取消"按钮：放弃更改并关闭

---

## 3. 页面布局

### 3.1 整体结构

```
┌─────────────────────────────────────────┐
│ Header                                   │
│ - 标题：选择规则                         │
│ - 规则源名称                             │
│ - 关闭按钮                               │
├─────────────────────────────────────────┤
│ Toolbar                                  │
│ - 搜索框                                 │
│ - 快捷操作按钮组                         │
├─────────────────────────────────────────┤
│ Statistics Bar                           │
│ - 总数 / 已选 / 排除                     │
├─────────────────────────────────────────┤
│ Rules Tree (可滚动)                      │
│ ├─ 📁 directory1 [✓]                    │
│ │  ├─ 📄 rule1.md (1 rule) [✓]         │
│ │  └─ 📄 rule2.md (2 rules) [✓]        │
│ ├─ 📁 directory2 [⊡] (部分选中)         │
│ │  ├─ 📄 rule3.md (1 rule) [✓]         │
│ │  └─ 📄 rule4.md (1 rule) [ ]         │
│ └─ 📄 root-rule.md (1 rule) [✓]         │
├─────────────────────────────────────────┤
│ Footer                                   │
│ - 保存按钮                               │
│ - 取消按钮                               │
└─────────────────────────────────────────┘
```

### 3.2 组件层次

- **Header**：标题 + 规则源信息 + 关闭按钮
- **Toolbar**：搜索 + 全选/清除/反选/重置
- **Statistics**：统计信息（总数、已选、排除）
- **Tree Container**：可滚动的树形列表
  - TreeNode：目录/文件节点
    - 复选框
    - 图标（📁/📄）
    - 名称
    - 规则数（文件节点）
    - 展开/收起按钮（目录节点）
- **Footer**：保存 + 取消按钮

---

## 4. 视觉设计要求

### 4.1 主题适配
- 使用 VSCode CSS 变量（`var(--vscode-*)`）
- 支持亮色/暗色主题自动切换
- 保持与其他页面的视觉一致性

### 4.2 紧凑布局（重要）
- 减少垂直间距：使用 `var(--spacing-sm)` (8px)
- 节点高度：32px（紧凑）
- Header/Footer 高度：48px
- Toolbar 高度：40px
- Statistics 高度：32px
- 树形列表使用虚拟滚动（如果节点数量大）

### 4.3 交互状态
- **复选框状态**：
  - 未选中：`[ ]`
  - 选中：`[✓]`
  - 部分选中：`[⊡]`（半选）
- **Hover 效果**：背景色变化
- **选中效果**：复选框颜色变化
- **禁用状态**：灰色显示

### 4.4 颜色方案
- 主背景：`var(--vscode-editor-background)`
- 卡片背景：`var(--vscode-editorWidget-background)`
- 边框：`var(--vscode-editorWidget-border)`
- 文本：`var(--vscode-foreground)`
- 描述文本：`var(--vscode-descriptionForeground)`
- 主按钮：`var(--vscode-button-background)`
- 次按钮：`var(--vscode-button-secondaryBackground)`

---

## 5. 数据结构

### 5.1 树节点结构

```typescript
interface TreeNode {
  id: string;              // 唯一标识
  name: string;            // 文件/目录名
  path: string;            // 相对路径
  type: 'directory' | 'file';
  checked: boolean;        // 是否选中
  indeterminate: boolean;  // 是否半选（仅目录）
  ruleCount?: number;      // 规则数（仅文件）
  children?: TreeNode[];   // 子节点（仅目录）
  expanded?: boolean;      // 是否展开（仅目录）
}
```

### 5.2 选择配置

```typescript
interface RuleSelection {
  sourceId: string;        // 规则源 ID
  mode: 'include' | 'exclude'; // 选择模式
  paths: string[];         // 选中的路径列表
  excludePaths?: string[]; // 排除的路径列表
}
```

---

## 6. 消息协议

### 6.1 Webview → Extension

#### 加载树形结构
```typescript
{
  command: 'loadRuleTree',
  sourceId: string
}
```

#### 保存选择
```typescript
{
  command: 'saveRuleSelection',
  sourceId: string,
  selection: RuleSelection
}
```

#### 搜索规则
```typescript
{
  command: 'searchRules',
  sourceId: string,
  query: string
}
```

### 6.2 Extension → Webview

#### 返回树形结构
```typescript
{
  type: 'treeData',
  data: {
    tree: TreeNode,
    totalRules: number,
    selectedRules: number
  }
}
```

#### 保存成功
```typescript
{
  type: 'saveSuccess',
  message: string
}
```

#### 错误消息
```typescript
{
  type: 'error',
  message: string,
  code?: string
}
```

---

## 7. 技术实现要点

### 7.1 性能优化
- 使用虚拟滚动处理大量节点（>100 个）
- 树节点懒加载（按需展开目录）
- 搜索结果高亮与节点缓存

### 7.2 状态管理
- 使用 React Context 或 Zustand 管理选择状态
- 节点展开/收起状态持久化
- 搜索状态与选择状态分离

### 7.3 用户体验
- 节点选择带动画反馈（复选框勾选动画）
- 保存时显示 loading 状态
- 操作失败时友好提示

---

## 8. 响应式设计

### 桌面布局（>768px）
- 树形容器最大高度：`calc(100vh - 300px)`
- 节点缩进：24px/层级

### 移动布局（<768px）
- 树形容器最大高度：`calc(100vh - 280px)`
- 节点缩进：16px/层级
- 按钮文字缩短

---

## 9. 开发优先级

### P0（MVP）
- [x] 树形结构展示
- [x] 复选框选择功能
- [x] 全选/清除/重置
- [x] 保存/取消操作
- [x] 统计信息显示

### P1（增强）
- [ ] 搜索与过滤
- [ ] 反选功能
- [ ] 虚拟滚动（大列表优化）

### P2（优化）
- [ ] 节点拖拽排序
- [ ] 批量操作（批量选择标签）
- [ ] 导入/导出配置

---

## 10. 测试用例

### 功能测试
- [ ] 展开/收起目录正常工作
- [ ] 选择父目录时子项全选
- [ ] 取消父目录时子项全取消
- [ ] 部分选择状态正确显示
- [ ] 全选/清除/重置功能正常
- [ ] 搜索功能匹配正确
- [ ] 保存后配置正确存储

### 边界测试
- [ ] 空目录处理
- [ ] 深层嵌套目录（>5 层）
- [ ] 大量节点（>500 个）性能
- [ ] 网络错误处理
- [ ] 并发操作处理

---

## 11. 设计参考

### 视觉风格
参考 VSCode 内置的文件树：
- 简洁的图标
- 清晰的层级缩进
- 柔和的 hover 效果

### 交互模式
参考 Chrome DevTools 的 Coverage 面板：
- 复选框三态显示
- 统计信息实时更新
- 操作按钮分组明确

---

## 元信息

- **文档版本**: 1.0.0
- **创建日期**: 2025-10-30
- **设计者**: Turbo AI Rules 团队
- **目标实现**: Phase 2 - UI 优化
- **预计工作量**: 3-5 天
- **依赖**: GitManager（获取文件树）、RulesParser（统计规则数）

---

## 下一步

1. 使用 SuperDesign 生成 HTML 原型
2. 根据原型创建 React 组件
3. 实现 Provider 与消息通信
4. 集成到欢迎页和 Source Detail 页
5. 编写单元测试和集成测试
