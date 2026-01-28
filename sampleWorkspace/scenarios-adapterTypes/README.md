# Scenarios: Adapter Types

## 📋 测试信息

- **测试文件**: `src/test/suite/scenarios/scenarios-adapterTypes.test.ts`
- **测试目标**: 验证不同类型适配器（file/directory）

## 🧪 测试场景

### 1. File 类型适配器
**说明**: Cursor, Copilot 等输出单文件

**步骤**:
- 启用 Cursor 适配器
- 执行生成

**验证**:
- ✅ 生成 .cursorrules 文件
- ✅ 文件包含所有规则
- ✅ 覆盖已存在的文件

### 2. Directory 类型适配器
**说明**: Bolt, Qodo Gen 等输出目录

**步骤**:
- 启用 Bolt 适配器
- 执行生成

**验证**:
- ✅ 创建 .bolt/prompt 目录
- ✅ 目录内包含规则文件
- ✅ 保留目录内其他文件

## 🎯 关键验证点

- ✅ File vs Directory
- ✅ 输出路径逻辑
- ✅ 覆盖策略
- ✅ 目录结构

---
