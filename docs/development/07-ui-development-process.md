# UI 开发流程文档

> **版本**: 3.0 (SuperDesign 协作模式)  
> **最后更新**: 2025-10-27  
> **状态**: 活跃开发中

---

## 📋 流程概述

Turbo AI Rules 采用 **AI 协作开发模式**，将 UI 设计和开发分为三个角色：

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Copilot    │ ───→ │ SuperDesign  │ ───→ │     User     │
│  (需求分析)  │      │  (UI 设计)   │      │   (测试)     │
└──────────────┘      └──────────────┘      └──────────────┘
       ↑                                            │
       └────────────────────────────────────────────┘
                      反馈循环
```

### 角色职责

| 角色               | 工具            | 职责                             | 输出                                                            |
| ------------------ | --------------- | -------------------------------- | --------------------------------------------------------------- |
| **GitHub Copilot** | VS Code Copilot | 需求分析、设计文档编写、代码集成 | 设计文档 (`.superdesign/design_docs/`)、Provider 代码、文档更新 |
| **SuperDesign**    | SuperDesign AI  | UI 设计、HTML 生成、迭代优化     | HTML 原型 (`.superdesign/design_iterations/`)                   |
| **User (开发者)**  | VS Code         | 测试验证、反馈问题、最终审核     | 测试反馈、验收确认                                              |

---

## 🔄 完整开发流程

### Phase 1: 需求分析 (Copilot)

**输入**: 用户需求、功能描述

**任务**:

1. 分析 UI 需求和功能点
2. 确定页面类型（Webview / TreeView / StatusBar）
3. 规划数据结构和消息协议
4. 编写详细的设计文档

**输出**: `.superdesign/design_docs/XX-page-name.md`

**设计文档结构**:

```markdown
# 页面名称设计文档

## 页面概述

- 页面名称、类型、实现文件
- 访问方式、触发时机

## 设计目标

- 核心功能和用户价值

## 页面布局

- ASCII 线框图
- 响应式行为说明

## 视觉设计

- 颜色方案（CSS 变量）
- 图标使用
- 字体和间距

## 交互设计

- 用户流程图
- 操作响应
- 动画效果

## 数据结构

- 接口定义
- 消息协议

## 性能考虑

- 优化策略
- 性能指标
```

**示例**: 参考 `.superdesign/design_docs/01-welcome-page.md`

---

### Phase 2: UI 设计 (SuperDesign)

**输入**: 设计文档 (`.superdesign/design_docs/`)

**SuperDesign 工作流程**:

#### Step 1: 布局设计

SuperDesign 读取设计文档，绘制 ASCII 线框图：

```
用户: "根据 01-welcome-page.md 设计欢迎页面"

SuperDesign:
┌──────────────────────────────────────────┐
│         🚀 Welcome to Turbo AI Rules     │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  Step 1: Add Source                │ │
│  │  [➕ Add Source]                   │ │
│  └────────────────────────────────────┘ │
│  ...                                     │
└──────────────────────────────────────────┘

是否确认此布局？
```

#### Step 2: 主题设计

用户确认布局后，SuperDesign 定义 CSS 变量：

```css
.welcome-container {
  background-color: var(--vscode-editor-background);
  padding: var(--spacing-lg);
}

.step-card {
  background-color: var(--vscode-editorWidget-background);
  border: 1px solid var(--vscode-editorWidget-border);
}
```

#### Step 3: 动画设计

```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.step-card {
  animation: fadeIn 0.4s ease-out;
}
```

#### Step 4: 生成 HTML

SuperDesign 调用工具生成完整 HTML：

**输出**: `.superdesign/design_iterations/welcome-page_v1.html`

---

### Phase 3: 测试验证 (User)

**输入**: HTML 原型 (`.superdesign/design_iterations/`)

**测试清单**:

- [ ] **主题测试**

  - [ ] 明亮主题显示正常
  - [ ] 暗黑主题显示正常
  - [ ] 高对比度主题可读

- [ ] **响应式测试**

  - [ ] 300px 宽度（窄面板）
  - [ ] 600px 宽度（平板）
  - [ ] 1200px+ 宽度（桌面）

- [ ] **交互测试**

  - [ ] 按钮点击响应
  - [ ] 键盘导航
  - [ ] 鼠标悬停效果

- [ ] **功能测试**
  - [ ] 消息通信正常
  - [ ] 数据加载正确
  - [ ] 错误处理

**预览方式**:

方式一：直接在浏览器打开 HTML
live server 等

---

### Phase 4: 反馈迭代 (User → Copilot)

**场景 1: UI 需要调整**

```
用户: "欢迎页面的卡片间距太小，调整为 24px"

