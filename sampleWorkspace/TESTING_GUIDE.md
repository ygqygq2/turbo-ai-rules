# 测试指南

## 测试工作区概览

本项目包含 **7 个测试场景**，全面覆盖插件的各种功能：

1. **rules-for-cursor** - Cursor 适配器 + 单一公开源
2. **rules-for-copilot** - Copilot 适配器 + 单一公开源
3. **rules-for-continue** - Continue 适配器 + 单一公开源
4. **rules-for-default** - 自定义适配器 (rules/ 目录) + 单一公开源
5. **rules-for-skills** - 技能适配器 + 规则同步页与快速同步的区分测试
6. **rules-multi-source** - 多规则源 + 冲突解决策略
7. **rules-with-user-rules** - 多适配器同时启用 + 用户规则保护功能

所有测试场景已预配置规则源，**无需交互输入**，可直接运行自动化测试。

## 自动化测试

### 重要修复说明

**已修复的问题**：

1. ✅ 输入提示框现在显示插件名称 "Turbo AI Rules - Add Source"
2. ✅ 测试工作区预配置的源现在可以被正确读取，不会再触发交互提示
3. ✅ `ConfigManager.getSources()` 现在会同时检查运行时状态和预配置设置

**工作原理**：

- 插件首先从 workspace state 读取运行时添加的源
- 如果没有运行时源，则从 `.vscode/settings.json` 读取预配置的源
- 这样测试工作区的预配置源就能被正确识别，避免触发交互提示

### 运行集成测试

```bash
# 运行所有集成测试（现在应该无交互）
pnpm test:suite:mocha

# 或者直接运行
pnpm test:suite
```

### 运行单元测试

```bash
# 运行所有单元测试
pnpm test:unit

# 运行测试覆盖率
pnpm test:coverage
```

### CI/CD 测试

GitHub Actions 会自动运行所有测试（包括 xvfb-run for Linux headless environment）。

## 测试场景详解

### 场景 1: Cursor 适配器（rules-for-cursor）

**测试目标**：

- Cursor `.cursorrules` 文件生成
- 单一公开 Git 仓库源
- 无认证访问

**预配置源**：

```json
{
  "id": "test-cursor-rules",
  "name": "Test Cursor Rules",
  "gitUrl": "https://github.com/ygqygq2/ai-rules.git",
  "branch": "main",
  "subPath": "/rules"
}
```

**验证点**：

- `.cursorrules/` 目录存在
- 规则文件按源 ID 组织
- Cursor 配置文件格式正确

### 场景 2: Copilot 适配器（rules-for-copilot）

**测试目标**：

- GitHub Copilot instructions 文件生成
- Markdown 格式输出
- 公开仓库访问

**预配置源**：

```json
{
  "id": "test-copilot-rules",
  "gitUrl": "https://github.com/github/copilot-docs.git",
  "branch": "main",
  "subPath": "/"
}
```

**验证点**：

- `.github/copilot-instructions.md` 文件生成
- Markdown 格式符合 Copilot 规范
- 内容正确合并

### 场景 3: Continue 适配器（rules-for-continue）

**测试目标**：

- Continue config.json 生成
- JSON 格式输出
- 公开文档仓库

**预配置源**：

```json
{
  "id": "test-continue-rules",
  "gitUrl": "https://github.com/continuedev/continue.git",
  "branch": "main",
  "subPath": "/docs"
}
```

**验证点**：

- `.continue/config.json` 文件生成
- JSON 格式正确
- Continue API 兼容性

### 场景 4: 自定义适配器 - 默认 rules/ 目录（rules-for-default）

**测试目标**：

- 自定义适配器配置
- `rules/` 目录组织结构
- 按源组织规则文件
- 生成索引文件

**预配置源**：

```json
{
  "id": "test-default-rules",
  "gitUrl": "https://github.com/ygqygq2/ai-rules.git",
  "branch": "main",
  "subPath": "/rules"
}
```

**自定义适配器配置**：

```json
{
  "turbo-ai-rules.adapters.custom": {
    "defaultRulesDirectory": {
      "enabled": true,
      "outputPath": "rules",
      "outputType": "directory",
      "organizeBySource": true
    }
  }
}
```

