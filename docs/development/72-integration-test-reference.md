# 72. 集成测试快速参考

## 先判断要加到哪一类

- **commands/**：单个命令是否可执行、是否正确报错/更新状态
- **adapters/**：适配器配置、输出路径、目录结构、skills/rules 差异
- **scenarios/**：特殊边界、共享状态、异常回退、跨工作区问题
- **workflows/**：真实用户闭环，必须考虑“首次同步 → 选择/修改 → 再次同步 → 输出验证 → 恢复基线”

## 添加新测试

### 1. 选择目录

- **workflows/** - 端到端闭环
- **scenarios/** - 特殊场景、边界情况
- **adapters/** - 适配器契约测试
- **commands/** - 单个命令测试

### 2. 选择工作空间

优先参考：

- `sampleWorkspace/test.code-workspace`：当前真实测试工作区列表
- `sampleWorkspace/TEST-WORKSPACE-MAPPING.md`：工作区 ↔ 测试文件 ↔ 自动化/手动状态

### 3. Workflow 闭环新增前检查表

新增或修改 `workflows/**` 时，至少逐条确认：

- [ ] 首次 `syncRules` 后规则确实加载成功
- [ ] 初始选择写入后能生成目标输出
- [ ] 修改选择后已持久化到磁盘
- [ ] 再次 `syncRules` 后不会回退到旧选择
- [ ] 再次生成后输出内容与当前选择一致
- [ ] 测试结束后能恢复基线（优先快照恢复）

### 4. 推荐模板（Workflow 优先）

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import { CONFIG_KEYS } from '../../../utils/constants';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../testConstants';
import {
  createWorkspaceSnapshot,
  restoreWorkspaceSnapshot,
  sleep,
  switchToWorkspace,
} from '../testHelpers';

describe('XXX Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;
  let rulesManager: any;
  let selectionStateManager: any;

  before(async function() {
    this.timeout(TEST_TIMEOUTS.LONG);
    workspaceFolder = await switchToWorkspace('Workflows: XXX');
    await createWorkspaceSnapshot(workspaceFolder);
    
    const ext = vscode.extensions.getExtension('ygqygq2.turbo-ai-rules');
    if (ext && !ext.isActive) await ext.activate();
    
    const api = ext?.exports;
    rulesManager = api?.rulesManager;
    selectionStateManager = api?.selectionStateManager;
    
    assert.ok(rulesManager, 'RulesManager should be available');
    assert.ok(selectionStateManager, 'SelectionStateManager should be available');
    
    // 4. 切换到工作空间上下文（只切换一次）
    const readmePath = vscode.Uri.joinPath(workspaceFolder.uri, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);
    await sleep(TEST_DELAYS.SHORT);
  });

  after(async function() {
    this.timeout(TEST_TIMEOUTS.LONG);
    await restoreWorkspaceSnapshot(workspaceFolder);
  });

  afterEach(async () => {
    // 清理选择状态
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<Array<{ id: string }>>(CONFIG_KEYS.SOURCES) || [];
    for (const source of sources) {
      selectionStateManager?.clearState(source.id);
    }
  });

  it('Should [测试描述]', async function() {
    this.timeout(TEST_TIMEOUTS.EXTRA_LONG);
    // 1. 首次同步成功
    // 2. 选择并生成
    // 3. 修改选择
    // 4. 再次同步
    // 5. 验证输出与当前选择一致
  });
});
```

## 常用代码片段

### 模拟选择规则

```typescript
const allRules = rulesManager.getRulesBySource(sourceId);
const selectedPaths = allRules.map(rule => rule.filePath);
selectionStateManager.updateSelection(sourceId, selectedPaths, false, workspaceFolder.uri.fsPath);
await selectionStateManager.persistToDisk(sourceId, workspaceFolder.uri.fsPath);
```

### 等待同步

```typescript
await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
let allRules: any[] = [];
for (let i = 0; i < 20; i++) {
  await sleep(TEST_DELAYS.MEDIUM);
  allRules = rulesManager.getRulesBySource(sourceId);
  if (allRules.length > 0) break;
}
```

### 闭环断言：修改选择后再次同步

```typescript
const initialPaths = allRules.slice(0, 3).map((rule) => rule.filePath);
selectionStateManager.updateSelection(sourceId, initialPaths, false, workspaceFolder.uri.fsPath);
await selectionStateManager.persistToDisk(sourceId, workspaceFolder.uri.fsPath);

await vscode.commands.executeCommand('turbo-ai-rules.generateRules');

const updatedPaths = initialPaths.slice(0, 1);
selectionStateManager.updateSelection(sourceId, updatedPaths, false, workspaceFolder.uri.fsPath);
await selectionStateManager.persistToDisk(sourceId, workspaceFolder.uri.fsPath);

await vscode.commands.executeCommand('turbo-ai-rules.syncRules');

const pathsAfterResync = selectionStateManager.getSelection(sourceId);
assert.deepStrictEqual(pathsAfterResync.sort(), updatedPaths.sort());
```

### Mock 输入

```typescript
import { mockShowInputBox, mockShowQuickPick, restoreAllMocks } from '../mocks';
mockShowInputBox('https://github.com/user/repo.git');
mockShowQuickPick({ label: 'None' } as vscode.QuickPickItem);
await vscode.commands.executeCommand('turbo-ai-rules.addSource');
restoreAllMocks(); // 在 afterEach 中
```

### 验证文件

```typescript
import * as fs from 'fs-extra';
const configPath = path.join(workspaceFolder.uri.fsPath, '.cursorrules');
assert.ok(await fs.pathExists(configPath), 'Config file should exist');
const content = await fs.readFile(configPath, 'utf-8');
assert.ok(content.includes('规则内容'), 'Config should include rule content');
```

## 关键原则

1. **一测试一工作空间** - 避免切换
2. **模拟 UI 操作** - 通过数据持久化
3. **Workflow 优先快照恢复** - `createWorkspaceSnapshot` / `restoreWorkspaceSnapshot`
4. **清理状态** - afterEach 中清理选择状态与临时输出
5. **合理超时** - 网络操作用 LONG / EXTRA_LONG
6. **等待异步** - sleep + 轮询
7. **至少留一条闭环链路** - 不能只有“第一次同步成功”，还要测“改选择后再次同步”

## 测试常量

```typescript
export const TEST_TIMEOUTS = {
  SHORT: 5000,   // 简单操作
  MEDIUM: 10000, // 一般命令
  LONG: 30000,   // 网络/Git 操作
  EXTRA_LONG: 60000
};

export const TEST_DELAYS = {
  SHORT: 100,
  MEDIUM: 500,
  LONG: 1000
};
```
