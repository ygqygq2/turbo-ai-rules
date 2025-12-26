# Dashboard 页面实施文档

> **对应设计文档**: `.superdesign/design_docs/12-dashboard.md`  
> **UI 原型版本**: `.superdesign/design_iterations/12-dashboard_1.html`（已废弃，仅作参考）  
> **实施日期**: 2025-12-01  
> **状态**: ✅ 已完成 React 迁移

---

## 📋 实施概览

Dashboard 页面已从静态 HTML 原型迁移为 **React 实现**，与项目中其他 Webview 页面（Welcome、Statistics）保持统一的技术栈和样式规范。

**核心变更**:

- ✅ 完全使用 React + TypeScript 开发
- ✅ 复用项目现有样式组件（Button、Card、Section、Icon 等）
- ✅ 统一使用 VSCode CSS 变量，支持主题切换
- ✅ 添加完整的国际化支持（中英文）
- ✅ 集成到 Vite 构建流程

---

## 🏗️ 架构实现

### Provider 类实现

**文件**: `src/providers/DashboardWebviewProvider.ts`

**关键特性**:

- 继承 `BaseWebviewProvider` 基类
- 使用单例模式 (`getInstance`)
- 通过 React 组件渲染，而非静态 HTML
- HTML 模板路径: `out/webview/src/webview/dashboard/index.html`（编译后）

**HTML 生成逻辑**:

```typescript
protected async getHtmlContent(webview: vscode.Webview): Promise<string> {
  // 读取编译后的 React HTML 文件
  const htmlPath = path.join(
    this.context.extensionPath,
    'out',
    'webview',
    'src',
    'webview',
    'dashboard',
    'index.html',
  );

  // 替换 CSP 占位符
  // 转换资源路径为 webview URI
  // 与 WelcomeWebviewProvider、StatisticsWebviewProvider 保持一致
}
```

---

## ⚛️ React 组件实现

### 目录结构

```
src/webview/dashboard/
├── index.html      # HTML 模板（Vite 入口）
├── index.tsx       # React 根渲染
├── App.tsx         # 主组件
└── dashboard.css   # 样式文件
```

### 主组件 (`App.tsx`)

**状态管理**:

```typescript
interface DashboardState {
  sources: {
    enabled: number;
    total: number;
    totalRules: number;
    lastSync: string | null;
  };
  adapters: Array<{
    id: string;
    name: string;
    enabled: boolean;
    ruleCount: number;
    outputPath: string;
    lastGenerated: string | null;
  }>;
}
```

**复用的样式组件**（与 Welcome、Statistics 页面统一）:

| 组件         | 用途               | 文件位置                                |
| ------------ | ------------------ | --------------------------------------- |
| `Button`     | 操作按钮           | `src/webview/components/Button.tsx`     |
| `Card`       | 卡片容器           | `src/webview/components/Card.tsx`       |
| `Section`    | 区域容器（带标题） | `src/webview/components/Section.tsx`    |
| `EmptyState` | 空状态提示         | `src/webview/components/EmptyState.tsx` |
| `Icon`       | Codicon 图标       | `src/webview/components/Icon.tsx`       |

**消息通信**（VSCode 最佳实践）:

```typescript
// 初始化时发送 ready（前端先加载完成，再请求数据）
vscodeApi.postMessage('ready');

// 监听后端消息
const handleMessage = (event: MessageEvent) => {
  switch (message.type) {
    case 'updateStats':
      setStats(message.payload);
      setLoading(false);
      break;
    case 'error':
      setError(message.payload?.message);
      setLoading(false);
      break;
  }
};
```

---

## 🎨 CSS 样式规范

### 完全一致性要求

**与设计文档对齐**:

- ✅ 所有 CSS 类名与设计文档中的完全一致
- ✅ 样式值（颜色、间距、字体）使用 VSCode CSS 变量
- ✅ 布局策略与设计文档描述一致（Flexbox/Grid）
- ✅ 禁止使用内联 `style` 属性

**关键类名**:

```css
.dashboard-container      /* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
/* 主容器 */
.dashboard-header         /* 顶部标题栏 */
.sources-card             /* 规则源卡片 */
.adapters-card            /* 适配器卡片 */
.quick-actions-grid       /* 快速操作网格 */
.getting-started-card; /* 快速入门卡片 */
```

**VSCode CSS 变量使用**:

```css
.dashboard-container {
  background-color: var(--vscode-editor-background);
  color: var(--vscode-foreground);
}

.button {
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.button:hover {
  background-color: var(--vscode-button-hoverBackground);
}
```

**响应式设计**:

