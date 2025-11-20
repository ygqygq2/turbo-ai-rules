# 统计仪表板设计文档

## 页面概述

**页面名称**: Statistics Dashboard (统计仪表板)  
**页面类型**: Webview  
**实现文件**: `src/providers/StatisticsWebviewProvider.ts`  
**访问方式**: 树视图工具栏图标 / 命令面板

---

## 设计目标

- 📊 可视化展示规则统计数据
- 📈 提供优先级分布分析
- 📋 显示源统计信息
- 🏷️ 展示热门标签云
- 💾 支持数据导出

---

## 页面布局

### 整体结构

```
┌──────────────────────────────────────────────────┐
│  📊 Statistics Dashboard            [🔄][📥]    │
├──────────────────────────────────────────────────┤
│                                                  │
│  📚 Overview                                     │
│  ┌─────────────┐  ┌─────────────┐               │
│  │ Total Rules │  │   Sources   │               │
│  │     156     │  │     2/3     │               │
│  └─────────────┘  └─────────────┘               │
│  ┌─────────────┐  ┌─────────────┐               │
│  │  Conflicts  │  │ Cache Size  │               │
│  │      2      │  │    2.3 MB   │               │
│  └─────────────┘  └─────────────┘               │
│                                                  │
│  📈 Priority Distribution                        │
│  ┌──────────────────────────────────────────┐   │
│  │ 🔥 High    23  ████████                  │   │
│  │ ⚠️  Medium  67  ███████████████████████   │   │
│  │ ℹ️  Low     66  ██████████████████████    │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  📋 Source Statistics                            │
│  ┌──────────────────────────────────────────┐   │
│  │ Source Name         Rules  Status  Sync  │   │
│  ├──────────────────────────────────────────┤   │
│  │ company-rules        89     ✅     2m    │   │
│  │ personal-rules       67     ✅     5m    │   │
│  │ archived-rules       0      ❌     -     │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  🏷️ Top Tags                                     │
│  ┌──────────────────────────────────────────┐   │
│  │ #typescript (45)  #react (32)            │   │
│  │ #eslint (28)      #naming (24)           │   │
│  │ #security (18)    #testing (15)          │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 响应式行为

- **桌面端 (>900px)**: 4 列网格布局（概览卡片）
- **平板端 (600-900px)**: 2 列网格布局
- **移动端 (<600px)**: 单列垂直堆叠

---

## 视觉设计

### 颜色方案

```css
/* 概览卡片 */
.stat-card {
  background-color: var(--vscode-editorWidget-background);
  border: 1px solid var(--vscode-editorWidget-border);
  border-radius: 4px;
  padding: 20px;
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
  color: var(--vscode-foreground);
}

.stat-label {
  font-size: 14px;
  color: var(--vscode-descriptionForeground);
  margin-top: 8px;
}

