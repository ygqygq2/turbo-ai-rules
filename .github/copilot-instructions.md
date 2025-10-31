# GitHub Copilot 使用指令（Turbo AI Rules 专用）

> 项目：Turbo AI Rules - 从外部 Git 仓库管理 AI 编码规则并为多工具生成配置的 VSCode 扩展
> 生成日期：2025-10-23
> 目的：让 Copilot 产出符合本扩展的架构、工程、日志与安全规范的代码；本文件不包含其他扩展的具体实现说明

---

## 文件位置与作用域

- 路径：.github/copilot-instructions.md（Copilot 默认读取）
- 作用：仅约束 Turbo AI Rules 的开发；其他扩展的实现细节不在本文档内
- 风格来源：提炼自团队统一的 VSCode 扩展工程风格（作为规范参考而非实现清单）

---

## 技术基线

- 语言：TypeScript 5.9+
- 运行时：Node.js 24.9+
- VSCode API：1.105+
- 构建：esbuild
- 包管理：pnpm（必须）
- 测试：Vitest（单元）+ Mocha（集成）
- 规范：ESLint 9 + Prettier
- Git：simple-git；文件系统：fs-extra

---

## 强制日志与错误码规范（必须）

- 统一日志库：@ygqygq2/vscode-log（必须使用）
  - 在 extension.ts 初始化单例：new Logger('TurboAiRules')
  - 等级：debug/info/warn/error，按场景选择最小可用等级
  - 结构化：logger.info('Sync start', { sourceId, count })
  - 避免敏感信息：禁止输出令牌、密码、邮箱等个人隐私
- 错误码设计（挂载在错误对象的 code 字段，或记录到日志上下文）
  - 命名空间前缀：TAI
  - 分类与示例：
    - TAI-100x 配置类（缺失/格式错误/范围越界）
    - TAI-200x Git 类（克隆/拉取/鉴权/分支异常）
    - TAI-300x 解析类（frontmatter/MDC/语义校验）
    - TAI-400x 生成类（文件生成/覆盖/写入失败）
    - TAI-500x 系统类（IO/权限/路径越界/资源不足）
  - 提示策略：vscode.window.showErrorMessage 需包含“问题+建议”（如“请检查仓库 URL 或网络代理设置”）

---

## 架构与模块职责（概览）

### 核心理念

扩展作为"Rules 聚合与同步工具"，将外部 Git 仓库的 rules 同步到本地，并自动生成各个 AI 工具能识别的配置文件。

### 存储策略

- **全局缓存**：`~/.turbo-ai-rules/sources/` (所有项目共享)
- **项目本地**：`<workspace>/.ai-rules/` (自动添加到 .gitignore)
- **AI 配置**：`.cursorrules`, `.github/copilot-instructions.md` 等

### 模块分层（详见 docs/development/01-design.md）

- **Service 层**：GitManager、RulesParser、FileGenerator、ConfigManager、SyncScheduler
- **Orchestrator 层**：RulesOrchestrator（串联端到端流程）
- **Provider 层**：RulesTreeProvider、StatusBarProvider（UI）
- **Adapter 层**：AIToolAdapter、CursorAdapter、CopilotAdapter、ContinueAdapter
- **Utils 层**：logger、fileSystem、gitignore、validator

---

## 代码风格与组织

- 严格模式：tsconfig 开启 strict，避免 any（若必须使用需注释原因）
- 命名：
  - 类/接口：PascalCase（RuleSource、GitManager）
  - 函数/方法：camelCase（cloneRepository、parseRules）
  - 常量：UPPER_SNAKE_CASE（DEFAULT_CACHE_DIR）
  - 私有：`_cache`
- 文件命名：
  - 服务：PascalCase.ts（GitManager.ts）
  - 工具：camelCase.ts（logger.ts、fileSystem.ts）
  - 类型：types/ 下 camelCase.ts（types/config.ts）
