# 整体架构与设计总览

> 本文档面向第一次了解 Turbo AI Rules 的读者，概述“它是什么、为什么这样设计、如何协同工作”。详细实现请参见开发文档。

---

## 背景与目标

在 AI 辅助编程时代，不同工具（GitHub Copilot、Cursor、Continue 等）支持各自的规则/提示配置，存在格式不统一、规则分散、同步困难、版本追踪缺失等问题。Turbo AI Rules 作为 VS Code 扩展，充当“外部规则仓库 ↔ 各 AI 工具配置”的桥梁：

- 统一管理：从外部 Git 仓库集中拉取规则（支持多源）
- 自动同步：按策略检测/拉取更新，增量解析
- 多工具适配：将统一规则集合转换为不同 AI 工具所需的配置文件
- 冲突解决与校验：合并、去重、验证，保证生成结果可用

参阅：docs/development/01-background.md（项目背景与目标）

---

## 产品定位与范围

- 定位：规则聚合与配置生成器，专注“拉取-解析-合并-生成”闭环
- 目标用户：个人开发者/团队/企业需要在多项目中复用与统一规则
- 非目标：不在线编辑上游规则；不替代各 AI 工具本身的行为与设置

---

## 架构总览（What）

系统采用分层架构，职责清晰、可扩展性强：

- UI 层（Views）：TreeView、StatusBar、Webview（欢迎页、搜索、统计等）
- Service 层：GitManager、RulesManager、FileGenerator、ConfigManager、SyncScheduler、RulesOrchestrator
- Parser & Validator 层：MdcParser + 规则验证
- Adapter 层：面向 Cursor/Copilot/Continue 及自定义适配器
- Storage 层：全局缓存 + 工作区索引 + 项目根输出

参阅：docs/development/20-architecture.md（顶层架构设计）

---

## 设计理念与原则（Why）

- 桥接模式与关注点分离：规则定义（Git/MDC）⇢ 管理与编排（扩展）⇢ 工具适配（生成配置）
- 约定优于配置：合理默认值，最少用户输入即可工作
- Local-First：全量数据本地化，离线可用，不上传用户规则
- 单一数据源：Git 仓库即真源，生成物与索引均可重建

参阅：docs/development/02-core-concepts.md（核心理念与设计原则）

---

## 核心概念（一览）

- RuleSource：规则源配置（Git URL、分支、子目录、认证、启用等）
- ParsedRule：解析后的规则（元数据、Markdown 内容、来源追溯）
- Adapter：将合并后的规则集转换为特定 AI 工具配置
- RulesOrchestrator：编排端到端流程（同步/解析/合并/生成）

参阅：docs/development/10-data-model.md（数据模型）

---

## 存储策略（一览）

- 全局缓存：~/.cache/.turbo-ai-rules/
  - sources/：多工作区共享的规则源 Git 数据
  - workspaces/<hash>/：按工作区路径哈希隔离的索引与生成清单
- workspaceState：轻量 UI/同步元数据（< 10KB）
- 项目根：仅输出最终 AI 配置文件（如 .github/copilot-instructions.md、.cursorrules）

参阅:docs/development/11-storage-strategy.md(存储策略设计)

---

## 关键流程（摘要）

- 添加规则源

  1. 用户输入 Git URL（可选分支/子目录/认证）
  2. 克隆至全局缓存并建立索引
  3. UI 刷新，提示可同步/生成

- 同步规则

  1. 调度任务 → Git 增量更新
  2. 解析变更规则 + 校验
  3. 合并与冲突处理 → 更新索引与 UI

- 生成配置
  1. 选择启用的适配器
  2. 读取合并后的规则集
  3. 生成并写入各工具目标文件（原子写、带元注释）

参阅:docs/development/22-config-sync.md(配置与同步)、相关命令文档

---

## 模块职责（速查）

- GitManager：克隆/拉取/分支与鉴权
- MdcParser + Validator：MDC 解析与元数据校验
- RulesManager：索引与搜索、冲突检测与合并
- FileGenerator：目标文件生成、覆盖策略、gitignore 管理
- Adapters：Cursor/Copilot/Continue/自定义
- SyncScheduler：手动/定时/启动触发与并发控制

参阅:docs/development/21-adapter-design.md(适配器设计)

---

## 文档与代码的映射

- 阅读顺序建议：docs/00-documentation-system.md → 本文（01）→ 开发文档各分章
- 开发文档目录与 src 目录“同名同层”，按模块直达对应说明（见 00 文档的规则）

---

## 参考与延伸

- 根目录 README.md：特性、快速开始、面向用户的说明
- docs/development/\*：分层设计、实现细节与 UI 规范
- docs/user-guide/\*：命令、配置、规则格式与 FAQ（中英文）

> 本文仅描述“是什么/为什么”。“怎么做”的细节见开发文档与实施文档。
