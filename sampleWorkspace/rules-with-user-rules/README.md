# Multi-Adapter with User Rules Protection Test Scenario

此测试场景测试 **所有适配器同时启用 + 用户规则保护**功能。

## 测试目标

- ✅ 所有适配器同时启用（Cursor、Copilot、Continue、Custom）
- ✅ `protectUserRules: true` 保护所有配置文件的现有用户内容
- ✅ Cursor `.cursorrules` 单文件保护
- ✅ Copilot `.github/copilot-instructions.md` 单文件保护
- ✅ Continue `.continue/config.json` 配置保护
- ✅ Custom `rules/` 目录生成

## 预创建用户规则

文件 `.cursorrules` 包含用户自定义的规则内容（首次同步前已存在）

## 验证点

1. **首次同步**：

   - 用户现有的 `.cursorrules` 文件内容被完全保留
   - 自动生成的规则被添加到文件中，使用块标记包裹
   - 块标记格式：`<!-- TURBO-AI-RULES:BEGIN/END -->`

2. **后续同步**：
   - 块标记外的用户内容保持不变
   - 块标记内的自动生成内容被更新
   - 用户可以在块标记外添加自己的规则
