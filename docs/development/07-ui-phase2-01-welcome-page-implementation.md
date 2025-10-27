# 欢迎页面实施文档

> **设计文档**: `.superdesign/design_docs/01-welcome-page.md`  
> **HTML 原型**: `.superdesign/design_iterations/welcome-page_v*.html` (待 SuperDesign 生成)  
> **实现文件**: `src/providers/WelcomeWebviewProvider.ts`  
> **状态**: ✅ 已完成基础实现

---

## 实施概述

欢迎页面是用户首次使用扩展时看到的引导界面，提供 3 步快速开始流程和模板库。

### 关键特性

- 🎯 **3 步引导流程**: 添加源 → 同步规则 → 生成配置
- 📚 **快速模板库**: 预置 TypeScript、React、Python 等常见模板
- 💾 **状态持久化**: 记录用户完成的步骤（待实现）
- 🔒 **单例模式**: 避免重复创建 Webview 面板

---

## 实施细节

### 1. Provider 类设计

```typescript
export class WelcomeWebviewProvider extends BaseWebviewProvider {
  // 单例模式
  private static instance: WelcomeWebviewProvider | undefined;

  // 私有构造函数
  private constructor(context: vscode.ExtensionContext) {
    super(context);
  }

  // 获取单例
  public static getInstance(context: vscode.ExtensionContext): WelcomeWebviewProvider;

  // 显示欢迎页面
  public async showWelcome(): Promise<void>;
}
```

### 2. HTML 结构

当前实现包含：

- **Hero 区域**: 标题和副标题
- **步骤卡片**: 3 个步骤，每个包含标题、描述和操作按钮
- **模板网格**: 3x1 响应式卡片布局
- **底部操作**: 文档、帮助、关闭按钮

**样式特点**:

- 使用 VS Code CSS 变量 (`--vscode-*`)
- 响应式网格布局 (`grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))`)
- 卡片悬停效果 (`transform: translateY(-2px)`)

### 3. 消息协议

#### Webview → Extension

| 消息类型          | Payload            | 说明         |
| ----------------- | ------------------ | ------------ |
| `addSource`       | -                  | 添加规则源   |
| `syncRules`       | -                  | 同步规则     |
| `generateConfigs` | -                  | 生成配置     |
| `useTemplate`     | `{ type: string }` | 使用模板     |
| `viewDocs`        | -                  | 查看文档     |
| `getHelp`         | -                  | 获取帮助     |
| `dismiss`         | -                  | 关闭欢迎页面 |

#### Extension → Webview

| 消息类型       | Payload                         | 说明                   |
| -------------- | ------------------------------- | ---------------------- |
| `themeChanged` | `{ kind, isDark }`              | 主题变化（基类）       |
| `updateState`  | `{ hasSource, hasSynced, ... }` | 更新步骤状态（待实现） |

### 4. 状态管理

**当前实现**:

```typescript
// 使用 GlobalState 记录欢迎页面是否已显示
await this.context.globalState.update('welcomeShown', true);
```

**待完善**:

- [ ] 记录每个步骤的完成状态
- [ ] 在 Webview 中显示步骤完成状态（勾选标记）
- [ ] 根据完成状态启用/禁用后续步骤按钮

**建议实现**:

```typescript
// 存储步骤完成状态
interface WelcomeState {
  hasSource: boolean;
  hasSynced: boolean;
  hasGenerated: boolean;
}

// 在 Webview 中使用 vscode.getState() / vscode.setState()
// 在 Extension 中监听命令完成事件并更新状态
```

---

## 命令集成

### 注册命令

```typescript
// src/extension.ts
vscode.commands.registerCommand('turbo-ai-rules.showWelcome', async () => {
  const welcomeProvider = WelcomeWebviewProvider.getInstance(context);
  await welcomeProvider.showWelcome();
});
```

### package.json 配置

```json
{
  "contributes": {
    "commands": [
      {
        "command": "turbo-ai-rules.showWelcome",
        "title": "%command.showWelcome%",
        "category": "Turbo AI Rules"
      }
    ]
  }
}
```

### 自动显示逻辑

```typescript
// src/extension.ts - activate()
const welcomeShown = context.globalState.get('welcomeShown', false);
const config = ConfigManager.getInstance(context).getConfig();

if (!welcomeShown && config.sources.length === 0) {
  const welcomeProvider = WelcomeWebviewProvider.getInstance(context);
  await welcomeProvider.showWelcome();
}
```

---

## 与设计文档的对比

### 已实现

- ✅ 3 步引导流程 UI
- ✅ 模板库展示
- ✅ 响应式布局
- ✅ VS Code 主题适配
- ✅ 命令调用集成

### 待完善（与设计文档差异）

| 设计文档要求                     | 当前实现状态 | 优先级 |
| -------------------------------- | ------------ | ------ |
| **步骤状态追踪**（完成标记）     | ❌ 未实现    | 🔥 高  |
| **按钮禁用逻辑**（依赖前置步骤） | ❌ 未实现    | 🔥 高  |
| **"不再显示"复选框**             | ❌ 未实现    | 中     |
| **模板自动添加功能**             | ⚠️ 占位实现  | 中     |
| **ASCII 线框图精确还原**         | ⚠️ 部分偏差  | 低     |

---

## SuperDesign 生成建议