```css
@media (max-width: 900px) {
  .quick-actions-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
}

@media (max-width: 600px) {
  .button-group {
    flex-direction: column;
  }
}
```

---

## 📨 消息协议实现

### Extension → Webview

**初始化数据** (`updateStats`):

```typescript
{
  type: 'updateStats',
  payload: DashboardState
}
```

**错误消息** (`error`):

```typescript
{
  type: 'error',
  payload: { message: string }
}
```

### Webview → Extension

**操作命令**:

| 消息类型                    | 触发场景           | 对应命令                          |
| --------------------------- | ------------------ | --------------------------------- |
| `ready`                     | 页面加载完成       | 请求初始状态                      |
| `syncAll`                   | 同步所有适配器     | `turbo-ai-rules.syncRules`        |
| `addSource`                 | 添加规则源         | `turbo-ai-rules.addSource`        |
| `manageSources`             | 管理规则源         | `turbo-ai-rules.manageSources`    |
| `searchRules`               | 浏览/搜索规则      | `turbo-ai-rules.searchRules`      |
| `openRuleSyncPage`          | 打开规则同步页     | `turbo-ai-rules.openRuleSyncPage` |
| `regenerateAll`             | 重新生成适配器配置 | `turbo-ai-rules.generateConfigs`  |
| `manageAdapters`            | 管理适配器         | `turbo-ai-rules.manageAdapters`   |
| `openStatistics`            | 打开统计面板       | `turbo-ai-rules.showStatistics`   |
| `openAdvancedSearch`        | 打开高级搜索       | `turbo-ai-rules.advancedSearch`   |
| `showWelcome`/`openWelcome` | 显示欢迎页         | `turbo-ai-rules.showWelcome`      |
| `openRuleFormat`            | 查看规则格式文档   | 打开 GitHub 规则格式文档          |
| `openExamples`              | 浏览示例规则库     | 打开 GitHub 示例仓库              |
| `openSettings`              | 打开设置           | `workbench.action.openSettings`   |
| `openDocs`                  | 打开帮助文档       | 打开扩展文档链接                  |

**设置按钮演进计划**:

- **当前阶段 (v2.1)**: 设置按钮打开 VSCode 原生设置，过滤扩展 ID (`@ext:ygqygq2.turbo-ai-rules`)
- **后续计划**: 创建自定义设置页 (`SettingsWebviewProvider`)，用于可视化管理复杂配置：
  - 自定义适配器编辑器（JSON 编辑+预览）
  - 规则源认证配置（支持 SSH key、Token 等）
  - 高级选项（同步策略、缓存设置等）
- **切换时机**: 实现 `SettingsWebviewProvider` 后，替换 `openSettings` 消息处理逻辑

---

## 🌐 国际化实现

### 新增文本键

**英文** (`l10n/bundle.l10n.json`):

```json
{
  "common.loading": "Loading...",
  "common.settings": "Settings",
  "common.help": "Help",
  "dashboard.title": "Turbo AI Rules - Dashboard",
  "dashboard.noData": "No data available",
  "dashboard.sources.title": "Rule Sources Management",
  "dashboard.sources.enabled": "{enabled} of {total} sources enabled",
  "dashboard.sources.totalRules": "{count} total rules",
  "dashboard.sources.lastSync": "Last sync: {time}",
  "dashboard.sources.syncAll": "Sync to All Enabled Adapters",
  "dashboard.sources.addSource": "Add Rule Source",
  "dashboard.sources.manageSources": "Manage Sources",
  "dashboard.sources.searchRules": "Browse/Search Rules",
  "dashboard.adapters.title": "Adapter Status",
  "dashboard.adapters.noAdaptersConfigured": "No adapters configured",
  "dashboard.adapters.ruleCount": "{count} rules",
  "dashboard.adapters.output": "Output",
  "dashboard.adapters.lastGenerated": "Last generated: {time}",
  "dashboard.adapters.fineSync": "Rule Sync Page",
  "dashboard.adapters.manageAdapters": "Manage Adapters",
  "dashboard.adapters.regenerateAll": "Regenerate Adapter Configs",
  "dashboard.quickActions.title": "Quick Actions",
  "dashboard.quickActions.quickStart": "Quick Start",
  "dashboard.quickActions.generateConfigs": "Generate Config Files",
  "dashboard.quickActions.statistics": "Statistics Panel",
  "dashboard.quickActions.advancedSearch": "Advanced Search",
  "dashboard.quickActions.ruleSyncPage": "Rule Sync Page",
  "dashboard.gettingStarted.title": "Getting Started",
  "dashboard.gettingStarted.newUser": "👋 New user?",
  "dashboard.gettingStarted.viewWelcome": "View Welcome Page and Quick Start Guide",
  "dashboard.gettingStarted.learnRuleFormat": "Learn about Rule Format and Writing Specifications",
  "dashboard.gettingStarted.browseExamples": "Browse Example Rule Repository"
}
```