- 导入顺序：Node 内置 → 第三方 → 内部别名(@/) → 相对路径
- 函数规模：尽量 < 50 行，单一职责；组合优于继承
- 异步：优先 async/await，独立任务使用 Promise.all 并行

---

## VSCode 集成约定

- activate() 注册命令，命令 ID 具描述性：turboAiRules.[动作]（如 addSource/syncAll）
- 配置：vscode.workspace.getConfiguration('turboAiRules')；更新时指定作用域（Workspace）
- 交互：
  - 列表：showQuickPick
  - 输入：showInputBox（必须校验）
  - 长任务：withProgress（支持取消）
- 存储：globalState/workspaceState/secrets 区分使用；密钥仅存 secrets

---

## 核心数据结构（概念说明）

### RuleSource（规则源配置）

规则源是扩展的基本单元，包含：

- 唯一标识（id，kebab-case）
- Git 仓库信息（gitUrl, branch, subPath）
- 启用状态和同步策略
- 认证配置（token/ssh/none）

### ParsedRule（解析后的规则）

解析后的规则包含：

- 规则标识和标题
- Markdown 内容（不含 frontmatter）
- 元数据（version, tags, priority, author 等）
- 来源信息（sourceId, filePath）

### ExtensionConfig（完整配置）

扩展配置包含四大部分：

- **sources**: 规则源列表
- **storage**: 存储策略（全局缓存、项目目录、.gitignore）
- **adapters**: AI 工具适配器配置
- **sync**: 同步策略（自动同步、间隔、启动行为）

详细的数据结构定义见 `src/types/` 目录。

---

## 工作流程（概念说明）

### 1. 添加规则源流程

用户通过 QuickPick 输入 Git URL → 选择认证方式 → 配置分支和子目录 → 克隆到全局缓存 → 解析规则 → 保存配置 → 生成 AI 工具配置 → 更新 .gitignore → 刷新 UI。

### 2. 同步流程

触发器（手动/定时/启动）→ 遍历启用的源 → 拉取更新 → 增量解析 → 合并规则（处理冲突）→ 重新生成配置 → 刷新 UI → 通知用户。

### 3. 规则冲突解决策略

冲突策略类型：

- **priority**（默认）：高优先级覆盖低优先级；相同优先级时先添加的源优先
- **merge**：合并规则内容（需明确合并策略）
- **skip-duplicates**：保留第一个，跳过重复

生成的配置中添加注释说明冲突来源。

详细的流程图和时序图见 `docs/development/01-design.md`。

---

## 错误码详细定义

### TAI-100x 配置类

- **TAI-1001**: 配置文件缺失或损坏
- **TAI-1002**: 配置格式错误 (JSON 语法错误)
- **TAI-1003**: 必填字段缺失 (gitUrl, id 等)
- **TAI-1004**: 字段值超出有效范围 (如 syncInterval < 0)

### TAI-200x Git 类

- **TAI-2001**: Git URL 格式无效
- **TAI-2002**: 克隆失败 (网络/权限/URL 错误)
- **TAI-2003**: 拉取失败 (网络中断/冲突)
- **TAI-2004**: 认证失败 (Token 过期/SSH Key 错误)
- **TAI-2005**: 分支不存在

### TAI-300x 解析类

- **TAI-3001**: MDC 文件格式错误 (frontmatter 语法错误)
- **TAI-3002**: 必需元数据缺失 (id, title)
- **TAI-3003**: 语义校验失败 (规则内容为空)
- **TAI-3004**: 文件编码错误 (非 UTF-8)

### TAI-400x 生成类

- **TAI-4001**: 生成目标文件失败 (权限/磁盘空间)
- **TAI-4002**: 文件覆盖冲突 (用户手动修改了生成的文件)
- **TAI-4003**: 模板渲染错误

### TAI-500x 系统类

- **TAI-5001**: IO 错误 (读写失败)
- **TAI-5002**: 权限不足
- **TAI-5003**: 路径越界 (目录遍历攻击尝试)
- **TAI-5004**: 磁盘空间不足

---

## 安全与合规