Copilot:
1. 更新设计文档
2. 指导用户让 SuperDesign 重新生成

用户 → SuperDesign: "重新生成欢迎页面，卡片间距改为 24px"

SuperDesign: 生成 welcome-page_v2.html
```

**场景 2: 功能需要修改**

```
用户: "欢迎页面需要添加'跳过'按钮"

Copilot:
1. 更新设计文档，添加跳过按钮规范
2. 更新消息协议
3. 提供给 SuperDesign

用户 → SuperDesign: "根据更新的设计文档重新生成"

SuperDesign: 生成 welcome-page_v3.html
```

**场景 3: 发现 Bug**

```
用户: "暗黑主题下按钮文字看不清"

Copilot:
1. 分析问题（CSS 变量使用错误）
2. 更新设计文档的颜色方案
3. 记录修复说明

用户 → SuperDesign: "修复暗黑主题按钮问题"

SuperDesign: 生成 welcome-page_v4.html
```

---

### Phase 5: 最终集成 (User → Copilot → Code)

**测试通过后，由 Copilot 负责代码集成**:

#### 用户职责

用户在 HTML 原型测试通过后，**反馈给 Copilot** 进行集成：

```
用户: "welcome-page_v4.html 测试通过，请集成到扩展中"

Copilot:
收到！我将：
1. 创建 WelcomeWebviewProvider 类
2. 注册命令和视图
3. 更新配置文件
4. 更新开发文档和用户文档
```

#### Copilot 集成步骤

**Step 1: 创建 Provider 类**

```typescript
// src/providers/WelcomeWebviewProvider.ts
export class WelcomeWebviewProvider extends BaseWebviewProvider {
  protected getHtmlContent(webview: vscode.Webview): string {
    // 从 design_iterations/welcome-page_v4.html 移植内容
    // 替换占位符 ${nonce}, ${cspSource}
    // 处理资源路径
    return `<!DOCTYPE html>...`;
  }

  protected handleMessage(message: WebviewMessage): void {
    // 实现消息处理逻辑（参考设计文档的消息协议）
    switch (message.type) {
      case 'addSource':
        vscode.commands.executeCommand('turbo-ai-rules.addSource');
        break;
      case 'syncRules':
        vscode.commands.executeCommand('turbo-ai-rules.syncRules');
        break;
      // ... 其他消息处理
    }
  }
}
```

**Step 2: 注册到扩展**

```typescript
// src/extension.ts
import { WelcomeWebviewProvider } from './providers/WelcomeWebviewProvider';

export function activate(context: vscode.ExtensionContext) {
  // 创建 Provider 实例
  const welcomeProvider = new WelcomeWebviewProvider(context);

  // 注册命令
  context.subscriptions.push(
    vscode.commands.registerCommand('turbo-ai-rules.showWelcome', () => {
      welcomeProvider.show();
    }),
  );

  // 首次使用时自动显示
  const hasShownWelcome = context.globalState.get('hasShownWelcome');
  if (!hasShownWelcome) {
    welcomeProvider.show();
    context.globalState.update('hasShownWelcome', true);
  }
}
```

**Step 3: 配置命令和视图**

```json
// package.json
{
  "contributes": {
    "commands": [
      {
        "command": "turbo-ai-rules.showWelcome",
        "title": "%command.showWelcome%",
        "category": "Turbo AI Rules",
        "icon": "$(home)"
      }
    ],
    "menus": {
      "commandPalette": [
        {
          "command": "turbo-ai-rules.showWelcome"
        }
      ]
    }
  }
}
```

**Step 4: 更新文档**

- **开发文档**: 更新实施文档，记录集成细节
- **用户文档**: 更新命令文档，说明如何使用欢迎页面
- **CHANGELOG**: 添加新功能记录

**Step 5: 测试验证**

```bash
# 编译扩展
npm run compile

