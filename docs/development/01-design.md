# Turbo AI Rules - 产品整体设计

> 本文档是 Turbo AI Rules 扩展的总体设计概览，详细内容见各子文档。
>
> **版本**: 1.0.0  
> **最后更新**: 2025-01-23

---

## 文档索引

本设计文档采用分层结构，主文档提供概览和导航，详细设计在各子文档中：

- **[01-01-background.md](./01-01-background.md)** - 项目背景和设计目标
- **[01-02-core-concepts.md](./01-02-core-concepts.md)** - 核心理念和设计原则
- **[01-03-architecture.md](./01-03-architecture.md)** - 顶层架构和模块分工
- **[01-04-storage-strategy.md](./01-04-storage-strategy.md)** - 存储策略和文件管理
- **[01-05-adapter-design.md](./01-05-adapter-design.md)** - 适配器架构和扩展机制
- **[01-06-config-sync.md](./01-06-config-sync.md)** - 配置管理和同步策略
- **[01-07-parser-validator.md](./01-07-parser-validator.md)** - 解析验证和错误处理
- **[01-08-data-model.md](./01-08-data-model.md)** - 数据结构和类型定义

---

## 产品定位

**Turbo AI Rules** 是一个 VSCode 扩展，用于从外部 Git 仓库管理 AI 编码规则，并自动生成多个 AI 工具的配置文件。

### 核心价值

- **规则集中管理**: 从 Git 仓库统一管理 AI 编码规则
- **多工具支持**: 自动生成 Cursor、GitHub Copilot、Continue.dev 等工具的配置
- **自动同步**: 定时同步规则更新，保持规则最新
- **规则选择**: 灵活选择需要的规则，避免冗余
- **冲突解决**: 智能处理多规则源的冲突

---

## 核心功能

### 1. 规则源管理

- 添加/移除规则源（Git 仓库）
- 配置认证方式（无认证/Token/SSH）
- 启用/禁用规则源
- 查看规则源详情

### 2. 规则同步

- 手动触发同步
- 定时自动同步
- 启动时同步
- 增量同步（只拉取更新）

### 3. 规则选择

- 浏览规则源的目录结构
- 选择/取消选择规则
- 按标签过滤规则
- 搜索规则

### 4. 配置生成

- 生成 Cursor 配置（\`.cursorrules\`）
- 生成 GitHub Copilot 配置（\`.github/copilot-instructions.md\`）
- 生成 Continue.dev 配置（\`.continuerules\`）
- 支持自定义适配器

### 5. 规则浏览

- 侧边栏树视图显示规则源和规则
- 规则详情面板查看规则内容
- 统计面板显示规则数量和分布
- 高级搜索界面

---

## 架构概览

详细架构请参见 [01-03-architecture.md](./01-03-architecture.md)

---

## 存储策略

详细策略请参见 [01-04-storage-strategy.md](./01-04-storage-strategy.md)

---

## 适配器设计

详细设计请参见 [01-05-adapter-design.md](./01-05-adapter-design.md)

---

## 同步策略

详细策略请参见 [01-06-config-sync.md](./01-06-config-sync.md)

---

## 规则格式

详细格式请参见 [01-07-parser-validator.md](./01-07-parser-validator.md)

---

## 数据模型

详细定义请参见 [01-08-data-model.md](./01-08-data-model.md)

---

## 错误码体系

### 错误码分类

- **TAI-100x**: 配置类（缺失/格式错误/范围越界）
- **TAI-200x**: Git 类（克隆/拉取/鉴权/分支异常）
- **TAI-300x**: 解析类（frontmatter/MDC/语义校验）
- **TAI-400x**: 生成类（文件生成/覆盖/写入失败）
- **TAI-500x**: 系统类（IO/权限/路径越界/资源不足）

详细定义见各子文档的错误处理章节。

---

## 安全考虑

- 输入验证（Git URL、路径、配置值）
- 权限控制（文件操作限制、凭据加密）
- 日志安全（不输出敏感信息）

---

## 性能优化

- 缓存策略（LRU 缓存、规则索引）
- 防抖与节流（文件监听、自动同步）
- 并行控制（限制并发数）

---

## 扩展性

- 自定义适配器（Handlebars 模板）
- 插件机制（未来）
- API 稳定性（语义化版本）

---

## 测试覆盖

详细要求见 [04-test-coverage.md](./04-test-coverage.md)

---

## 开发与维护

- **开发指南**: [05-development.md](./05-development.md)
- **维护指南**: [06-maintaining.md](./06-maintaining.md)
- **UI 开发**: [07-webview-best-practices.md](./07-webview-best-practices.md) 等

---

## 版本历史

### v1.0.0 (2025-01-23)

- ✅ 核心功能完成（规则源管理、同步、配置生成）
- ✅ 内置适配器（Cursor、Copilot、Continue）
- ✅ UI Phase 1 & Phase 2
- ✅ 文档体系完善

## 相关文档

- **用户指南**: [../user-guide/README.md](../user-guide/README.md)
- **开发文档**: [./README.md](./README.md)
- **自定义适配器**: [02-custom-adapters-design.md](./02-custom-adapters-design.md)

---

> **说明**: 本文档仅提供概览和导航，详细设计内容见各子文档。
