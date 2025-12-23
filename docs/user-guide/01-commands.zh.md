# 命令详解

> Turbo AI Rules 所有可用命令的完整指南

[English](./commands.md) | [中文](./commands.zh.md)

---

## 概览

扩展提供 6 个核心命令，涵盖规则源管理、同步和配置生成的完整流程。

### 快速访问

- **状态栏**: 点击 **🤖 AI Rules** 图标
- **命令面板**: `Ctrl+Shift+P` → 输入 `Turbo AI Rules`
- **树视图**: 在 **AI Rules** 侧边栏右键点击

### 树视图图标说明

扩展使用**彩色图标**表示规则优先级:

- 🔴 **红色** - 高优先级 (HIGH)
- 🟡 **黄色** - 中优先级 (MEDIUM)
- ⚪ **白色** - 普通优先级 (NORMAL)
- ⚫ **灰色** - 低优先级 (LOW)

规则描述中的标记含义:

- **✓ 已选** - 规则已被选中用于生成配置
- **+N** - 显示标签数量(如 `+3` 表示还有 3 个未显示的标签)

---

## 1. 🔗 添加规则源

**命令**: `Turbo AI Rules: Add Source`

**功能**: 添加新的 Git 规则仓库作为规则源

### 使用场景

- 首次配置扩展
- 添加团队共享的规则仓库
- 添加个人的规则仓库
- 添加社区优质规则源

### 操作步骤

1. 执行命令（或点击状态栏/树视图的 + 按钮）
2. 输入 Git 仓库 URL
   - 公开仓库: `https://github.com/username/repo.git`
   - 私有仓库: 需要在后续步骤提供访问令牌
3. 选择分支（可选，默认 `main`）
4. 指定子路径（可选，如 `rules` 或 `docs/rules`）
5. 设置显示名称（可选，方便在树视图中识别）
6. 提供访问令牌（仅私有仓库需要）

### 示例

```
URL:      https://github.com/company/coding-rules.git
分支:     main
子路径:   /best-practices
名称:     Company Rules
Token:    ghp_xxxxxxxxxxxx (私有仓库)
```

### 提示

- 🔐 访问令牌仅需 `repo`（完整仓库访问）权限
- 📁 使用子路径可以只同步仓库中的特定目录
- 🏷️ 设置清晰的名称便于管理多个规则源

---

## 2. 🗑️ 删除规则源

**命令**: `Turbo AI Rules: Remove Source`

**功能**: 删除已添加的规则源

### 使用场景

- 移除不再需要的规则源
- 清理过期的规则仓库
- 移除团队不再使用的规则

### 操作步骤

1. 执行命令
2. 从列表中选择要删除的规则源
3. 确认删除操作

**或者**:

- 在树视图中右键点击规则源
- 选择 **Remove**

### 重要提示

- ⚠️ 删除规则源会从缓存中移除该源的所有规则
- 🔄 删除后会自动重新生成配置文件（不包含该源的规则）
- 💾 本地 Git 克隆会被删除，但不影响远程仓库

---

## 3. 🔄 同步规则

**命令**: `Turbo AI Rules: Sync Rules`

**功能**: 从所有已启用的规则源同步最新规则

### 使用场景

- 获取规则源的最新更新
- 首次添加规则源后同步
- 手动触发规则更新（当自动同步未及时触发）

### 操作步骤

1. 执行命令（或点击树视图的 🔄 按钮）
2. 扩展会依次:
   - 从 Git 仓库拉取最新代码（`git pull`）
   - 解析所有规则文件（`.md` 格式）
   - 应用冲突解决策略（如有重复规则）
   - 自动生成所有已启用的配置文件

### 输出日志示例

```
[Turbo AI Rules] Syncing rules from 3 sources...
[Turbo AI Rules] ✓ Synced: Company Rules (15 rules)
[Turbo AI Rules] ✓ Synced: Personal Rules (8 rules)
[Turbo AI Rules] ✓ Synced: Community Rules (42 rules)
[Turbo AI Rules] Total: 65 rules synced
[Turbo AI Rules] Generating config files...
[Turbo AI Rules] ✓ Generated: .cursorrules
[Turbo AI Rules] ✓ Generated: .github/copilot-instructions.md
[Turbo AI Rules] ✓ Generated: rules/index.md
[Turbo AI Rules] Sync completed successfully!
```

### 配置选项

- `sync.onStartup`: VS Code 启动时自动同步（默认: `true`）
- `sync.interval`: 自动同步间隔（分钟）（默认: `60`）
- `sync.conflictStrategy`: 冲突解决策略（默认: `priority`）