**中文** (`l10n/bundle.l10n.zh-cn.json`):

对应的中文翻译已添加。

### 使用方式

```typescript
import { t } from '../utils/i18n';

<h1>{t('dashboard.title')}</h1>
<span>{t('dashboard.sources.enabled', { enabled: 2, total: 5 })}</span>
```

---

## ⚙️ Vite 配置集成

Dashboard 已自动集成到 Vite 构建流程中，无需手动配置：

```typescript
// vite.config.ts 会自动检测 src/webview/dashboard 目录
fs.readdirSync(webviewDir, { withFileTypes: true })
  .filter((dirent) => dirent.isDirectory() && !excludeDirs.includes(dirent.name))
  .forEach((dirent) => {
    const htmlPath = path.join(webviewDir, dirent.name, 'index.html');
    if (fs.existsSync(htmlPath)) {
      input[dirent.name] = htmlPath;
    }
  });
```

**构建输出**:

```
out/webview/
├── dashboard.js           # React 组件编译后的 JS
├── dashboard.css          # 样式文件
└── src/webview/dashboard/
    └── index.html         # HTML 模板
```

**构建命令**:

```bash
pnpm build:webview  # 单独构建 webview
pnpm compile        # 构建 webview + 扩展代码
```

---

## ✅ 测试要点

### 功能测试

- [ ] 页面加载显示正确的统计数据
- [ ] 所有快捷操作按钮正常工作
- [ ] 响应式布局在不同屏幕尺寸下正常
- [ ] 国际化文本在中英文下正确显示
- [ ] 错误状态正确显示（加载失败、无数据）
- [ ] 空状态正确显示（无适配器、无规则源）

### 消息通信测试

- [ ] `ready` 消息触发 `updateStats` 响应
- [ ] 所有操作按钮正确发送消息并触发对应命令
- [ ] 错误消息正确捕获并显示友好提示

### 样式测试

- [ ] VSCode 主题切换时颜色正常（Dark/Light/High Contrast）
- [ ] Codicon 图标正确显示
- [ ] 卡片布局正确，无样式冲突
- [ ] 按钮悬停效果正常
- [ ] 响应式布局在移动端/平板/桌面端正常

### 无障碍测试

- [ ] 键盘导航正常（Tab/Shift+Tab/Enter）
- [ ] 屏幕阅读器支持（ARIA 属性）
- [ ] 颜色对比度符合 WCAG 标准

---

## 🔧 遇到的问题和解决方案

### 问题 1: 原始设计使用静态 HTML

**现象**: 设计文档中使用静态 HTML + 内联样式，与项目其他页面技术栈不一致。

**解决方案**:

- 将静态 HTML 迁移为 React 组件
- 复用项目现有的样式组件库（`Button`, `Card`, `Section` 等）
- 确保与 `WelcomeWebviewProvider`、`StatisticsWebviewProvider` 保持一致的架构

### 问题 2: CSS 样式与其他页面不统一

**现象**: 原始设计使用硬编码颜色和内联样式。

**解决方案**:

- 所有颜色使用 VSCode CSS 变量（`var(--vscode-*)`）
- 移除所有内联 `style` 属性，统一使用 `className`
- 参考 `statistics.css` 和 `welcome.css` 的样式规范

### 问题 3: 国际化文本缺失

**现象**: Dashboard 页面文本未国际化。

**解决方案**:

- 在 `l10n/bundle.l10n.json` 和 `l10n/bundle.l10n.zh-cn.json` 中添加完整的 Dashboard 相关文本键
- 使用 `t()` 函数包裹所有用户可见文本

### 问题 4: 构建配置缺失

**现象**: Dashboard 未集成到 Vite 构建流程。

**解决方案**:

- Vite 配置已自动检测 `src/webview/dashboard` 目录
- 创建 `index.html` 模板文件作为入口
- 验证构建输出正确

### 问题 5: i18n 重复键冲突

**现象**: 多个模块使用了相同的 i18n 键（如 `form.cancel`, `form.error.*`），导致覆盖冲突。

**解决方案**:

- 分析所有重复键的使用上下文，确认是否为不同用途
- 保留更详细、更具体的键（如第二组 `form.error.*`），删除第一组重复项
- 将 `rule-selector` 中的 "取消" 按钮改为 `form.reset`（语义更准确）
- 确保两个 bundle 文件（英文/中文）的键完全一致（334 个）

### 问题 6: i18n 类型错误（对象参数）

