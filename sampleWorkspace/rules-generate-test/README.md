# rules generate test

## 📋 测试信息

- **测试文件**: `src/test/suite/（示例工作空间）`
- **测试内容**: 生成配置测试示例

---

# Generate Config Files + Shared Selection Test Workspace

This workspace is used for testing:

1. `generateRules` command
2. `enableSharedSelection` feature

## Configuration

- **Adapter**: Cursor (enabled)
- **Source**: ai-rules repository
- **Shared Selection**: Enabled (`.turbo-ai-rules/selections.json`)
- **Purpose**: Test config file generation + shared selection storage

## Test Scenarios

### 1. Generate Config Files

1. Sync rules from the configured source
2. Select rules
3. Generate config files
4. Verify `.cursorrules` file is created with correct content

### 2. Shared Selection

1. Enable `enableSharedSelection: true`
2. Select rules and verify `.turbo-ai-rules/selections.json` is created
3. Reload window and verify selection state is restored from shared file
4. Test multi-source selection storage
5. Test fallback to WorkspaceDataManager when shared file is corrupted