# 启动调试（F5）
# 验证功能：
# - 命令面板执行 "Turbo AI Rules: Show Welcome"
# - 首次安装自动显示
# - 消息通信正常
# - 主题切换正常
```

#### 用户验证

集成完成后，用户进行最终验证：

```
用户测试清单：
- [ ] 命令执行正常
- [ ] 页面显示符合预期
- [ ] 交互功能正常
- [ ] 不同主题下正常
- [ ] 性能表现良好

测试通过 → 合并代码
发现问题 → 反馈给 Copilot → 修复 → 重新测试
```

---

## 📁 目录结构

```
turbo-ai-rules/
├── .superdesign/
│   ├── rules.md                    # SuperDesign 设计规范
│   ├── design_docs/                # 设计文档（Copilot 编写）
│   │   ├── README.md               # 设计系统总览
│   │   ├── 01-welcome-page.md
│   │   ├── 02-statistics-dashboard.md
│   │   ├── 03-rule-details-panel.md
│   │   └── ...
│   └── design_iterations/          # HTML 原型（SuperDesign 生成）
│       ├── welcome-page_v1.html
│       ├── welcome-page_v2.html
│       ├── statistics_v1.html
│       └── ...
│
├── src/providers/                  # 最终集成代码
│   ├── BaseWebviewProvider.ts
│   ├── WelcomeWebviewProvider.ts
│   └── ...
│
└── docs/development/
    ├── 07-ui-development-process.md  # 本文档
    ├── 07-ui-design.md              # UI 设计总览
    └── ...
```

---

## 🎯 最佳实践

### For Copilot (你)

1. **详细的设计文档**

   - 清晰的布局描述（ASCII 线框图）
   - 完整的数据结构定义
   - 明确的交互流程
   - 具体的性能指标

2. **遵循设计系统**

   - 使用 VS Code CSS 变量
   - 参考现有页面布局
   - 保持视觉一致性

3. **考虑实现可行性**

   - 消息协议设计合理
   - 数据结构清晰
   - 性能要求明确

4. **迭代优化**
   - 根据用户反馈快速更新文档
   - 记录设计决策和变更
   - 维护文档版本

### For SuperDesign

1. **严格遵循设计文档**

   - 按照文档的布局规范
   - 使用指定的颜色和图标
   - 实现描述的交互效果

2. **遵循设计规范**

   - 使用 CSS 变量，禁止硬编码颜色
   - 响应式设计
   - 无障碍支持

3. **版本管理**
   - 每次迭代生成新版本
   - 文件命名规范：`{page-name}_v{version}.html`
   - 保留历史版本供回溯

### For User (开发者)

1. **充分测试**

   - 不同主题测试（明亮、暗黑、高对比度）
   - 不同尺寸测试（300px - 1920px+）
   - 边界情况测试（空数据、大量数据）
   - 交互测试（键盘、鼠标、触摸）

2. **清晰反馈**

   - 描述具体问题（附上截图或录屏）
   - 提供复现步骤
   - 说明期望行为
   - 反馈给 Copilot 而非直接修改代码

3. **最终验收**
   - 在扩展中验证集成后的功能
   - 确认符合业务需求
   - 批准发布或要求调整

---

## 🔧 工具支持

### Copilot 工具

- **文档生成**: Markdown 格式的设计文档
- **代码生成**: Provider 类、消息处理
- **架构设计**: 数据结构、接口定义

### SuperDesign 工具

- **read**: 读取设计文档
- **write**: 生成 HTML 文件
- **edit**: 修改现有 HTML
- **布局工具**: ASCII 艺术、线框图

### 开发工具

- **预览服务器**: `npx http-server`
- **调试**: VS Code Extension Development Host
- **构建**: `npm run compile`

---

## 📊 流程指标

### 效率提升

| 阶段     | 传统方式  | AI 协作方式 | 提升 |
| -------- | --------- | ----------- | ---- |
| 设计文档 | 2-4 小时  | 30 分钟     | 75%  |
| UI 原型  | 4-8 小时  | 1 小时      | 87%  |
| 迭代调整 | 1-2 小时  | 15 分钟     | 87%  |
| 总计     | 7-14 小时 | 2 小时      | 85%  |

### 质量保证

- ✅ 设计一致性：统一的设计系统
- ✅ 代码质量：遵循最佳实践
- ✅ 可维护性：清晰的文档和版本
- ✅ 无障碍：自动符合标准

---

## 🚀 快速开始示例

### 示例：添加新的配置管理页面

#### Step 1: Copilot 编写设计文档

```markdown
用户: "我需要一个配置管理页面，用于可视化管理规则源"