**现象**: 部分 i18n 文本需要对象参数（如 `{enabled: 2, total: 5}`），但 `i18n.ts` 仅支持位置参数。

**解决方案**:

- 更新 `i18n.ts` 函数签名，支持 `Record<string, string | number>` 参数
- 添加命名占位符替换逻辑：`{enabled}` → 值
- 兼容两种模式：位置参数 `{0}` 和命名参数 `{key}`

### 问题 7: 标题显示冗余

**现象**: Dashboard 标题显示 "Turbo AI Rules - Dashboard"，显得冗余。

**解决方案**:

- 将标题改为仅显示 "Dashboard"（英文）和 "仪表板"（中文）
- 扩展名已在侧边栏和其他位置显示，页面内无需重复

### 问题 8: 头部按钮布局在小屏幕换行

**现象**: 在小屏幕（<900px）下，设置/帮助按钮会换到新行。

**解决方案**:

- 移除 `@media (max-width: 900px)` 中的 `flex-direction: column`
- 保持按钮始终在右侧水平排列，即使在小屏幕

### 问题 9: 快速操作与适配器区按钮功能重复

**现象**: 快速操作区有"生成配置文件"，但适配器卡片区也有"重新生成所有配置"。

**解决方案**:

- 快速操作区移除"生成配置文件"按钮
- 保留 5 个快速操作：快速开始、统计、高级搜索、规则同步页、规则树
- "生成配置"按钮仅保留在适配器卡片区，语义更清晰

---

## 📝 后续优化建议

1. **实时刷新**: 监听规则源和适配器变化，自动刷新统计数据（使用 `vscode.workspace.onDidChangeConfiguration`）
2. **性能优化**: 使用 `useMemo` 缓存计算结果，减少重复渲染
3. **错误恢复**: 添加"重试"按钮，允许用户手动刷新数据
4. **动画效果**: 添加卡片加载和按钮点击的过渡动画（已有 `fadeIn` 动画，可进一步完善）
5. **键盘导航**: 改进无障碍支持，确保所有操作可通过键盘完成
6. **单元测试**: 为 Dashboard 组件添加 React Testing Library 测试
7. **集成测试**: 添加端到端测试验证消息通信

---

## 🔗 相关文件

**设计**:

- `.superdesign/design_docs/12-dashboard.md` - 设计文档
- `.superdesign/design_iterations/12-dashboard_1.html` - UI 原型（已废弃，仅作参考）

**实现**:

- `src/providers/DashboardWebviewProvider.ts` - Provider 类
- `src/webview/dashboard/App.tsx` - React 主组件
- `src/webview/dashboard/index.tsx` - React 根渲染
- `src/webview/dashboard/index.html` - HTML 模板
- `src/webview/dashboard/dashboard.css` - 样式文件
- `l10n/bundle.l10n.json` - 国际化（英文）
- `l10n/bundle.l10n.zh-cn.json` - 国际化（中文）

**组件复用**:

- `src/webview/components/Button.tsx`
- `src/webview/components/Card.tsx`
- `src/webview/components/Section.tsx`
- `src/webview/components/Icon.tsx`
- `src/webview/components/EmptyState.tsx`

**测试**:

- TODO: 添加集成测试 `src/test/suite/dashboard.spec.ts`
- TODO: 添加 React 组件测试

---

## 📊 变更记录

| 日期       | 版本 | 变更内容                                                    |
| ---------- | ---- | ----------------------------------------------------------- |
| 2025-12-01 | 1.0  | 初始版本，完成样式迁移与统一                                |
| 2025-12-01 | 2.0  | **重大变更**: 从静态 HTML 迁移为 React 实现                 |
|            |      | - 复用样式组件（Button、Card、Section 等）                  |
|            |      | - 添加完整国际化支持                                        |
|            |      | - 集成 Vite 构建流程                                        |
|            |      | - 统一使用 VSCode CSS 变量                                  |
| 2025-12-01 | 2.1  | **UI/UX 优化**                                              |
|            |      | - 标题改为 "Dashboard"（不显示扩展名 "Turbo AI Rules"）     |
|            |      | - 快速操作区移除 "生成配置文件" 按钮（保留在适配器区）      |
|            |      | - 快速操作保留 5 个：快速开始/统计/高级搜索/规则同步/规则树 |
|            |      | - 头部按钮布局保持右对齐（所有屏幕尺寸）                    |
|            |      | - 设置按钮: 当前打开 VSCode 原生设置（暂时方案）            |
|            |      | - 后续计划: 创建自定义设置页 (SettingsWebviewProvider)      |

---

_实施版本: 2.0_  
_完成日期: 2025-12-01_  
_实施者: AI (GitHub Copilot)_