**验证点**：

- `rules/<source-id>/` 目录结构
- `rules/index.md` 索引文件生成
- 规则文件正确复制

### 场景 5: 多规则源 + 冲突解决（rules-multi-source）

**测试目标**：

- 多个规则源同时使用
- 冲突解决策略 (`priority`)
- 多个适配器同时启用
- 规则合并逻辑

**预配置源**：

```json
{
  "sources": [
    {
      "id": "source-1",
      "name": "High Priority Rules",
      "gitUrl": "https://github.com/ygqygq2/ai-rules.git"
    },
    {
      "id": "source-2",
      "name": "Secondary Rules",
      "gitUrl": "https://github.com/continuedev/continue.git",
      "subPath": "/docs"
    }
  ],
  "sync.conflictStrategy": "priority"
}
```

**启用适配器**：

- Cursor: ✅
- Copilot: ✅

**验证点**：

- 两个源都被克隆
- 冲突规则按优先级处理
- 多个配置文件同时生成
- 无重复规则 ID 错误

### 场景 5: 技能适配器 + 同步策略测试（rules-for-skills）

**测试目标**：

- 技能适配器的配置和生成
- 规则同步页可以选择技能适配器进行同步
- 快速同步不会同步到技能适配器
- 技能规则与普通规则的区分

**预配置源**：

```json
{
  "id": "example-skills",
  "name": "示例技能规则",
  "gitUrl": "https://github.com/ygqygq2/turbo-ai-rules.git",
  "branch": "main",
  "subPath": "rules"
}
```

**技能适配器配置**：

```json
{
  "turboAiRules.adapters.skills": [
    {
      "id": "python-skills",
      "name": "Python 开发技能",
      "enabled": true,
      "outputPath": ".skills/python-dev.md",
      "description": "Python 开发相关的技能和最佳实践"
    },
    {
      "id": "typescript-skills",
      "name": "TypeScript 开发技能",
      "enabled": true,
      "outputPath": ".skills/typescript-dev.md",
      "description": "TypeScript 开发相关的技能和最佳实践"
    }
  ]
}
```

**测试步骤**：

1. **规则同步页测试**：
   - 打开规则同步页
   - 验证技能适配器出现在列表中
   - 勾选技能适配器
   - 点击同步
   - 验证 `.skills/` 目录下生成了技能文件

2. **快速同步测试**：
   - 执行快速同步命令
   - 验证只有 Copilot 适配器被更新
   - 验证技能适配器**不会**被同步
   - 验证 `.skills/` 目录内容未改变

**验证点**：

- `.skills/python-dev.md` 生成（仅在规则同步页勾选时）
- `.skills/typescript-dev.md` 生成（仅在规则同步页勾选时）
- 快速同步不影响技能文件
- `.github/copilot-instructions.md` 正常更新（快速同步和规则同步页都会）

### 场景 6: 多适配器 + 用户规则保护（rules-with-user-rules）

**测试目标**：

- 所有适配器同时启用（Cursor、Copilot、Continue、Custom）
- `protectUserRules: true` 保护所有配置文件的用户内容
- 首次生成时保留现有文件内容
- 后续同步时只更新自动生成部分

**预配置源**：

```json
{
  "id": "ai-rules-7008d805",
  "name": "Test User Rules",
  "gitUrl": "https://github.com/ygqygq2/ai-rules.git",
  "branch": "main",
  "subPath": "/"
}
```

**启用适配器**：

- Cursor: ✅
- Copilot: ✅
- Continue: ✅
- Custom (rules/ 目录): ✅

**关键配置**：

```json
{
  "turbo-ai-rules.protectUserRules": true
}
```

**可预创建的用户文件**（用于测试保护功能）：

```
.cursorrules                         # Cursor 用户自定义规则
.github/copilot-instructions.md      # Copilot 用户自定义指令
.continue/config.json                # Continue 用户自定义配置（注意：JSON 格式需特殊处理）
```

**验证点**：

