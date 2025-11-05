# 文档导航（必读）

> 这是一份“如何阅读 docs”的快速指南。先看这里，再按需深入。

---

## 我该从哪里开始？

1) docs/README.md — 文档索引与快速入口（在文件树中选中 docs 目录默认显示）
2) docs/00-documentation-system.md（本文）— 说明文档布局与阅读顺序
3) docs/01-overall-design.md — 架构总览（项目是什么、为什么这样设计）
4) docs/development/ — 开发文档（与 src 目录一一对应，按目录找即可）
   - docs/development/implementation/ — 实施文档：记录“如何把设计落地”的关键实现、决策与踩坑
5) docs/user-guide/ — 面向用户的命令、配置、规则格式与 FAQ（英文/中文，.zh.md 为中文）
6) .superdesign/ — 仅用于 Webview 的页面设计原型与迭代文件（实现请看 development/webview 与 implementation）

---

## 导航速查（我想…→ 去哪里）

- 了解某个代码模块的设计 → docs/development/<与 src 同名的子目录>/
- 查看 TreeView/状态栏/欢迎页等的实施记录 → docs/development/implementation/
- 找 Webview 消息协议/样式规范 → docs/development/webview/
- 查所有命令的使用方法 → docs/user-guide/01-commands*.md
- 看示例工作区与配置示例 → sampleWorkspace/

---

## 基本约定

- 设计文档讲“是什么/为什么”；实施文档讲“怎么做/遇到什么问题”；用户文档讲“怎么用”。
- docs/development 的子目录与 src 同名同层，优先在对应目录下查找说明。
- 用户文档中英文配对：英文 *.md，中文 *.zh.md；若内容不一致，以最近更新为准并欢迎提 Issue 协助修正。

---

## 维护提示（给贡献者）

- 功能/架构变更：先更新 01-overall-design 或相关设计，再更新 implementation 与 user-guide，最后更新 CHANGELOG。
- 文档结构调整：请优先更新本文（00）以保证新人能按正确路径阅读。

