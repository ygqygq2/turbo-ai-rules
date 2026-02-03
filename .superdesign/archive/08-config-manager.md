# SuperDesign 设计文档 - 配置管理面板

> **页面名称**: Configuration Manager (配置管理面板)  
> **用途**: 管理规则源、AI 工具适配器和同步设置  
> **优先级**: high

---

## 📋 设计目标

创建一个集中式配置管理界面，让用户能够：

- 📦 管理规则源（添加、编辑、删除、启用/禁用）
- 🎯 配置 AI 工具适配器（Cursor、Copilot、Continue 等）
- 🔄 设置同步策略（自动同步、间隔、冲突解决）
- 💾 导入/导出配置

---

## 🎨 布局设计

### 整体结构

```
┌────────────────────────────────────────────────────────────┐
│  ⚙️  配置管理                                [导出] [导入]  │  ← 头部工具栏
├────────────────────────────────────────────────────────────┤
│                                                            │
│  📦 规则源管理                           [➕ 添加新源]     │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ ┌─────────────────────────────────────────┐          │ │
│  │ │ ✓ My Team Rules                         │ [︙]     │ │  ← 源卡片
│  │ │   🌐 github.com/team/rules              │          │ │
│  │ │   🌿 Branch: main                       │          │ │
│  │ │   📁 Path: /rules                       │          │ │
│  │ │   🔄 Last Sync: 2 mins ago              │          │ │
│  │ │   📊 Rules: 45                          │          │ │
│  │ └─────────────────────────────────────────┘          │ │
│  │                                                       │ │
│  │ ┌─────────────────────────────────────────┐          │ │
│  │ │ ✗ Public Best Practices (已禁用)       │ [︙]     │ │
│  │ │   🌐 github.com/awesome/rules           │          │ │
│  │ │   🌿 Branch: main                       │          │ │
│  │ └─────────────────────────────────────────┘          │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  🎯 AI 工具适配器                                          │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  ☑ GitHub Copilot                      [自动更新: ON] │ │  ← 适配器开关
│  │     输出: .github/copilot-instructions.md           │ │
│  │                                                       │ │
│  │  ☑ Cursor                               [自动更新: ON] │ │
│  │     输出: .cursorrules                                │ │
│  │                                                       │ │
│  │  ☐ Continue                            [自动更新: OFF] │ │
│  │     输出: .continuerules                              │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  🔄 同步设置                                               │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  ☑ 启动时自动同步                                     │ │  ← 同步选项
│  │  ☑ 后台自动同步                                       │ │
│  │     同步间隔: [60] 分钟                               │ │
│  │                                                       │ │
│  │  冲突解决策略: [优先级 ▼]                            │ │  ← 下拉选择
│  │     • 优先级（默认）                                  │ │
│  │     • 合并内容                                        │ │
│  │     • 跳过重复                                        │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  💾 存储设置                                               │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  ☑ 使用全局缓存 (~/.turbo-ai-rules/)                 │ │
│  │  ☑ 自动添加到 .gitignore                             │ │
│  │                                                       │ │
│  │  缓存大小: 2.3 MB                      [🗑️ 清理缓存]  │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  [取消]                                           [保存]  │  ← 底部操作栏
└────────────────────────────────────────────────────────────┘
```

### 响应式布局

**桌面端（> 900px）**:

- 单列布局，最大宽度 900px 居中
- 所有卡片展开显示

**平板端（600px - 900px）**:

- 单列布局，填充宽度
- 卡片略微收缩

**移动端（< 600px）**:

- 垂直堆叠
- 源卡片可折叠，只显示标题和状态
- 工具栏按钮显示图标，隐藏文字

---

## 🎨 视觉设计

### 配色方案

使用 VS Code 主题变量：

