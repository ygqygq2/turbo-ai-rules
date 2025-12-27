# 顶层架构设计

> 本文档描述 Turbo AI Rules 的整体架构、设计原则、模块分工和数据流向。

---

## 1. 设计原则

### 1.1 核心理念

#### 桥接模式 (Bridge Pattern)

本扩展作为**外部规则仓库**和**AI 工具配置文件**之间的桥梁：

```
Git 规则仓库 ──→ [Turbo AI Rules] ──→ AI 工具配置文件
(统一 MDC 格式)     (解析/转换/合并)      (各工具特定格式)
```

**职责分离**:

- **规则仓库**: 负责规则定义和版本管理
- **扩展**: 负责同步、解析、转换、合并
- **AI 工具**: 负责读取配置并应用规则

#### 分离关注点 (Separation of Concerns)

**三层分离**:

- **规则定义层**: MDC 格式 (Markdown + YAML Frontmatter)，存储在 Git 仓库
- **规则管理层**: 扩展负责同步、索引、搜索、冲突解决
- **规则适配层**: 适配器模式，每个 AI 工具有独立适配器

#### 适配器模式 (Adapter Pattern)

每个 AI 工具对应一个适配器，负责：

- 读取合并后的规则集合
- 转换为目标工具的格式
- 生成配置文件
- 验证配置有效性

### 1.2 设计原则

#### 约定优于配置 (Convention over Configuration)

- 全局缓存路径: `~/.cache/.turbo-ai-rules/`
- 所有数据存储在全局缓存（不在项目目录创建文件）
- 生成的 AI 配置文件可提交到 git
- 默认启用 GitHub Copilot 适配器
- 提供合理的默认值，支持高级用户深度定制

#### 渐进式增强 (Progressive Enhancement)

- **基础**: 添加源、同步规则、生成配置
- **中级**: 规则选择、冲突解决、搜索
- **高级**: 自定义适配器、规则验证、统计分析
- 新手使用默认配置即可快速上手，专家可完全掌控所有细节

#### 数据本地优先 (Local-First)

- 所有数据本地存储，不依赖外部服务，离线可用
- 不上传用户规则，不收集使用数据
- Git 凭据本地加密存储

#### 单一数据源 (Single Source of Truth)

- Git 仓库是规则的唯一数据源
- 本地缓存和生成的配置都来源于规则源
- 不在本地编辑规则，保持与源同步

#### 最小惊讶原则 (Principle of Least Astonishment)

- 操作结果符合用户预期
- 错误提示清晰友好
- 遵循 VSCode 设计规范，保持与原生组件一致的行为

---

## 2. 架构分层

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      VSCode Extension                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  UI Layer (Views)                       │ │
│  │  • RulesTreeProvider (侧边栏规则树)                    │ │
│  │  • StatusBarProvider (状态栏显示)                      │ │
│  │  • WelcomeWebviewProvider (欢迎页/引导)                │ │
│  │  • RuleSelectorWebviewProvider (规则选择器)             │ │
│  │  • StatisticsWebviewProvider (统计面板)                │ │
│  │  • SearchWebviewProvider (搜索界面)                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                              ↓                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Service Layer (核心服务)                   │ │
│  │  • GitManager (Git 操作)                               │ │
│  │  • RulesManager (规则管理)                             │ │
│  │  • FileGenerator (文件生成)                            │ │
│  │  • ConfigManager (配置管理)                            │ │
│  │  • AutoSyncService (同步调度)                          │ │
│  │  • WorkspaceStateManager (工作区状态)                  │ │
│  │  • SelectionStateManager (选择状态)                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                              ↓                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │             Parser & Validator Layer                    │ │
│  │  • MdcParser (MDC 格式解析)                            │ │
│  │  • RulesValidator (规则验证)                           │ │
│  └────────────────────────────────────────────────────────┘ │
│                              ↓                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Adapter Layer (适配器)                     │ │
│  │  • CursorAdapter (Cursor 配置生成)                     │ │
│  │  • CopilotAdapter (GitHub Copilot 配置生成)            │ │
│  │  • ContinueAdapter (Continue.dev 配置生成)             │ │
│  │  • CustomAdapter (自定义适配器)                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                              ↓                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Storage Layer (存储)                       │ │
│  │  • 全局缓存: ~/.cache/.turbo-ai-rules/                 │ │
│  │  • AI 配置: .cursorrules, .github/copilot-*.md 等     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 模块职责

### 3.1 UI Layer (用户界面层)

负责所有用户交互和视图渲染：

- **RulesTreeProvider**: 侧边栏显示规则源和规则树
- **StatusBarProvider**: 状态栏显示同步状态和快捷操作
- **WelcomeWebviewProvider**: 首次使用引导页面
- **RuleSelectorWebviewProvider**: 规则选择器（选择要同步的规则）
- **StatisticsWebviewProvider**: 统计面板（规则数量、来源分布等）
- **SearchWebviewProvider**: 高级搜索界面

### 3.2 Service Layer (核心服务层)

负责核心业务逻辑：

- **GitManager**: Git 仓库克隆、拉取、分支管理
- **RulesManager**: 规则索引、查询、搜索、冲突检测
- **FileGenerator**: 配置文件生成和写入
- **ConfigManager**: 扩展配置读写和验证
- **AutoSyncService**: 定时同步调度和自动同步
- **WorkspaceStateManager**: 工作区状态管理
- **SelectionStateManager**: 规则选择状态管理
- **Commands**: 命令层直接调用各服务编排端到端流程（如同步→解析→合并→生成）

