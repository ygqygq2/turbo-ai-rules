# Turbo AI Rules - 架构设计文档

> **项目概述**: 一个 VSCode 扩展,用于从外部 Git 仓库同步 AI 编程规则,并自动生成适配 Cursor、GitHub Copilot、Continue 等 AI 工具的配置文件。

## 📋 目录

1. [项目背景](#项目背景)
2. [核心理念](#核心理念)
3. [架构设计](#架构设计)
4. [核心模块](#核心模块)
5. [数据流程](#数据流程)
6. [文件结构](#文件结构)
7. [配置系统](#配置系统)
8. [扩展点](#扩展点)
9. [技术决策](#技术决策)

---

## 项目背景

### 问题场景

在 AI 辅助编程时代，不同的 AI 工具（Cursor、GitHub Copilot、Continue 等）都支持自定义编码规则，但存在以下痛点：

1. **格式不统一**: 每个工具有自己的配置文件格式

   - Cursor: `.cursorrules` (Markdown)
   - GitHub Copilot: `.github/copilot-instructions.md` (Markdown)
   - Continue: `.continuerules` (Markdown)

2. **规则分散**: 团队规则分散在多个仓库、文档中，难以统一管理

3. **同步困难**: 规则更新后，需要手动复制到每个项目

4. **缺乏版本控制**: 难以追踪规则的变更历史

### 解决方案

**Turbo AI Rules** 作为一个"智能规则聚合器"，提供：

- ✅ **统一管理**: 从外部 Git 仓库集中管理规则
- ✅ **自动同步**: 后台自动检测并同步规则更新
- ✅ **多工具适配**: 自动生成不同 AI 工具的配置文件
- ✅ **冲突解决**: 智能合并和去重规则
- ✅ **版本控制**: 规则源基于 Git，天然支持版本管理

---

## 核心理念

### 1. 桥接模式 (Bridge Pattern)

本扩展作为**外部规则仓库**和**AI 工具配置文件**之间的桥梁：

```
Git 规则仓库 ──→ [Turbo AI Rules] ──→ AI 工具配置文件
(统一 MDC 格式)     (解析/转换/合并)      (各工具特定格式)
```

### 2. 分离关注点 (Separation of Concerns)

- **规则定义**: MDC 格式 (Markdown + YAML Frontmatter)，存储在 Git 仓库
- **规则管理**: 扩展负责同步、索引、搜索、冲突解决
- **规则适配**: 适配器模式，每个 AI 工具有独立适配器

### 3. 智能缓存策略

- **全局缓存**: `~/.cache/turbo-ai-rules/sources/` - 所有项目共享
- **项目缓存**: `.ai-rules/` - 项目特定元数据（可选）
- **自动 .gitignore**: 防止缓存文件提交到版本控制

---

## 架构设计

### 整体架构图

```
┌────────────────────────────────────────────────────────────────┐
│                      VSCode Extension                           │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  UI Layer (Views)                         │  │
│  │  • RulesTreeProvider (侧边栏规则树)                      │  │
│  │  • StatusBarProvider (状态栏显示)

让我分析一下当前主流 AI 编程工具的情况：

### 1️⃣ **Cursor**

- **配置文件**: `.cursorrules` (项目根目录)
- **格式**: 纯文本 Markdown
- **外部引用**: ❌ **不支持** 直接引用外部 URL 或 Git 仓库
- **机制**: 只读取本地 `.cursorrules` 文件内容

### 2️⃣ **GitHub Copilot**

- **配置文件**: `.github/copilot-instructions.md` 或 `.github/copilot-instructions.md`
- **格式**: Markdown
- **外部引用**: ❌ **不支持** 外部引用
- **机制**: 只读取仓库内的文件

### 3️⃣ **Continue.dev**

- **配置文件**: `.continuerules` 或通过 `config.json` 配置
- **格式**: Markdown
- **外部引用**: ❌ **不支持** 直接外部引用
- **机制**: 本地文件读取

### 4️⃣ **Codeium**

- **配置**: 通过 Web UI 或本地配置
- **外部引用**: ❌ **不支持**

### 5️⃣ **Amazon CodeWhisperer**

- **配置**: IDE 内置配置
- **外部引用**: ❌ **不支持**

---

## 🎯 **结论与建议方案**

你的担心完全正确！**当前所有主流 AI 编程工具都不支持直接引用外部 URL 或 Git 仓库的 rules**。它们都只能读取项目内的本地文件。

因此，我建议采用 **混合方案**，兼顾灵活性和实用性：

---

## 🔄 **优化后的架构设计**

### **核心理念**

扩展作为 **"Rules 聚合与同步工具"**，将外部 Git 仓库的 rules 同步到本地，并自动生成各个 AI 工具能识别的配置文件。

---

### **方案对比**

| 方案                            | 优点                 | 缺点                    | 推荐度            |
| ------------------------------- | -------------------- | ----------------------- | ----------------- |
| **方案 A: 全局缓存 + 自动生成** | 不污染项目，统一管理 | 需要手动触发生成        | ⭐⭐⭐            |
| **方案 B: 项目内 + .gitignore** | 简单直接，自动同步   | 可能忘记配置 .gitignore | ⭐⭐⭐⭐          |
| **方案 C: 符号链接**            | 优雅，共享缓存       | Windows 支持差          | ⭐⭐              |
| **方案 D: 动态注入**            | 最灵活               | 需要 AI 工具支持 API    | ⭐⭐⭐⭐⭐ (未来) |

---

## 🏗️ **推荐方案：智能混合模式**

### **核心思路**

1. **全局缓存**: 外部 Git 仓库统一缓存到 `~/.turbo-ai-rules/`
2. **项目生成**: 根据用户选择，生成到项目内的 `.ai-rules/` 目录
3. **自动合并**: 将多个源的 rules 合并生成各 AI 工具的配置文件
4. **智能 .gitignore**: 自动检测并更新 .gitignore
5. **透明同步**: 后台自动同步，用户无感知

---

### **新的架构设计**

```

┌─────────────────────────────────────────────────────────────┐
│ VSCode Extension │
├─────────────────────────────────────────────────────────────┤
│ │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ UI & Command Layer │ │
│ │ • Add Source • Sync • Generate • Preview │ │
│ └──────────────────────────────────────────────────────┘ │
│ ↓ │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Service Orchestrator │ │
│ │ 负责协调各个服务，智能决策存储位置 │ │
│ └──────────────────────────────────────────────────────┘ │
│ ↓ │
│ ┌─────────────┬──────────────┬──────────────┬──────────┐ │
│ │ GitManager │ RulesManager │ FileGenerator│ AIAdapter│ │
│ │ │ │ │ │ │
│ │ • Clone │ • Parse │ • Merge │ • Cursor │ │
│ │ • Pull │ • Index │ • Generate │ • Copilot│ │
│ │ • Cache │ • Search │ • Watch │ • Continue│ │
│ └─────────────┴──────────────┴──────────────┴──────────┘ │
│ ↓ │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Storage Strategy │ │
│ │ │ │
│ │ Global Cache: ~/.turbo-ai-rules/sources/ │ │
│ │ │ │
│ │ Project Local: <workspace>/.ai-rules/ │ │
│ │ ├── .gitignore (自动添加) │ │
│ │ ├── merged-rules.md (合并后) │ │
│ │ └── sources.json (元数据) │ │
│ │ │ │
│ │ AI Tool Configs: │ │
│ │ • .cursorrules │ │
│ │ • .github/copilot-instructions.md │ │
│ │ • .continuerules │ │
│ └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

````

---

### **详细设计**

#### **1. 存储策略**

```typescript
#### 1. 存储策略（设计说明）

- 全局缓存（Global Cache）: 用于存放从外部 Git 仓库克隆下来的规则仓库副本。建议路径为 `~/.turbo-ai-rules/sources/`（或遵从 XDG 标准的缓存目录）。全局缓存的好处是节省磁盘空间并加速多项目复用。
- 项目本地目录（Project Local）: 在用户工作区内创建一个可选目录（默认 `.ai-rules/`），用于存放当前项目需要的规则的本地副本、合并结果和元数据（例如 `sources.json`、`merged-rules.md`）。该目录应默认加入 `.gitignore`（可由扩展自动管理），并允许用户选择禁用将部分文件提交到仓库。
- 生成位置（Generated Files）: 支持两种主要生成位置：写入到项目根（例如 `.cursorrules`）或写入到 `.ai-rules/` 下并通过 `.gitignore` 隐藏。生成位置为可配置项。
- 数据保留与清理: 支持缓存清理接口（针对单个源或全部缓存），并在清理时提供日志与确认，避免误删。

  // 项目本地目录
  projectLocal: {
    enabled: boolean;
    path: string; // .ai-rules/ 或 .turbo-ai-rules/
    autoGitignore: boolean;
  };

  // 生成位置
  generatedFiles: {
    location: 'project-root' | 'ai-rules-dir';
    files: GeneratedFile[];
  };
}

interface GeneratedFile {
  target: 'cursor' | 'copilot' | 'continue' | 'custom';
  path: string; // .cursorrules
  template: string; // 生成模板
  autoUpdate: boolean; // 是否自动更新
}
````

#### **2. 工作流程**

```
用户添加 Git 源
    ↓
1. Clone 到全局缓存 (~/.turbo-ai-rules/sources/company-rules/)
    ↓
2. 解析 MDC 文件，建立索引
    ↓
3. 询问用户: "为当前项目启用哪些 rules？"
    ↓
4. 用户选择要启用的 sources 和具体 rules
    ↓
5. 在项目内创建 .ai-rules/ 目录
    ↓
6. 自动更新 .gitignore (添加 .ai-rules/)
    ↓
7. 根据用户配置生成 AI 工具配置文件:
       • .github/copilot-instructions.md (Copilot, 默认启用)
       • .cursorrules (Cursor, 需手动启用)
       • .continuerules (Continue, 需手动启用)
    ↓
8. 后台监听 Git 仓库变化，自动同步和更新
```

#### **2.1 Git 同步策略**

为了避免 Git 操作冲突，扩展采用以下同步策略：

**同一仓库串行处理原则**:

- 当配置多个源指向同一 Git 仓库（相同 gitUrl）但不同分支/子路径时
- 扩展会将它们分组，确保同一仓库的所有源按顺序串行同步
- 避免同时对同一本地仓库执行 `git clone` / `git pull` 导致的冲突

**实现逻辑**:

```typescript
// 伪代码示例
1. 按 gitUrl 对所有源分组
   例如:
   - group1: [source-a, source-b] (都指向 https://github.com/company/rules.git)
   - group2: [source-c] (指向 https://github.com/other/rules.git)

2. 对每个仓库组:
   for group in repositoryGroups {
     // 同一仓库的源按顺序处理
     for source in group.sources {
       await syncSingleSource(source)  // 等待完成后再处理下一个
     }
   }
```

**优点**:

- ✅ 避免 Git 操作冲突和锁定问题
- ✅ 支持同一仓库的多分支/多子路径场景
- ✅ 保证同步的可靠性和可预测性

**示例场景**:

```json
{
  "sources": [
    {
      "id": "company-main",
      "gitUrl": "https://github.com/company/rules.git",
      "branch": "main",
      "subPath": "/frontend"
    },
    {
      "id": "company-dev",
      "gitUrl": "https://github.com/company/rules.git",
      "branch": "develop",
      "subPath": "/backend"
    }
  ]
}
```

上述配置会将两个源分为一组，先同步 main 分支的 /frontend，再同步 develop 分支的 /backend。

#### **3. AI Adapter 设计**

```typescript
#### 3. AI 适配器（Adapter）设计说明

- 概念：适配器负责将解析/合并后的规则集合转换为目标 AI 工具所需的配置文件或格式。每个适配器声明其目标文件路径、支持的格式（Markdown/JSON/YAML）、以及支持的特性（如是否支持分节、多文件、优先级、标签等）。
- 职责：
  - 接受一组已合并且验证通过的规则（含元数据）
  - 按目标工具的格式生成配置内容
  - 对生成内容进行验证（基本语义/非空校验）
  - 在配置被写入前支持“预览”功能以展示差异
- 可配置项：是否自动写入、是否包含元数据注释、是否开启按标签分组输出。
- 常见适配目标举例（行为说明，不含实现代码）：
  - Cursor：输出为清晰的 Markdown 文档（`.cursorrules`），建议展现标题、优先级、标签及正文；
  - GitHub Copilot：输出到 `.github/copilot-instructions.md`，按段分隔规则以便 Copilot 读取；
  - Continue：输出为 `.continuerules` 或匹配其配置规范的文件。

  // 生成配置文件
  generate(rules: ParsedRule[]): string;

  // 验证配置文件
  validate(content: string): boolean;

  // 是否支持特定功能
  supports: {
    multiFile: boolean; // 是否支持多文件
    sections: boolean; // 是否支持分节
    priority: boolean; // 是否支持优先级
    tags: boolean; // 是否支持标签
  };
}

class CursorAdapter implements AIToolAdapter {
  name = 'Cursor';
  configFile = '.cursorrules';
  format = 'markdown';

  generate(rules: ParsedRule[]): string {
    // 生成 Cursor 格式的配置
    return `
# AI Coding Rules
Generated by Turbo AI Rules Extension
Last Updated: ${new Date().toISOString()}

---

${rules
  .map(
    (rule) => `
## ${rule.title}
Source: ${rule.sourceId}
Priority: ${rule.metadata.priority}

${rule.content}
`,
  )
  .join('\n\n')}
    `.trim();
  }

  supports = {
    multiFile: false,
    sections: true,
    priority: false,
    tags: false,
  };
}

class CopilotAdapter implements AIToolAdapter {
  name = 'GitHub Copilot';
  configFile = '.github/copilot-instructions.md';
  format = 'markdown';

  generate(rules: ParsedRule[]): string {
    // 生成 Copilot 格式
    return `
# Copilot Instructions
${rules.map((rule) => rule.content).join('\n\n---\n\n')}
    `.trim();
  }

  supports = {
    multiFile: false,
    sections: true,
    priority: false,
    tags: false,
  };
}
```

#### **4. 自动 .gitignore 管理**

```typescript
#### 4. 自动 .gitignore 管理（行为说明）

- 扩展应在首次生成本地规则目录或写入配置文件时，自动在工作区的 `.gitignore` 中添加受控条目（带有注释标记），例如隐藏 `.ai-rules/` 和可选的自动生成文件（如 `.cursorrules`）。
- 设计要点：
  - 添加时保留标记行（例如 `# Turbo AI Rules - Auto Generated`），以便后续识别与移除；
  - 若 `.gitignore` 已包含标记或条目则不重复添加；
  - 提供用户配置项以启用/禁用自动修改 `.gitignore`；
  - 在失败（文件权限等）时记录日志并以非阻塞方式通知用户。

    let content = '';
    if (await fs.pathExists(gitignorePath)) {
      content = await fs.readFile(gitignorePath, 'utf-8');
    }

    const linesToAdd: string[] = [];
    const marker = '# Turbo AI Rules - Auto Generated';

    if (!content.includes(marker)) {
      linesToAdd.push('', marker);
      for (const pattern of patterns) {
        if (!content.includes(pattern)) {
          linesToAdd.push(pattern);
        }
      }
      linesToAdd.push('');

      await fs.appendFile(gitignorePath, linesToAdd.join('\n'));

      vscode.window.showInformationMessage('✓ Updated .gitignore to exclude AI rules cache');
    }
  }
}
```

#### **5. 配置结构优化**

```typescript
#### 5. 配置结构（工作区与扩展配置）

- 配置目的：明确哪些源被使用、缓存及生成策略、适配器启用状态、以及同步策略（自动/手动、间隔、启动时同步）。
- 主要配置项（示例说明）：
  - sources: 源列表（每个源包含 id、显示名、gitUrl、branch、subPath、enabled、authentication 配置）；
  - storage: 存储相关（useGlobalCache、projectLocalDir、autoGitignore）；
  - adapters: 各适配器的启用状态与自动更新开关。**默认只启用 copilot**，cursor 和 continue 需手动启用；custom 默认为空数组；
  - sync: 同步策略（auto、interval、onStartup、conflictStrategy）。
- 配置存放：建议以 VSCode 的 `settings.json` 为主配置入口（便于按工作区管理），对于敏感凭证支持存放到本地配置文件或用户密钥库。

  // 存储策略
  "turboAiRules.storage": {
    "useGlobalCache": true,
    "projectLocalDir": ".ai-rules",
    "autoGitignore": true
  },

  // AI 工具适配（默认配置）
  "turboAiRules.adapters": {
    "cursor": {
      "enabled": false,      // 默认禁用
      "autoUpdate": false
    },
    "copilot": {
      "enabled": true,       // 默认启用，让新用户直接看到效果
      "autoUpdate": true
    },
    "continue": {
      "enabled": false       // 默认禁用
    },
    "custom": []             // 默认空数组，不包含 default-rules
  },

  // 同步策略
  "turboAiRules.sync": {
    "auto": true,
    "interval": 60,
    "onStartup": true,
    "conflictStrategy": "priority"
  },

  // 解析器配置(默认宽松模式)
  "turboAiRules.parser": {
    "strictMode": false,           // 默认不要求 id/title 必须存在
    "requireFrontmatter": false    // 默认接受纯 Markdown 文件
  }
}
```

**设计理念**:

- **新手友好**: 默认只启用 GitHub Copilot，用户安装后即可看到效果
- **按需启用**: Cursor、Continue 等工具需用户主动启用，避免生成不必要的文件
- **自定义灵活**: custom 适配器可作为文件同步工具使用，但默认不启用，避免误导

---

### **6. 用户交互流程优化**

#### **首次使用流程**

```
1. 用户安装扩展
   ↓
2. 执行命令: "Turbo AI Rules: Setup"
   ↓
3. 向导式配置:
   ┌────────────────────────────────────┐
   │ 🎯 Setup Turbo AI Rules            │
   ├────────────────────────────────────┤
   │                                    │
   │ Step 1: Add Rules Source           │
   │ ┌────────────────────────────────┐ │
   │ │ Git URL:                       │ │
   │ │ [github.com/company/ai-rules]  │ │
   │ └────────────────────────────────┘ │
   │                                    │
   │ Step 2: Select AI Tools            │
   │ ☑ Cursor                           │
   │ ☑ GitHub Copilot                   │
   │ ☐ Continue.dev                     │
   │                                    │
   │ Step 3: Storage Options            │
   │ ◉ Auto-manage (Recommended)        │
   │ ○ Custom directory                 │
   │                                    │
   │     [Cancel]  [Setup]              │
   └────────────────────────────────────┘
   ↓
4. 扩展自动:
   • Clone Git 仓库
   • 创建 .ai-rules/ 目录
   • 更新 .gitignore
   • 生成 .cursorrules 和其他配置
   • 显示成功通知
```

#### **日常使用**

```
情景 1: Git 仓库有更新
    ↓
扩展后台自动 Pull
    ↓
解析变更的 rules
    ↓
重新生成 AI 工具配置
    ↓
Toast 通知: "✓ Rules updated (3 changes)"

情景 2: 切换项目
    ↓
扩展检测到新的工作区
    ↓
读取 .vscode/settings.json
    ↓
自动从全局缓存同步到本地
    ↓
状态栏显示: "AI Rules: 12 active"
```

---

### 7. 高级功能（概念说明）

本节以概念性描述替代实现代码，便于维护人员理解系统行为与扩展点。

A. 智能合并与冲突解决

- 目标：当多个规则源中出现相同规则 ID 或语义重复时，提供可配置的冲突解决策略以保证生成结果的可用性与可预测性。
- 可配置策略：
  - priority：按优先级保留一条（默认策略）。
  - skip-duplicates：保留第一次出现的规则，忽略后续重复项。
  - merge：对可合并部分做合并（合并策略需明确字段级如何处理）。
  - ask-user：在检测到冲突时通过 UI 提示用户选择。
- 支持的功能：冲突检测、推荐解决方案、人工介入入口、合并回溯日志。

B. 预览与差异展示（Preview & Diff）

- 目标：在写入项目文件前向用户展示将被修改/生成的配置文件差异，降低误操作风险。
- 交互要点：
  - 提供逐文件预览（例如 `.cursorrules`、`.github/copilot-instructions.md`）。
  - 高亮新增/修改/删除的段落（文本 diff）。
  - 提供“应用更改”与“取消”的操作。

C. 选择性启用（Selective Enable）

- 目标：允许用户在项目级只启用部分规则或只启用部分源，避免不必要的规则膨胀。
- 交互要点：
  - 在侧边栏树状视图中对源与单个规则提供启用/禁用开关。
  - 支持按标签（tags）、优先级（priority）或来源筛选并批量启用。

---

### **8. 对你问题的直接回答**

**Q: 能否直接引用外部资源，不生成本地文件？**

**A: 技术上可以，但实际不可行**

1. **AI 工具限制**: 当前所有主流 AI 工具（Cursor、Copilot、Continue）都**只能读取本地文件**，不支持：

   - HTTP/HTTPS URL 引用
   - Git 仓库直接引用
   - 动态加载远程内容

2. **替代方案**:

   - ✅ **方案 1** (推荐): 本扩展作为"桥梁"，将外部资源同步到本地，自动管理 .gitignore
   - ✅ **方案 2**: 扩展提供 API，未来如果 AI 工具支持插件，可以动态注入 rules
   - ❌ **不可行**: 直接让 Cursor 等工具读取远程 URL

3. **为什么需要本地文件**:

   ```
   Cursor 的工作原理:
   用户输入 → Cursor 读取 .cursorrules → 作为上下文发送给 AI → 生成代码

   如果没有本地 .cursorrules，Cursor 无法获取 rules
   ```

**Q: .gitignore 方案是否足够优雅？**

**A: 是的，这是目前最佳实践**

```bash
# .gitignore 中添加
.ai-rules/          # 扩展的缓存和元数据
.cursorrules        # (可选) 如果是自动生成的
```

优点:

- ✅ 开发者无需关心同步细节
- ✅ 多人协作时，每个人都能自动同步到最新 rules
- ✅ CI/CD 环境也能正常工作
- ✅ 不会污染 Git 历史

---

### 9. 未来展望（概念与可扩展点）

随着 AI 工具生态的发展，可能出现一些新的能力，可以显著简化本扩展的工作流或带来更强的实时性：

- 动态注入 API：如果 AI 工具提供插件 API 或运行时注入接口，扩展可以直接向 AI 工具注入规则而无需在磁盘生成文件；这将减少对 `.gitignore` 的依赖并提升实时性。
- 远程加载能力：若工具支持从受信任的远程 URL 或私有服务安全加载规则，扩展可提供安全代理以管理认证并下发远端规则。
- 更细粒度的权限控制：在企业环境下，通过集成组织的密钥/权限服务管理对私有仓库的访问会更加安全可靠。

## 这些都是未来可追踪的方向，当前应将设计分为"当前实现（文件级、缓存、适配器）"与"未来可替换模块（动态注入、远程加载）"，并在代码与模块设计中为可能的替换点保留扩展接口。

## 🎯 **最终推荐架构**

### **核心特性**

1. ✅ **全局缓存**: `~/.turbo-ai-rules/sources/` - 所有项目共享，节省空间
2. ✅ **项目生成**: `.ai-rules/` - 项目内缓存和元数据，自动 .gitignore
3. ✅ **多 AI 适配**: 自动生成 `.cursorrules`、`.github/copilot-instructions.md` 等
4. ✅ **智能同步**: 后台自动同步，无需手动干预
5. ✅ **选择性启用**: 可以只启用某些 rules，不是全部
6. ✅ **冲突解决**: 多源相同 ID 的 rules 智能合并
7. ✅ **预览与 Diff**: 生成前可预览变更
8. ✅ **零配置**: 自动管理 .gitignore，开发者无感知

### 文件结构示例（概览）

推荐的源码与文档组织方式（只作参考，实际项目已存在实现）：

- src/: 扩展源码（按模块分为 adapters/、commands/、parsers/、providers/、services/、types/、utils/ 等）
- docs/: 设计与用户文档（本文件位于 docs/01-design.md）
- sampleWorkspace/: 示例工作区配置
- out/: 构建产物（编译后）

## 把设计与实现清晰分离，便于维护与接手开发者快速定位模块。

## 📝 总结与维护建议

核心结论：

1. 当前实现基于"同步到本地并生成配置文件"的方案，这是兼容性最高、实现成本最低的实用方案；
2. 通过全局缓存 + 项目本地生成的混合策略，既节约存储又保证项目可用性；
3. 设计上应强调可观测性（日志、变更历史、生成预览）、可配置性（哪些源启用、如何合并、输出位置）以及可扩展性（适配器、未来的动态注入）。

维护建议：

- 文档优先：把规则定义格式、常见故障排查步骤写进 docs 目录，方便接手者快速上手；
- 单元/集成测试：为关键模块（解析器、合并器、文件生成器、git 管理）添加测试用例；
- 配置兼容性：扩展配置应优先使用工作区设置，并对敏感信息支持本地/安全存储；
- 日志与监控：扩展应记录关键操作（clone/pull/parse/generate），并在 UI 提示失败原因与下一步建议；
- 扩展点接口：在适配器、规则合并等处保留可替换接口，便于未来替换为动态注入或远程加载方案。

接下来我会：

- 更新项目 `docs/01-design.md`（已完成主要替换）；
- 将 Todo 列表更新为"审阅完成并已替换文中实现代码"，并标记任务为已完成；
- 如果你愿意，我可以把 docs 目录下再补充一份 `MAINTAINING.md`，包含上面提到的维护建议与排查步骤。

---

## 📖 **双模式解析策略**

### **设计背景**

在实际使用中发现，社区现有的 Cursor/Copilot 规则文件格式存在多样性：

1. **GitHub Copilot 官方格式**: 只用 `applyTo` 字段指定文件匹配模式
2. **Cursor 社区格式**: 使用 `description` 和 `globs` 字段，偶尔有 `alwaysApply`
3. **纯 Markdown 文件**: 没有 frontmatter，只有内容

为了兼容这些不同格式，同时提供高级的规则管理功能（冲突解决、优先级控制、规则追踪），扩展设计了**双模式解析策略**。

### **两种解析模式**

#### **宽松模式（Relaxed Mode）** - 默认

**配置**:

```json
{
  "turbo-ai-rules.parser.strictMode": false,
  "turbo-ai-rules.parser.requireFrontmatter": false
}
```

**特点**:

- ✅ **最大兼容性**: 接受所有格式的规则文件
- ✅ **Frontmatter 可选**: 可以没有 YAML frontmatter
- ✅ **自动生成元数据**:
  - `id`: 从文件名自动生成（转换为 kebab-case）
  - `title`: 从第一个 `# 标题` 或文件名提取
- ✅ **零配置**: 社区规则文件可以直接使用
- ⚠️ **有限的冲突控制**: 无法精确控制规则优先级

**适用场景**:

- 使用社区现有规则（awesome-cursorrules 等）
- 快速原型和测试
- 个人项目或小团队
- 不需要复杂规则管理

**解析逻辑说明**:

1. 读取文件并尝试解析 frontmatter（使用 gray-matter 库）
2. 元数据提取：
   - 如果存在 frontmatter，从中获取元数据
   - 如果不存在，元数据为空对象
3. ID 生成策略（优先级从高到低）：
   - 优先使用 frontmatter 中的 `id` 字段
   - 如果不存在，从文件名自动生成（转换为 kebab-case）
   - 验证并修正 ID 格式，确保符合 kebab-case 规范
4. Title 生成策略（优先级从高到低）：
   - 优先使用 frontmatter 中的 `title` 字段
   - 尝试从 Markdown 内容提取第一个 `# 标题`
   - 如果都没有，从文件名生成（转换为 Title Case）
5. 返回完整的规则对象，包含 id、title、content、metadata、sourceId、filePath

#### **严格模式（Strict Mode）**

**配置**:

```json
{
  "turbo-ai-rules.parser.strictMode": true,
  "turbo-ai-rules.parser.requireFrontmatter": true
}
```

**特点**:

- ✅ **强制元数据**: 必须包含完整的 YAML frontmatter
- ✅ **必需字段**: `id` 和 `title` 必须在 frontmatter 中显式声明
- ✅ **格式验证**: 严格验证 ID 的 kebab-case 格式
- ✅ **精确控制**: 支持 `priority`、`tags` 等扩展字段
- ✅ **可追踪性**: 每个规则都有唯一标识符
- ⚠️ **需要维护**: 需要手动编写和维护元数据

**适用场景**:

- 企业级规则库管理
- 多团队协作环境
- 需要精确优先级控制
- 规则审计和版本管理

**解析逻辑说明**:

1. 读取文件并解析 frontmatter
2. 验证 frontmatter 存在性：
   - 如果不存在或为空，抛出错误
   - 严格模式要求必须有 YAML 前置元数据
3. 验证必需字段：
   - `id` 和 `title` 必须在 frontmatter 中显式声明
   - 缺失任一字段都会抛出错误
4. 格式验证：
   - 严格验证 ID 必须是 kebab-case 格式
   - 格式无效时抛出错误，不进行自动修正
5. 返回规则对象，所有字段都来自 frontmatter

// 严格模式：id 和 title 必需
if (!metadata.id) {
throw new ParseError('Strict mode: id field required in frontmatter');
}

if (!metadata.title) {
throw new ParseError('Strict mode: title field required in frontmatter');
}

// 严格验证 ID 格式
if (!isValidKebabCase(metadata.id)) {
throw new ParseError(`Invalid rule ID format: ${metadata.id} (must be kebab-case)`);
}

return {
id: metadata.id,
title: metadata.title,
content: parsed.content,
metadata,
sourceId,
filePath,
};
}

````

### **字段说明**

#### **官方约定字段** (Cursor/Copilot 社区标准)

| 字段          | 来源           | 说明                   |
| ------------- | -------------- | ---------------------- |
| `description` | Cursor 社区    | 规则的详细描述         |
| `globs`       | Cursor 社区    | 文件匹配模式           |
| `applyTo`     | GitHub Copilot | 路径特定指令的文件匹配 |
| `alwaysApply` | Cursor 社区    | 是否总是应用（可选）   |

#### **扩展字段** (Turbo AI Rules)

| 字段       | 模式要求     | 说明                        |
| ---------- | ------------ | --------------------------- |
| `id`       | 严格模式必需 | kebab-case 格式的唯一标识符 |
| `title`    | 严格模式必需 | 规则显示名称                |
| `priority` | 可选         | `low` \| `medium` \| `high` |
| `tags`     | 可选         | 规则分类标签数组            |

### **实现要点**

#### **配置读取**

解析器从 VSCode 配置系统读取 `turbo-ai-rules.parser` 命名空间下的配置:
- `strictMode`: 布尔值，默认 false
- `requireFrontmatter`: 布尔值，默认 false

配置读取使用 VSCode API: `vscode.workspace.getConfiguration()`

#### **ID 生成规则**

文件名到 ID 的转换规则:
1. 提取文件名（去除扩展名）
2. 转换为小写
3. 将所有非字母数字字符替换为连字符 `-`
4. 移除首尾多余的连字符
5. 示例: `TypeScript Best-Practices.md` → `typescript-best-practices`

#### **Title 提取规则**

标题提取的优先级策略:
1. 首先尝试从 Markdown 内容中提取第一个 `# 标题`（使用正则表达式匹配）
2. 如果没有找到标题，使用文件名生成:
   - 将 kebab-case 按 `-` 分割
   - 每个单词首字母大写
   - 用空格连接
   - 示例: `typescript-best-practices` → `Typescript Best Practices`

### **迁移路径**

### **实现细节**

#### **配置读取**

```typescript
class MdcParser {
  private getParserConfig() {
    const config = vscode.workspace.getConfiguration('turbo-ai-rules.parser');
    return {
      strictMode: config.get<boolean>('strictMode', false),
      requireFrontmatter: config.get<boolean>('requireFrontmatter', false),
    };
  }
}
````

#### **ID 生成逻辑**

```typescript
private extractIdFromFilename(filePath: string): string {
  const filename = path.basename(filePath, path.extname(filePath));
  // 转换为 kebab-case
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // 非字母数字转为连字符
    .replace(/^-+|-+$/g, '');      // 移除首尾连字符
}
```

#### **标题提取逻辑**

```typescript
private extractTitleFromContent(content: string, filePath?: string): string {
  // 1. 尝试从第一个 # 标题提取
  const match = content.match(/^#\s+(.+)$/m);
  if (match) {
    return match[1].trim();
  }

  // 2. 宽松模式：使用文件名生成标题
  if (filePath) {
    const filename = path.basename(filePath, path.extname(filePath));
    // 将 kebab-case 转为 Title Case
    return filename
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return '';
}
```

### **迁移路径**

#### **从宽松模式到严格模式**

1. **评估现有规则**: 检查哪些规则缺少 `id` 和 `title`
2. **批量添加元数据**: 为自定义规则添加完整的 frontmatter
3. **渐进式启用**:

   ```json
   // 第一步：要求 frontmatter，但不强制 id/title
   "turbo-ai-rules.parser.requireFrontmatter": true,
   "turbo-ai-rules.parser.strictMode": false

   // 第二步：完全启用严格模式
   "turbo-ai-rules.parser.strictMode": true
   ```

4. **验证和测试**: 确认所有规则都能正确解析

### **最佳实践**

1. **默认使用宽松模式**: 除非有明确需求，否则保持默认配置
2. **渐进式采用**: 先用社区规则快速起步，后期逐步添加元数据
3. **文件组织分离**:
   ```
   sources/
   ├── community/     # 社区规则（宽松模式）
   └── custom/        # 自定义规则（可用严格模式）
   ```
4. **元数据最小化**: 只添加确实需要的字段，避免过度工程化

### **设计优势**

1. **向后兼容**: 现有社区规则无需修改即可使用
2. **向前扩展**: 支持未来更复杂的规则管理需求
3. **灵活配置**: 根据团队规模和需求选择合适模式
4. **渐进式**: 可以从简单开始，逐步增强规则管理能力

### **参考资料**

- [GitHub Copilot 自定义指令文档](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)
- [awesome-cursorrules 仓库](https://github.com/PatrickJS/awesome-cursorrules)
- [规则文件格式详细说明](../RULE_FORMAT.md)

---

## 📋 **规则验证策略**

### **设计背景**

规则验证器 (`RulesValidator`) 负责在规则解析后进行质量检查,确保规则的完整性和有效性。验证策略需要与解析器的双模式策略保持一致,避免在宽松模式下过度严格而拒绝有效规则。

### **验证模式**

验证器根据 `parser.strictMode` 配置动态调整验证策略:

#### **宽松模式验证** (默认)

**配置**: `strictMode: false`

**验证行为**:

1. **必需字段** (`id`, `title`):

   - ✅ 缺失时只产生 **警告 (warning)**,不阻止规则使用
   - ✅ 允许解析器自动生成的 id/title
   - ⚠️ 格式无效时仍然报错 (如 id 不是 kebab-case)

2. **内容字段** (`content`, `sourceId`, `filePath`):

   - ❌ 必须存在且有效,缺失或为空会报错
   - 这些是规则的核心数据,无法自动生成

3. **元数据字段** (`priority`, `tags`, etc.):
   - ✅ 都是可选的,只产生建议性警告

#### **严格模式验证**

**配置**: `strictMode: true`

**验证行为**:

1. **必需字段** (`id`, `title`):

   - ❌ 缺失时报错,规则被拒绝
   - ❌ 格式无效时报错
   - 要求在 frontmatter 中显式声明

2. **其他行为与宽松模式相同**

### **验证流程**

```
规则解析 (MdcParser)
    ↓
生成 ParsedRule 对象
(宽松模式可能自动生成 id/title)
    ↓
规则验证 (RulesValidator)
(根据 strictMode 决定验证严格程度)
    ↓
过滤无效规则 (getValidRules)
(只保留 valid: true 的规则)
    ↓
规则索引和使用
```

### **关键设计决策**

1. **验证器遵循解析器模式**:

   - 验证器读取与解析器相同的 `parser.strictMode` 配置
   - 确保两者行为一致,避免"解析成功但验证失败"的困惑

2. **警告 vs 错误**:

   - **错误 (errors)**: 阻止规则使用,`valid: false`
   - **警告 (warnings)**: 建议改进,`valid: true`
   - 宽松模式下,id/title 缺失只是警告

3. **核心字段始终验证**:
   - `content`: 不能为空,这是规则的实际内容
   - `sourceId`, `filePath`: 用于规则追踪,必须存在
   - 这些字段无法自动生成,必须验证

### **常见问题修复**

#### **问题: 宽松模式下仍然只同步少量规则**

**原因**: 旧版本的 `RulesValidator` 始终要求 id/title 存在,即使在宽松模式下也会拒绝缺少这些字段的规则。

**修复**:

- 验证器现在读取 `parser.strictMode` 配置
- 宽松模式下,id/title 缺失只产生警告,不影响规则有效性
- 确保解析器生成的所有规则都能通过验证

**验证修复**:

```bash
# 查看扩展日志
VSCode > Output > Turbo AI Rules
# 应该看到: "Valid rules filtered: total: N, valid: N, invalid: 0"
```

### **最佳实践**

1. **使用默认配置**: 宽松模式适合大多数场景
2. **查看警告**: 虽然不阻止使用,但警告有助于改进规则质量
3. **渐进式严格化**: 先用宽松模式,逐步为重要规则添加元数据
4. **监控日志**: 定期检查验证日志,了解规则质量状况

---

2. 自动生成各 AI 工具需要的配置文件格式
