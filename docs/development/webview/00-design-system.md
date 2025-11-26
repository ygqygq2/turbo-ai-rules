# Webview 设计系统规范

> 本文档定义所有 Webview 页面必须遵循的统一设计规范，确保视觉一致性和用户体验

## 一、布局规范

### 1.1 容器 (Container)

**规则**：所有页面的根容器必须使用统一的 `.container` 类

```css
.container {
  max-width: var(--container-max-width); /* 1200px */
  margin: 0 auto;
  padding: var(--spacing-md); /* 12px */
}
```

**应用场景**：每个页面的最外层 `<div>` 元素

### 1.2 间距系统

统一使用 CSS 变量，禁止硬编码像素值：

- `--spacing-xs: 4px` - 极小间距（图标间距）
- `--spacing-sm: 8px` - 小间距（按钮内间距、小元素间）
- `--spacing-md: 12px` - 中等间距（卡片内边距、表单字段间）
- `--spacing-lg: 16px` - 大间距（区块之间、页面主要分隔）
- `--spacing-xl: 24px` - 超大间距（页面顶部、重要分隔）

**使用规则**：

- **页面顶部标题区** 底部间距：`margin-bottom: var(--spacing-lg)`
- **Section/区块** 间距：`margin-bottom: var(--spacing-lg)`
- **卡片内部** 内边距：`padding: var(--spacing-md)`
- **表单元素** 间距：`gap: var(--spacing-md)`
- **按钮组** 间距：`gap: var(--spacing-sm)`

## 二、标题规范

### 2.1 标题层级

| 标题   | 语义         | 字体大小         | 使用场景            | 底部间距            |
| ------ | ------------ | ---------------- | ------------------- | ------------------- |
| `<h1>` | 页面主标题   | 2em (26px)       | 每个页面顶部，唯一  | `var(--spacing-sm)` |
| `<h2>` | 主要分区标题 | 1.5em (19.5px)   | Section/Card 组标题 | `var(--spacing-md)` |
| `<h3>` | 次级标题     | 1.25em (16.25px) | Card 内标题、子分区 | `var(--spacing-sm)` |
| `<h4>` | 小标题       | 1em (13px)       | 数据标签、字段标签  | `var(--spacing-xs)` |

### 2.2 标题样式

**全局样式**（已在 global.css 定义）：

```css
h1,
h2,
h3,
h4,
h5,
h6 {
  margin: 0 0 var(--spacing-sm) 0;
  font-weight: 600;
  line-height: 1.3;
  color: var(--vscode-foreground);
  display: flex;
  align-items: center;
  gap: 8px;
}
```

**禁止**：在页面级 CSS 中重复定义标题基础样式

## 三、页面头部 (Header) 规范

### 3.1 统一结构

所有页面头部必须使用相同的结构和样式：

```tsx
<div className="header">
  <div className="header-title">
    <h1>页面标题</h1>
    <p className="header-description">可选描述</p>
  </div>
  <div className="toolbar">
    <button className="button button-primary">操作</button>
  </div>
</div>
```

### 3.2 统一样式

```css
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-lg); /* 必须 */
  padding-bottom: var(--spacing-md);
  border-bottom: 2px solid var(--vscode-editorWidget-border);
}
```

**要求**：

- ✅ 所有页面的 `.header` 必须使用 `margin-bottom: var(--spacing-lg)`
- ✅ 必须有底部边框分隔
- ❌ 禁止使用其他间距值（如 `--spacing-md`）

## 四、卡片/网格布局规范

### 4.1 统计卡片网格

**类名**：`.stats-grid` 或 `.statistics-grid`（统一为 `.stats-grid`）

```css
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}
```

**应用页面**：

- 统计仪表板 (statistics)
- 规则源详情 (source-detail)
- 欢迎页面 (welcome)

### 4.2 主内容网格

**类名**：`.main-grid`

```css
.main-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-lg);
}

@media (min-width: 768px) {
  .main-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

## 五、组件规范

### 5.1 Section 组件

**必须使用**：`<Section>` 组件（已标准化）

```tsx
<Section title="标题" icon="🎯">
  {/* 内容 */}
