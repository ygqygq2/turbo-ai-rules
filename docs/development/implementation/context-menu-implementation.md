# 右键菜单跨模块实施文档

本文件记录 Turbo AI Rules 扩展中右键菜单相关的跨模块实现细节，包括命令注册、UI 交互、服务调用等。

## 主要内容

- 右键菜单命令注册与分发
- TreeProvider 与命令的集成
- 交互流程与权限校验

## 设计要点

- 动态菜单项生成
- 权限与状态判断
- 日志与错误码规范

## 相关模块

- commands/contextMenuCommands.ts
- providers/RulesTreeProvider.ts

## 测试要点

- 菜单命令集成测试
- 权限与状态判断覆盖

---
