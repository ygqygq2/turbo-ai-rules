# Workflows: Custom MCP

## 📋 测试目的

这个工作区用于验证 `mcp` 资产通过自定义 `merge-json` 适配器输出到 `.vscode/mcp.json` 的完整工作流。

## ✅ 验证点

- 首次同步后可生成合并后的 `.vscode/mcp.json`
- 生成结果只包含当前选中的 MCP 服务器片段
- 再次生成时会保留既有生成结果与手工追加的 MCP server，符合 custom `merge-json` 的深合并语义

## 🧪 对应测试文件

- `src/test/suite/workflows/workflows-custom-mcp.test.ts`
