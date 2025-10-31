# 顶层架构设计

> 本文档描述 Turbo AI Rules 的整体架构、模块分工和数据流向。

---

## 1. 架构分层

### 1.1 整体架构图

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
│  │  • SyncScheduler (同步调度)                            │ │
│  │  • RulesOrchestrator (流程编排)                        │ │
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
│  │  • 全局缓存: ~/.turbo-ai-rules/sources/                │ │
│  │  • 项目本地: <workspace>/.ai-rules/                    │ │
│  │  • AI 配置: .cursorrules, .github/copilot-*.md 等     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 模块职责

### 2.1 UI Layer (用户界面层)

负责所有用户交互和视图渲染：

- **RulesTreeProvider**: 侧边栏显示规则源和规则树
- **StatusBarProvider**: 状态栏显示同步状态和快捷操作
- **WelcomeWebviewProvider**: 首次使用引导页面
- **RuleSelectorWebviewProvider**: 规则选择器（选择要同步的规则）
- **StatisticsWebviewProvider**: 统计面板（规则数量、来源分布等）
- **SearchWebviewProvider**: 高级搜索界面

### 2.2 Service Layer (核心服务层)

负责核心业务逻辑：

- **GitManager**: Git 仓库克隆、拉取、分支管理
- **RulesManager**: 规则索引、查询、搜索、冲突检测
- **FileGenerator**: 配置文件生成和写入
- **ConfigManager**: 扩展配置读写和验证
- **SyncScheduler**: 定时同步调度和自动同步
- **RulesOrchestrator**: 编排多个服务完成端到端流程

### 2.3 Parser & Validator Layer (解析验证层)

负责规则文件解析和验证：

- **MdcParser**: 解析 MDC 格式文件（Markdown + YAML Frontmatter）
- **RulesValidator**: 验证规则元数据和内容的有效性

### 2.4 Adapter Layer (适配器层)

负责生成各 AI 工具的配置：

- **CursorAdapter**: 生成 `.cursorrules` 文件
- **CopilotAdapter**: 生成 `.github/copilot-instructions.md` 文件
- **ContinueAdapter**: 生成 `.continuerules` 文件
- **CustomAdapter**: 支持用户自定义适配器

### 2.5 Storage Layer (存储层)

负责文件系统操作和数据持久化：

- **全局缓存**: 所有项目共享的 Git 仓库缓存
- **项目本地**: 项目特定的规则元数据和缓存
- **AI 配置**: 各 AI 工具的配置文件

---

## 3. 数据流向

### 3.1 规则同步流程

```
1. 用户触发同步
   ↓
2. SyncScheduler 调度任务
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

### 3.2 配置生成流程

```
1. 用户触发生成
   ↓
2. RulesManager 读取合并规则
   ↓
3. 选择启用的适配器
   ↓
4. 各适配器生成配置内容
   ↓
5. FileGenerator 写入文件
   ↓
6. 更新 .gitignore
   ↓
7. 通知用户完成
```

### 3.3 规则源添加流程

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

## 4. UI 交互设计

### 4.1 欢迎页交互流程

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

### 4.2 规则选择器交互

用户点击 "Select Rules" 后弹出规则选择器，显示：

- 规则源的目录/文件树
- 复选框选择机制
- 搜索和过滤功能
- 统计信息（总数/已选/排除）
- 保存和取消按钮

详见: [.superdesign/design_docs/05-rule-selector.md](../../.superdesign/design_docs/05-rule-selector.md)

---

## 5. 扩展点设计

### 5.1 自定义适配器

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

### 5.2 自定义规则格式

支持自定义规则解析器：

- 继承 `MdcParser` 基类
- 实现 `parse()` 方法
- 在配置中注册

### 5.3 自定义同步策略

支持自定义同步逻辑：

- 实现 `SyncStrategy` 接口
- 注册到 `SyncScheduler`
- 在配置中启用

---

## 6. 安全考虑

### 6.1 输入验证

- Git URL 正则验证
- 路径规范化和边界检查
- 配置值范围验证

### 6.2 权限控制

- 文件系统操作限制在工作区和缓存目录
- Git 凭据加密存储（VSCode Secret Storage）
- 不执行用户提供的任意代码

### 6.3 日志安全

- 不在日志中输出 Token、密码等敏感信息
- 日志文件权限控制
- 支持日志脱敏

---

> **返回**: [01-design.md](./01-design.md) - 产品整体设计
