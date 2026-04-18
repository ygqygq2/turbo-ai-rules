# sampleWorkspace README

`sampleWorkspace/` 不是随手堆出来的示例目录，而是 **Turbo AI Rules 集成测试的场景基座**。

这里的目标不是“能跑几个测试就行”，而是建立一套**功能持续增长时也不容易漏测、不容易重复造轮子、不容易把工作区跑脏**的集成测试方案。

---

## 🎯 这个目录解决什么问题

随着功能增多，集成测试最容易出现 4 类失控：

1. **新功能来了，只补一个临时测试**，没有放回整体分类里
2. **同一类问题到处另起灶台**，工作区、测试文件、说明文档越长越乱
3. **只测第一次成功**，不测“改选择后再同步”“再生成后是否清理正确”这类真实闭环
4. **测试会污染下一轮**，导致样例工作区越来越不可信

`sampleWorkspace/` 的设计就是为了解决这些问题。

---

## 🧭 单一真相源：4 个文件各管什么

以后看集成测试，不要靠猜，按下面 4 个入口看：

### 1. `sampleWorkspace/test.code-workspace`

- **当前真实测试工作区清单**
- Extension Development Host / Mocha suite 运行时使用它加载多工作区
- 新增工作区，必须先加到这里

### 2. `sampleWorkspace/TEST-WORKSPACE-MAPPING.md`

- **工作区 ↔ 测试文件 ↔ 自动化/手动状态** 映射表
- 解决“这个工作区到底有没有自动测试覆盖”的问题
- 新增或调整测试文件，必须同步更新这里

### 3. `src/test/suite/**`

- **真正执行的 Mocha 集成测试**
- 按分类落到 `commands / adapters / scenarios / workflows`
- 新功能的集成测试最终都要落到这里，而不是只写在文档里

### 4. `docs/development/70-integration-test-design.md` + `72-integration-test-reference.md`

- **测试设计规范与写法约束**
- 解决“应该怎么分层、应该测到什么程度、应该如何恢复基线”的问题

> 简单说：
>
> - `test.code-workspace` = 有哪些工作区
> - `TEST-WORKSPACE-MAPPING.md` = 谁测它
> - `src/test/suite/**` = 怎么测
> - `docs/development/70/72` = 为什么这么测

---

## 🗂️ 集成测试分类：以后不要再另起灶台

新功能进来时，先判断它属于哪一类，再决定测试落点。

### `commands/`

适合：

- 单个命令行为验证
- 参数与交互分支验证
- 命令副作用较小的场景

典型问题：

- `addSource` 是否正确写配置
- `removeSource` 是否正确删除状态
- `searchRules` 是否返回预期结果

### `adapters/`

适合：

- 适配器配置解析
- 输出路径 / 目录结构 / skills 与 rules 差异
- preset / custom adapter 契约测试

典型问题：

- preset 目录型输出路径是否正确
- custom skills adapter 是否保留 `skill.md` 目录结构
- `relativePathBase` / `preserveDirectoryStructure` 是否生效

### `scenarios/`

适合：

- 特殊风险场景
- 跨模块状态同步
- 回退 / 降级 / 边界行为

典型问题：

- 共享选择状态
- 工作区切换与隔离
- status bar 统计
- 多适配器 + 用户保护这类高风险组合

### `workflows/`

适合：

- 真实用户闭环
- 新功能影响完整操作链路时
- “第一次成功不够，还要测第二次/第三次行为”的场景

典型问题：

- 同步 → 选择 → 生成
- 同步 → 改选择 → 再同步 → 再生成
- 多源同步 → 冲突处理 → 输出验证

---

## ✅ Workflow 的必测闭环

以后凡是影响同步、选择、生成、清理、用户规则/技能保护的功能，**至少要有一条 workflow 用例覆盖下面这条链**：

1. **首次同步成功**
2. **初始选择并生成成功**
3. **修改选择后持久化成功**
4. **再次同步成功**
5. **再次生成后输出跟随最新选择变化**
6. **测试结束后恢复基线**

也就是说，不能只测：

- 第一次 `syncRules` 成功
- 生成了一个文件

还必须测：

- **用户改了选择后，再次同步会不会回滚旧状态**
- **再次生成时，旧产物会不会残留**
- **测试跑完后，工作区会不会污染下一轮**

这条规则，就是为了避免“新功能能跑一次，但第二次就露馅”。

---

## 🧪 sampleWorkspace 的设计原则

### 1. 一个工作区只表达一种主要意图

例如：

- `workflows-preset-single-file/`：预设单文件 workflow
- `workflows-custom-skills/`：自定义 skills workflow
- `workflows-claude-composite/`：Claude commands / agents / hooks 综合 workflow
- `workflows-custom-mcp/`：自定义 MCP merge-json workflow
- `scenarios-multiAdapterUserProtection/`：多适配器 + 用户保护风险场景

不要为了一个新小功能再复制一整套几乎相同的工作区。

### 2. 优先复用已有工作区，不随便新增

新功能先问：

