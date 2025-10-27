# UI 设计文档总览

> **项目**: Turbo AI Rules Extension  
> **目的**: 为 SuperDesign AI 提供完整的 UI 页面设计参考  
> **版本**: 2.0  
> **最后更新**: 2025-10-27

---

## 📋 文档目录

本目录包含 Turbo AI Rules 扩展所有 UI 页面的完整设计文档。

### Webview 页面

1. **[01-welcome-page.md](./01-welcome-page.md)** - 欢迎页面

   - 首次使用引导
   - 3 步快速开始
   - 模板库

2. **[02-statistics-dashboard.md](./02-statistics-dashboard.md)** - 统计仪表板

   - 规则统计数据
   - 优先级分布图
   - 源统计表格
   - 热门标签云

3. **[03-rule-details-panel.md](./03-rule-details-panel.md)** - 规则详情面板

   - 完整元数据展示
   - Markdown 内容预览
   - 快速操作工具栏

4. **[04-advanced-search.md](./04-advanced-search.md)** - 高级搜索界面
   - 多条件搜索
   - 搜索历史
   - 结果导出

### 原生 UI 组件

5. **[05-tree-view.md](./05-tree-view.md)** - 规则树视图

   - 分层展示源和规则
   - 图标和颜色编码
   - 右键上下文菜单

6. **[06-status-bar.md](./06-status-bar.md)** - 状态栏
   - 实时状态显示
   - 快捷操作菜单
   - 冲突和错误提示

---

## 🎨 设计系统

### 视觉一致性

所有页面遵循统一的设计语言：

- **主题系统**: 使用 VS Code CSS 变量，禁止硬编码颜色
- **图标库**: VS Code Codicons
- **间距系统**: 4px 基准单位 (xs/sm/md/lg/xl)
- **圆角**: 统一 4px
- **字体**: VS Code 默认字体系统

### 响应式设计

- **最小宽度**: 300px（窄面板）
- **常规宽度**: 600px - 1200px
- **最大宽度**: 1920px+

### 颜色编码

**优先级颜色**:

- 🔥 High: `errorForeground` (红色)
- ⚠️ Medium: `editorWarning.foreground` (黄色)
- ℹ️ Low: `descriptionForeground` (灰色)

**状态颜色**:

- ✅ Success: `charts.green`
- ❌ Error: `errorForeground`
- ⚠️ Warning: `editorWarning.foreground`

---

## 📐 布局模式

### Webview 布局

所有 Webview 页面使用居中布局模式：

```css
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
```

### 卡片组件

```css
.card {
  background-color: var(--vscode-editorWidget-background);
  border: 1px solid var(--vscode-editorWidget-border);
  border-radius: 4px;
  padding: 16px;
}
```

### 网格布局

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}
```

---

## ✨ 交互设计

### 动画原则

- **性能优先**: 使用 `transform` 和 `opacity`
- **时长**: 150-300ms（快速反馈），300-600ms（过渡）
- **缓动**: `ease-out` (淡入), `ease-in-out` (双向)

### 通用动画

```css
/* 淡入 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 按钮交互 */
.button:hover {
  transform: scale(1.05);
}

.button:active {
  transform: scale(0.98);
}
```

---

## 📡 消息通信

### 通用消息格式

**Webview → Extension**:

```typescript
interface WebviewMessage {
  type: string; // 消息类型
  payload?: any; // 消息数据
}
```

**Extension → Webview**:

```typescript
interface ExtensionMessage {
  type: string; // 消息类型
  data?: any; // 响应数据
  error?: string; // 错误信息
}
```

### 常用消息类型

| 方向                | 类型          | 说明     |
| ------------------- | ------------- | -------- |
| Webview → Extension | `refresh`     | 刷新数据 |
| Webview → Extension | `export`      | 导出数据 |
| Webview → Extension | `viewDetails` | 查看详情 |
| Extension → Webview | `updateData`  | 更新数据 |
| Extension → Webview | `error`       | 错误通知 |

---

## 🔧 技术架构

### Webview 基础架构

所有 Webview 继承自 `BaseWebviewProvider`:

```typescript
export class YourWebviewProvider extends BaseWebviewProvider {
  protected getHtmlContent(webview: vscode.Webview): string {
    // 返回 HTML 内容
  }

  protected handleMessage(message: WebviewMessage): void {
    // 处理来自 Webview 的消息
  }
}
```

### 安全策略 (CSP)

所有 Webview 必须配置内容安全策略：

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'none'; 
           style-src ${cspSource} 'unsafe-inline'; 
           script-src 'nonce-${nonce}'; 
           img-src ${cspSource} https:;"
/>
```

---

## ♿ 无障碍支持

### 键盘导航

- 所有交互元素支持 Tab 键导航
- 提供清晰的焦点指示
- 支持常用快捷键

### 屏幕阅读器

- 使用语义化 HTML 标签
- 提供 `aria-label` 和 `aria-describedby`
- 使用 `role` 属性标识组件类型

### 颜色对比度

- 文本对比度符合 WCAG 2.1 AA 标准
- 不仅依赖颜色传达信息

---

## 📊 性能指标

### 加载性能

| 页面            | 初始加载 | 刷新速度 | 内存占用 |
| --------------- | -------- | -------- | -------- |
| Welcome         | < 100ms  | -        | < 5MB    |
| Statistics      | < 500ms  | < 100ms  | < 10MB   |
| Rule Details    | < 100ms  | -        | < 5MB    |
| Advanced Search | < 200ms  | < 100ms  | < 10MB   |
| Tree View       | < 200ms  | < 100ms  | < 10MB   |
| Status Bar      | < 50ms   | < 50ms   | < 1MB    |

### 优化策略

- **缓存**: 缓存计算结果和数据
- **防抖/节流**: 限制频繁操作
- **虚拟滚动**: 大列表性能优化
- **懒加载**: 按需加载内容

---

## 🚀 使用指南

### For SuperDesign AI

在设计新页面时：

1. **参考现有设计**: 查看对应的设计文档
2. **遵循设计系统**: 使用统一的颜色、间距、图标
3. **保持一致性**: 布局和交互模式与现有页面一致
4. **考虑响应式**: 确保在不同尺寸下都能良好显示
5. **注重无障碍**: 提供键盘导航和屏幕阅读器支持

### 设计工作流

1. **布局设计**: 使用 ASCII 线框图规划布局
2. **主题设计**: 使用 CSS 变量定义样式
3. **动画设计**: 添加合适的交互动画
4. **生成 HTML**: 创建完整的 HTML 文件
5. **测试验证**: 在不同主题和尺寸下测试

---

## 📚 参考资源

- [VS Code UX Guidelines](https://code.visualstudio.com/api/ux-guidelines/overview)
- [VS Code Codicons](https://microsoft.github.io/vscode-codicons/dist/codicon.html)
- [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [VS Code Theme Colors](https://code.visualstudio.com/api/references/theme-color)

---

## 📝 更新日志

### Version 2.0 (2025-10-27)

- ✨ 新增：所有 UI 页面的完整设计文档
- 📐 优化：统一设计系统和布局模式
- 🎨 完善：视觉规范和颜色编码
- ⚡ 改进：性能指标和优化策略

---

_维护者: ygqygq2_  
_贡献指南: 查看项目 CONTRIBUTING.md_