### 输入验证规则

所有用户输入必须经过严格验证：

- **Git URL**：使用正则表达式验证 https:// 或 git@ 格式
- **路径**：规范化并限制在工作区/缓存目录内，防止目录遍历攻击
- **分支名**：只允许字母、数字、下划线、连字符和斜杠，防止命令注入

### Secret Storage 使用规范

敏感信息（如 Token）必须存储在 VSCode 的 Secret Storage 中：

- 存储 key 格式：`turboAiRules.token.${sourceId}`
- 使用 `context.secrets.store()` 存储
- 使用 `context.secrets.get()` 读取
- 删除时使用 `context.secrets.delete()`

### 文件写入安全

文件写入必须使用原子操作：

- 先写入临时文件（`.tmp.${timestamp}`）
- 验证写入成功后再重命名为目标文件
- 失败时清理临时文件
- 所有文件操作需要 try-catch 保护

---

## 性能优化策略

### 缓存策略

- 使用 LRU 缓存解析结果（最大 100 条）
- 缓存命中时将项移到队列末尾（LRU 特性）
- 缓存满时删除最旧的项

### 防抖与节流

- 文件监听使用防抖（300ms）避免频繁刷新
- 自动同步使用节流（60 秒内最多一次）避免过度请求

### 并行控制

- 限制并发克隆数（建议 3 个）避免资源耗尽
- 使用 Promise.all 并行处理独立任务
- 使用工作队列模式控制并发数

---

## 目录建议（详细）

```
src/
├── extension.ts                 # 入口（仅注册命令、激活服务）
│
├── commands/                    # 命令处理器
│   ├── index.ts                # 导出所有命令
│   ├── addSource.ts            # 添加规则源
│   ├── removeSource.ts         # 移除规则源
│   ├── syncRules.ts            # 同步规则
│   ├── searchRules.ts          # 搜索规则
│   └── openSettings.ts         # 打开设置
│
├── services/                    # 核心服务（业务逻辑）
│   ├── GitManager.ts           # Git 操作（克隆/拉取/状态）
│   ├── RulesParser.ts          # MDC 文件解析
│   ├── RulesManager.ts         # 规则索引与搜索
│   ├── FileGenerator.ts        # AI 工具配置生成
│   ├── ConfigManager.ts        # 配置读写与验证
│   ├── SyncScheduler.ts        # 同步调度器
│   └── RulesOrchestrator.ts    # 编排器（串联流程）
│
├── providers/                   # VSCode UI Provider
│   ├── RulesTreeProvider.ts    # 侧边栏 TreeView
│   └── StatusBarProvider.ts    # 状态栏显示
│
├── parsers/                     # 解析器
│   ├── MdcParser.ts            # MDC 格式解析
│   └── RulesValidator.ts       # 规则验证
│
├── adapters/                    # AI 工具适配器
│   ├── AIToolAdapter.ts        # 基础接口
│   ├── CursorAdapter.ts        # Cursor 适配
│   ├── CopilotAdapter.ts       # GitHub Copilot 适配
│   └── ContinueAdapter.ts      # Continue.dev 适配
│
├── ui/                          # UI 辅助工具
│   ├── QuickPickHelper.ts      # QuickPick 封装
│   ├── InputHelper.ts          # InputBox 封装
│   └── NotificationManager.ts  # 通知管理
│
├── utils/                       # 工具函数
│   ├── logger.ts               # 日志封装（基于 @ygqygq2/vscode-log）
│   ├── fileSystem.ts           # 安全文件操作
│   ├── gitignore.ts            # .gitignore 管理
│   ├── validator.ts            # 输入验证
│   ├── debounce.ts             # 防抖/节流
│   └── constants.ts            # 常量定义
│
└── types/                       # TypeScript 类型定义
    ├── config.ts               # ExtensionConfig, RuleSource
    ├── rules.ts                # ParsedRule, RuleMetadata
    ├── git.ts                  # GitStatus, GitAuth
    ├── errors.ts               # 自定义错误类型
    └── index.ts                # 统一导出
```