- 是命令测试？复用对应命令工作区
- 是 adapter 契约？复用对应 adapter 工作区
- 是 workflow 新阶段？优先补进已有 workflow 工作区
- 真的是全新风险模型？再新增工作区

### 3. 样例工作区分两种身份

#### 自动化工作区

- 在 `TEST-WORKSPACE-MAPPING.md` 中有对应测试文件
- 会被 Mocha / Vitest 间接或直接校验

#### 手动夹具工作区

- 用于人工复现复杂问题
- 在映射表中必须明确标记为手动夹具 / 预留工作区
- 不能假装“应该有人会记得它的作用”

### 4. 基线夹具必须可读

像 `scenarios-multiAdapterUserProtection/rules/` 这种目录，如果它是**有意提交的基线状态**，就必须在对应工作区 `README.md` 里说清楚。

否则一段时间后谁都分不清：

- 这是设计好的 fixture
- 还是上次测试跑脏的垃圾

---

## 🔒 如何保证以后功能增加时测试不漏

这是最关键的部分。

### 功能变更时，必须过这张检查表

#### A. 先判断影响层级

- 只影响单个命令 → `commands/`
- 只影响适配器协议 / 输出格式 → `adapters/`
- 影响边界状态 / 回退 / 多工作区 → `scenarios/`
- 影响用户主链路 → `workflows/`

#### B. 再判断是否触及 workflow 闭环

只要影响以下任一项，就必须补 workflow：

- `syncRules`
- 规则选择状态
- `generateRules`
- 目录输出清理
- 用户规则 / 用户技能保护
- 多源同步结果
- 规则同步页 / adapter 选择行为

#### C. 最后同步更新 3 个地方

新增或调整集成测试时，至少同步检查：

1. `src/test/suite/**` 是否有对应测试
2. `sampleWorkspace/TEST-WORKSPACE-MAPPING.md` 是否已登记
3. 如果新增工作区，`sampleWorkspace/test.code-workspace` 是否已加入

> 少一个，都算没做完。

---

## 🧱 防止测试体系继续漂移的护栏

仓库里已经加了护栏测试，当前会校验：

- `test.code-workspace` 中的工作区是否都在映射文档中说明
- 关键基线夹具是否保持可读状态
- 集成测试设计文档里是否明确 workflow 闭环要求

相关校验见：

- `src/test/unit/sampleWorkspace/sampleWorkspaceInventory.spec.ts`

这类护栏测试的意义不是替代集成测试，而是确保：

- 工作区清单不漂
- 说明文档不漂
- 测试设计原则不漂

---

## 🧰 推荐的新增流程（以后照这个来）

### 场景 1：新功能只是已有 workflow 的一个新阶段

例如：

- 原来只测“同步后生成成功”
- 现在新增“改选择后再次同步”

做法：

1. 优先补进已有 `workflows/*.test.ts`
2. 不要新增近似重复工作区
3. 如有必要，在 `README.md` / 映射文档中补充该工作区覆盖的阶段

### 场景 2：新功能是新的风险模型

例如：

- 多适配器 + 用户规则保护
- 共享选择跨工作区
- 技能目录清理与规则目录清理逻辑完全不同

做法：

1. 新增专门场景工作区
2. 加入 `test.code-workspace`
3. 更新 `TEST-WORKSPACE-MAPPING.md`
4. 添加对应 `scenarios/` 或 `workflows/` 测试

### 场景 3：现在先手工复现，后续再自动化

这种情况可以接受，但必须显式记录：

- 这是**手动夹具工作区**
- 它为什么暂时没自动化
- 后续应该补到哪一类测试里

不能让它默默躺着。

---

## ▶️ 如何运行

### 跑 Mocha 集成测试合集

```bash
pnpm test:suite:mocha
```

对应脚本：`"test:suite:mocha": "npm run test-compile && cross-env TEST_DEBUG=0 node out/test/runTests.js"`

### 跑单个集成测试文件

```bash
TEST_FILE=workflows/workflows-preset-single-file pnpm run test:suite:mocha:file
```

这个是**单文件集成测试**入口，不是合集。

### 跑单元测试合集 / 护栏测试

```bash
pnpm test:unit
pnpm exec vitest run src/test/unit/sampleWorkspace/sampleWorkspaceInventory.spec.ts
```

其中 `pnpm test:unit` 是当前单元测试合集入口。

### 手工调试样例工作区

按 `F5` 启动调试，VS Code 会加载：

- `sampleWorkspace/test.code-workspace`

---

## 📚 相关文件

- `sampleWorkspace/test.code-workspace`
- `sampleWorkspace/TEST-WORKSPACE-MAPPING.md`
- `docs/development/70-integration-test-design.md`
- `docs/development/72-integration-test-reference.md`
- `src/test/suite/**`
- `src/test/unit/sampleWorkspace/sampleWorkspaceInventory.spec.ts`

---

## 一句话原则

> **加功能时，不是顺手补一个测试就完了；而是要把它放回现有分类、闭环和工作区体系里。**
>
> **不另起灶台，不漏闭环，不让样例工作区跑脏，这样集成测试才能跟着功能一起长期演进。**
