# 配置与同步策略

> 本文档描述 Turbo AI Rules 的配置管理、同步调度和冲突解决策略。

---

## 1. 配置管理

### 1.1 配置层级

Turbo AI Rules 支持多层级配置，优先级从高到低：

```
1. 工作区配置 (Workspace Settings)
   • 项目特定配置
   • 存储在 .vscode/settings.json
   • 优先级最高

2. 用户配置 (User Settings)
   • 跨项目的全局配置
   • 存储在用户设置文件
   • 作为默认值

3. 默认配置 (Default Settings)
   • 扩展内置的默认值
   • 代码中定义
   • 兜底配置
```

### 1.2 配置结构

完整的配置结构包含四大部分：

```
ExtensionConfig
├── sources           # 规则源配置
│   ├── id            # 唯一标识 (kebab-case)
│   ├── name          # 显示名称
│   ├── gitUrl        # Git 仓库 URL
│   ├── branch        # 分支名 (默认 main)
│   ├── subPath       # 子目录路径 (可选)
│   ├── enabled       # 是否启用
│   ├── syncInterval  # 同步间隔 (秒)
│   └── auth          # 认证配置
│       ├── type      # none | token | ssh
│       └── token     # Token (存储在 Secret Storage)
│
├── storage           # 存储策略
│   ├── useGlobalCache   # 是否使用全局缓存
│   ├── projectLocalDir  # 项目本地目录
│   └── autoGitignore    # 自动添加 .gitignore
│
├── adapters          # 适配器配置
│   ├── cursor        # Cursor 适配器
│   ├── copilot       # GitHub Copilot 适配器
│   ├── continue      # Continue.dev 适配器
│   └── custom        # 自定义适配器
│
└── sync              # 同步策略
    ├── auto          # 是否自动同步
    ├── interval      # 自动同步间隔 (秒)
    └── onStartup     # 启动时同步
```

### 1.3 配置示例

```json
{
  "turboAiRules.sources": [
    {
      "id": "typescript-rules",
      "name": "TypeScript Best Practices",
      "gitUrl": "https://github.com/example/ts-rules.git",
      "branch": "main",
      "subPath": "rules",
      "enabled": true,
      "syncInterval": 3600,
      "auth": {
        "type": "token"
      }
    }
  ],
  "turboAiRules.storage": {
    "useGlobalCache": true,
    "projectLocalDir": ".ai-rules",
    "autoGitignore": true
  },
  "turboAiRules.adapters": {
    "cursor": {
      "enabled": true,
      "autoUpdate": true
    },
    "copilot": {
      "enabled": true,
      "autoUpdate": true
    },
    "continue": {
      "enabled": false
    }
  },
  "turboAiRules.sync": {
    "auto": true,
    "interval": 3600,
    "onStartup": true
  }
}
```

---

## 2. 同步调度 (SyncScheduler)

### 2.1 触发机制

同步可通过以下方式触发：

- **手动触发**: 用户执行 `turbo-ai-rules.syncRules` 命令
- **定时触发**: 根据 `syncInterval` 配置定时同步
- **启动触发**: 扩展激活时根据 `onStartup` 配置同步
- **文件监听触发**: 监听配置文件变化自动同步

### 2.2 同步流程

```
1. 检查是否需要同步
   • 距离上次同步是否超过间隔
   • 是否有未同步的规则源
   ↓
2. 遍历启用的规则源
   • 跳过禁用的源
   • 检查网络连接
   ↓
3. 拉取 Git 更新
   • 使用 GitManager 拉取
   • 处理认证和冲突
   ↓
4. 增量解析规则
   • 只解析变化的文件
   • 更新规则索引
   ↓
5. 合并规则
   • 处理规则冲突
   • 应用冲突解决策略
   ↓
6. 生成配置文件
   • 调用启用的适配器
   • 写入目标文件
   ↓
7. 更新 UI
   • 刷新 TreeView
   • 更新状态栏
   ↓
8. 通知用户
   • 显示同步结果
   • 报告错误和警告
```

### 2.3 防抖与节流

- **防抖 (Debounce)**: 文件监听使用 300ms 防抖，避免频繁触发
- **节流 (Throttle)**: 自动同步使用 60 秒节流，避免过度请求
- **并发控制**: 限制同时同步的规则源数量（默认 3 个）

---

## 3. 冲突解决策略

### 3.1 冲突类型

- **规则 ID 冲突**: 多个规则源包含相同 ID 的规则
- **文件路径冲突**: 多个适配器生成相同目标文件
- **Git 冲突**: 拉取时本地有未提交的修改
- **配置冲突**: 工作区和用户配置不一致

