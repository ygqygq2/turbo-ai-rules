# 归档文件 - 未来功能设计

> 本目录包含未来功能的设计文档和原型，暂时没有对应的实现。

---

## 📋 归档内容

### 1. 08-config-manager.md / 08-config-manager_1.html

**功能**: 集中式配置管理面板  
**状态**: 🔄 设计中（无实现）  
**原因**: 该功能的大部分已经通过 03-source-manager 和 04-adapter-manager 实现

**相关实现**:
- 源管理 → [03-source-manager.md](../design_docs/03-source-manager.md)
- 适配器管理 → [04-adapter-manager.md](../design_docs/04-adapter-manager.md)

---

### 2. 09-rule-editor.md

**功能**: 规则编辑器（在 VS Code 编辑器中编辑规则文件）  
**状态**: 📋 设计（概念阶段）  
**原因**: 暂未实现，计划作为未来增强功能

**设计目标**:
- 为 md/mdc 规则文件提供编辑体验
- 支持工作区内规则和同步规则的编辑

---

### 3. 10-conflict-resolution.md

**功能**: 规则冲突解决面板  
**状态**: 📋 设计（概念阶段）  
**原因**: 暂未实现，当规则同步时有冲突才需要

**相关实现**:
- 规则同步页 → [05-rule-sync-page.md](../design_docs/05-rule-sync-page.md)

---

### 4. 11-sync-progress.md

**功能**: 同步进度面板  
**状态**: 📋 设计（概念阶段）  
**原因**: 暂未实现，同步功能进度信息已通过其他方式展示

**相关实现**:
- 规则同步页 → [05-rule-sync-page.md](../design_docs/05-rule-sync-page.md)

---

## 🚀 如何激活这些功能

当需要实现以上功能时：

1. **复制回 design_docs/**:
   ```bash
   cp archive/{filename}.md design_docs/
   ```

2. **创建实现**:
   - 新增 `src/webview/{feature-name}/`
   - 创建对应的 React 组件

3. **创建 HTML 原型**:
   - 基于设计文档创建 `design_iterations/{序号}-{name}_1.html`

4. **更新 README.md**:
   - 将功能加入主表格

---

## 📝 注意

- 这些是**未来功能设计**，不在当前开发范围
- 设计文档可能不是最新状态，实现时需要重新评估
- 优先级可根据实际需求调整