### 3.3 Parser & Validator Layer (解析验证层)

负责规则文件解析和验证：

- **MdcParser**: 解析 MDC 格式文件（Markdown + YAML Frontmatter）
- **RulesValidator**: 验证规则元数据和内容的有效性

### 3.4 Adapter Layer (适配器层)

负责生成各 AI 工具的配置：

- **CursorAdapter**: 生成 `.cursorrules` 文件
- **CopilotAdapter**: 生成 `.github/copilot-instructions.md` 文件
- **ContinueAdapter**: 生成 `.continuerules` 文件
- **CustomAdapter**: 支持用户自定义适配器

### 3.5 Storage Layer (存储层)

负责数据持久化和状态管理：

**全局缓存** (`~/.cache/.turbo-ai-rules/`):

- `sources/`: Git 仓库完整数据（多工作区共享）
- `workspaces/<hash>/`: 工作区索引数据（按路径哈希隔离）
  - `rules.index.json`: 规则索引
  - `search.index.json`: 搜索索引
  - `generation.manifest.json`: 生成清单

**workspaceState** (VSCode 提供):

- 同步元数据（lastSyncTime、sourceHashes）
- UI 状态（expandedNodes、selectedSource）
- 缓存元数据（lruQueue、lastCleanup）
- 轻量级（< 10KB），自动按工作区隔离

**项目根目录**:

- AI 工具配置文件（`.cursorrules` 等）
- 可提交到版本控制

---

## 4. 数据流向

### 4.1 规则同步流程

```
1. 用户触发同步命令
   ↓
2. syncRules 命令编排流程
   ↓
3. GitManager 拉取 Git 更新
   ↓
4. MdcParser 解析规则文件
   ↓
5. RulesValidator 验证规则
   ↓
6. RulesManager 建立索引
   ↓
7. 检测冲突并解决
   ↓
8. 更新 UI 显示
```

### 4.2 配置生成流程

```
1. 用户触发生成命令
   ↓
2. generateRules 命令编排流程
   ↓
3. RulesManager 读取合并规则
   ↓
4. 选择启用的适配器
   ↓
5. 各适配器生成配置内容
   ↓
6. FileGenerator 写入文件
   ↓
7. 更新 .gitignore
   ↓
8. 通知用户完成
```

### 4.3 规则源添加流程

```
1. 用户输入 Git URL
   ↓
2. ConfigManager 保存配置
   ↓
3. GitManager 克隆仓库到全局缓存
   ↓
4. MdcParser 解析规则文件
   ↓
5. RulesManager 建立索引
   ↓
6. RulesTreeProvider 刷新视图
   ↓
7. 提示用户同步规则
```

---

## 5. UI 交互设计

### 5.1 欢迎页交互流程

```
┌──────────────────────────────────────────────────────┐
│                 Welcome to Turbo AI Rules             │
├──────────────────────────────────────────────────────┤
│                                                       │
│  Step 1: Add a Rule Source                          │
│  ┌───────────────────────────────────────┐          │
│  │ [Add Source]  [Select Rules]          │          │
│  └───────────────────────────────────────┘          │
│                                                       │
│  Step 2: Sync Rules                                 │
│  ┌───────────────────────────────────────┐          │
│  │ [Sync Now]                            │          │
│  └───────────────────────────────────────┘          │
│                                                       │
│  Step 3: Generate Configs                           │
│  ┌───────────────────────────────────────┐          │
│  │ [Generate Configs]                    │          │
│  └───────────────────────────────────────┘          │
│                                                       │
│  Quick Start Templates                              │
│  • TypeScript Best Practices                        │
│  • React Development Rules                          │
│  • Python Style Guide                               │
│                                                       │
└──────────────────────────────────────────────────────┘
```

**设计说明**:

- "Add Source" 和 "Select Rules" 并列，强调规则选择的重要性
- "Select Rules" 在有规则源后才可用，避免误导
- 三步流程清晰，降低学习成本

### 5.2 规则选择器交互

用户点击 "Select Rules" 后弹出规则选择器，显示：

- 规则源的目录/文件树
- 复选框选择机制
- 搜索和过滤功能
- 统计信息（总数/已选/排除）
- 保存和取消按钮

详见: [.superdesign/design_docs/05-rule-sync-page.md](../../.superdesign/design_docs/05-rule-sync-page.md)

---

## 6. 扩展点设计

### 6.1 自定义适配器

用户可通过配置添加自定义适配器：

```json
{
  "turboAiRules.adapters.custom": [
    {
      "name": "My Custom Tool",
      "targetFile": ".my-tool-rules",
      "template": "path/to/template.hbs"
    }
  ]
}
```

### 6.2 自定义规则格式

支持自定义规则解析器：

- 继承 `MdcParser` 基类
- 实现 `parse()` 方法
- 在配置中注册

### 6.3 自定义同步策略

支持自定义同步逻辑：

- 实现 `SyncStrategy` 接口
- 注册到 `AutoSyncService`
- 在配置中启用

---

## 7. 安全考虑

### 7.1 输入验证

- Git URL 正则验证
- 路径规范化和边界检查
- 配置值范围验证

### 7.2 权限控制

- 文件系统操作限制在工作区和缓存目录
- Git 凭据加密存储（VSCode Secret Storage）
- 不执行用户提供的任意代码

### 7.3 日志安全

- 不在日志中输出 Token、密码等敏感信息
- 日志文件权限控制
- 支持日志脱敏

---

> **返回**: [01-design.md](./01-design.md) - 产品整体设计