### 3.2 规则冲突解决

支持三种冲突解决策略：

**1. priority (默认策略)**

- 高优先级规则覆盖低优先级规则
- 相同优先级时，先添加的规则源优先
- 在生成的配置中添加注释说明冲突来源

**2. merge**

- 合并规则内容（需适配器支持）
- 保留所有规则的元数据
- 标记合并来源

**3. skip-duplicates**

- 保留第一个规则
- 跳过重复的规则
- 记录跳过的规则 ID

### 3.3 配置冲突解决

- **工作区优先**: 工作区配置覆盖用户配置
- **验证合并**: 合并前验证配置有效性
- **冲突提示**: 冲突时提示用户选择

### 3.4 Git 冲突解决

- **Stash 策略**: 拉取前 stash 本地修改
- **Reset 策略**: 强制重置到远程分支（可选）
- **手动解决**: 提示用户手动解决冲突

---

## 4. 增量同步

### 4.1 变更检测

- **Git 状态检测**: 使用 `git status` 检测文件变化
- **时间戳比对**: 比对文件修改时间
- **哈希校验**: 使用文件哈希检测内容变化

### 4.2 增量处理

- **只解析变化的文件**: 跳过未修改的文件
- **增量索引更新**: 只更新变化的规则索引
- **部分生成**: 只重新生成受影响的配置

### 4.3 缓存利用

- **解析缓存**: 缓存解析结果，避免重复解析
- **索引缓存**: 缓存规则索引，避免重复读取
- **Git 缓存**: 利用 Git 的 delta 压缩机制

---

## 5. 网络处理

### 5.1 网络检测

- **连接检测**: 同步前检测网络连接
- **超时处理**: 设置合理的超时时间（默认 30 秒）
- **重试机制**: 网络失败时自动重试（最多 3 次）

### 5.2 离线模式

- **离线检测**: 检测网络不可用时切换到离线模式
- **使用缓存**: 离线时使用本地缓存的规则
- **延迟同步**: 网络恢复后自动同步

### 5.3 代理支持

- **代理配置**: 支持配置 HTTP/HTTPS 代理
- **环境变量**: 自动读取 `HTTP_PROXY` 和 `HTTPS_PROXY`
- **认证代理**: 支持需要认证的代理服务器

---

## 6. 认证管理

### 6.1 认证类型

- **无认证 (none)**: 公开仓库，无需认证
- **Token 认证 (token)**: 使用 Personal Access Token
- **SSH 认证 (ssh)**: 使用 SSH Key

### 6.2 Token 存储

- **Secret Storage**: 使用 VSCode Secret Storage 加密存储
- **存储格式**: `turboAiRules.token.${sourceId}`
- **自动清理**: 删除规则源时自动清理 Token

### 6.3 SSH Key 管理

- **系统 SSH Key**: 使用系统默认 SSH Key
- **自定义路径**: 支持配置自定义 SSH Key 路径
- **Passphrase**: 提示用户输入 SSH Key 密码

---

## 7. 错误处理

### 7.1 同步错误

- **TAI-2002**: 克隆失败（网络/权限/URL 错误）
- **TAI-2003**: 拉取失败（网络中断/冲突）
- **TAI-2004**: 认证失败（Token 过期/SSH Key 错误）

### 7.2 错误恢复

- **自动重试**: 网络错误自动重试
- **降级处理**: 失败时跳过该源继续处理其他源
- **通知用户**: 显示错误信息和建议操作

### 7.3 日志记录

- **详细日志**: 记录同步的每个步骤
- **错误上下文**: 记录错误发生时的上下文信息
- **性能指标**: 记录同步耗时和文件数量

---

## 8. 性能优化

### 8.1 并行同步

- **限制并发**: 限制同时同步的规则源数量（默认 3 个）
- **优先级队列**: 高优先级规则源优先同步
- **工作队列**: 使用工作队列模式控制并发

### 8.2 缓存策略

- **LRU 缓存**: 使用 LRU 算法缓存解析结果
- **缓存大小**: 默认缓存 100 个规则文件
- **缓存过期**: 支持配置缓存过期时间

### 8.3 资源管理

- **内存限制**: 监控内存使用，避免内存溢出
- **磁盘空间**: 检查磁盘空间，不足时提示清理
- **进程管理**: 使用子进程执行 Git 操作，避免阻塞主进程

---

> **返回**: [01-design.md](./01-design.md) - 产品整体设计