- 首次同步：所有现有文件内容被完全保留
- 自动生成的内容使用块标记包裹：`<!-- TURBO-AI-RULES:BEGIN/END -->`
- 后续同步：块标记外的用户内容保持不变，块标记内的内容被更新
- 多个适配器同时工作，配置文件互不干扰
- 规则源只克隆一次，被所有适配器共享

## 手动测试

### 1. 启动调试

1. 在 VS Code 中打开此项目
2. 按 `F5` 或从调试面板选择 **"Extension (Test Workspace)"**
3. 新窗口将打开测试工作区（包含 6 个测试文件夹）

### 2. 测试场景

#### 场景 1: 公开仓库 + Cursor 适配器

**工作区**: `rules-for-cursor`

1. 打开命令面板（Ctrl+Shift+P / Cmd+Shift+P）
2. 运行：`Turbo AI Rules: Add Source`
3. 输入公开仓库 URL：
   ```
   https://github.com/ygqygq2/ai-rules.git
   ```
4. 分支：`main`
5. SubPath：`/`
6. 名称：`Awesome Cursor Rules`
7. 认证类型：`None`
8. 运行：`Turbo AI Rules: Sync Rules`
9. **验证**：
   - 检查是否生成 `.cursorrules` 文件
   - 规则应该从 `/` 目录递归解析

#### 场景 2: HTTPS Token + Copilot 适配器

**工作区**: `rules-for-copilot`

1. 准备 GitHub Personal Access Token (Settings → Developer settings → Personal access tokens)
2. 运行：`Turbo AI Rules: Add Source`
3. 输入私有仓库 URL（示例使用公开仓库）：
   ```
   https://github.com/ygqygq2/ai-rules.git
   ```
4. 分支：`main`
5. SubPath：`/rules`
6. 名称：`Cursor Rules`
7. 认证类型：`None`（公开仓库）或 `HTTPS Token`（私有仓库）
8. 输入 Token：`ghp_xxxxxxxxxxxx`
9. 保存范围：`Project`（会自动添加到 .gitignore）
10. 运行：`Turbo AI Rules: Sync Rules`
11. **验证**：
    - 检查 `.github/copilot-instructions.md` 文件
    - 检查 `.turbo-ai-rules/sources.json` 文件
    - 检查 `.gitignore` 包含 `.turbo-ai-rules/`

#### 场景 3: 默认 SSH Key + Continue 适配器

**工作区**: `rules-for-continue`

**前提**：已配置 SSH key (`~/.ssh/id_rsa` 或 `~/.ssh/id_ed25519`)

1. 运行：`Turbo AI Rules: Add Source`
2. 输入 SSH 仓库 URL：
   ```
   git@github.com:PatrickJS/awesome-cursorrules.git
   ```
3. 分支：`main`
4. SubPath：`/rules`
5. 名称：`SSH Rules`
6. 认证类型：`SSH Key`
7. SSH Key 配置：`Default SSH Key`
8. Passphrase：根据实际情况选择
9. 保存范围：`Global`
10. 运行：`Turbo AI Rules: Sync Rules`
11. **验证**：
    - 检查 `.continue/config.json` 文件
    - 检查 `~/.config/turbo-ai-rules/sources.json` 文件

#### 场景 4: 自定义 SSH Key + 通用适配器 + 递归解析

**工作区**: `rules-for-default`

**前提**：准备自定义 SSH key（如 `~/.ssh/id_ed25519_custom`）

1. 运行：`Turbo AI Rules: Add Source`
2. 输入 SSH 仓库 URL：
   ```
   git@github.com:PatrickJS/awesome-cursorrules.git
   ```
3. 分支：`main`
4. SubPath：`/rules`（测试递归解析）
5. 名称：`Custom SSH Rules`
6. 认证类型：`SSH Key`
7. SSH Key 配置：`Custom SSH Key`
8. SSH Key 路径：`~/.ssh/id_ed25519_custom`
9. Passphrase：根据实际情况
10. 保存范围：`Project`
11. 运行：`Turbo AI Rules: Sync Rules`
12. **验证**：
    - 检查 `rules/<sourceId>/` 目录（包含所有规则文件）
    - 检查 `rules/index.md` 索引文件
    - 验证递归解析（最多 6 层深度，最多 500 文件）

### 3. 其他命令测试

