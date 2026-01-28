# Adapters: Preset

## 📋 测试信息

- **测试文件**: `src/test/suite/adapters/adapters-preset.test.ts`
- **测试目标**: 验证所有 10 个预设适配器（8个规则 + 2个技能）的加载、配置和属性
- **工作空间**: 不依赖 Git 源，纯配置测试

## 🧪 测试场景（13 个测试）

### 测试准备（before 钩子）
**步骤**:
1. 使用 `switchToWorkspace('Adapters: Preset')` 切换工作空间
2. 自动打开 `README.md` 激活工作空间上下文
3. 等待 VSCode 完成上下文切换

**技术要点**:
- ✅ 使用公共辅助函数 `switchToWorkspace`
- ✅ 通过打开 README 激活工作空间
- ✅ 超时设置：`TEST_TIMEOUTS.LONG` (120 秒)

### 1. 加载所有预设适配器
**测试**: `Should load all 10 preset adapters`

**验证**:
- ✅ 从 `PRESET_ADAPTERS` 常量加载 10 个适配器
- ✅ 包含完整列表：
  - **Rules**: cursor, windsurf, copilot, continue, cline, roo-cline, aider, bolt
  - **Skills**: cursor-skills, copilot-skills

**执行时间**: <50ms

### 2. 适配器属性完整性
**测试**: `All preset adapters should have required properties`

**验证每个适配器**:
- ✅ `id` (唯一标识符)
- ✅ `name` (显示名称)  
- ✅ `filePath` (输出路径)
- ✅ `type` (file 或 directory)

**执行时间**: <50ms

### 3. ID 命名规范
**测试**: `Preset adapter IDs should be in kebab-case format`

**验证**:
- ✅ 使用正则 `/^[a-z0-9]+(-[a-z0-9]+)*$/`
- ✅ 例如：`roo-cline`, `qodo-gen`

**执行时间**: <50ms

### 4. 配置 Windsurf 适配器
**测试**: `Should be able to configure and enable Windsurf adapter`

**步骤**:
1. 更新 `adapters.windsurf = { enabled: true }`
2. 读取配置验证
3. 清理：设置回 `enabled: false`

**验证**:
- ✅ 配置写入成功
- ✅ 读取值正确

**执行时间**: ~225ms

### 5. 批量启用多个适配器
**测试**: `Should be able to configure and enable multiple new adapters`

**步骤**:
1. 同时启用 5 个新适配器：
   - windsurf, cline, roo-cline, aider, bolt
2. 批量验证配置

**验证**:
- ✅ 所有适配器 `enabled: true`

**执行时间**: ~80ms

### 6. 新格式配置兼容性
**测试**: `New format configuration should be read correctly`

**步骤**:
1. 设置扁平化配置：
   ```json
   {
     "cursor": { "enabled": true, "autoUpdate": false },
     "copilot": { "enabled": false }
   }
   ```
2. 验证读取

**验证**:
- ✅ 扁平结构正确解析

**执行时间**: ~79ms

### 7-9. 排序配置测试

#### 7.1 配置 sortBy 和 sortOrder
**测试**: `Should be able to configure sortBy and sortOrder for preset adapters`

**步骤**:
- 设置 `cursor` 的排序：`sortBy: 'priority', sortOrder: 'desc'`

**验证**:
- ✅ 排序配置保存正确

**执行时间**: ~77ms

#### 7.2 所有 sortBy 选项
**测试**: `Should support all sortBy options: id, priority, none`

**步骤**:
- 测试 3 种排序字段：
  - `id` (按标识符)
  - `priority` (按优先级)
  - `none` (不排序)

**验证**:
- ✅ 所有选项都能正确保存和读取

**执行时间**: ~161ms

#### 7.3 所有 sortOrder 选项
**测试**: `Should support all sortOrder options: asc, desc`

**步骤**:
- 测试 2 种排序方向：
  - `asc` (升序)
  - `desc` (降序)

**验证**:
- ✅ 排序方向正确应用

**执行时间**: ~91ms

### 10-13. 配置持久化测试

#### 10. 避免保存空对象
**测试**: `Should save adapter configurations correctly (not as empty objects)`

**步骤**:
1. 设置复杂配置：
   ```json
   {
     "cursor": { "enabled": true, "autoUpdate": false, "sortBy": "priority", "sortOrder": "desc" },
     "copilot": { "enabled": false, "autoUpdate": true }
   }
   ```
2. 等待 500ms 写入
3. 重新读取验证

**验证**:
- ✅ 配置不是空对象
- ✅ 所有属性完整保存
- ✅ 嵌套属性正确

**执行时间**: ~529ms

#### 11. 仅保存用户修改的适配器
**测试**: `Should only save user-modified adapters to reduce config file size`