</Section>
```

**CSS 规范**：

```css
.section {
  margin-bottom: var(--spacing-lg); /* 固定 */
  min-height: 60px;
}
```

### 5.2 Card 组件

**全局样式**（已定义）：

```css
.card {
  background-color: var(--vscode-editorWidget-background);
  border: 1px solid var(--vscode-editorWidget-border);
  border-radius: var(--border-radius);
  padding: var(--spacing-md); /* 固定 */
  transition: all 0.2s ease;
}
```

**禁止**：在页面 CSS 中修改 `.card` 的 padding

### 5.3 MetadataGrid 组件

**统一使用**：

```css
.metadata-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-md);
}
```

## 六、按钮规范

### 6.1 按钮类型

- `.button-primary` - 主要操作
- `.button-secondary` - 次要操作
- `.button-icon` - 仅图标按钮

### 6.2 按钮组间距

```css
.toolbar {
  display: flex;
  gap: var(--spacing-sm); /* 固定 8px */
}
```

## 七、特殊页面例外

### 7.1 允许的差异

以下情况允许偏离标准：

1. **功能性需求**：特定页面独有功能需要特殊布局
2. **视觉平衡**：在保持整体一致性前提下的微调
3. **响应式适配**：不同屏幕尺寸的适配调整

### 7.2 申请例外流程

1. 在页面 CSS 文件顶部注释说明原因
2. 在该设计文档中记录例外
3. Code Review 时讨论合理性

## 八、检查清单

### 新页面开发检查清单

- [ ] 使用 `.container` 作为根容器
- [ ] Header 使用 `margin-bottom: var(--spacing-lg)`
- [ ] Section 使用 `margin-bottom: var(--spacing-lg)`
- [ ] 统计卡片使用 `.stats-grid` 且 `minmax(200px, 1fr)`
- [ ] 所有间距使用 CSS 变量，无硬编码像素
- [ ] H1~H6 不重复定义基础样式
- [ ] 导入 `../global.css`
- [ ] 使用标准组件（Section、Card、Tag、MetadataGrid）

### 现有页面重构检查清单

- [ ] 移除重复的标题样式定义
- [ ] 统一 Header 间距为 `--spacing-lg`
- [ ] 统一 Section 间距为 `--spacing-lg`
- [ ] 统一卡片内边距为 `--spacing-md`
- [ ] 替换硬编码像素为 CSS 变量
- [ ] 检查网格布局是否一致

## 九、常见错误

### ❌ 错误示例

```css
/* 错误：硬编码间距 */
.header {
  margin-bottom: 20px;
}

/* 错误：重复定义标题样式 */
h2 {
  font-size: 1.5em;
  font-weight: 600;
  margin-bottom: 16px;
}

/* 错误：不一致的网格定义 */
.statistics-grid {
  grid-template-columns: repeat(3, 1fr); /* 固定列数 */
}

/* 错误：修改全局组件样式 */
.card {
  padding: 20px; /* 覆盖全局定义 */
}
```

### ✅ 正确示例

```css
/* 正确：使用 CSS 变量 */
.header {
  margin-bottom: var(--spacing-lg);
}

/* 正确：页面特定样式不重复全局定义 */
.page-specific-title {
  color: var(--vscode-charts-blue);
}

/* 正确：统一的网格布局 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
}

/* 正确：扩展而非覆盖 */
.card-special {
  /* 继承 .card 的所有样式 */
  border-color: var(--vscode-focusBorder);
}
```

## 十、实施计划

### 第一阶段：标准化核心页面

1. ✅ global.css - 已完成
2. ⏳ statistics.css - 标准参考页面
3. ⏳ rule-details.css - 统一 Header 和 Section
4. ⏳ source-detail.css - 统一网格和间距

### 第二阶段：统一其他页面

5. search.css
6. welcome.css
7. add-source.css
8. rule-selector.css

### 第三阶段：验证和文档

- 跨页面一致性测试
- 更新实施文档
- Code Review 检查机制
