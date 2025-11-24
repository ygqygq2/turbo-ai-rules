# 规则源表单页面设计（新增/编辑双模式）

## 页面目标

- 让用户通过表单**添加新的规则源**或**编辑现有规则源**（Git 仓库），支持多种认证方式，表单校验，体验一致。
- 同一个表单页面支持两种模式，根据传入的 `sourceId` 区分：
  - `sourceId === 'new'`：新增模式
  - `sourceId === <existing-id>`：编辑模式

## 主要交互流程

### 新增模式

1. 用户点击"添加规则源"按钮，打开本页面（`sourceId = 'new'`）
2. 表单为空，用户填写仓库信息和认证方式
3. 表单校验，错误提示
4. 点击"添加"按钮，保存新源，自动跳转到详情页或列表页

### 编辑模式

1. 用户点击"编辑规则源"菜单/按钮，打开本页面（`sourceId = <existing-id>`）
2. 表单自动填充现有源的数据（仓库地址、分支、子路径、认证信息等）
3. 用户修改字段，表单校验，错误提示
4. 点击"保存"按钮，更新源配置，自动跳转到详情页或列表页

## 表单字段

所有字段在**新增模式**为空，在**编辑模式**自动填充现有值：

- 仓库名称（name，必填）
- Git 仓库地址（gitUrl，必填，正则校验）
  - **编辑模式禁用**：避免修改导致仓库路径变化
- 分支名（branch，默认 main）
- 子路径（subPath，默认 /）
- 认证类型（none/token/ssh，单选）
  - Token（type=token 时显示，必填）
  - SSH Key 路径（type=ssh 时显示，必填）
  - SSH Key 密码（type=ssh 时可选）
- 启用状态（enabled，默认 true）

## 交互细节

### 通用交互

- 提交按钮禁用状态（表单未填完/校验不通过）
- 错误提示区（如 URL 格式、必填项、认证信息）
- 取消按钮返回上一页

### 模式区分

- **页面标题**：
  - 新增模式："添加规则源"
  - 编辑模式："编辑规则源"
- **提交按钮文案**：
  - 新增模式："添加"
  - 编辑模式："保存"
- **Git URL 字段**：
  - 新增模式：可编辑
  - 编辑模式：只读（显示为禁用输入框）

## 视觉建议

- 分组卡片布局，表单区与操作区分离
- 响应式，适配 400-1200px
- VSCode 主题色变量，风格与详情页一致

## 事件流

### 新增模式

- onSubmit: 校验并发送 `addSource` 消息（`vscodeApi.postMessage({ type: 'addSource', payload: { ...formData } })`）
- onCancel: 关闭页面或返回

### 编辑模式

- onLoad: 发送 `loadSourceData` 消息获取现有源数据（`vscodeApi.postMessage({ type: 'loadSourceData', payload: { sourceId } })`）
- onReceive: 接收 `sourceData` 消息并填充表单
- onSubmit: 校验并发送 `updateSource` 消息（`vscodeApi.postMessage({ type: 'updateSource', payload: { sourceId, ...formData } })`）
- onCancel: 返回详情页或上一页

## 消息协议设计

### Webview → Extension

| 消息类型         | 用途           | 触发时机           | Payload                                              |
| ---------------- | -------------- | ------------------ | ---------------------------------------------------- |
| `loadSourceData` | 加载现有源数据 | 编辑模式页面加载时 | `{ sourceId: string }`                               |
| `addSource`      | 添加新源       | 新增模式提交时     | `{ name, gitUrl, branch, subPath, auth, enabled }`   |
| `updateSource`   | 更新源配置     | 编辑模式提交时     | `{ sourceId, name, branch, subPath, auth, enabled }` |

### Extension → Webview

| 消息类型             | 用途       | 触发时机              | Data                                      |
| -------------------- | ---------- | --------------------- | ----------------------------------------- |
| `sourceData`         | 返回源数据 | 响应 `loadSourceData` | `{ source: RuleSource }`                  |
| `addSourceStatus`    | 添加结果   | 新增完成后            | `{ success: boolean, message, sourceId }` |
| `updateSourceStatus` | 更新结果   | 编辑完成后            | `{ success: boolean, message }`           |

## 其他

- 支持键盘导航和无障碍
- 表单项有 placeholder 和说明
- 表单校验逻辑与后端一致
- **模式判断**：根据 `sourceId` 参数区分模式
  - `sourceId === 'new'` → 新增模式
  - 其他有效 `sourceId` → 编辑模式

## 实现要点

### 数据预填充（编辑模式）

1. 页面加载时检测 `sourceId !== 'new'`
2. 发送 `loadSourceData` 消息到 Extension
3. 接收 `sourceData` 响应，填充表单字段
4. Git URL 字段设置为只读（`disabled` 属性）

### 提交逻辑区分

1. 新增模式：调用 `configManager.addSource()`
2. 编辑模式：调用 `configManager.updateSource(sourceId, updates)`

### 跳转调用点

- **Tree View 右键菜单**：`Edit Source` → `showSourceDetail(sourceId)`
- **源详情页编辑按钮**：`handleEditSource(sourceId)` → `showSourceDetail(sourceId)`
- **添加规则源命令**：`addSourceCommand()` → `showSourceDetail('new')`

---

**设计参考**：风格与 `07-source-details-page.md` 一致，交互更简洁。
