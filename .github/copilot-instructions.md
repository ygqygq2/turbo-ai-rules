# GitHub Copilot 使用指令（Turbo AI Rules 专用）

> **项目**：Turbo AI Rules - 从外部 Git 仓库管理 AI 编码规则并为多工具生成配置的 VSCode 扩展  
> **作用域**：约束 Turbo AI Rules 的开发规范，详细设计见 docs/ 目录  
> **原则**：本文档仅包含规范性内容，不包含具体实现细节

---

## 日志与错误码规范（强制）

### 日志规范

- **统一日志库**：`@ygqygq2/vscode-log`（必须使用）
- **初始化**：在 extension.ts 初始化单例 `new Logger('TurboAiRules')`
- **等级选择**：debug/info/warn/error，按场景选择最小可用等级
- **结构化输出**：`logger.info('Sync start', { sourceId, count })`
- **安全要求**：禁止输出令牌、密码、邮箱等敏感信息

### 错误码设计

错误码挂载在错误对象的 `code` 字段或记录到日志上下文：

- **格式**：`TAI-{分类}{序号}` (如 TAI-2001)
- **分类**：
  - `TAI-100x` 配置类（缺失/格式错误/范围越界）
  - `TAI-200x` Git 类（克隆/拉取/鉴权/分支异常）
  - `TAI-300x` 解析类（frontmatter/MDC/语义校验）
  - `TAI-400x` 生成类（文件生成/覆盖/写入失败）
  - `TAI-500x` 系统类（IO/权限/路径越界/资源不足）
- **用户提示**：错误信息需包含"问题+建议"（如"请检查仓库 URL 或网络代理设置"）

> 详细错误码列表见 `docs/development/01-design.md`

---

## 架构分层（概览）

> 详细架构设计见 `docs/development/01-design.md`

---

## 代码风格与组织

- **严格模式**：tsconfig 开启 strict，避免 any（若必须使用需注释原因）
- **命名规范**：
  - 类/接口：PascalCase（RuleSource、GitManager）
  - 函数/方法：camelCase（cloneRepository、parseRules）
  - 常量：UPPER_SNAKE_CASE（DEFAULT_CACHE_DIR）
  - 私有成员：`_cache`
- **文件命名**：
  - 服务类：PascalCase.ts（GitManager.ts）
  - 工具函数：camelCase.ts（logger.ts、fileSystem.ts）
  - 类型定义：types/ 下 camelCase.ts（types/config.ts）
- **导入顺序**：Node 内置 → 第三方 → 内部别名(@/) → 相对路径
- **函数规模**：尽量 < 50 行，单一职责；组合优于继承
- **异步处理**：优先 async/await，独立任务使用 Promise.all 并行

---

## 模块化拆分规范

### 文件拆分阈值

不是为了拆分而拆分，是为了更好维护和合理拆分

- **硬性上限**：单个文件不超过 700 行（除非极度单一职责且必要）
- **建议上限**：单个文件控制在 500 行内
- **函数/方法**：单个函数/方法 < 50 行，超过需拆分

### 拆分策略（按优先级）

1. **按职责拆分（首选）**：单一类职责过多时拆分为多个类
2. **按类型/接口拆分**：类型定义过多时按领域拆分到不同文件
3. **按功能模块拆分**：服务类过大时拆分为主类 + 辅助类，使用子目录组织
4. **按层级拆分**：Provider 过大时拆分为 Provider + Helper + MessageHandler

### 拆分原则

- ✅ **DO**：
  - 拆分前先思考职责边界，确保每个文件有清晰的职责
  - 拆分后使用 `index.ts` 统一导出，避免影响调用方
  - 拆分后的每个文件都要有清晰的 JSDoc 说明其职责
- ❌ **DON'T**：
  - 不要机械拆分（破坏逻辑完整性）
  - 不要过度拆分（单个函数独立成文件）
  - 不要拆分后循环依赖

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

详细的数据结构定义见 `src/types/` 目录。

---

## 测试覆盖要求

### 单元测试（Vitest）- 目标覆盖率 80%+

必须覆盖的模块：

- **GitManager**：URL 验证、克隆/拉取错误处理
- **MdcParser**：有效/无效 MDC 文件解析
- **RulesManager**：规则索引、搜索、冲突检测
- **FileGenerator**：配置生成、验证
- **Adapters**：各适配器的格式转换

测试文件位置：`src/test/unit/`，文件后缀 `.test.ts`

### 集成测试（Mocha）

必须覆盖的流程：

- **命令流程**：addSource、syncRules、searchRules
- **端到端流程**：添加源 → 同步 → 生成配置
- **UI 交互**：TreeView 刷新、StatusBar 更新

测试文件位置：`src/test/suite/`，文件后缀 `.spec.ts`

---

## 注释规范

代码中注释能说清，就不要在实施文档里重复说明

### 优先使用扩展生成注释

- **函数注释**：优先使用 turbo-file-header 扩展（快捷键 ctrl+alt+/），再补充函数作用说明
- **调试日志**：优先使用 turbo-console-log 扩展（快捷键 ctrl+alt+l）

### 注释格式

返回值、参数都用 `{type}` 格式，如果类型未知，可用 `{auto}`

示例：

```typescript
/**
 * @description 生成文件内容
 * @return default {string}
 * @param rules {ParsedRule[]}
 */
private generateFileContent(rules: ParsedRule[]): string {
  // 实现...
}
```

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
- [ ] 文件行数 < 500 行（超过需拆分或注释说明必要性）
- [ ] 拆分后的模块有清晰的职责边界和目录组织