详见[02. 配置指南](./02-configuration.zh.md)。

### 提示

- ⏱️ 首次同步可能需要几秒到几分钟（取决于规则数量）
- 🌐 需要网络连接访问 Git 仓库
- 📊 可在 Output 面板查看详细同步日志

---

## 4. 🔍 搜索规则

**命令**: `Turbo AI Rules: Search Rules`

**功能**: 在所有已同步的规则中搜索特定内容

### 使用场景

- 查找特定技术栈的规则（如 "TypeScript", "React"）
- 搜索特定主题的规则（如 "naming", "testing"）
- 浏览可用的规则列表

### 操作步骤

1. 执行命令
2. 输入搜索关键词（支持模糊搜索）
3. 从结果列表中选择规则查看详情

### 搜索范围

- 规则 ID（`id`）
- 规则标题（`title`）
- 规则标签（`tags`）
- 规则描述（`description`）

### 示例

```
搜索: "typescript"
结果:
  - TypeScript Naming Conventions
  - TypeScript Best Practices
  - TypeScript Testing Guide
  - React + TypeScript Patterns
```

### 提示

- 🔤 搜索不区分大小写
- 🏷️ 可以通过标签快速过滤（如 `#react`, `#testing`）
- 📄 选择规则后会在编辑器中预览规则内容

---

## 5. 📝 生成配置文件

**命令**: `Turbo AI Rules: Generate Config Files`

**功能**: 手动重新生成所有 AI 工具的配置文件

### 使用场景

- 配置文件被意外删除或修改
- 更改了适配器配置后重新生成
- 手动验证配置文件生成逻辑

### 操作步骤

1. 执行命令
2. 扩展会根据当前配置重新生成所有已启用的配置文件

### 生成的文件

```
✅ Cursor:       .cursorrules
✅ Copilot:      .github/copilot-instructions.md
⚙️ Continue:     .continuerules (如果启用)
✅ Custom:       根据自定义适配器配置生成
```

### 重要提示

- ⚠️ **会覆盖现有配置文件**，手动修改会丢失
- 💡 推荐修改规则源而非配置文件本身
- 🔄 同步规则时会自动调用此命令

### 提示

- 如果不想某个工具的配置被生成，在设置中禁用对应适配器
- 自定义适配器支持配置多个输出目标

---

## 6. ⚙️ 管理规则源

**命令**: `Turbo AI Rules: Manage Sources`

**功能**: 编辑现有规则源的配置

### 使用场景

- 更改规则源的分支（如从 `main` 切换到 `develop`）
- 修改子路径（调整规则文件所在目录）
- 更新显示名称
- 更新访问令牌（Token 过期或更换）
- 启用/禁用规则源

### 操作步骤

1. 执行命令
2. 选择要管理的规则源
3. 选择要修改的属性:
   - **Branch**: 更改 Git 分支
   - **Subpath**: 修改子路径
   - **Display Name**: 更新显示名称
   - **Token**: 更新访问令牌
   - **Enable/Disable**: 启用或禁用该源

**或者**:

- 在树视图中右键点击规则源
- 选择对应的操作（Enable/Disable/Edit）

### 示例场景

#### 场景 1: 切换到开发分支

```
规则源: Company Rules
操作:   更改分支
旧值:   main
新值:   develop
```

#### 场景 2: 更新过期 Token

```
规则源: Private Rules
操作:   更新 Token
新值:   ghp_newtoken123456
```

#### 场景 3: 临时禁用规则源

```
规则源: Experimental Rules
操作:   Disable
效果:   该源的规则不再包含在配置文件中
```

### 提示

- 🔄 修改配置后会自动重新同步
- 💾 配置持久化保存在工作区设置中
- 🌲 树视图会实时反映启用/禁用状态

---

## 7. 高级命令

### 7.1 UI 与可视化命令

#### 📊 显示统计信息

**命令**: `Turbo AI Rules: Show Statistics`

显示统计仪表板，包含：

- 按源分类的规则总数
- 按优先级分布的规则
- 标签云和分类细分
- 同步历史和趋势

#### 🏠 打开仪表板

**命令**: `Turbo AI Rules: Open Dashboard`

打开主仪表板 webview，快速访问所有功能。

#### 🔍 高级搜索

**命令**: `Turbo AI Rules: Advanced Rule Search`

打开高级搜索界面，支持：

- 多字段搜索（标题、标签、内容）
- 按源、优先级、标签过滤
- 搜索结果预览
- 导出搜索结果

