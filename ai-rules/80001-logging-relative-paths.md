---
id: 80001-logging-relative-paths
title: 日志路径显示规范
description: 日志中的路径应显示相对路径而非绝对路径
globs: ['**/*.ts', '**/*.js']
priority: high
tags: [logging, paths, standards, project-rules]
version: 1.0.0
author: ygqygq2
lastUpdated: 2025-12-27
---

# 日志路径显示规范

所有日志输出中涉及路径展示时，除非明确说明，默认都应该展示相对路径（相对于工作区根目录），即使代码中使用的是绝对路径。