---

## 测试覆盖要求

### 单元测试（Vitest）- 目标覆盖率 80%+

必须覆盖的模块：

- **GitManager**：URL 验证、克隆/拉取错误处理
- **MdcParser**：有效/无效 MDC 文件解析
- **RulesManager**：规则索引、搜索、冲突检测
- **FileGenerator**：配置生成、验证
- **Adapters**：各适配器的格式转换

测试文件位置：`src/test/unit/`

### 集成测试（Mocha）

必须覆盖的流程：

- **命令流程**：addSource、syncRules、searchRules
- **端到端流程**：添加源 → 同步 → 生成配置
- **UI 交互**：TreeView 刷新、StatusBar 更新

测试文件位置：`src/test/suite/`

---

## VSCode 配置说明

工作区配置文件 `.vscode/settings.json` 包含以下配置项：

- **turboAiRules.sources**：规则源列表（id、name、gitUrl、branch、subPath、enabled、syncInterval）
- **turboAiRules.storage**：存储策略（useGlobalCache、projectLocalDir、autoGitignore）
- **turboAiRules.adapters**：适配器配置（cursor、copilot、continue 的启用状态和自动更新开关）
- **turboAiRules.sync**：同步策略（auto、interval、onStartup）

详细配置示例见 `sampleWorkspace/test.code-workspace`。

---

## 代码生成检查清单（Copilot 必须遵守）

生成任何代码前，确保：

- [ ] 所有异步函数都有 try-catch 错误处理
- [ ] 错误包含错误码（TAI-xxxx）
- [ ] 用户可见错误有友好提示和操作建议
- [ ] 日志记录包含关键上下文（sourceId、filePath 等）
- [ ] 敏感信息（token）不出现在日志中
- [ ] 路径操作前已验证安全性（防目录遍历）
- [ ] 所有用户输入已验证（URL、分支名、路径）
- [ ] 导出的函数/类有 JSDoc 注释，优先使用 turbo-file-header 扩展的函数注释（快捷键 ctrl+alt+/），再把函数作用补上
- [ ] 变量调试日志，优先使用 turbo-console-log 扩展的调试日志（快捷键 ctrl+alt+l）
- [ ] 复杂逻辑有行内注释说明
- [ ] 单一职责，函数 < 50 行
- [ ] 使用 async/await，避免回调
- [ ] 独立操作使用 Promise.all 并行
- [ ] 添加相应的单元测试
- [ ] 遵循现有命名和目录约定

---

```
src/
├─ extension.ts              # 入口（尽量精简）
├─ commands/                 # 命令处理
├─ services/                 # Git/Rules/Config/FileGenerator/Scheduler
├─ providers/                # Tree/StatusBar
├─ parsers/                  # 解析与校验
├─ adapters/                 # AI 工具适配（Cursor/Copilot/Continue）
├─ ui/                       # UI 助手
├─ utils/                    # logger/fs/gitignore/validator
└─ types/                    # config/rules/git 等
```

函数注释示例：
返回值、参数都用 {type} 格式，如果类型未知，可用 {auto}

```
  /**
   * @description 生成文件内容
   * @return default {string}
   * @param rules {ParsedRule[]}
   */
  private generateFileContent(rules: ParsedRule[]): string {
    const lines: string[] = [];
    ...
  }
```

---

## 安全与合规

- 输入验证：URL/路径/分支名等需正则或白名单校验
- 路径安全：规范化并限制在工作区/缓存目录内，防目录穿越
- 输出编码：日志与 UI 输出避免注入；不包含敏感信息
- 网络安全：Git 优先 HTTPS，必要时提示用户配置凭据到 Secret Storage

---

## 性能策略

- 延迟加载：启动不做重活，命令触发后加载必要模块
- 缓存：规则解析结果缓存（可 LRU），避免重复 IO
- 防抖/节流：文件监听与自动同步应做防抖；远端同步节流避免频繁请求
- 并行：互不依赖的 IO 并行；控制并发上限

