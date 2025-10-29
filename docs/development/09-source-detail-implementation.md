# 规则源详情页面实施文档

> **实施日期**: 2025-10-29  
> **功能**: 规则源详细信息查看页面  
> **状态**: ✅ 已完成

---

## 📋 功能概述

实现了规则源详情页面，用于显示单个规则源的完整信息，包括：

- **规则源的配置详情**：Git 仓库、分支、路径、认证方式等
- **统计数据**：规则数量、优先级分布、标签分布
- **规则列表**：该源包含的所有规则，支持搜索和筛选
- **快捷操作**：同步、编辑、启用/禁用、删除规则源

---

## 🎯 实施内容

### 1. 后端 Provider

**文件**: `src/providers/SourceDetailWebviewProvider.ts`

**核心功能**:

- 继承自 `BaseWebviewProvider`
- 管理规则源详情 Webview 的生命周期
- 加载并计算规则源的统计数据
- 处理前端发送的各种操作消息（同步、编辑、删除等）
- 计算缓存大小和下次同步时间

**关键方法**:

```typescript
- showSourceDetail(sourceId: string): 显示规则源详情页面
- loadAndSendData(): 加载数据并发送到前端
- calculateStatistics(rules): 计算统计数据
- getSyncInfo(source): 获取同步信息
- handleMessage(message): 处理来自前端的消息
```

### 2. 前端页面

**文件结构**:

```
src/webview/source-detail/
├── index.html           # HTML 入口
├── index.tsx            # React 渲染入口
├── App.tsx              # 主应用组件
├── source-detail.css    # 样式文件
└── source-detail.ts     # Vite 构建入口
```

**组件设计**:

- **App 组件**: 主应用逻辑
- **PriorityIcon 组件**: 优先级图标
- **StatusDot 组件**: 状态指示器

**功能特性**:

1. **响应式布局**: 支持桌面和移动端
2. **实时搜索**: 规则列表支持实时搜索
3. **多维度筛选**: 按优先级、标签筛选规则
4. **懒加载**: 初始显示 20 条，支持加载更多
5. **状态管理**: 同步状态、加载状态、错误处理

### 3. 命令注册

**文件**: `src/commands/viewSourceDetail.ts`

**命令**: `turbo-ai-rules.viewSourceDetail`

**功能**:

- 如果提供 sourceId，直接显示该源的详情
- 如果未提供，显示快速选择面板让用户选择

**调用方式**:

```typescript
// 从代码调用
vscode.commands.executeCommand('turbo-ai-rules.viewSourceDetail', sourceId);

// 从树视图右键菜单调用
// 从命令面板调用
```

### 4. 配置更新

#### package.json

添加了命令定义：

```json
{
  "command": "turbo-ai-rules.viewSourceDetail",
  "title": "View Source Details",
  "category": "Turbo AI Rules",
  "icon": "$(info)"
}
```

添加到规则源的上下文菜单：

```json
{
  "command": "turbo-ai-rules.viewSourceDetail",
  "when": "view == turboAiRulesExplorer && viewItem == source",
  "group": "1_actions@4"
}
```

#### 本地化文件

- `package.nls.json`: 英文
- `package.nls.zh-cn.json`: 中文

#### Vite 配置

添加 source-detail 到构建入口：

```typescript
input: {
  'source-detail': path.resolve(__dirname, 'src/webview/source-detail/index.html'),
}
```

### 5. 导出更新

**src/providers/index.ts**: 导出 `SourceDetailWebviewProvider`  
**src/commands/index.ts**: 导出 `viewSourceDetailCommand`  
**src/extension.ts**: 注册命令和 Provider

---

## 🎨 界面设计

### 页面布局

```
┌────────────────────────────────────────────┐
│  Header (源名称、状态、操作按钮)             │
├────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐       │
│  │ Configuration│  │  Statistics  │       │
│  │   Details    │  │   Overview   │       │
│  └──────────────┘  └──────────────┘       │
├────────────────────────────────────────────┤
│  Rules List (搜索、筛选、规则卡片)          │
└────────────────────────────────────────────┘
```

### 核心 UI 元素

1. **Header 区域**

   - 源名称 + 状态指示器
   - Git URL（可点击复制）
   - 4 个操作按钮：Sync、Edit、Toggle、Delete