```css
/* 容器 */
.config-container {
  background-color: var(--vscode-editor-background);
  color: var(--vscode-foreground);
  padding: var(--spacing-lg);
}

/* 源卡片 */
.source-card {
  background-color: var(--vscode-editorWidget-background);
  border: 1px solid var(--vscode-editorWidget-border);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.source-card.enabled {
  border-left: 3px solid var(--vscode-testing-iconPassed);
}

.source-card.disabled {
  opacity: 0.6;
  border-left: 3px solid var(--vscode-descriptionForeground);
}

/* 适配器开关 */
.adapter-toggle {
  display: flex;
  align-items: center;
  padding: var(--spacing-sm);
  background-color: var(--vscode-input-background);
  border: 1px solid var(--vscode-input-border);
  border-radius: var(--border-radius);
  margin-bottom: var(--spacing-sm);
}

.adapter-toggle.active {
  border-left: 3px solid var(--vscode-testing-iconPassed);
}

/* 表单元素 */
.form-group {
  margin-bottom: var(--spacing-md);
}

.form-label {
  display: block;
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
  color: var(--vscode-foreground);
}

.form-input {
  width: 100%;
  padding: var(--spacing-sm);
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: var(--border-radius);
}

.form-input:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
}

/* 按钮 */
.button-primary {
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius);
  cursor: pointer;
}

.button-secondary {
  background-color: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
}

.button-danger {
  background-color: var(--vscode-errorForeground);
  color: white;
}
```

### 图标使用

```html
<!-- VS Code Codicons -->
<i class="codicon codicon-settings-gear"></i>
<!-- 配置图标 -->
<i class="codicon codicon-add"></i>
<!-- 添加按钮 -->
<i class="codicon codicon-trash"></i>
<!-- 删除按钮 -->
<i class="codicon codicon-edit"></i>
<!-- 编辑按钮 -->
<i class="codicon codicon-sync"></i>
<!-- 同步图标 -->
<i class="codicon codicon-check"></i>
<!-- 启用状态 -->
<i class="codicon codicon-close"></i>
<!-- 禁用状态 -->
<i class="codicon codicon-kebab-vertical"></i>
<!-- 更多操作 -->
```

---

## ✨ 交互设计

### 源卡片操作

**点击更多菜单（︙）显示**：

```
┌─────────────────────────┐
│  ✏️  编辑源配置         │
│  🔄  测试连接           │
│  ✓/✗ 启用/禁用          │
│  📤  导出配置           │
│  🗑️  删除源             │
└─────────────────────────┘
```

**编辑源配置弹窗**：

```
┌─────────────────────────────────────┐
│  ✏️  编辑规则源                     │
├─────────────────────────────────────┤
│  源名称:                            │
│  [My Team Rules               ]    │
│                                     │
│  Git 仓库 URL:                      │
│  [https://github.com/team/rules]   │
│                                     │
│  分支:                              │
│  [main                         ]   │
│                                     │
│  子目录（可选）:                    │
│  [/rules                       ]   │
│                                     │
│  认证方式:                          │
│  ( ) 无需认证                       │
│  (•) Token                          │
│  ( ) SSH Key                        │
│                                     │
│  Token:                             │
│  [••••••••••••••••            ]    │
│                                     │
├─────────────────────────────────────┤
│  [取消]                    [保存]  │
└─────────────────────────────────────┘
```

### 动画效果

```css
/* 卡片展开动画 */
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.source-card {
  animation: slideDown 0.3s ease-out;
}

/* 开关切换动画 */
.toggle-switch {
  transition: all 0.3s ease;
}

.toggle-switch.active {
  transform: translateX(20px);
}

/* 保存按钮加载动画 */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.button-loading::before {
  content: '';
  display: inline-block;
  width: 14px;
  height: 14px;
  margin-right: 8px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
```

---

## 🔌 消息通信

### Extension → Webview

```typescript
// 初始化配置数据
{
  type: 'init',
  payload: {
    sources: RuleSource[],
    adapters: AdapterConfig[],
    syncSettings: SyncSettings,
    storageSettings: StorageSettings
  }
}

// 配置更新成功
{
  type: 'configUpdated',
  payload: {
    message: '配置已保存'
  }
}

// 测试连接结果
{
  type: 'connectionTestResult',
  payload: {
    sourceId: string,
    success: boolean,
    message: string
  }
}
```

### Webview → Extension

```typescript
// 保存配置
{
  type: 'saveConfig',
  payload: {
    sources: RuleSource[],
    adapters: AdapterConfig[],
    syncSettings: SyncSettings
  }
}

// 添加源
{
  type: 'addSource',
  payload: {
    name: string,
    gitUrl: string,
    branch: string,
    subPath?: string,
    auth: AuthConfig
  }
}

// 删除源
{
  type: 'deleteSource',
  payload: {
    sourceId: string
  }
}

// 测试连接
{
  type: 'testConnection',
  payload: {
    sourceId: string
  }
}

// 清理缓存
{
  type: 'clearCache'
}

// 导入配置
{
  type: 'importConfig',
  payload: {
    config: ExtensionConfig
  }
}

// 导出配置
{
  type: 'exportConfig'
}
```