---

## 测试与质量

- 测试工作空间在 `sampleWorkspace/test.code-workspace` 有设置
- 单元（Vitest）：Git 管理模拟、解析器、生成器、配置校验
- 集成（Mocha）：VSCode 命令注册、UI 交互、实际文件写入的端到端验证
- 质量门禁：ESLint 错误即阻断；提交前执行 lint 与单元测试

---

## 提交与变更

- 日常维护，同步更新 docs 目录
- 变更说明：对影响用户的改动需更新 CHANGELOG/README
- 日常维护时,请遵循以下流程:
  - 新功能 → 先更新设计文档 → 实现代码+测试 → 同步用户文档
  - Bug 修复 → 编写失败测试 → 修复代码 → 更新文档(如需要)
  - 重构 → 评估影响 → 更新设计 → 重构实现 → 同步文档

### 文档规范（强制）

#### 文档组织

- **docs/** 目录结构：
  - `README.md` - 文档索引（无序号）
  - `development/` - 开发文档（所有文件都有序号: 01-_.md, 02-_.md 等）
  - `user-guide/` - 用户文档（所有文件都有序号: 01-_.md, 02-_.md 等）

#### UI 实施文档命名规范（强制）

**Phase 2 UI 页面实施文档**必须与设计文档序号对应：

- 设计文档路径：`.superdesign/design_docs/`
- ui 设计路径：`.superdesign/design_iterations/`
- 实施文档路径：`docs/development/`
- **命名规则**：

  ```
  设计文档: .superdesign/design_docs/01-welcome-page.md
  实施文档: docs/development/13-ui-phase2-01-welcome-page-implementation.md

  设计文档: .superdesign/design_docs/02-statistics-dashboard.md
  实施文档: docs/development/13-ui-phase2-02-statistics-implementation.md

  设计文档: .superdesign/design_docs/03-rule-details-panel.md
  实施文档: docs/development/13-ui-phase2-03-rule-details-implementation.md

  设计文档: .superdesign/design_docs/04-advanced-search.md
  实施文档: docs/development/13-ui-phase2-04-search-implementation.md
  ```

- **格式模板**：`13-ui-phase2-{序号}-{简短名称}-implementation.md`
- **作用**：记录 SuperDesign 生成的 HTML 如何集成到 VSCode 扩展，包括：
  - HTML 原型版本（`design_iterations/{page}_v{n}.html`）
  - Provider 类实现要点
  - 消息协议实现
  - 测试要点
  - 遇到的问题和解决方案

**创建时机**：完成每个页面的 Provider 实现后立即创建对应的实施文档

#### 设计文档规范（docs/development/01-design.md）

**核心原则**：设计文档只描述"是什么"和"为什么"，不包含代码实现

- ✅ **允许的内容**：
  - 架构图和流程图（文本描述或 Mermaid）
  - 概念说明和设计决策
  - 模块职责和接口定义（文字描述）
  - 配置示例（JSON/YAML）
  - 数据流程和状态转换说明
- ❌ **禁止的内容**：
  - TypeScript/JavaScript 代码实现
  - 函数实现细节和代码示例
  - 伪代码（除非是算法说明且无法用文字表达）
- 📝 **替代方案**：
  - 代码示例 → 改为文字描述行为和接口
  - 函数实现 → 说明输入输出和职责
  - 伪代码 → 用列表或流程图描述步骤

#### 其他文档

- **开发文档**（05-development.md 等）：可包含代码示例和操作指南
- **用户文档**（user-guide/）：可包含配置示例和使用示例
- **规则格式**（00-rule-format.md）：可包含 Markdown 和 YAML 示例

#### 文档同步

- **设计-代码-文档** 必须保持一致
- 修改代码行为时,必须同步更新相关文档
- 新增功能时,先更新设计文档,再实现代码

### Commit 类型

feat 增加新功能
fix 修复问题/BUG
style 代码风格相关无影响运行结果的
perf 优化/性能提升
refactor 重构
revert 撤销修改
test 测试相关
docs 文档/注释
chore 依赖更新/脚手架配置修改等
workflow 工作流改进
ci 持续集成
mod 不确定分类的修改
wip 开发中
types 类型修改

---

## 依赖包说明

### 核心依赖（已安装）

- **simple-git**：Git 操作核心库
- **fs-extra**：增强的文件系统操作
- **gray-matter**：解析 frontmatter（YAML + Markdown）
- **@ygqygq2/vscode-log**：统一日志输出

### 添加新依赖

使用 pnpm 添加新依赖前需确认必要性，更新 package.json。

---

## 代码生成要点（Copilot 请遵守）

1. 覆盖错误分支与边界：为空/无权限/网络失败/路径无效/解析失败
2. 明确类型标注与 JSDoc（对外导出 API 必须写）
3. 低耦合、可测试：抽象 IO、注入依赖、避免在函数内直接 new 复杂对象
4. 遵循现有目录与命名；新增依赖需先确认后更新 package.json
5. 文件写入幂等：重复执行不产生重复内容；谨慎覆盖已有文件
6. 所有用户可见错误需同时写日志（含错误码）并给出可操作建议

---

## UI 设计工具集成

### SuperDesign AI 辅助设计系统

本项目集成了 **SuperDesign** AI 辅助设计工具，专用于高效创建符合 VS Code 规范的 Webview 界面。

**使用场景**:

- ✅ **Webview 界面设计**: 创建符合 VS Code 主题的 HTML/CSS 界面
- ✅ **响应式布局**: 生成适配不同视口的组件布局
- ✅ **主题自适应**: 自动使用 VS Code CSS 变量（`var(--vscode-*)`）
- ✅ **快速原型迭代**: 通过 AI 对话生成设计变体

**集成规范** (必须遵守):

1. **继承基类**: 所有 Webview 组件必须继承 `BaseWebviewProvider`
2. **主题变量**: 使用 VS Code 官方 CSS 变量，不使用硬编码颜色
3. **架构一致性**: 遵循 `src/providers/BaseWebviewProvider.ts` 定义的架构
4. **文件存放**: 生成的设计文件存放在 `.superdesign/design_iterations/` 目录

**VS Code 主题变量示例**:

```css
/* 文本颜色 */
color: var(--vscode-foreground);
color: var(--vscode-descriptionForeground);