/* 优先级柱状图 */
.priority-bar-wrapper {
  flex: 1;
  background-color: var(--vscode-input-background);
  border-radius: 4px;
  height: 24px;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.priority-bar-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.priority-bar-text {
  position: relative;
  z-index: 1;
  font-size: 0.85em;
  font-weight: 600;
  white-space: nowrap;
  /* 白色文字配合阴影，确保在所有颜色背景上都清晰可见 */
  color: #ffffff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8), 0 0 8px rgba(0, 0, 0, 0.6);
}

.priority-high {
  background-color: var(--vscode-errorForeground);
}

.priority-medium {
  background-color: var(--vscode-editorWarning-foreground);
}

.priority-low {
  background-color: var(--vscode-charts-blue);
}

/* 标签云 */
.tag {
  display: inline-block;
  background-color: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  padding: 4px 12px;
  margin: 4px;
  border-radius: 12px;
  font-size: 14px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag:hover {
  background-color: var(--vscode-button-hoverBackground);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.tag:active {
  transform: translateY(0);
}
```

### 图标使用

- 🔄 Refresh - `codicon-refresh`
- 📥 Export - `codicon-export`
- 📚 Rules - `codicon-file-code`
- 📦 Sources - `codicon-package`
- ⚠️ Conflicts - `codicon-warning`
- 💾 Cache - `codicon-database`

---

## 数据结构

### 统计数据接口

```typescript
interface StatisticsData {
  overview: {
    totalRules: number; // 总规则数
    totalSources: number; // 总源数
    enabledSources: number; // 已启用源数
    conflicts: number; // 冲突数量
    cacheSize: string; // 缓存大小 (MB)
  };
  sourceStats: Array<{
    name: string; // 源名称
    ruleCount: number; // 规则数量
    enabled: boolean; // 是否启用
    lastSync?: string; // 最后同步时间
  }>;
  priorityDistribution: {
    high: number; // 高优先级数量
    medium: number; // 中优先级数量
    low: number; // 低优先级数量
  };
  topTags: Array<{
    tag: string; // 标签名称
    count: number; // 出现次数
  }>;
}
```

---

## 交互设计

### 刷新功能

**触发方式**：

- 点击工具栏刷新按钮
- 自动刷新（每 60 秒）
- 面板不可见时暂停刷新

**刷新流程**：

```
点击刷新
    ↓
显示加载状态
    ↓
重新计算统计数据
    ↓
更新 Webview 内容
    ↓
显示完成动画
```

### 标签点击搜索

**触发方式**：

- 点击任意标签
- 标签呈现可点击样式（鼠标悬停效果）

**搜索流程**：

```
点击标签
    ↓
发送 searchByTag 消息
    ↓
打开搜索页面
    ↓
预填标签条件
    ↓
自动执行搜索
```

### 导出功能

**支持格式**：

- JSON - 完整数据导出
- CSV - 表格格式

**导出内容**：

- 概览统计
- 源详细信息
- 优先级分布
- 标签统计

---

## 动画效果

### 页面加载

```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stat-card {
  animation: fadeInUp 0.3s ease-out;
}

/* 卡片依次出现 */
.stat-card:nth-child(1) {
  animation-delay: 0s;
}
.stat-card:nth-child(2) {
  animation-delay: 0.1s;
}
.stat-card:nth-child(3) {
  animation-delay: 0.2s;
}
.stat-card:nth-child(4) {
  animation-delay: 0.3s;
}
```

### 柱状图动画

```css
@keyframes progressBar {
  from {
    width: 0;
  }
  to {
    width: var(--target-width);
  }
}

.priority-bar-fill {
  animation: progressBar 0.6s ease-out;
}
```

### 刷新动画

```css
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.refreshing .codicon-refresh {
  animation: spin 1s linear infinite;
}
```

---

## 消息通信

### Webview → Extension 消息

```typescript
// 刷新数据
{ type: 'refresh' }

// 导出数据
{ type: 'export', payload: { format: 'json' | 'csv' } }

// 查看源详情
{ type: 'viewSource', payload: { sourceName: string } }

// 根据标签搜索规则
{ type: 'searchByTag', payload: { tag: string } }
```

### Extension → Webview 消息

```typescript
// 更新数据
{ type: 'updateData', data: StatisticsData }

// 刷新完成
{ type: 'refreshComplete' }

// 导出完成
{ type: 'exportComplete', path: string }
```

---

## 性能优化

### 数据缓存

- **缓存时长**: 30 秒
- **缓存策略**: 过期后异步更新
- **缓存失效**: 规则变化时清除

### 计算优化

- **标签统计**: 仅计算 Top 20
- **异步计算**: 不阻塞 UI 渲染
- **增量更新**: 仅更新变化的数据

### 渲染优化

- **虚拟滚动**: 大量标签时使用（待实现）
- **防抖刷新**: 避免频繁更新
- **节流滚动**: 提升滚动性能

---

## 无障碍支持

```html
<!-- 统计卡片 -->
<div class="stat-card" role="region" aria-label="Total Rules">
  <div class="stat-value">156</div>
  <div class="stat-label">Total Rules</div>
</div>

<!-- 优先级柱状图 -->
<div
  role="progressbar"
  aria-label="High priority rules"
  aria-valuenow="23"
  aria-valuemin="0"
  aria-valuemax="156"
>
  🔥 High 23
</div>

<!-- 表格 -->
<table role="table" aria-label="Source Statistics">
  <caption>
    Statistics by source
  </caption>
  <!-- ... -->
</table>
```

---

## 性能指标

- **初始加载**: < 500ms（100 条规则）
- **数据刷新**: < 100ms
- **导出速度**: < 200ms
- **内存占用**: < 10MB

---

_设计版本: 2.0_  
_最后更新: 2025-10-27_
