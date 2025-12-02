# 规则同步页面设计文档

## 1. 页面概述

### 功能定位

提供规则选择和适配器映射的统一界面,让用户可以:

- 从所有规则源中选择要同步的规则
- 指定选中的规则同步到哪些适配器

### 使用场景

- 用户需要精细控制哪些规则同步到哪些适配器
- 用户想为不同适配器配置不同的规则集
- 用户需要快速浏览所有规则源的规则

### 入口

- Dashboard 首页："规则同步页"按钮
- 欢迎页面:"选择规则并同步"
- 命令面板:`turboAiRules.openRuleSyncPage`

---

## 2. 功能需求

### 2.1 核心功能

#### 规则树展示(左侧 - 所有规则源)

**重要**: 左侧展示所有规则源的规则树,不是单源切换

- 树形结构展示所有规则源(类似左侧规则树视图)
  ```
  📁 规则源 A (my-team-rules)
    ├─ 📁 001-general-standards
    │  ├─ 📄 coding-standards.md ☑
    │  └─ 📄 naming-conventions.md ☑
    ├─ 📁 100-programming-languages
    │  └─ 📄 typescript-guide.md ☐
  📁 规则源 B (public-rules)
    ├─ 📄 README.md ☐
    └─ 📁 best-practices
       └─ 📄 react-patterns.md ☑
  ```
- 每个规则源作为顶层节点,显示源名称
- 支持展开/收起目录(点击 chevron 图标)
- 显示文件类型图标(使用 Codicon)
- 规则文件旁显示复选框,可单独勾选
- 缩进显示层级关系(16-24px/层级)

#### 适配器选择(右侧)

**重要**: 右侧列出所有适配器供勾选

- 列表展示所有适配器(预置 + 自定义)

  ```
  ☑ GitHub Copilot
     输出: .github/copilot-instructions.md
     已选规则: 15 条

  ☑ Cursor
     输出: .cursorrules
     已选规则: 20 条

  ☐ Continue
     输出: .continuerules
     已选规则: 0 条

  ☑ Default Rules
     输出: rules/
     已选规则: 30 条

  ☑ AI Skills
     输出: skills/
     已选规则: 5 条
  ```

- 每个适配器显示:
  - 复选框(启用/禁用)
  - 适配器名称和图标
  - 输出路径
  - 当前选中规则数量(实时统计)
- 用户勾选适配器后,点击"同步"按钮将左侧选中的规则同步到勾选的适配器

#### 规则选择机制

**左侧规则树**:

- 所有节点都有复选框（规则源、目录、文件）
- 规则源/目录复选框：选中/取消所有子规则
- 部分选择状态（子项部分选中时显示半选）
- 支持跨规则源选择

**右侧适配器列表**:

- 适配器级复选框
- 勾选后才会同步到该适配器
- 实时显示每个适配器将同步的规则数

#### 同步逻辑

**核心原则**: 用户选择的规则 + 用户勾选的适配器 = 同步目标

1. 用户在左侧勾选规则(可跨多个源)
2. 用户在右侧勾选适配器
3. 点击"同步"按钮
4. 系统将左侧选中的规则同步到右侧勾选的所有适配器

**示例**:

- 选中规则: A 源的规则 1,规则 2 + B 源的规则 3
- 勾选适配器: Copilot, Cursor
- 结果: 规则 1,2,3 → 同步到 Copilot 和 Cursor

#### 搜索与过滤

- 左侧支持按文件名/路径搜索
- 支持按规则标签过滤(未来 P1)
- 搜索结果高亮显示

#### 统计信息

- 左侧顶部:总规则数、已选规则数
- 右侧每个适配器:将同步的规则数
- 底部:选中 X 条规则,将同步到 Y 个适配器

### 2.2 用户交互

#### 左侧快捷操作

- "全选"按钮:选择所有规则源的所有规则
- "清除"按钮:取消所有规则选择
- 搜索框:快速查找规则

#### 右侧快捷操作

- "全选适配器"按钮:勾选所有启用的适配器
- "清除适配器"按钮:取消所有适配器勾选

#### 同步操作

