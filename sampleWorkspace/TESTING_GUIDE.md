# 测试指南

## 工作区分类原则

测试工作区按**功能维度**分类，而非按配置项分类。新测试应复用现有工作区，避免为单个配置创建独立工作区。

### 分类维度

1. **适配器类型**（单一适配器测试）
   - `rules-for-cursor` - Cursor 适配器
   - `rules-for-copilot` - Copilot 适配器
   - `rules-for-continue` - Continue 适配器
   - `rules-for-default` - 自定义适配器（rules/ 目录）
   - `rules-for-skills` - 技能适配器

2. **功能场景**（复杂功能测试）
   - `rules-multi-source` - 多规则源 + 冲突解决
   - `rules-with-user-rules` - 多适配器 + 用户规则保护
   - `rules-generate-test` - 配置生成 + 共享选择存储

### 新测试添加指南

**添加新测试前，先问自己：**

1. **是否属于适配器测试？** → 添加到对应的 `rules-for-*` 工作区
2. **是否属于存储/状态管理？** → 添加到 `rules-generate-test`
3. **是否属于多源/冲突处理？** → 添加到 `rules-multi-source`
4. **是否属于用户内容保护？** → 添加到 `rules-with-user-rules`
5. **是否是全新的功能维度？** → 考虑创建新工作区（需充分理由）

**示例：**

- ❌ 不要为 `enableSharedSelection` 创建独立工作区
- ✅ 应该整合到 `rules-generate-test`（配置生成相关）
- ❌ 不要为 `autoGitignore` 创建独立工作区
- ✅ 应该整合到现有工作区的配置中

## 测试工作区列表

所有工作区已预配置规则源，**无需交互输入**。

## 快速开始

### 运行测试

```bash
# 集成测试（Mocha）
pnpm test:suite:mocha

# 单元测试（Vitest）
pnpm test:unit

# 测试覆盖率
pnpm test:coverage
```

## 工作区详解

### 1. rules-for-cursor

**测试内容**：Cursor 适配器 + 单一公开源  
**验证点**：`.cursorrules` 文件生成、格式正确

### 2. rules-for-copilot

**测试内容**：Copilot 适配器 + Markdown 格式输出  
**验证点**：`.github/copilot-instructions.md` 生成、格式符合规范

### 3. rules-for-continue

**测试内容**：Continue 适配器 + JSON 格式输出  
**验证点**：`.continue/config.json` 生成、API 兼容性

### 4. rules-for-default

**测试内容**：自定义适配器 + rules/ 目录组织  
**验证点**：`rules/<source-id>/` 目录结构、`rules/index.md` 索引文件

### 5. rules-multi-source

**测试内容**：多规则源 + 冲突解决策略（priority）  
**验证点**：多源克隆、冲突按优先级处理、多配置文件生成

### 6. rules-for-skills

**测试内容**：技能适配器 + 同步策略区分  
**验证点**：`.skills/` 文件生成、规则同步页可选技能、快速同步不影响技能

### 7. rules-with-user-rules

**测试内容**：多适配器同时启用 + 用户规则保护（`protectUserRules: true`）  
**验证点**：用户内容保留、块标记正确、多适配器互不干扰

### 8. rules-generate-test

**测试内容**：配置生成 + 共享选择存储（`enableSharedSelection: true`）  
**验证点**：配置文件生成、`.turbo-ai-rules/selections.json` 创建和加载、多源选择存储

## 手动测试

按 `F5` 启动调试，新窗口将打开包含所有测试工作区的多工作区环境。

### 测试场景

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
