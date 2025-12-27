---
id: 80001
title: 项目规范
description: 日志中的路径应显示相对路径而非绝对路径
globs: ['**/*.ts', '**/*.js']
priority: high
tags: [project-rules]
version: 1.0.0
author: ygqygq2
lastUpdated: 2025-12-27
---

# 1. 日志路径显示规范

所有日志输出中涉及路径展示时，除非明确说明，默认都应该展示相对路径（相对于工作区根目录），即使代码中使用的是绝对路径。

# 2. git commit 时 message 精简
- 修改好代码，不要自己 commit，commit 前用户确认，不要自己随便就 commit 了。
- commit message 只写必要信息，避免冗长描述，特别是别加什么测试了啥。
