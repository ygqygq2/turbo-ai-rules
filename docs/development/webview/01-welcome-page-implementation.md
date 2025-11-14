# 欢迎页实施记录

> **对应设计**: `.superdesign/design_docs/01-welcome-page.md`  
> **实现文件**: `src/providers/WelcomeWebviewProvider.ts`, `src/webview/welcome/App.tsx`  
> **HTML 原型**: `.superdesign/design_iterations/01-welcome-page_1.html`  
> **实施日期**: 2025-10-27（初版），2025-11-10（更新）  
> **状态**: ✅ 已完成并更新

---

## 实施概述

欢迎页面使用 **React + TypeScript** 实现，展示三步式规则同步流程和快速开始模板。

### 技术栈

- **前端**: React 18 + TypeScript
- **样式**: CSS（VSCode 主题变量）
- **构建**: Vite（编译到 `out/webview`）
- **通信**: VSCode Webview API

---

## 文件结构

```
src/
├── providers/
│   └── WelcomeWebviewProvider.ts    # Provider 类（加载 HTML 和处理消息）
└── webview/
    └── welcome/
        ├── App.tsx                   # React 主组件
        ├── index.tsx                 # React 渲染入口
        ├── index.html                # HTML 容器
        └── welcome.css               # 样式文件
```

---

## 核心功能

1. **三步引导流程**:

   - Step 1: Add a Rule Source（添加规则源 + 模板）
   - Step 2: Select Rules（选择规则，无源时禁用）
   - Step 3: Sync & Generate（同步并生成配置）

2. **模板库**:

   - ygqygq2's AI Rules（一键添加常用规则模板）

3. **文档入口**:

   - Documentation 和 Get Help 链接

4. **智能显示**:
   - 首次安装自动显示
   - 勾选"Don't show again"后不再自动显示

---

## 架构决策

### 1. 单例面板模式

**决策**: 使用单例 WebviewPanel，避免重复创建

**原因**:

- 欢迎页无需多实例
- 节省系统资源
- 保持状态连续性

**实现要点**:

- 检查 `this.panel` 是否存在
- 存在则 `reveal()` 并刷新内容
- 不存在则创建新面板

### 2. 状态管理

**决策**: 使用 `globalState` 存储欢迎页显示状态

**原因**:

- 跨会话持久化（关闭 VSCode 后仍记住）
- 避免每次启动都显示
- 用户可手动重新打开

**状态字段**:

- `turboAiRules.welcomeShown`: 是否已显示过
- 首次显示后设为 `true`
- 用户可通过命令重新打开

### 3. 内容保持策略

**决策**: 设置 `retainContextWhenHidden: true`

**原因**:

- 用户切换标签页后不需要重新加载
- 保持表单输入状态
- 提升用户体验

---

## 消息协议设计（2025-11-10 更新）

### Webview → Extension

| 消息类型              | 用途                 | Payload                | 触发时机                   |
| --------------------- | -------------------- | ---------------------- | -------------------------- |
| `ready`               | 前端加载完成         | 无                     | 组件 mount 时（useEffect） |
| `addSource`           | 添加规则源           | 无                     | 点击"Add Source"按钮       |
| `openTemplates`       | 打开模板选择         | 无                     | 点击"Templates"按钮        |
| `selectRules`         | 选择规则             | 无                     | 点击"Select Rules"按钮     |
| `syncAndGenerate`     | 同步并生成配置       | 无                     | 点击"Sync Now"按钮         |
| `openAdvancedOptions` | 打开高级设置         | 无                     | 点击"Advanced"按钮         |
| `useTemplate`         | 使用模板             | `{ template: string }` | 点击模板卡片               |
| `viewDocs`            | 查看文档             | 无                     | 点击"Documentation"按钮    |
| `getHelp`             | 获取帮助             | 无                     | 点击"Get Help"按钮         |
| `updateDontShowAgain` | 更新"Don't show"设置 | `{ checked: boolean }` | 点击/取消复选框（实时）    |
| `dismiss`             | 关闭页面（已废弃）   | `{ checked: boolean }` | -                          |

### Extension → Webview

| 消息类型              | 用途                       | 数据内容                             |
| --------------------- | -------------------------- | ------------------------------------ |
| `initialState`        | 初始化复选框状态           | `{ dontShowAgain: boolean }`         |
| `rulesSelectionState` | 更新"Select Rules"按钮状态 | `{ enabled: boolean }`               |
| `syncStage`           | 同步进度（预留）           | `{ stage: string, percent: number }` |

**设计亮点**:

- 消息类型语义化，直接对应用户操作
- 统一使用 `vscodeApi.postMessage(type, payload)` 格式
- Extension 侧根据消息类型调用相应命令
- 支持双向通信（Extension 可主动更新 UI 状态）
- **VSCode 最佳实践**: 前端发送 `ready` 消息，后端响应 `initialState`，避免时序问题

---

## 关键实现点

### 1. 智能显示逻辑

**场景判断**:

- 首次安装 → 自动显示
- 已有规则源 → 不自动显示（避免打扰）
- 用户主动调用命令 → 始终显示

**好处**:

- 新用户有引导
- 老用户不被打扰
- 灵活性高

### 2. 复选框状态管理（2025-11-10 新增）

**"Don't show this again" 复选框行为**:

1. **初始状态同步（VSCode 最佳实践）**：

   - 前端组件加载完成后发送 `ready` 消息
   - Extension 收到 `ready` 后发送 `initialState` 消息（包含 `dontShowAgain` 状态）
   - React 组件接收后更新复选框的 `checked` 属性
   - **关键**: 避免时序问题（等待前端准备好才发送状态）

2. **实时状态更新**：

   - 用户点击复选框立即发送 `updateDontShowAgain` 消息
   - Extension 立即保存到 `globalState.welcomeShown`
   - 不关闭页面，只更新状态

