# 规则源添加页面设计（新增模式）

## 页面目标

- 让用户通过表单添加新的规则源（Git 仓库），支持多种认证方式，表单校验，体验一致。

## 主要交互流程

1. 用户点击“添加规则源”按钮，打开本页面
2. 用户填写仓库信息和认证方式
3. 表单校验，错误提示
4. 提交后保存新源，自动跳转到详情页或列表页

## 表单字段

- 仓库名称（name，必填）
- Git 仓库地址（gitUrl，必填，正则校验）
- 分支名（branch，默认 main）
- 子路径（subPath，默认 /）
- 认证类型（none/token/ssh，单选）
  - Token（type=token 时显示，必填）
  - SSH Key 路径（type=ssh 时显示，必填）
  - SSH Key 密码（type=ssh 时可选）
- 启用状态（enabled，默认 true）

## 交互细节

- 提交按钮禁用状态（表单未填完/校验不通过）
- 错误提示区（如 URL 格式、必填项、认证信息）
- 取消按钮返回上一页

## 视觉建议

- 分组卡片布局，表单区与操作区分离
- 响应式，适配 400-1200px
- VSCode 主题色变量，风格与详情页一致

## 事件流

- onSubmit: 校验并发送 addSource 消息（vscodeApi.postMessage('addSource', { ...formData })）
- onCancel: 关闭页面或返回

## 其他

- 支持键盘导航和无障碍
- 表单项有 placeholder 和说明
- 表单校验逻辑与后端一致

---

**设计参考：07-source-details-page_1.md，风格一致，交互更简洁。**
