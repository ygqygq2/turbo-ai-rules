# Commands: Add Source - Empty State

## 📋 测试信息

- **测试文件**: `src/test/suite/commands/addSource-shared.test.ts`
- **测试目标**: 验证添加规则源命令的基本功能

## 🧪 测试场景

### 1. 空规则源列表提示
**测试**: `Should show info message when no sources configured`
- **前置条件**: 工作空间无任何规则源
- **步骤**: 执行添加源命令
- **验证**:
  - ✅ 显示信息提示 "未配置规则源"
  - ✅ 引导用户添加第一个规则源

### 2. 添加第一个规则源
**测试**: `Should add first source successfully`
- **步骤**:
  1. 输入源 ID: `test-source`
  2. 输入 Git 仓库: `https://github.com/user/repo.git`
  3. 选择分支: `main`
- **验证**:
  - ✅ 源添加成功
  - ✅ 配置持久化到 settings.json
  - ✅ 显示成功提示

### 3. URL 格式验证
**测试**: `Should validate Git URL format`
- **测试无效 URL**:
  - `invalid-url`
  - `ftp://example.com`
  - `not-a-git-url`
- **验证**:
  - ✅ 拒绝无效 URL
  - ✅ 显示错误提示 "无效的 Git URL"

### 4. ID 命名验证
**测试**: `Should enforce kebab-case naming for source ID`
- **测试无效 ID**:
  - `Test_Source` (包含下划线)
  - `testSource` (camelCase)
  - `test source` (包含空格)
- **测试有效 ID**:
  - `test-source`
  - `my-rules-123`
- **验证**:
  - ✅ 拒绝不符合 kebab-case 的 ID
  - ✅ 接受符合规范的 ID

## ⚙️ 工作空间配置

此工作空间初始状态：

```json
{
  "turbo-ai-rules.sources": []  // 空数组
}
```

## 🎯 关键验证点

- ✅ 空状态提示友好
- ✅ Git URL 验证严格
- ✅ ID 命名强制 kebab-case
- ✅ 配置正确保存到 settings.json
- ✅ 用户交互流畅（逐步引导）

## 📝 相关命令

- `turbo-ai-rules.addSource` - 添加新规则源

---
