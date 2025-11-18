# 实施文档索引

本目录包含 Turbo AI Rules 扩展的跨模块功能实施记录。

---

## 核心功能实施

### 规则选择机制

- **[规则选择机制](./rule-selection-implementation.md)** - 左侧树视图、右侧 Webview 选择器的规则选择功能及三者之间的实时同步机制

---

## 文档组织原则

**实施文档的位置选择**：

1. **单模块功能** → 放在对应的模块目录下

   - 例如：`providers/rules-tree-implementation.md` - 树视图实施细节
   - 例如：`commands/batch-operations-implementation.md` - 批量操作命令实施

2. **跨模块功能** → 放在 `implementation/` 目录

   - 例如：`rule-selection-implementation.md` - 涉及 Provider、Service、Command 多个模块

3. **避免重复** → 同一功能只在一处记录
   - 优先放在核心模块目录，跨模块时才放 implementation

---

## 阅读建议

### 新开发者

建议按以下顺序阅读：

1. 先阅读 `docs/development/03-design.md` 了解整体架构
2. 阅读具体模块目录下的实施文档了解实现细节
3. 对于跨模块功能，查看本目录下的实施文档

### 维护者

- 修改现有功能前，先查看对应的实施文档
- 添加新功能后，在合适的位置创建实施文档
- 确保实施文档与代码保持同步

---

## 相关目录

- **[providers/](../providers/)** - Provider 层实施文档
- **[commands/](../commands/)** - 命令层实施文档
- **[services/](../services/)** - 服务层实施文档
- **[webview/](../webview/)** - Webview 实施文档

---

> **维护提示**: 添加新实施文档时，优先放在对应模块目录；只有跨模块功能才放在此目录。