3. **允许双向切换**：
   - 用户可随时勾选/取消勾选来控制下次启动是否自动显示

**实现位置**:

- 前端: `App.tsx` 的 `useEffect` 发送 `ready`，`handleDismissChange` 处理点击
- 后端: `WelcomeWebviewProvider.ts` 的 `handleMessage` 处理 `ready`，`sendInitialState` 发送状态，`handleUpdateDontShowAgain` 保存状态

**好处**:

- 状态实时同步，无需关闭页面
- 遵循 VSCode Webview 最佳实践
- Logger 记录帮助调试

### 3. 步骤状态追踪

**实现方式**:

- Extension 侧检查实际状态（是否有源、是否同步过、是否生成过配置）
- 通过 `updateState` 消息同步到 Webview
- Webview 根据状态显示完成标记

**好处**:

- 状态真实可靠
- 用户知道进度
- 鼓励完成流程

### 4. 模板库设计

**模板内容**:

- TypeScript 最佳实践
- React 开发规则
- Python 风格指南

**实现方式**:

- 模板预定义在配置中
- 点击后直接调用添加源命令
- 预填充 Git URL 和分支

**好处**:

- 降低学习成本
- 快速体验功能
- 推广优质规则源

---

## 遇到的问题与解决

### 问题 1: 页面闪烁

**现象**: 首次打开时短暂显示空白再加载内容

**原因**: HTML 内容异步获取，面板先创建后赋值

**解决方案**:

- `getHtmlContent()` 改为同步方法
- 面板创建时立即设置 HTML
- 添加 loading 状态（未采用，因为加载很快）

**效果**: 页面流畅打开，无闪烁

### 问题 2: 重复显示判断

**现象**: 用户通过命令打开时，判断逻辑可能阻止显示

**原因**: 自动显示逻辑太严格

**解决方案**:

- 区分自动显示和手动显示
- `activate()` 时检查是否自动显示
- 命令调用时直接显示，不做判断

**效果**: 符合用户预期

### 问题 3: 复选框状态不同步（2025-11-10 修复）

**现象**: 通过命令打开 Welcome 页时，复选框显示为未勾选（实际已勾选）

**原因**: 时序问题 - `showWelcome()` 创建 webview 后立即发送 `initialState` 消息，前端可能还没加载完成，导致消息丢失

**解决方案（VSCode 最佳实践）**:

- 前端加载完成后发送 `ready` 消息
- 后端收到 `ready` 后才发送 `initialState`
- 确保消息在前端准备好后才发送

**实现位置**:

- 前端: `App.tsx` useEffect 中调用 `vscodeApi.postMessage('ready')`
- 后端: `WelcomeWebviewProvider.ts` handleMessage 中处理 `ready` case，调用 `sendInitialState()`

**效果**: 复选框状态始终正确反映 `globalState.welcomeShown` 的值

### 问题 4: 步骤状态不同步

**现象**: 用户完成操作后，步骤状态未更新

**原因**: 缺少状态同步机制

**解决方案**:

- 关键操作完成后发送 `updateState` 消息
- Webview 监听消息并更新 UI
- 使用 CSS 类名控制显示

**效果**: 状态实时反馈

---

## 与设计文档的对应

| 设计文档章节 | 实施对应    | 备注                  |
| ------------ | ----------- | --------------------- |
| 页面布局     | ✅ 完全实现 | 3 步骤卡片 + 模板网格 |
| 交互设计     | ✅ 完全实现 | 按钮响应、步骤跳转    |
| 数据结构     | ✅ 完全实现 | 消息协议如设计        |
| 视觉设计     | ✅ 完全实现 | 使用 VSCode CSS 变量  |

**差异点**: 无重大差异，设计得到完整实现

---

## 测试要点

### 功能测试

- ✅ 首次启动自动显示
- ✅ 已有源不自动显示
- ✅ 命令调用正常显示
- ✅ 按钮功能正常
- ✅ 模板点击有效
- ✅ 步骤状态更新

### 主题测试

- ✅ 明亮主题正常
- ✅ 暗黑主题正常
- ✅ 高对比度可读

### 边界测试

- ✅ 无网络环境显示正常
- ✅ 无模板配置降级处理
- ✅ 关闭后重新打开状态保持

---

## 性能考虑

**加载速度**:

- HTML 内联，无网络请求
- CSS 变量，无主题切换重绘
- 图标使用 Codicons，已预加载

**资源占用**:

- 单例模式，只有一个实例
- `retainContextWhenHidden`，避免重复创建
- 轻量级 DOM 结构

**响应性能**:

- 消息处理异步，不阻塞 UI
- 错误捕获，避免崩溃
- 操作防抖（按钮点击）

---

## 经验总结

### 做得好的地方

1. **单例模式**: 简化管理，提升性能
2. **状态驱动**: UI 根据状态渲染，逻辑清晰
3. **智能显示**: 平衡引导和打扰
4. **消息协议**: 清晰定义，易于维护

### 可改进的地方

1. **国际化**: 目前只有中文，需要支持多语言
2. **模板配置**: 硬编码在代码中，应该可配置
3. **动画效果**: 步骤完成可以加入动画反馈
4. **统计埋点**: 记录用户使用情况，优化体验

---

## 后续优化方向

1. **多语言支持**: 使用 i18n 机制
2. **自定义模板**: 允许用户添加自己的模板
3. **视频教程**: 嵌入短视频演示
4. **完成奖励**: 完成所有步骤后给予视觉反馈

---

**相关文档**:

- 设计文档: `.superdesign/design_docs/01-welcome-page.md`
- 用户指南: `docs/user-guide/01-commands.md`
- 开发指南: `docs/development/32-ui-development-process.md`
