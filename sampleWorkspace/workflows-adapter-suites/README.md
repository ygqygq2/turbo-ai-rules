# Workflows: Adapter Suites

## 📋 测试目的

这个工作区用于验证**适配器综合体（Adapter Suites）**的真实端到端行为，而不只是校验 UI 数据。

当前重点覆盖：

- `copilot-core`
- `claude-core`

## ✅ 验证点

- 综合体展开后的目标适配器可以一起同步
- 单文件与目录型预设可以混合同步
- `copilot-core` 不会误包含 `copilot-hooks`
- Claude / Copilot 的目录型资产路径会被正确创建

## 📦 预启用适配器

### Copilot Core

- `copilot`
- `copilot-instructions-files`
- `copilot-skills`
- `copilot-agents`
- `copilot-prompts`

### Claude Core

- `claude-md`
- `claude-skills`
- `claude-commands`
- `claude-agents`

## 🧪 对应测试文件

- `src/test/suite/workflows/workflows-adapterSuites.test.ts`