#### 管理源

```
Turbo AI Rules: Manage Sources
```

- 查看所有源
- 启用/禁用源
- 删除源

#### 搜索规则

```
Turbo AI Rules: Search Rules
```

- 搜索规则内容
- 快速预览

#### 生成配置

```
Turbo AI Rules: Generate Configs
```

- 重新生成配置文件（不重新同步）

#### 删除源

```
Turbo AI Rules: Remove Source
```

- 删除指定源及其缓存

### 4. 验证清单

- [ ] 公开仓库克隆成功
- [ ] HTTPS Token 认证成功
- [ ] SSH 默认 key 认证成功
- [ ] SSH 自定义 key 认证成功
- [ ] SubPath 验证（支持相对路径，如 rules 或 docs/rules）
- [ ] 递归解析工作正常
- [ ] Cursor 适配器生成 `.cursorrules`
- [ ] Copilot 适配器生成 `.github/copilot-instructions.md`
- [ ] Continue 适配器生成 `.continue/config.json`
- [ ] 通用适配器生成 `rules/` 目录
- [ ] 项目级认证自动添加到 `.gitignore`
- [ ] 全局认证保存到 `~/.config/turbo-ai-rules/`
- [ ] 项目级认证保存到 `.turbo-ai-rules/`

### 5. 调试技巧

#### 查看日志

1. 打开输出面板：View → Output
2. 选择 "Turbo AI Rules" 通道
3. 查看详细日志

#### 查看缓存

```bash
# 全局缓存（仓库克隆）
ls ~/.cache/turbo-ai-rules/sources/

# 全局配置（认证信息）
cat ~/.config/turbo-ai-rules/sources.json

# 项目配置（认证信息）
cat .turbo-ai-rules/sources.json
```

#### 清理测试数据

```bash
# 清理全局缓存
rm -rf ~/.cache/turbo-ai-rules/

# 清理全局配置
rm -rf ~/.config/turbo-ai-rules/

# 清理项目配置
rm -rf .turbo-ai-rules/
```

### 6. 常见问题

#### Q: 克隆失败（HTTPS Token）

- 检查 Token 权限（需要 `repo` 权限）
- 检查 Token 格式（GitHub: `ghp_xxx`, GitLab: `glpat-xxx`）
- 查看输出面板日志

#### Q: SSH 认证失败

- 确保 SSH key 已添加到 GitHub/GitLab
- 检查 SSH key 路径是否正确
- 测试 SSH 连接：`ssh -T git@github.com`
- 如果有 passphrase，确保正确输入

#### Q: 递归解析未找到文件

- 检查 SubPath 是否正确（支持相对路径，如 rules 或 docs/rules）
- 确认仓库中有 `.md` 或 `.mdc` 文件
- 检查文件深度（默认最多 6 层）

#### Q: 配置未生成

- 确认适配器已启用（Settings → Turbo AI Rules → Adapters）
- 检查规则是否解析成功（查看日志）
- 验证工作区已打开

### 7. 示例公开仓库（用于测试）

**推荐测试仓库**：

```
https://github.com/ygqygq2/ai-rules.git
SubPath: /
```

其他可选：

```
https://github.com/continuedev/continue.git (SubPath: /docs)
https://github.com/github/copilot-docs.git (SubPath: /)
```

### 8. 成功标志

当所有功能正常时，您应该看到：

1. ✅ 源添加成功通知
2. ✅ 同步进度条显示
3. ✅ 生成配置文件通知
4. ✅ 对应的配置文件出现在工作区
5. ✅ 通用适配器的 `rules/` 目录和索引文件
6. ✅ 项目级 `.turbo-ai-rules/` 已添加到 `.gitignore`

---

## 高级测试

### 测试多源合并

1. 添加多个源（不同仓库）
2. 同步所有源
3. 检查规则合并策略（priority/merge/overwrite）

### 测试冲突策略

1. 添加两个有相同规则 ID 的源
2. 配置不同的冲突策略
3. 验证合并结果

### 测试增量同步

1. 同步一次
2. 修改远程仓库
3. 再次同步
4. 验证只拉取更新（git pull）

---

**祝测试顺利！**