#### 📋 打开规则同步页面

**命令**: `Turbo AI Rules: Open Rule Sync Page`

打开规则选择界面，以文件树视图选择要同步的特定规则。

#### ℹ️ 查看源详情

**命令**: `Turbo AI Rules: View Source Detail`

查看规则源的详细信息，包括：

- Git 仓库信息
- 同步状态和历史
- 规则统计
- 配置详情

### 7.2 规则管理命令

#### ✅ 全选规则

**命令**: `Turbo AI Rules: Select All Rules`

选择所有源的所有规则用于配置生成。

#### ❌ 取消全选规则

**命令**: `Turbo AI Rules: Deselect All Rules`

取消选择所有规则（用于重新开始选择）。

#### 📋 选择规则

**命令**: `Turbo AI Rules: Select Rules`

打开特定源的规则选择器，选择要包含的规则。

#### 📄 复制规则内容

**命令**: `Turbo AI Rules: Copy Rule Content`

将选定规则的内容复制到剪贴板。

#### 📤 导出规则

**命令**: `Turbo AI Rules: Export Rule`

将规则导出为独立文件。

#### 👁️ 忽略规则

**命令**: `Turbo AI Rules: Ignore Rule`

将规则标记为忽略（不会包含在配置生成中）。

### 7.3 源管理命令

#### ✏️ 编辑源

**命令**: `Turbo AI Rules: Edit Source`

快速编辑源属性（分支、子路径、名称、令牌）。

#### 🔌 测试连接

**命令**: `Turbo AI Rules: Test Connection`

测试源的 Git 连接和身份验证。

#### 🔄 切换源状态

**命令**: `Turbo AI Rules: Toggle Source`

快速启用/禁用规则源。

#### ⚙️ 打开源管理器

**命令**: `Turbo AI Rules: Open Source Manager`

打开综合源管理界面。

### 7.4 系统命令

#### 🔄 重新加载设置

**命令**: `Turbo AI Rules: Reload Settings`

从工作区/用户配置重新加载扩展设置。

#### 🔄 刷新 Git 缓存

**命令**: `Turbo AI Rules: Refresh Git Cache`

强制刷新所有源的 Git 缓存。

#### 🔄 刷新

**命令**: `Turbo AI Rules: Refresh`

刷新树视图显示。

#### ⚙️ 管理适配器

**命令**: `Turbo AI Rules: Manage Adapters`

配置 AI 工具适配器（Cursor、Copilot、Continue、自定义）。

#### 🗑️ 清除工作区状态（调试）

**命令**: `Turbo AI Rules: Clear Workspace State`

清除所有工作区状态数据（用于调试）。

### 7.5 通过上下文菜单快速访问

大多数高级命令可通过以下方式访问：

- **树视图**: 右键点击源或规则
- **状态栏**: 点击 🤖 AI Rules 图标
- **命令面板**: `Ctrl+Shift+P` → 输入命令名称

---

## 🎯 推荐工作流程

### 首次使用

1. **初始化**: `Add Source` → 添加规则源
2. **同步**: `Sync Rules` → 获取规则
3. **验证**: 检查生成的配置文件
4. **开始使用**: AI 工具会自动加载规则

### 日常使用

1. **更新**: 定期 `Sync Rules` 获取最新更新
2. **搜索**: 使用 `Search Rules` 查找特定规则
3. **调整**: 通过 `Manage Sources` 调整配置

### 团队协作

1. **共享源**: 团队成员添加相同的规则源
2. **同步设置**: 在版本控制中共享 `.vscode/settings.json`
3. **定期更新**: 团队定期同步规则

---

## 🆘 故障排查

### 命令找不到

- 确保扩展已正确安装并激活
- 检查 VS Code 扩展视图是否有错误
- 尝试重新加载 VS Code

### 同步失败

- 查看 Output 面板 → "Turbo AI Rules" 获取详细错误日志
- 验证网络连接
- 确认 Git 仓库 URL 和 Token（私有仓库）

### 配置文件未生成

- 检查对应的适配器是否在设置中启用
- 验证工作区是否打开了根文件夹
- 尝试手动运行 `Generate Config Files` 命令

---

## 📚 相关文档

- [02. 配置指南](./02-configuration.zh.md) - 详细的配置选项
- [03. 规则文件格式](./03-rule-format.zh.md) - 如何编写规则
- [04. 常见问题](./04-faq.zh.md) - 常见问题解答

---

[⬅️ 返回用户指南](./README.zh.md)