当 SuperDesign 生成 HTML 原型时，重点关注：

### 必须实现

1. **步骤状态可视化**

   ```html
   <div class="step-card completed" data-step="1">
     <div class="step-number">✓</div>
     ...
   </div>
   ```

2. **动态按钮状态**

   ```javascript
   // 根据前置步骤完成情况启用/禁用按钮
   const syncButton = document.getElementById('syncButton');
   syncButton.disabled = !state.hasSource;
   ```

3. **"不再显示"复选框**
   ```html
   <div class="footer">
     <label>
       <input type="checkbox" id="dontShowAgain" onchange="handleDontShowAgain(this.checked)" />
       Don't show this again
     </label>
   </div>
   ```

### 样式优化

- 步骤卡片动画效果（`fadeIn` 动画）
- 完成状态的视觉反馈（变灰、勾选图标）
- 模板卡片悬停效果（阴影、上浮）

### 响应式断点

- **Desktop (>600px)**: 3 列模板网格
- **Tablet (400-600px)**: 2 列模板网格
- **Mobile (<400px)**: 1 列模板网格

---

## 测试要点

### 功能测试

- [ ] 点击"Add Source"调用 `turbo-ai-rules.addSource` 命令
- [ ] 点击"Sync Now"调用 `turbo-ai-rules.syncRules` 命令
- [ ] 点击"Generate Configs"调用 `turbo-ai-rules.generateConfigs` 命令
- [ ] 点击模板卡片显示确认对话框
- [ ] 点击"Documentation"打开 GitHub 文档
- [ ] 点击"Get Help"打开 GitHub Discussions
- [ ] 点击"Don't Show Again"关闭页面并设置状态

### 状态测试

- [ ] 首次安装时自动显示欢迎页面
- [ ] 已配置源的用户不自动显示
- [ ] 可以通过命令面板再次打开
- [ ] 步骤完成后显示勾选标记（待实现）
- [ ] 后续步骤按钮根据前置步骤启用（待实现）

### 主题测试

- [ ] 明亮主题显示正常
- [ ] 暗黑主题显示正常
- [ ] 高对比度主题可读性良好
- [ ] 主题切换时 UI 自动更新

### 响应式测试

- [ ] 300px 宽度（窄面板）
- [ ] 600px 宽度（平板）
- [ ] 1200px+ 宽度（桌面）
- [ ] 模板网格自动换行

---

## 已知问题与改进

### Issue 1: 步骤状态未追踪

**问题**: 用户完成某个步骤后，UI 没有视觉反馈

**影响**: 用户不清楚自己的进度

**解决方案**:

1. 在 Extension 中监听命令执行成功事件
2. 发送消息到 Webview 更新状态
3. Webview 使用 `vscode.setState()` 持久化状态
4. 重新打开时从 `vscode.getState()` 恢复状态

**优先级**: 🔥 高

### Issue 2: 模板功能未实现

**问题**: 点击模板只显示占位消息

**影响**: 用户无法快速开始

**解决方案**:

1. 创建模板配置文件（JSON）
2. 实现 `handleUseTemplate()` 逻辑：
   - 显示模板详情对话框
   - 自动添加模板 Git 源
   - 触发同步
3. 提供模板管理功能

**优先级**: 中

### Issue 3: 缺少加载状态

**问题**: 执行命令时没有加载指示器

**影响**: 用户不知道操作是否在进行

**解决方案**:

1. 在按钮上添加加载状态（禁用 + 旋转图标）
2. 使用 `vscode.window.withProgress()` 显示进度
3. 完成后通过消息更新 UI

**优先级**: 中

---

## 性能考虑

- ✅ **单例模式**: 避免重复创建 Webview
- ✅ **retainContextWhenHidden**: 隐藏时保留状态
- ⚠️ **HTML 大小**: 当前约 5KB，可接受
- ❌ **状态持久化**: 未实现，每次打开都重置

---

## 相关文件

### 核心文件

- `src/providers/WelcomeWebviewProvider.ts` - Provider 实现
- `src/providers/BaseWebviewProvider.ts` - 基类
- `src/extension.ts` - 命令注册和自动显示逻辑

### 配置文件

- `package.json` - 命令定义
- `package.nls.json` - 国际化（英文）
- `package.nls.zh-cn.json` - 国际化（中文）

### 文档文件

- `.superdesign/design_docs/01-welcome-page.md` - 设计文档
- `.superdesign/design_iterations/welcome-page_v*.html` - HTML 原型（待生成）
- `docs/development/07-ui-phase2-01-welcome-page-implementation.md` - 本文档

---

## 下一步行动

### 立即行动

1. **请求 SuperDesign 生成 HTML 原型**

   ```
   根据 .superdesign/design_docs/01-welcome-page.md 生成欢迎页面 HTML
   ```

2. **测试现有实现**
   - 验证命令调用
   - 测试不同主题
   - 检查响应式布局

### 短期改进（本周）

1. 实现步骤状态追踪
2. 添加按钮禁用逻辑
3. 实现"不再显示"功能

### 长期改进（下版本）

1. 实现模板自动添加
2. 添加加载状态指示器
3. 添加动画效果

---

_实施日期: 2025-10-27_  
_开发者: Copilot + User_  
_设计者: SuperDesign (待协作)_