---

## 提交与变更

- 日常维护，同步更新 docs 目录
- 变更说明：对影响用户的改动需更新 CHANGELOG/README
- 日常维护时,请遵循以下流程:
  - 新功能 → 先更新设计文档 → 实现代码+测试 → 同步用户文档
  - Bug 修复 → 编写失败测试 → 修复代码 → 更新文档(如需要)
  - 重构 → 评估影响 → 更新设计 → 重构实现 → 同步文档

### 文档规范（强制）

#### 文档组织结构（必须遵守）

**完整规范详见 `docs/00-documentation-system.md`**（开发前必读）

- **docs/** 目录结构：
  - `README.md` - 文档索引（无序号）
  - `00-documentation-system.md` - 文档组织规范（必读第一个）
  - `01-overall-design.md` - 整体架构设计（设计总览）
  - `development/` - 开发文档目录
    - 子目录**必须**与 `src/` 目录对应：`adapters/`、`commands/`、`parsers/`、`providers/`、`services/`、`utils/`、`webview/`
    - `implementation/` - 实施文档（跨模块的实现记录）
  - `user-guide/` - 用户文档（所有文件都有序号: 01-_.md, 02-_.md 等）

#### UI 实施文档命名规范（强制）

**UI 页面实施文档**必须与设计文档序号对应：

- 设计文档路径：`.superdesign/design_docs/`
- ui 设计路径：`.superdesign/design_iterations/`
- 实施文档路径：`docs/development/webview/`
- **命名规则**：

  ```
  设计文档: .superdesign/design_docs/01-welcome-page.md
  实施文档: docs/development/webview/01-welcome-page-implementation.md
  ...
  ```

- **格式模板**：`{序号}-{简短名称}-implementation.md`
- **作用**：记录 SuperDesign 生成的 HTML 如何集成到 VSCode 扩展，包括：
  - HTML 原型版本（`design_iterations/{page}_{n}.html`）
  - Provider 类实现要点
  - 消息协议实现
  - 测试要点
  - 遇到的问题和解决方案

**创建时机**：完成每个页面的实现后立即创建对应的实施文档

#### 设计文档规范（docs/development/01-design.md）

**核心原则**：设计文档只描述"是什么"和"为什么"，不包含代码实现

- ✅ **允许的内容**：
  - 架构图和流程图（文本描述或 Mermaid）
  - 概念说明和设计决策
  - 模块职责和接口定义（文字描述）
  - 配置示例（JSON/YAML）
  - 数据流程和状态转换说明
- ❌ **强烈禁止的内容**：
  - 代码实现细节
  - 函数实现细节和代码示例
  - 业务代码（除非是算法说明且无法用文字表达）
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
7. lint 处理包括 any 等警告

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

**三位一体强制同步规范** (⚠️ 极其重要):

每次修改 Webview 相关内容时，**必须同时更新以下三个文件**，缺一不可：

1. **设计文档** (`.superdesign/design_docs/{序号}-{名称}.md`)

   - 描述设计理念、布局结构、交互流程
   - 包含 CSS 样式规范和对齐策略
   - 说明消息协议和数据流

2. **UI 原型** (`.superdesign/design_iterations/{序号}-{名称}_{迭代数字}.html`)

   - 完整的 HTML/CSS 静态原型
   - 可在浏览器中直接预览
   - 包含所有样式定义和示例数据

3. **代码实现**
   - React 组件实现
   - 与设计文档和 UI 原型保持完全一致
   - 所有 CSS 类名、样式值必须同步

**强制规则**:

- ✅ 修改任何一个文件，必须同时更新其他两个
- ✅ CSS 样式（类名、值、布局策略）必须完全一致
- ✅ 不需要用户提醒，自动完成三文件同步
- ❌ 禁止只更新代码而不同步设计文档和 UI 原型
- ❌ 禁止出现"我忘记同步了"的情况

**检查清单** (每次修改后必须确认):

- [ ] 设计文档已更新（CSS 规范、布局说明）
- [ ] UI 原型已更新（HTML/CSS 代码）
- [ ] 代码实现已更新（React 组件和样式）
- [ ] 三者的 CSS 类名完全一致
- [ ] 三者的样式值完全一致
- [ ] 三者的布局策略完全一致

**现有 Webview 参考**:

- `WelcomeWebviewProvider` - 欢迎页面（引导流程）
- `StatisticsWebviewProvider` - 统计仪表板（数据可视化）
  ...

**详细文档**:

- 设计指南见 `docs/development/09-ui-design.md`
- CSS 规范见 `docs/development/08-webview-css-guide.md`
- Codicons 使用见 `docs/development/11-codicons-guide.md`

---

最重要：修改/修复代码后，请务必确保设计、代码与文档一致，有必要时修改 superdesig 的那个 html(简单修改时)。

---

## 参考

- VSCode Extension API / TypeScript Handbook / simple-git / esbuild / fs-extra
- @ygqygq2/vscode-log（日志与输出风格基线）
- **开发文档**: docs/development/ 目录包含详细设计和实现指南

备注：本规范为 Turbo AI Rules 的 Copilot 生成约束文件，旨在保证代码一致性、可维护性与安全性。若与实现存在冲突，请以本文件为准。