**步骤**:
1. 仅启用 `cursor`
2. 不配置其他适配器
3. 验证 settings.json 只包含 `cursor` 条目

**验证**:
- ✅ 配置文件精简
- ✅ 未修改的适配器不写入

**执行时间**: ~542ms

#### 12. 深拷贝避免配置污染
**测试**: `Should deep clone configurations to avoid corrupting shared settings.json`

**步骤**:
1. 设置初始配置
2. 修改引用对象
3. 验证原始配置未被污染

**验证**:
- ✅ 使用深拷贝机制
- ✅ 配置独立不互相影响

**执行时间**: ~530ms

#### 13. 混合启用/禁用复杂配置
**测试**: `Should handle mixed enabled/disabled adapters with complex configurations`

**步骤**:
1. 设置 3 个适配器的混合状态：
   - cursor: enabled + 复杂配置
   - copilot: disabled + 基础配置
   - continue: enabled + 默认配置

**验证**:
- ✅ 启用/禁用状态正确
- ✅ 复杂配置正确保存

**执行时间**: ~532ms

## 🎯 关键验证点

- ✅ **适配器加载**: 10 个预设适配器完整加载（8个规则 + 2个技能）
- ✅ **属性验证**: id/name/filePath/type 必需字段
- ✅ **命名规范**: kebab-case 格式强制
- ✅ **配置读写**: 扁平化结构支持
- ✅ **排序功能**: sortBy/sortOrder 完整测试
- ✅ **持久化**: 避免空对象、深拷贝、精简配置

## ⚡ 性能表现

| 测试类型 | 数量 | 总耗时 | 平均耗时 |
|---------|------|--------|----------|
| 基础验证（1-3） | 3 | <150ms | <50ms |
| 配置操作（4-6） | 3 | ~384ms | ~128ms |
| 排序测试（7-9） | 3 | ~329ms | ~110ms |
| 持久化测试（10-13） | 4 | ~2133ms | ~533ms |
| **总计** | **13** | **~4s** | **~308ms** |
| **总计** | **12** | **~3秒** | **~250ms** |

## 🔧 代码优化

✅ **已完成优化**:
1. 使用 `switchToWorkspace()` 统一管理工作空间切换
2. 使用 `TEST_DELAYS.SHORT` 替代 4 处固定 `setTimeout(500)`
3. 通过打开 README 激活工作空间上下文

## 📝 测试清理

**after 钩子清理路径**:
- `.cursorrules`
- `.windsurfrules`
- `.github/copilot-instructions.md`
- `.continuerules`
- `.clinerules`
- `.roo-clinerules`
- `.aider.conf.yml`
- `.bolt/prompt`

**afterEach 钩子**:
- 恢复 `adapters` 配置为空对象

---

### 6. 复杂配置组合
**测试**: `Should handle complex adapter configuration`
- **配置示例**:
  ```json
  {
    "cursor": {
      "enabled": true,
      "autoUpdate": false,
      "sortBy": "priority",
      "sortOrder": "desc"
    }
  }
  ```
- **验证**:
  - ✅ 所有配置项正确保存
  - ✅ 读取时完整还原

### 7. 多适配器并存
**测试**: `Should save multiple adapters`
- **配置**:
  - cursor: enabled
  - copilot: enabled
  - continue: disabled
- **验证**:
  - ✅ 已启用的适配器保存
  - ✅ 未启用的适配器不保存

## 📦 支持的预设适配器

### 规则类型适配器（Rules, 8个）

| ID | 名称 | 输出文件 | 类型 |
|----|------|----------|------|
| cursor | Cursor | `.cursorrules` | file |
| windsurf | Windsurf | `.windsurfrules` | file |
| copilot | GitHub Copilot | `.github/copilot-instructions.md` | file |
| continue | Continue | `.continuerules` | file |
| cline | Cline | `.clinerules` | file |
| roo-cline | Roo-Cline | `.roo-clinerules` | file |
| aider | Aider | `.aider.conf.yml` | file |
| bolt | Bolt | `.bolt/prompt` | directory |

### 技能类型适配器（Skills, 2个）

| ID | 名称 | 输出目录 | 类型 |
|----|------|----------|------|
| cursor-skills | Cursor Skills | `.cursor/skills` | directory |
| copilot-skills | GitHub Copilot Skills | `.github/skills` | directory |

## 🎯 关键验证点

- ✅ 适配器完整性（10个全加载：8个规则 + 2个技能）
- ✅ 属性完整性（id/name/filePath/type）
- ✅ 命名规范（kebab-case）
- ✅ 配置持久化（读写一致）
- ✅ 排序功能（sortBy + sortOrder）
- ✅ 多适配器共存

---
