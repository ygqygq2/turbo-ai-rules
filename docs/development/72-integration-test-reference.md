# 72. 集成测试快速参考

## 添加新测试

### 1. 选择目录

- **workflows/** - 端到端流程
- **scenarios/** - 特殊场景、边界情况
- **commands/** - 单个命令测试

### 2. 选择工作空间

| 工作空间 | 用途 | 已使用测试 |
|---------|------|-----------|
| rules-for-cursor | Cursor、通用 | cursor-workflow, source-management |
| rules-multi-source | 多源、冲突 | multi-source-workflow |
| rules-with-user-rules | 用户规则、用户技能 | user-rules-workflow, user-skills-workflow |
| rules-for-skills | Skill 适配器 | skills-workflow |
| rules-for-default | 默认适配器 | rule-selection, adapter-types, statusbar |
| 多工作空间 | 隔离测试 | workspace-isolation |

### 3. 测试模板

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import { CONFIG_KEYS } from '../../../utils/constants';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../testConstants';

describe('XXX Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;
  let rulesManager: any;
  let selectionStateManager: any;

  before(async function() {
    this.timeout(TEST_TIMEOUTS.LONG);
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0);
    workspaceFolder = folders.find(f => f.name.includes('关键词')) || folders[0];
    
    const ext = vscode.extensions.getExtension('ygqygq2.turbo-ai-rules');
    if (ext && !ext.isActive) await ext.activate();

      await ext.activate();
    }
    
    // 3. 获取服务实例
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
    
    rulesManager = (ext as any)?.exports?.getRulesManager?.();
    selectionStateManager = (ext as any)?.exports?.getSelectionStateManager?.();
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
    this.timeout(TEST_TIMEOUTS.LONG);
    // 测试逻辑
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
3. **清理状态** - afterEach 中清理
4. **合理超时** - 网络操作用 LONG
5. **等待异步** - sleep + 轮询

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
const configPath = path.join(workspaceFolder.uri.fsPath, '.cursorrules');
