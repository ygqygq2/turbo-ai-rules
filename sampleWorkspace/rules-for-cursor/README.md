# Cursor Rules Test Workspace

这是用于测试 Cursor 适配器的工作区。

## 测试场景

1. 添加公开仓库源（无认证）
2. 测试 SubPath 配置为 `/rules-new`
3. 测试递归解析规则文件
4. 同步规则并生成 `.cursorrules` 文件
5. 验证文件是否正确生成

## 使用步骤

1. 打开命令面板（Ctrl+Shift+P / Cmd+Shift+P）
2. 运行 `Turbo AI Rules: Add Source`
3. 输入公开 Git 仓库 URL:
   ```
   https://github.com/PatrickJS/awesome-cursorrules.git
   ```
4. 分支: `main`
5. SubPath: `/rules-new`
6. 名称: `Awesome Cursor Rules`
7. 选择 "None" 认证
8. 运行 `Turbo AI Rules: Sync Rules`
9. 检查生成的 `.cursorrules` 文件

## 预期结果

- 从 `/rules-new` 目录递归解析所有 `.md` 和 `.mdc` 文件
- 生成 `.cursorrules` 文件包含所有规则
- 支持最多 6 层深度的目录结构
- 最多解析 500 个文件
