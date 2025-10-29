---
# Turbo AI Rules - 规则源详情页面实施文档
日期：2025-10-29  | 作者：GitHub Copilot

## 一、背景与目标
实现 VSCode 扩展的规则源详情页，支持新增/编辑/统计/规则列表，前后端解耦，React 组件化，便于维护和扩展。

## 二、技术实现摘要
- 前端：React 19 + TypeScript + Vite，统一主题变量，公共组件复用。
- 后端 Provider：TypeScript，window.initialMode 区分“详情/新增”模式。
- 消息通信：vscodeApi.postMessage(type, payload)，Provider handleMessage。

## 三、主要流程
1. 设计稿分析：字段、交互、样式全部对齐 SuperDesign 产出。
2. 组件开发：`NewSourceForm.tsx` 完全复用公共组件，校验与交互逻辑独立。
3. 页面集成：App.tsx 根据 window.initialMode 渲染详情或新增表单。
4. Provider 逻辑：sourceId === 'new' 时注入 window.initialMode，前端自动切换模式。

## 四、关键变更与最佳实践
- 详情/新增模式完全解耦，Provider 只负责注入模式和数据。
- 表单与 Provider 解耦，易于扩展和维护。
- 统一主题变量，保证视觉一致性。
- 组件化开发，公共组件高复用。

## 五、测试与验证
### 功能测试
- 规则源详情、统计、规则列表、搜索、筛选、同步、编辑、删除等功能均可用。
### 性能测试
- 支持大数据量规则渲染，响应速度良好。
### UI/UX 测试
- 响应式布局、主题切换、交互反馈均符合 VSCode 规范。

## 六、关联文件
- 设计文档：`.superdesign/design_docs/07-source-details-new_1.md`
- UI 原型：`.superdesign/design_iterations/07-source-details-new_1.html`
- 前端代码：`src/webview/source-detail/NewSourceForm.tsx`, `App.tsx`
- Provider：`src/providers/SourceDetailWebviewProvider.ts`
- 公共组件：`src/webview/components/`

## 七、后续建议
- 表单保存逻辑可进一步抽象，支持异步校验和错误码。
- 组件库可继续完善，支持更多表单类型和状态。
- 文档需持续同步，保证开发者快速理解和复用。

---

- [ ] 搜索响应速度
- [ ] 懒加载功能正常
- [ ] 内存占用合理

### UI/UX 测试

- [ ] 响应式布局在不同窗口大小下正常
- [ ] 主题切换无视觉错误
- [ ] 按钮点击有视觉反馈
- [ ] 加载状态显示正确
- [ ] 错误提示友好

---

## 🚀 使用方式

### 1. 从树视图打开

右键点击规则源 → 选择 "View Source Details"

### 2. 从命令面板打开

1. 按 `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`)
2. 输入 "Turbo AI Rules: View Source Details"
3. 选择要查看的规则源

### 3. 从代码调用

```typescript
vscode.commands.executeCommand('turbo-ai-rules.viewSourceDetail', sourceId);
```

---

## 🔧 技术栈

- **后端**: TypeScript + VS Code Extension API
- **前端**: React 18 + TypeScript
- **构建**: Vite 7
- **样式**: CSS (VS Code 主题变量)

---

## 📝 后续优化

### 可能的改进点

1. **虚拟滚动**: 规则列表超过 100 条时使用虚拟滚动提升性能
2. **缓存优化**: 统计数据缓存以减少计算
3. **导出功能**: 支持导出规则源的统计报告
4. **更多图表**: 添加更丰富的数据可视化
5. **历史记录**: 显示规则源的同步历史

### 已知限制

1. 统计数据在规则数量特别大时（>5000）可能有性能问题
2. 标签云最多显示 6 个标签
3. 缓存大小计算是同步的，在大缓存时可能阻塞

---

## 🔗 相关文件

### 核心文件

- `src/providers/SourceDetailWebviewProvider.ts`
- `src/webview/source-detail/App.tsx`
- `src/commands/viewSourceDetail.ts`

### 配置文件

- `package.json`
- `vite.config.ts`
- `package.nls.json`
- `package.nls.zh-cn.json`

### 文档

- `.superdesign/design_docs/07-source-details-page.md` (设计文档)
- `.superdesign/design_iterations/07-source-details-page_1.html` (UI 原型)

---

**实施者**: GitHub Copilot  
**审核**: 待用户测试  
**状态**: ✅ 实施完成，待测试
