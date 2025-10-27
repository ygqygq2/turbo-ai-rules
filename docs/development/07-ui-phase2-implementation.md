# UI Phase 2 实现文档

> Webview 组件开发和基础架构

## 功能概述

Phase 2 专注于开发新的 Webview 组件，为用户提供更丰富的交互体验和信息展示。包括基础架构（BaseWebviewProvider）和 4 个具体 Webview（Welcome, Statistics, RuleDetails, Config）。

## 已实现组件

### 1. BaseWebviewProvider（基础架构）

**文件**: `src/providers/BaseWebviewProvider.ts`

**设计目的**:

- 抽象基类，为所有 Webview 组件提供统一的管理接口
- 避免每个 Webview 重复实现相同的基础功能
- 确保 Webview 遵循一致的安全和主题规范

**核心功能**:

- 主题自适应（自动同步 VS Code 主题变化）
- 安全的 CSP（内容安全策略）配置
- 双向消息通信机制
- 资源 URI 管理
- HTML 模板生成辅助方法

**核心接口**:

```typescript
interface WebviewOptions {
  title: string;
  viewType: string;
  enableScripts?: boolean;
  retainContextWhenHidden?: boolean;
  viewColumn?: vscode.ViewColumn;
}

interface WebviewMessage {
  type: string;
  payload?: any;
}
```

**设计模式**:

- **模板方法模式**：定义骨架，子类实现具体内容
- **单例模式**：每个提供者保持单一实例
- **观察者模式**：监听主题变化和面板关闭

**核心方法**（抽象）:

- `getHtmlContent(webview)`: 子类必须实现，返回 HTML 内容
- `handleMessage(message)`: 子类必须实现，处理消息
- `getCSP(webview, nonce)`: 生成内容安全策略
- `createPanel(options)`: 创建 Webview 面板
- `dispose()`: 清理资源

---

### 2. WelcomeWebviewProvider（欢迎页面）

**文件**: `src/providers/WelcomeWebviewProvider.ts`

**核心功能**:

- 首次启动自动显示（通过 `globalState` 控制）
- 3 步快速开始引导
- 模板库（TypeScript/React/Python）
- 文档和帮助资源链接

**启动流程**:

**启动流程**:

```
用户首次启动扩展
    ↓
检查 globalState.welcomeShown
    ↓ (false)
显示欢迎页面
- Step 1: Add Source
- Step 2: Sync Rules
- Step 3: Generate Configs
    ↓
用户点击 "Don't Show Again"
    ↓
设置 welcomeShown = true
```

**消息处理流程**:

- `addSource`: 执行添加源命令
- `syncRules`: 执行同步规则命令
- `generateConfigs`: 执行生成配置命令
- `useTemplate`: 添加预定义模板源
- `viewDocs`: 打开外部文档链接
- `dismiss`: 标记已查看，不再显示

**模板库**:

| 模板名称   | 描述                    | 预配置源                  |
| ---------- | ----------------------- | ------------------------- |
| TypeScript | TypeScript 项目规则模板 | turbo-ai/typescript-rules |
| React      | React 组件开发规则      | turbo-ai/react-rules      |
| Python     | Python 开发规则         | turbo-ai/python-rules     |

---

### 3. StatisticsWebviewProvider（统计视图）

**文件**: `src/providers/StatisticsWebviewProvider.ts`

**核心功能**:

- 实时统计数据展示
- 优先级分布图表（横向柱状图）
- 源统计表格
- 热门标签云
- 数据缓存机制（30 秒）
- 自动刷新（每 60 秒）
- 数据导出（JSON 格式）

**数据结构**:

```typescript
interface StatisticsData {
  overview: {
    totalRules: number;
    totalSources: number;
    enabledSources: number;
    conflicts: number;
  };
  sourceStats: Array<{
    name: string;
    ruleCount: number;
    enabled: boolean;
    lastSync?: string;
  }>;
  priorityDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  topTags: Array<{
    tag: string;
    count: number;
  }>;
}
```

**技术实现要点**:

**数据缓存机制**:

- 缓存时长：30 秒
- 缓存失效时异步更新
- 面板不可见时停止自动刷新

**自动刷新策略**:

- 刷新间隔：60 秒
- 仅在面板可见时刷新
- 使用定时器实现，dispose 时清理

**性能优化**:

- 缓存统计结果避免重复计算
- 按需计算标签统计（Top 20）
- 异步计算不阻塞 UI

**可视化元素**:

- 📊 概览卡片（4 个关键指标）
- 📈 优先级分布横向柱状图
- 📋 源统计表格（名称、规则数、状态、最后同步时间）
- 🏷️ 标签云（最多显示 20 个热门标签）

---

### 4. RuleDetailsWebviewProvider（规则详情）

**文件**: `src/providers/RuleDetailsWebviewProvider.ts`

**核心功能**:

- 详细元数据展示
- Markdown 内容预览
- 代码自动换行切换
- 快速操作按钮

**布局结构**:

**布局结构**:

```
┌─────────────────────────────────────────┐
│  📄 Rule Title              [工具栏]     │
├─────────────────────────────────────────┤
│  📊 Metadata                            │
│  Source: xxx    File Path: xxx          │
│  Version: x.x   Author: xxx             │
│  Priority: xxx                          │
├─────────────────────────────────────────┤
│  📝 Description                         │
│  [描述内容]                             │
├─────────────────────────────────────────┤
│  🏷️ Tags: [tag1] [tag2] [tag3]         │
├─────────────────────────────────────────┤
│  📄 Content Preview      [↔️] [📋] [📥] │
│  ┌───────────────────────────────────┐ │
│  │ [Markdown 内容]                   │ │
│  │                                   │ │
│  └───────────────────────────────────┘ │
├─────────────────────────────────────────┤
│  🔧 Additional Metadata                 │
│  [额外字段列表]                         │
└─────────────────────────────────────────┘
```

**快速操作**:

| 按钮           | 功能                             | 消息类型      |
| -------------- | -------------------------------- | ------------- |
| 📋 Copy        | 复制规则内容到剪贴板             | `copyContent` |
| 📥 Export      | 导出为 Markdown 文件（含元数据） | `exportRule`  |
| 📝 Edit        | 在编辑器中打开原始文件           | `editRule`    |
| ↔️ Toggle Wrap | 切换内容自动换行                 | `toggleWrap`  |

**安全实现要点**:

**HTML 转义**:

- 防止 XSS 攻击
- 转义特殊字符（&, <, >, ", '）
- 确保用户输入安全显示

**内容安全策略**:

- 使用 nonce 限制脚本执行
- 限制资源加载来源
- 遵循 VS Code Webview 安全最佳实践

---

## 架构设计

### 继承层次

```
BaseWebviewProvider (抽象基类)
    ├─→ WelcomeWebviewProvider
    ├─→ StatisticsWebviewProvider
    ├─→ RuleDetailsWebviewProvider
    └─→ ConfigWebviewProvider (未实现)
```

### 消息协议

**通用消息格式**:

```typescript
// Extension → Webview
{
  type: 'updateData' | 'updateTheme' | 'error',
  data?: any,
  error?: string
}

// Webview → Extension
{
  type: string,  // 命令类型
  payload?: any  // 命令参数
}
```

### 依赖注入

**单例模式 + 工厂方法**:

```typescript
class StatisticsWebviewProvider {
  private static instance: StatisticsWebviewProvider;

  static getInstance(
    context: vscode.ExtensionContext,
    configManager: ConfigManager,
    rulesManager: RulesManager,
  ): StatisticsWebviewProvider {
    if (!this.instance) {
      this.instance = new StatisticsWebviewProvider(context, configManager, rulesManager);
    }
    return this.instance;
  }
}
```

---

## 性能考量

### 缓存策略

**StatisticsWebviewProvider**:

- 数据缓存 30 秒，避免频繁计算
- 缓存失效时异步更新，不阻塞 UI
- 面板不可见时停止自动刷新

**BaseWebviewProvider**:

- 面板单例，避免重复创建
- `retainContextWhenHidden: true` 保持状态

### 内存管理

**资源清理**:

```typescript
class BaseWebviewProvider {
  dispose() {
    // 清理定时器
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    // 清理面板
    if (this.currentPanel) {
      this.currentPanel.dispose();
      this.currentPanel = undefined;
    }

    // 清理缓存
    this.cache = null;
  }
}
```

**注意事项**:

- dispose 时清理所有定时器
- 清理面板引用避免内存泄漏
- 清空缓存释放内存

### 渲染优化

- 使用 `nonce` 实现内联脚本 CSP
- CSS 使用 VS Code 主题变量，避免重复定义
- 大内容使用 `overflow: auto` 和固定高度

---

## 技术实现细节

### 主题适配

**CSS 变量方案**:

```css
body {
  color: var(--vscode-foreground);
  background-color: var(--vscode-editor-background);
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
}

button {
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  padding: 6px 14px;
  cursor: pointer;
}

button:hover {
  background-color: var(--vscode-button-hoverBackground);
}
```

**优势**:

- 自动跟随 VS Code 主题
- 无需手动监听主题变化
- 保持视觉一致性

### 消息通信完整流程

**Webview 端**:

```javascript
// 获取 VS Code API
const vscode = acquireVsCodeApi();

// 发送消息到扩展
function handleAction(type, payload) {
  vscode.postMessage({ type, payload });
}

// 接收扩展消息
window.addEventListener('message', (event) => {
  const message = event.data;
  if (message.type === 'updateData') {
    renderData(message.data);
  }
});
```

**Extension 端**:

```typescript
protected handleMessage(message: WebviewMessage) {
  switch (message.type) {
    case 'refresh':
      this.refreshData();
      break;
    case 'export':
      this.exportData(message.payload);
      break;
  }
}

async refreshData() {
  const data = await this.calculateStatistics();
  await this.currentPanel?.webview.postMessage({
    type: 'updateData',
    data
  });
}
```