- "同步"按钮:执行同步操作
  - 将左侧选中的规则同步到右侧勾选的适配器
  - 显示同步进度
  - 完成后显示成功/失败通知
- "取消"按钮:关闭页面(不保存)

---

## 3. 页面布局

### 3.1 整体结构(两栏布局)

```
┌──────────────────────────────────────────────────────────────────────┐
│ Header                                                    [✕ 关闭]   │
│ 🔄 规则同步页                                                        │
├──────────────────────────────────────────────────────────────────────┤
│ Statistics Bar                                                       │
│ 📊 总规则: 45 条  |  已选: 20 条  |  将同步到: 2 个适配器            │
├────────────────────────────────────┬─────────────────────────────────┤
│ 左侧: 规则树 (所有规则源)          │ 右侧: 适配器列表                │
│                                    │                                 │
│ [🔍 搜索规则...]                   │ [☑ 全选] [☐ 清除]              │
│ [☑ 全选] [☐ 清除]                 │                                 │
│                                    │ ┌─────────────────────────────┐ │
│ ┌────────────────────────────────┐ │ │ ☑ GitHub Copilot            │ │
│ │ 📁 my-team-rules (15/30)       │ │ │    .github/copilot-inst...  │ │
│ │   ├─ 📁 001-general (2/5)      │ │ │    15 条规则                │ │
│ │   │  ├─ ☑ 📄 coding.md         │ │ └─────────────────────────────┘ │
│ │   │  └─ ☑ 📄 naming.md         │ │                                 │
│ │   ├─ 📁 100-languages (0/10)   │ │ ┌─────────────────────────────┐ │
│ │   │  └─ ☐ 📄 typescript.md     │ │ │ ☑ Cursor                    │ │
│ │   └─ ...                       │ │ │    .cursorrules             │ │
│ │                                │ │ │    20 条规则                │ │
│ │ 📁 public-rules (5/15)         │ │ └─────────────────────────────┘ │
│ │   ├─ 📁 best-practices (5/10)  │ │                                 │
│ │   │  └─ ☑ 📄 react.md          │ │ ┌─────────────────────────────┐ │
│ │   └─ ...                       │ │ │ ☐ Continue                  │ │
│ │                                │ │ │    .continuerules           │ │
│ │                                │ │ │    0 条规则                 │ │
│ │                                │ │ └─────────────────────────────┘ │
│ │                                │ │                                 │
│ │                                │ │ ┌─────────────────────────────┐ │
│ │                                │ │ │ ☑ Default Rules             │ │
│ │                                │ │ │    rules/                   │ │
│ │                                │ │ │    20 条规则                │ │
│ │                                │ │ └─────────────────────────────┘ │
│ │                                │ │                                 │
│ │                                │ │ ┌─────────────────────────────┐ │
│ │                                │ │ │ ☐ AI Skills                 │ │
│ │                                │ │ │    skills/                  │ │
│ │                                │ │ │    0 条规则                 │ │
│ │                                │ │ └─────────────────────────────┘ │
│ │                                │ │                                 │
│ └────────────────────────────────┘ │                                 │
│ (可滚动)                           │ (可滚动)                        │
│                                    │                                 │
├────────────────────────────────────┴─────────────────────────────────┤
│ Footer                                                               │
│ 💡 已选择 20 条规则,将同步到 2 个适配器  [取消]  [🔄 同步]          │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.2 组件层次

**左侧面板 - 规则树**:

- Header: 搜索框 + 快捷按钮(全选/清除)
- Tree Container: 可滚动的多源规则树
  - SourceNode: 规则源顶层节点
    - 源图标 + 源名称 + 统计(已选/总数)
  - DirectoryNode: 目录节点
    - 展开/收起图标(chevron)
    - 目录图标
    - 目录名称 + 统计
  - FileNode: 文件(规则)节点
    - 复选框
    - 文件图标
    - 文件名

**右侧面板 - 适配器列表**:

- Header: 快捷按钮(全选/清除适配器)
- Adapter Container: 可滚动的适配器卡片列表
  - AdapterCard: 适配器卡片
    - 复选框
    - 适配器图标 + 名称
    - 输出路径(描述文字)
    - 规则统计(将同步 X 条规则)

**顶部统计栏**:

- 总规则数
- 已选规则数
- 将同步到的适配器数

**底部操作栏**:

- 左侧: 提示信息(已选择 X 条规则,将同步到 Y 个适配器)
- 右侧: 取消按钮 + 同步按钮

---

## 4. 视觉设计要求

### 4.1 主题适配

- 使用 VSCode CSS 变量（`var(--vscode-*)`）
- 支持亮色/暗色主题自动切换
- 保持与其他页面的视觉一致性

### 4.2 两栏布局

**左侧面板(规则树)**:

- 宽度: 50% (可调整,最小 300px)
- 背景: `var(--vscode-editor-background)`
- 边框右侧: `var(--vscode-editorWidget-border)`

**右侧面板(适配器列表)**:

- 宽度: 50% (可调整,最小 300px)
- 背景: `var(--vscode-editor-background)`

**分隔条**:

- 宽度: 4px
- 可拖拽调整左右宽度
- Hover 时显示高亮

### 4.3 紧凑布局

- Header 高度: 48px
- Statistics 高度: 36px
- Footer 高度: 52px
- 树节点高度: 28px
- 适配器卡片高度: 80px
- 间距: `var(--spacing-sm)` (8px)

### 4.4 交互状态

**规则复选框状态**:

- 未选中: `☐`
- 选中: `☑`
- 部分选中(规则源/目录): `⊟` (半选，indeterminate 状态)

**适配器复选框状态**:

- 未勾选: `☐`
- 勾选: `☑`

**Hover 效果**:

- 树节点: 背景色变化
- 适配器卡片: 边框高亮

**禁用状态**:

- 未启用的适配器: 灰色显示,无法勾选

### 4.5 颜色方案

**左侧规则树**:

- 背景: `var(--vscode-editor-background)`
- 节点 Hover: `var(--vscode-list-hoverBackground)`
- 节点选中: `var(--vscode-list-activeSelectionBackground)`
- 文本: `var(--vscode-foreground)`
- 统计数字: `var(--vscode-descriptionForeground)`

**右侧适配器列表**:

- 卡片背景: `var(--vscode-editorWidget-background)`
- 卡片边框: `var(--vscode-editorWidget-border)`
- 勾选边框: `var(--vscode-testing-iconPassed)` (绿色,3px 左边框)
- 未勾选: 默认边框
- 禁用: 透明度 0.5

**按钮**:

- 主按钮(同步): `var(--vscode-button-background)`
- 次按钮(取消): `var(--vscode-button-secondaryBackground)`
- 快捷按钮: 无背景,仅图标

---

## 5. 数据结构

### 5.1 规则树节点结构

```typescript
interface RuleTreeNode {
  type: 'source' | 'directory' | 'file';
  id: string; // 唯一标识
  name: string; // 显示名称
  path: string; // 相对路径(仅 file/directory)
  sourceId?: string; // 所属规则源 ID
  checked?: boolean; // 是否选中（所有节点类型都支持）
  indeterminate?: boolean; // 半选状态（source/directory 节点）
  expanded?: boolean; // 是否展开(仅 source/directory)
  children?: RuleTreeNode[]; // 子节点
  totalRules?: number; // 总规则数(统计)
  selectedRules?: number; // 已选规则数(统计)
}
```

### 5.2 适配器状态

```typescript
interface AdapterState {
  id: string; // 适配器 ID
  name: string; // 适配器名称
  type: 'preset' | 'custom'; // 预置/自定义
  enabled: boolean; // 是否启用(来自配置)
  checked: boolean; // 是否勾选(用户操作)
  outputPath: string; // 输出路径
  ruleCount: number; // 将同步的规则数(实时统计)
}
```

### 5.3 同步配置

```typescript
interface SyncConfig {
  selectedRules: {
    sourceId: string;
    filePaths: string[]; // 选中的规则文件路径
  }[];
  targetAdapters: string[]; // 勾选的适配器 ID 列表
}
```

---

## 6. 消息协议

### 6.1 Webview → Extension

#### 加载规则树和适配器

```typescript
{
  command: 'loadData';
}
```

返回: 所有规则源的规则树 + 所有适配器状态

#### 切换规则选中状态

```typescript
{
  command: 'toggleRule',
  sourceId: string,
  filePath: string,
  checked: boolean
}
```

#### 批量操作规则

```typescript
{
  command: 'bulkRuleAction',
  action: 'selectAll' | 'clearAll'
}
```

#### 切换适配器勾选状态

```typescript
{
  command: 'toggleAdapter',
  adapterId: string,
  checked: boolean
}
```

#### 批量操作适配器

```typescript
{
  command: 'bulkAdapterAction',
  action: 'selectAll' | 'clearAll'
}
```

#### 执行同步

```typescript
{
  command: 'syncRules',
  selectedRules: {
    sourceId: string,
    filePaths: string[]
  }[],
  targetAdapters: string[]
}
```

返回: 同步进度和结果

#### 搜索规则

```typescript
{
  command: 'searchRules',
  query: string
}
```

### 6.2 Extension → Webview

#### 返回初始数据

```typescript
{
  type: 'initData',
  data: {
    ruleTrees: RuleTreeNode[], // 所有规则源的树结构
    adapters: AdapterState[], // 所有适配器状态
    statistics: {
      totalRules: number,
      selectedRules: number
    }
  }
}
```

#### 同步进度

```typescript
{
  type: 'syncProgress',
  data: {
    current: number,
    total: number,
    message: string
  }
}
```

#### 同步完成

```typescript
{
  type: 'syncCompleted',
  data: {
    success: boolean,
    message: string,
    results: {
      adapterId: string,
      success: boolean,
      ruleCount: number
    }[]
  }
}
```

#### 统计更新

```typescript
{
  type: 'statisticsUpdated',
  data: {
    selectedRules: number,
    targetAdapters: number
  }
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

- **虚拟滚动**: 左右两侧都使用虚拟滚动处理大量数据
- **懒加载**: 目录节点按需展开加载
- **状态缓存**: 缓存规则选择状态和适配器勾选状态
- **防抖**: 搜索和统计更新使用防抖(300ms)

### 7.2 状态管理

使用 React Hooks 或 Svelte Store 管理状态:

**左侧规则树状态**:

- `ruleTreeData`: 所有规则源的树结构
- `selectedRules`: Set<规则文件路径> (跨源)
- `expandedNodes`: Set<节点 ID> (展开状态)
- `searchQuery`: 搜索关键词

**右侧适配器状态**:

- `adapters`: 所有适配器列表
- `checkedAdapters`: Set<适配器 ID>

**全局状态**:

- `statistics`: 统计信息(总规则数、已选规则数、目标适配器数)

### 7.3 同步逻辑

1. 用户点击"同步"按钮
2. 收集左侧选中的规则(按源分组)
3. 收集右侧勾选的适配器
4. 发送 `syncRules` 消息到 Extension
5. Extension 执行同步:
   - 对每个勾选的适配器
   - 生成包含所有选中规则的配置文件
   - 使用对应的 Adapter 生成格式
6. 显示同步进度和结果

### 7.4 用户体验

- **即时反馈**: 勾选规则/适配器后立即更新统计
- **加载状态**: 同步时显示进度条
- **错误处理**: 友好的错误提示和重试选项
- **持久化**: 自动保存规则选择状态(不需要手动保存按钮)

---

## 8. 响应式设计

### 桌面布局 (> 900px)

- 两栏等宽(各 50%)
- 最小宽度: 左侧 300px, 右侧 300px
- 分隔条可拖拽调整

### 平板布局 (600px - 900px)

- 两栏布局保持
- 左侧 40%, 右侧 60%
- 节点文字可能省略

### 移动布局 (< 600px)

- 单栏布局,可切换标签页
- 标签 1: 规则选择
- 标签 2: 适配器选择
- 底部固定同步按钮

---

## 9. 开发优先级

### P0 (MVP)

- [x] 两栏布局框架
- [x] 左侧: 展示所有规则源的规则树
- [x] 左侧: 所有节点（规则源、目录、文件）都有复选框
- [x] 左侧: 目录选中时自动选中所有子文件
- [x] 左侧: 支持半选状态（部分子项选中）
- [ ] 右侧: 展示所有适配器列表
- [ ] 右侧: 适配器复选框勾选
- [ ] 统计信息实时更新
- [ ] 同步功能(将选中规则同步到勾选的适配器)
- [ ] 全选/清除快捷按钮

### P1 (增强)

- [ ] 搜索与过滤规则
- [ ] 虚拟滚动优化
- [ ] 分隔条拖拽调整宽度
- [ ] 同步进度显示
- [ ] 错误处理和重试

### P2 (优化)

- [ ] 按标签过滤规则
- [ ] 响应式布局(移动端)
- [ ] 导入/导出同步配置
- [ ] 批量操作(批量选择特定标签的规则)

---

## 10. 测试用例

### 功能测试

- [x] 左侧显示所有规则源的规则树
- [x] 所有节点（规则源、目录、文件）都有复选框
- [x] 选中目录时自动选中所有子文件
- [x] 取消目录时自动取消所有子文件
- [x] 部分子项选中时父节点显示半选状态
- [ ] 勾选规则后统计数更新
- [ ] 勾选适配器后显示将同步的规则数
- [ ] 全选/清除规则功能正常
- [ ] 全选/清除适配器功能正常
- [ ] 同步功能正确执行(规则 → 适配器)
- [ ] 搜索功能匹配正确
- [ ] 跨规则源选择规则

### 边界测试

- [ ] 无规则源时的处理
- [ ] 无适配器时的处理
- [ ] 未选择规则时点击同步的提示
- [ ] 未勾选适配器时点击同步的提示
- [ ] 大量规则(>500 条)性能
- [ ] 深层嵌套目录(>5 层)
- [ ] 同步失败的错误处理

### 集成测试

- [ ] 与 ConfigManager 集成
- [ ] 与 FileGenerator 集成
- [ ] 与 RulesManager 集成
- [ ] 同步后配置文件正确生成

---

## 11. 设计参考

### 视觉风格

- **左侧规则树**: 参考 VSCode 资源管理器

  - 清晰的目录层级
  - 文件图标和类型
  - 柔和的 hover 效果

- **右侧适配器列表**: 参考 VSCode 扩展列表
  - 卡片式布局
  - 清晰的状态指示
  - 友好的描述信息

### 交互模式

- **两栏布局**: 参考 VSCode Source Control 视图

  - 左侧变更列表
  - 右侧差异对比

- **同步操作**: 参考 VSCode Git 提交
  - 选择变更 → 勾选目标 → 执行操作

---

## 元信息

- **文档版本**: 2.0.0
- **更新日期**: 2025-11-27
- **设计者**: Turbo AI Rules 团队
- **重要变更**: 从单源选择器改为规则同步页,支持多源规则选择和适配器映射
- **预计工作量**: 5-7 天
- **依赖**: ConfigManager、RulesManager、FileGenerator

---

## 12. 核心设计要点总结

### 关键创新

1. **所有规则源统一展示**: 不再需要切换源,一次性展示所有源的规则树
2. **适配器映射可视化**: 用户可清晰看到哪些规则将同步到哪些适配器
3. **灵活的同步策略**: 支持跨源选择规则,支持一次性同步到多个适配器

### 与旧设计的区别

| 旧设计(规则选择器) | 新设计(规则同步页)    |
| ------------------ | --------------------- |
| 单源切换           | 所有源统一展示        |
| 只选择规则         | 选择规则 + 选择适配器 |
| 保存选择状态       | 直接执行同步操作      |
| 需要手动同步       | 集成同步功能          |

### Skills 处理

- Skills 作为普通自定义适配器处理
- 用户自行命名识别(如命名为 "AI Skills")
- 输出路径独立(如 `skills/`)
- 文件过滤可选(如 `.md, .mdc`)
- 不需要特殊的 `skills` 字段或 `sourceId` 字段

---

_补充: 本设计完全移除了规则源切换,采用统一多源树视图 + 适配器映射的新架构_