/* 背景颜色 */
background: var(--vscode-editor-background);
background: var(--vscode-editorWidget-background);

/* 按钮 */
background: var(--vscode-button-background);
color: var(--vscode-button-foreground);

/* 边框 */
border: 1px solid var(--vscode-editorWidget-border);
```

**现有 Webview 参考** (可作为设计模板):

- `WelcomeWebviewProvider` - 欢迎页面（引导流程）
- `StatisticsWebviewProvider` - 统计仪表板（数据可视化）
- `RuleDetailsWebviewProvider` - 规则详情面板（内容展示）
- `SearchWebviewProvider` - 高级搜索界面（表单交互）

**设计原则**:

1. **主题一致性**: 所有颜色必须使用 `var(--vscode-*)` 变量
2. **响应式设计**: 界面必须适配 300px - 1920px 宽度
3. **无障碍支持**: 支持键盘导航、屏幕阅读器
4. **性能优先**: 避免大量 DOM 操作，长列表使用虚拟滚动

**详细 SuperDesign 使用指南**:
📖 参见 [docs/development/08-superdesign-guide.md](../docs/development/08-superdesign-guide.md)

---

## 参考

- VSCode Extension API / TypeScript Handbook / simple-git / esbuild / fs-extra
- @ygqygq2/vscode-log（日志与输出风格基线）
- **SuperDesign 规范**: docs/development/08-superdesign-guide.md

备注：本规范为 Turbo AI Rules 的 Copilot 生成约束文件，旨在保证代码一致性、可维护性与安全性。若与实现存在冲突，请以本文件为准。