**消息流向**:

- Webview → Extension: `vscode.postMessage()`
- Extension → Webview: `webview.postMessage()`

### 资源 URI 安全处理

**资源加载方式**:

```typescript
// 获取资源 URI
const iconUri = this.currentPanel.webview.asWebviewUri(
  vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'icons', 'logo.png'),
);

// HTML 中使用
const html = `<img src="${iconUri}" alt="Logo" />`;
```

**安全要点**:

- 使用 `asWebviewUri` 转换资源路径
- 限制 `localResourceRoots`
- 遵循 CSP 策略

---

## 集成点

### Extension.ts 修改

```typescript
import {
  BaseWebviewProvider,
  RuleDetailsWebviewProvider,
  StatisticsWebviewProvider,
  WelcomeWebviewProvider,
} from './providers';

// 注册命令
context.subscriptions.push(
  vscode.commands.registerCommand('turbo-ai-rules.showWelcome', async () => {
    const provider = WelcomeWebviewProvider.getInstance(context);
    await provider.showWelcome();
  }),

  vscode.commands.registerCommand('turbo-ai-rules.showStatistics', async () => {
    const provider = StatisticsWebviewProvider.getInstance(context, configManager, rulesManager);
    await provider.showStatistics();
  }),

  vscode.commands.registerCommand('turbo-ai-rules.showRuleDetail', async (item) => {
    const provider = RuleDetailsWebviewProvider.getInstance(context);
    await provider.showRuleDetails(item.data.rule);
  }),
);

// 首次启动检查
const welcomeShown = context.globalState.get('welcomeShown', false);
if (!welcomeShown) {
  await vscode.commands.executeCommand('turbo-ai-rules.showWelcome');
}
```

### Package.json 配置

```json
{
  "contributes": {
    "commands": [
      {
        "command": "turbo-ai-rules.showWelcome",
        "title": "Show Welcome",
        "category": "Turbo AI Rules",
        "icon": "$(home)"
      },
      {
        "command": "turbo-ai-rules.showStatistics",
        "title": "Show Statistics",
        "category": "Turbo AI Rules",
        "icon": "$(graph)"
      },
      {
        "command": "turbo-ai-rules.showRuleDetail",
        "title": "Show Rule Details",
        "category": "Turbo AI Rules"
      }
    ],
    "menus": {
      "view/title": [
        {
          "command": "turbo-ai-rules.showStatistics",
          "when": "view == turbo-ai-rules-view",
          "group": "navigation"
        }
      ],
      "view/item/context": [
        {
          "command": "turbo-ai-rules.showRuleDetail",
          "when": "view == turbo-ai-rules-view && viewItem == rule",
          "group": "inline"
        }
      ]
    }
  }
}
```

---

## 测试清单

### 功能测试

- [ ] 欢迎页面首次启动自动显示
- [ ] "Don't Show Again" 正确保存状态
- [ ] 快速开始按钮触发正确命令
- [ ] 模板按钮添加预配置源
- [ ] 统计数据计算准确
- [ ] 图表正确渲染
- [ ] 规则详情显示完整元数据
- [ ] 快速操作按钮功能正常
- [ ] 导出功能生成正确的 Markdown
- [ ] 自动刷新在面板可见时工作

### 主题测试

- [ ] 浅色主题样式正确
- [ ] 深色主题样式正确
- [ ] 高对比度主题可读性良好
- [ ] 主题切换实时更新

### 性能测试

- [ ] 100+ 规则时统计视图加载 < 500ms
- [ ] 长规则内容渲染流畅
- [ ] 缓存机制有效减少计算
- [ ] 自动刷新不影响性能
- [ ] 内存占用 < 20MB/Webview

### 安全测试

- [ ] XSS 攻击防护有效
- [ ] CSP 策略正确配置
- [ ] 外部链接使用 `openExternal`
- [ ] 用户输入正确转义

### 边界测试

- [ ] 无规则时显示友好提示
- [ ] 特殊字符正确处理
- [ ] 超长文本正确显示
- [ ] 网络错误正确处理
- [ ] 多次打开/关闭面板无内存泄漏

---

## 已知问题

1. **欢迎页按钮无响应**:

   - 问题：点击快速开始按钮无反应
   - 原因：可能未正确注入 `acquireVsCodeApi()` 脚本
   - 解决：检查 `getVscodeApiScript()` 是否正确调用

2. **统计视图首次加载慢**:
   - 问题：首次打开统计视图需要 1-2 秒
   - 原因：需要遍历所有规则计算统计数据
   - 优化：考虑后台预计算或增量更新

---

## 下一步开发

Phase 2 完成后，建议继续：

1. **ConfigWebviewProvider**:

   - 可视化配置管理界面
   - 源列表编辑
   - 配置校验和预览

2. **Phase 3 - 高级交互**:
   - 高级搜索 Webview
   - 批量操作界面
   - 冲突解决向导

---

**维护说明**: 本文档描述 Phase 2 Webview 组件的技术实现细节，修改相关功能时需同步更新。
