# Turbo AI Rules - 开发指南

> 本文档面向项目开发者,说明如何搭建开发环境、运行测试、调试和构建项目。

## 📋 目录

- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [开发工作流](#开发工作流)
- [测试](#测试)
- [调试](#调试)
- [代码规范](#代码规范)
- [常见问题](#常见问题)

---

## 环境要求

### 必需

- **Node.js**: >= 18.x
- **pnpm**: >= 8.x (推荐使用 pnpm,不是 npm)
- **VS Code**: >= 1.88.0
- **Git**: >= 2.x

### 推荐

- **VS Code 扩展**:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - Error Lens (可选,实时显示错误)

---

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/ygqygq2/turbo-ai-rules.git
cd turbo-ai-rules
```

### 2. 安装依赖

```bash
# 确保使用 pnpm
pnpm install
```

如果没有 pnpm:

```bash
npm install -g pnpm
```

### 3. 编译项目

```bash
# 一次性编译
pnpm run compile

# 或启动观察模式(推荐开发时使用)
pnpm run watch
```

### 4. 启动调试

1. 在 VS Code 中按 `F5`
2. 会打开一个新的 VS Code 窗口(Extension Development Host)
3. 在新窗口中测试扩展功能

---

## 项目结构

```
turbo-ai-rules/
├── src/                          # 源代码
│   ├── extension.ts              # 扩展入口
│   ├── adapters/                 # AI 工具适配器
│   │   ├── AIToolAdapter.ts      # 适配器基类和接口
│   │   ├── CursorAdapter.ts      # Cursor 适配器
│   │   ├── CopilotAdapter.ts     # GitHub Copilot 适配器
│   │   ├── ContinueAdapter.ts    # Continue 适配器
│   │   ├── CustomAdapter.ts      # 自定义适配器(通用,可配置)
│   │   └── RulesAdapter.ts       # (已废弃,由 CustomAdapter 替代)
│   ├── commands/                 # VSCode 命令实现
│   │   ├── addSource.ts          # 添加规则源
│   │   ├── removeSource.ts       # 删除规则源
│   │   ├── syncRules.ts          # 同步规则
│   │   ├── searchRules.ts        # 搜索规则
│   │   ├── generateRules.ts    # 生成配置文件
│   │   └── manageSource.ts       # 管理规则源
│   ├── parsers/                  # 解析器
│   │   ├── MdcParser.ts          # MDC 格式解析器
│   │   └── RulesValidator.ts     # 规则验证器
│   ├── providers/                # UI 提供者
│   │   ├── RulesTreeProvider.ts  # 侧边栏树视图
│   │   └── StatusBarProvider.ts  # 状态栏
│   ├── services/                 # 核心服务
│   │   ├── ConfigManager.ts      # 配置管理
│   │   ├── LocalConfigManager.ts # 本地配置管理
│   │   ├── GitManager.ts         # Git 操作
│   │   ├── RulesManager.ts       # 规则索引和搜索
│   │   └── FileGenerator.ts      # 文件生成
│   ├── types/                    # TypeScript 类型
│   │   ├── config.ts             # 配置类型
│   │   ├── rules.ts              # 规则类型
│   │   ├── git.ts                # Git 类型
│   │   └── errors.ts             # 错误类型
│   ├── utils/                    # 工具函数
│   │   ├── constants.ts          # 常量定义
│   │   ├── logger.ts             # 日志工具
│   │   ├── fileSystem.ts         # 文件系统操作
│   │   ├── gitignore.ts          # .gitignore 管理
│   │   ├── path.ts               # 路径处理
│   │   └── validator.ts          # 验证工具
│   └── test/                     # 测试
│       ├── unit/                 # 单元测试 (Vitest)
│       └── suite/                # 集成测试 (Mocha)
├── docs/                         # 文档
├── sampleWorkspace/              # 示例工作区
├── out/                          # 编译输出
├── coverage/                     # 测试覆盖率
├── package.json                  # 项目配置
├── tsconfig.json                 # TypeScript 配置
├── vite.config.ts                # Vitest 配置
├── eslint.config.mjs             # ESLint 配置
└── .vscode/                      # VS Code 配置
    ├── launch.json               # 调试配置
    └── tasks.json                # 任务配置
```

---

## 核心概念

### 自定义适配器系统

从 v0.x.x 开始,扩展采用灵活的自定义适配器系统,允许用户为任意 AI 工具配置输出。

#### 适配器类型

1. **内置适配器** (固定格式)

   - `CursorAdapter`: 生成 `.cursorrules`
   - `CopilotAdapter`: 生成 `.github/copilot-instructions.md`
   - `ContinueAdapter`: 生成 `.continuerules`

2. **自定义适配器** (用户可配置)
   - `CustomAdapter`: 通用适配器,支持任意输出配置
   - 配置存储在 `adapters.custom[]` 数组中
   - 默认包含 `rules/` 目录适配器

#### 输出模式

**文件模式** (`outputType: 'file'`)

- 合并所有规则到单个文件
- 适用于大多数 AI 工具(Windsurf, Cline 等)
- 支持文件后缀过滤

**目录模式** (`outputType: 'directory'`)

- 生成完整的目录结构
- 可按源 ID 组织子目录(`organizeBySource: true`)
- 可生成索引文件(`generateIndex: true`)

#### 添加新适配器支持

如需为新的 AI 工具添加内置支持:

1. 在 `src/adapters/` 创建新适配器类(继承 `BaseAdapter`)
2. 实现 `generate()`, `getFilePath()`, `validate()` 方法
3. 在 `src/adapters/index.ts` 导出
4. 在 `src/services/FileGenerator.ts` 注册
5. 在 `package.json` 添加配置项
6. 更新类型定义 `src/types/config.ts`
7. 编写单元测试
8. 更新文档

**提示**: 大多数情况下,使用自定义适配器配置即可,无需创建新的内置适配器。

---

## 开发工作流

### 日常开发

1. **启动观察模式**

   ```bash
   pnpm run watch
   ```

   这会自动监听文件变化并重新编译。

2. **启动调试**

   - 按 `F5` 或点击"Run and Debug"
   - 选择 "Run Extension" 配置

3. **修改代码**

   - 编辑 `src/` 中的文件
   - 保存后自动编译

4. **重新加载扩展**
   - 在调试窗口中按 `Ctrl+R` (Windows/Linux) 或 `Cmd+R` (Mac)
   - 或在命令面板中执行 "Developer: Reload Window"

### 添加新功能

参考 [维护指南](./MAINTAINING.md#新增功能) 中的详细流程。

**简要步骤**:

1. 更新设计文档(如需要)
2. 实现功能代码
3. 编写测试
4. 更新用户文档
5. 提交 PR

### 修复 Bug

1. **重现问题**

   - 在 `src/test/` 中编写失败的测试用例

2. **修复代码**

   - 修改相关源文件

3. **验证修复**

   ```bash
   pnpm test
   ```

4. **提交**
   ```bash
   git commit -m "fix: description of fix"
   ```

---

## 测试

### 测试类型

项目包含两种测试:

1. **单元测试** (Vitest)

   - 位置: `src/test/unit/`
   - 测试独立模块和函数
   - 快速,可频繁运行

2. **集成测试** (Mocha + VS Code Test Runner)
   - 位置: `src/test/suite/`
   - 测试完整的扩展功能
   - 较慢,需要启动 VS Code 实例

### 运行测试

```bash
# 运行所有测试
pnpm test

# 仅运行单元测试
pnpm test:unit

# 仅运行集成测试
pnpm test:suite:mocha

# 生成覆盖率报告
pnpm test:coverage
```

### 编写测试

#### 单元测试示例

```typescript
// src/test/unit/parsers/MdcParser.spec.ts
import { describe, it, expect } from 'vitest';
import { MdcParser } from '../../../parsers/MdcParser';

describe('MdcParser', () => {
  it('should parse valid MDC content', () => {
    const content = `---
id: test-rule
title: Test Rule
---
# Content`;

    const result = MdcParser.parse(content, 'test.md');

    expect(result.id).toBe('test-rule');
    expect(result.title).toBe('Test Rule');
  });
});
```

#### 集成测试示例

```typescript
// src/test/suite/workflows/cursor-workflow.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';
import { CONFIG_KEYS } from '../../../utils/constants';

describe('Cursor Workflow Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;
  
  before(async function() {
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0);
    workspaceFolder = folders.find(f => f.name.includes('cursor')) || folders[0];
    
    const ext = vscode.extensions.getExtension('ygqygq2.turbo-ai-rules');
    if (ext && !ext.isActive) await ext.activate();
  });

  it('Should complete end-to-end workflow', async function() {
    // 测试完整流程：添加源 → 同步 → 选择 → 生成
    // ...
  });
});
```

---

## 调试

### 调试扩展

1. **设置断点**

   - 在代码行号左侧点击,或按 `F9`

2. **启动调试**

   - 按 `F5`
   - 选择 "Run Extension"

3. **调试控制**
   - `F10`: 单步跳过
   - `F11`: 单步进入
   - `Shift+F11`: 单步跳出
   - `F5`: 继续

### 查看日志

扩展日志输出到 VS Code 的输出面板:

1. 打开输出面板: `View > Output`
2. 选择 "Turbo AI Rules" 频道
3. 查看日志信息

### 调试技巧

```typescript
// 使用 Logger 输出调试信息
import { Logger } from '../utils/logger';

Logger.debug('Variable value:', { myVar });
Logger.info('Operation completed');
Logger.warn('Potential issue');
Logger.error('Error occurred', error);
```

### 调试测试

```bash
# 调试单元测试
# 在测试文件中设置断点,然后在 VS Code 中:
# 1. 打开测试文件
# 2. 点击左侧的"运行测试"按钮
# 3. 选择"调试测试"

# 调试集成测试
# 在 .vscode/launch.json 中有 "Extension Tests" 配置
# 按 F5 选择该配置
```

---

## 代码规范

### TypeScript 风格

项目使用 ESLint 和 Prettier 管理代码风格。

**自动格式化**:

- 保存时自动格式化(需要安装 Prettier 扩展)
- 手动格式化: `Shift+Alt+F`

**检查代码**:

```bash
# 运行 ESLint
pnpm run lint

# 自动修复问题
pnpm run lint-fix
```

### 命名约定

- **文件名**: PascalCase (如 `RulesManager.ts`)
- **类名**: PascalCase (如 `class RulesManager`)
- **接口**: PascalCase (如 `interface ParsedRule`)
- **函数/变量**: camelCase (如 `function parseRules()`)
- **常量**: UPPER_SNAKE_CASE (如 `const MAX_RETRIES`)

### 注释规范

```typescript
/**
 * 函数的简短描述
 *
 * 更详细的说明(可选)
 *
 * @param param1 参数说明
 * @param param2 参数说明
 * @returns 返回值说明
 * @throws {ErrorType} 错误说明
 */
export function myFunction(param1: string, param2: number): boolean {
  // 实现
}
```

### 导入顺序

```typescript
// 1. Node.js 内置模块
import * as path from 'path';
import * as fs from 'fs';

// 2. 外部依赖
import * as vscode from 'vscode';
import simpleGit from 'simple-git';

// 3. 内部模块 (按路径排序)
import type { ParsedRule } from '../types/rules';
import { Logger } from '../utils/logger';
```

---

## 构建和打包

### 构建

```bash
# 开发构建(带 sourcemap)
pnpm run compile

# 生产构建(优化+压缩)
pnpm run vscode:prepublish
```

### 打包扩展

```bash
# 生成 .vsix 文件
pnpm run package

# 输出: turbo-ai-rules-<version>.vsix
```

### 安装本地扩展

```bash
# 方法 1: 命令行
code --install-extension turbo-ai-rules-0.0.1.vsix

# 方法 2: VS Code UI
# Extensions 视图 > ... > Install from VSIX
```

---

## 常见问题

### Q: `pnpm install` 失败

**解决**:

```bash
# 清理缓存
pnpm store prune

# 删除 node_modules 和 lockfile
rm -rf node_modules pnpm-lock.yaml

# 重新安装
pnpm install
```

### Q: 编译错误 "Cannot find module"

**解决**:

```bash
# 检查 TypeScript 配置
# 确保 tsconfig.json 中的路径正确

# 重新编译
pnpm run clean
pnpm run compile
```

### Q: 测试失败 "Extension not found"

**解决**:

```bash
# 确保先编译
pnpm run test-compile

# 再运行测试
pnpm test
```

### Q: 调试时扩展未加载

**解决**:

1. 检查 `package.json` 中的 `activationEvents`
2. 确保 `main` 字段指向正确的入口文件
3. 查看调试控制台的错误信息

### Q: Git Hooks 不工作

**解决**:

```bash
# 重新安装 hooks
pnpm run postinstall

# 或手动设置
npx simple-git-hooks
```

---

## 性能优化

### 构建优化

项目使用 esbuild 进行快速构建:

- 开发: sourcemap 支持调试
- 生产: 代码压缩和优化

### 运行时优化

- **懒加载**: 延迟加载大型依赖
- **缓存**: 使用 LRU 缓存常用数据
- **异步操作**: Git 操作使用异步 API

---

## Git 工作流

### 分支策略

- `main`: 主分支,稳定版本
- `feature/*`: 功能分支
- `fix/*`: Bug 修复分支

### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type**:

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式(不影响功能)
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具配置

**示例**:

```bash
git commit -m "feat(adapters): add support for new AI tool"
git commit -m "fix(parser): handle empty frontmatter"
git commit -m "docs: update README with new features"
```

---

## 相关资源

- [VS Code 扩展开发文档](https://code.visualstudio.com/api)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Vitest 文档](https://vitest.dev/)
- [ESLint 文档](https://eslint.org/)

---

## 获取帮助

遇到问题?

1. 查看 [故障排查](./MAINTAINING.md#故障排查)
2. 搜索 [GitHub Issues](https://github.com/ygqygq2/turbo-ai-rules/issues)
3. 提交新 Issue
4. 加入讨论: [GitHub Discussions](https://github.com/ygqygq2/turbo-ai-rules/discussions)

祝开发愉快! 🚀