2. **Configuration Section**

   - 源配置信息（ID、分支、路径、认证）
   - 同步状态信息（最后同步时间、缓存大小等）

3. **Statistics Section**

   - 总规则数
   - 优先级分布（带进度条）
   - 热门标签云（可点击筛选）

4. **Rules List Section**
   - 搜索框（实时搜索）
   - 筛选器（按优先级、标签）
   - 规则卡片（显示标题、路径、标签）
   - 懒加载（初始 20 条，可加载更多）

---

## 🔌 消息协议

### Webview → Extension

```typescript
type Message =
  | { type: 'refresh' }
  | { type: 'syncSource'; payload: { sourceId: string } }
  | { type: 'editSource'; payload: { sourceId: string } }
  | { type: 'toggleSource'; payload: { sourceId: string } }
  | { type: 'deleteSource'; payload: { sourceId: string } }
  | { type: 'viewRule'; payload: { rulePath: string } }
  | { type: 'filterByTag'; payload: { tag: string } }
  | { type: 'searchRules'; payload: { query: string } };
```

### Extension → Webview

```typescript
type Message =
  | {
      type: 'sourceData';
      payload: {
        source: RuleSource;
        rules: ParsedRule[];
        statistics: SourceStatistics;
        syncInfo: SyncInfo;
      };
    }
  | { type: 'syncStatus'; payload: { status: 'syncing' | 'success' | 'error'; message?: string } }
  | { type: 'error'; payload: { message: string } };
```

---

## 📊 数据流

```
用户操作 → 命令 → Provider → Webview
              ↓
          加载数据
              ↓
      计算统计信息
              ↓
         发送到前端
              ↓
        前端渲染显示
```

---

## ✅ 测试要点

### 功能测试

- [ ] 正确显示规则源的所有配置信息
- [ ] 统计数据计算准确（规则数、优先级分布、标签分布）
- [ ] 搜索功能正常工作
- [ ] 按优先级筛选正常
- [ ] 按标签筛选正常
- [ ] 同步功能正常
- [ ] 编辑、启用/禁用、删除功能正常
- [ ] 查看规则详情功能正常

### 性能测试

- [ ] 大量规则（>1000）时的渲染性能
- [ ] 搜索响应速度
- [ ] 懒加载功能正常
- [ ] 内存占用合理

### UI/UX 测试

- [ ] 响应式布局在不同窗口大小下正常
- [ ] 主题切换无视觉错误
- [ ] 按钮点击有视觉反馈
- [ ] 加载状态显示正确
- [ ] 错误提示友好

---

## 🚀 使用方式

### 1. 从树视图打开

右键点击规则源 → 选择 "View Source Details"

### 2. 从命令面板打开

1. 按 `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`)
2. 输入 "Turbo AI Rules: View Source Details"
3. 选择要查看的规则源

### 3. 从代码调用

```typescript
vscode.commands.executeCommand('turbo-ai-rules.viewSourceDetail', sourceId);
```

---

## 🔧 技术栈

- **后端**: TypeScript + VS Code Extension API
- **前端**: React 18 + TypeScript
- **构建**: Vite 7
- **样式**: CSS (VS Code 主题变量)

---

## 📝 后续优化

### 可能的改进点

1. **虚拟滚动**: 规则列表超过 100 条时使用虚拟滚动提升性能
2. **缓存优化**: 统计数据缓存以减少计算
3. **导出功能**: 支持导出规则源的统计报告
4. **更多图表**: 添加更丰富的数据可视化
5. **历史记录**: 显示规则源的同步历史

### 已知限制

1. 统计数据在规则数量特别大时（>5000）可能有性能问题
2. 标签云最多显示 6 个标签
3. 缓存大小计算是同步的，在大缓存时可能阻塞

---

## 🔗 相关文件

### 核心文件

- `src/providers/SourceDetailWebviewProvider.ts`
- `src/webview/source-detail/App.tsx`
- `src/commands/viewSourceDetail.ts`

### 配置文件

- `package.json`
- `vite.config.ts`
- `package.nls.json`
- `package.nls.zh-cn.json`

### 文档

- `.superdesign/design_docs/07-source-details-page.md` (设计文档)
- `.superdesign/design_iterations/07-source-details-page_1.html` (UI 原型)

---

**实施者**: GitHub Copilot  
**审核**: 待用户测试  
**状态**: ✅ 实施完成，待测试