Copilot:
我来为你创建设计文档...

[创建 .superdesign/design_docs/07-config-manager.md]
```

#### Step 2: SuperDesign 生成 HTML

```markdown
用户: "SuperDesign，根据 07-config-manager.md 设计配置管理页面"

SuperDesign:
Step 1: 布局设计
[展示 ASCII 线框图]
是否确认？

用户: "确认"

SuperDesign:
Step 2: 主题设计
[展示 CSS 变量定义]
是否确认？

用户: "确认"

SuperDesign:
Step 3: 动画设计
[展示动画效果]
是否确认？

用户: "确认"

SuperDesign:
[生成 config-manager_v1.html]
完成！
```

#### Step 3: 测试和反馈

```bash
# 预览
npx http-server .superdesign/design_iterations -p 8080

# 测试发现问题
用户: "源列表需要支持拖放排序"

# 反馈给 Copilot
用户 → Copilot: "更新设计文档，添加拖放排序功能"

Copilot: [更新 07-config-manager.md]

# SuperDesign 重新生成
用户 → SuperDesign: "根据更新的文档重新生成"
SuperDesign: [生成 config-manager_v2.html]
```

#### Step 4: 集成到扩展

用户测试通过后，**反馈给 Copilot 进行集成**：

```markdown
用户: "config-manager_v2.html 测试通过，请集成到扩展"

Copilot:
收到！我将执行以下操作：

1. 创建 ConfigManagerWebviewProvider 类
2. 从 config-manager_v2.html 移植 HTML 和样式
3. 实现消息处理逻辑（拖放排序、编辑、删除等）
4. 注册命令和菜单项
5. 更新 package.json 配置
6. 更新开发文档和用户文档
7. 添加单元测试

[开始创建文件...]
```

**Copilot 生成的代码**:

```typescript
// src/providers/ConfigManagerWebviewProvider.ts
export class ConfigManagerWebviewProvider extends BaseWebviewProvider {
  protected getHtmlContent(webview: vscode.Webview): string {
    // 从 config-manager_v2.html 移植的完整内容
    return `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta http-equiv="Content-Security-Policy" content="...">
          <style>
            /* 从 HTML 原型中移植的样式 */
            .config-manager { ... }
          </style>
        </head>
        <body>
          <!-- 从 HTML 原型中移植的结构 -->
        </body>
      </html>`;
  }

  protected handleMessage(message: WebviewMessage): void {
    switch (message.type) {
      case 'reorderSources':
        // 实现拖放排序
        this.handleReorder(message.data);
        break;
      case 'editSource':
        // 实现编辑功能
        this.handleEdit(message.data);
        break;
      // ... 其他消息处理
    }
  }

  private async handleReorder(data: ReorderData): Promise<void> {
    // 具体实现
  }
}
```

**用户最终验收**:

```markdown
用户测试清单：

- [ ] 在扩展中打开配置管理页面
- [ ] 验证拖放排序功能
- [ ] 验证编辑和删除功能
- [ ] 测试不同主题
- [ ] 检查性能

测试结果：
✅ 所有功能正常 → 合并到主分支
❌ 发现问题 → 反馈给 Copilot → Copilot 修复 → 重新测试
```

---

## 🤝 协作沟通模板

### 用户 → Copilot

```
我需要一个 [页面名称]，用于 [功能描述]

核心功能：
1. ...
2. ...

数据来源：
- ...

期望交互：
- ...
```

### Copilot → User

```
我已创建设计文档：.superdesign/design_docs/XX-page-name.md

核心设计：
- 布局：[简要描述]
- 数据：[数据结构]
- 交互：[主要流程]

请让 SuperDesign 根据此文档生成 HTML 原型。
```

### User → SuperDesign

```
根据 .superdesign/design_docs/XX-page-name.md 设计 [页面名称]
```

### User → Copilot (反馈)

```
HTML 原型测试发现问题：
[问题描述 + 截图]

期望：
[期望行为]
```

---

_维护者: ygqygq2_  
_贡献者: GitHub Copilot, SuperDesign AI_