---

## ♿ 无障碍支持

### 键盘导航

| 按键        | 功能                 |
| ----------- | -------------------- |
| `Tab`       | 切换焦点到下一个元素 |
| `Shift+Tab` | 切换焦点到上一个元素 |
| `Enter`     | 激活按钮或切换开关   |
| `Esc`       | 关闭弹窗或对话框     |
| `Space`     | 切换复选框或开关     |
| `↑/↓`       | 在下拉菜单中导航     |

### ARIA 属性

```html
<!-- 源卡片 -->
<div class="source-card" role="article" aria-label="规则源: My Team Rules">
  <!-- 内容 -->
</div>

<!-- 适配器开关 -->
<div
  class="adapter-toggle"
  role="switch"
  aria-checked="true"
  aria-label="启用 GitHub Copilot 适配器"
>
  <!-- 开关 -->
</div>

<!-- 表单输入 -->
<label for="source-name" class="form-label">源名称</label>
<input id="source-name" type="text" aria-required="true" aria-describedby="source-name-hint" />
<small id="source-name-hint"> 请输入一个描述性的源名称 </small>
```

---

## 📊 数据验证

### 客户端验证

```typescript
// Git URL 格式验证
function validateGitUrl(url: string): boolean {
  const pattern = /^(https?:\/\/|git@)[\w\-.]+(:\d+)?\/?[\w\-./]+$/;
  return pattern.test(url);
}

// 分支名验证
function validateBranchName(branch: string): boolean {
  const pattern = /^[a-zA-Z0-9/_-]+$/;
  return pattern.test(branch) && branch.length > 0;
}

// 同步间隔验证
function validateSyncInterval(interval: number): boolean {
  return interval >= 1 && interval <= 1440; // 1分钟到24小时
}

// 表单验证
function validateSourceForm(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data.name || data.name.trim() === '') {
    errors.push('源名称不能为空');
  }

  if (!validateGitUrl(data.gitUrl)) {
    errors.push('Git URL 格式无效');
  }

  if (!validateBranchName(data.branch)) {
    errors.push('分支名格式无效');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

### 错误提示

```html
<!-- 表单错误显示 -->
<div class="form-group">
  <label class="form-label">Git 仓库 URL *</label>
  <input
    type="text"
    class="form-input"
    aria-invalid="true"
    style="border-color: var(--vscode-errorForeground)"
  />
  <div class="error-message" style="color: var(--vscode-errorForeground);">
    <i class="codicon codicon-error"></i>
    Git URL 格式无效，请检查
  </div>
</div>
```

---

## 🎯 实现优先级

### Phase 1（核心功能）

- [ ] 源列表显示
- [ ] 添加/编辑/删除源
- [ ] 适配器开关
- [ ] 基础验证

### Phase 2（增强功能）

- [ ] 测试连接功能
- [ ] 导入/导出配置
- [ ] 冲突策略配置
- [ ] 缓存管理

### Phase 3（高级功能）

- [ ] 源排序（拖拽）
- [ ] 批量操作
- [ ] 配置历史
- [ ] 配置模板

---

## 📝 技术备注

### 集成到 BaseWebviewProvider

```typescript
export class ConfigManagerWebviewProvider extends BaseWebviewProvider {
  constructor(
    context: vscode.ExtensionContext,
    private configManager: ConfigManager,
    private gitManager: GitManager,
  ) {
    super(context);
  }

  protected getHtmlContent(webview: vscode.Webview): string {
    // 返回配置管理面板的 HTML
    return `<!DOCTYPE html>...`;
  }

  protected async handleMessage(message: WebviewMessage): Promise<void> {
    switch (message.type) {
      case 'saveConfig':
        await this.handleSaveConfig(message.payload);
        break;
      case 'addSource':
        await this.handleAddSource(message.payload);
        break;
      case 'testConnection':
        await this.handleTestConnection(message.payload);
        break;
      // ... 其他消息处理
    }
  }
}
```

---

## 🔍 参考

- **设计系统**: [08-superdesign-guide.md](./08-superdesign-guide.md)
- **架构文档**: [01-design.md](./01-design.md)
- **UI 设计**: [07-ui-design.md](./07-ui-design.md)
- **配置管理**: `src/services/ConfigManager.ts`
- **现有 Webview**: `src/providers/WelcomeWebviewProvider.ts`

---

_设计版本: 1.0_  
_创建日期: 2025-10-27_  
_设计师: AI (SuperDesign)_
