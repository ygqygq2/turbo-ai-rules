# UI Phase 3: 交互优化设计

## 概述

Phase 3 专注于提升用户交互体验，增强高级功能的可用性和效率。

**设计原则**：

- 伪代码示意，不包含具体业务实现
- 遵循 VS Code 交互规范
- 优化大数据集场景下的性能
- 保持与 Phase 1/2 一致的视觉风格

---

## 任务列表

### Task 1: 高级搜索 Webview ⭐ 优先级高

**目标**：提供强大的多条件搜索界面，替代简单的快速选择器。

**功能需求**：

1. 多条件组合搜索（名称/内容/标签/优先级/来源）
2. 搜索历史记录（最近 10 次）
3. 快捷过滤器（高优先级、已忽略、特定来源）
4. 实时搜索结果预览
5. 结果导出（JSON/CSV）

**界面布局**（ASCII）：

```
┌─────────────────────────────────────────────────┐
│ Advanced Rule Search                        [x] │
├─────────────────────────────────────────────────┤
│ Search Conditions                               │
│ ┌───────────────────────────────────────────┐   │
│ │ Name:      [________________] 🔍          │   │
│ │ Content:   [________________]             │   │
│ │ Tags:      [tag1, tag2...   ]             │   │
│ │ Priority:  [ All ▼] Source: [ All ▼]     │   │
│ └───────────────────────────────────────────┘   │
│                                                   │
│ Quick Filters: [High Priority] [Ignored] [Reset]│
│                                                   │
│ Search History                                   │
│ ┌───────────────────────────────────────────┐   │
│ │ • "authentication rules" - 2 results      │   │
│ │ • "high priority" - 15 results            │   │
│ └───────────────────────────────────────────┘   │
│                                                   │
│ Results (23 found)              [Export ▼]       │
│ ┌───────────────────────────────────────────┐   │
│ │ 🔥 auth/jwt-validation.mdc          [View]│   │
│ │    Source: company-rules | Tags: auth    │   │
│ │ ⚠️  security/input-sanitize.mdc     [View]│   │
│ └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

**数据流**（伪代码）：

```typescript
// 搜索条件接口
interface SearchCriteria {
  namePattern?: string;
  contentPattern?: string;
  tags?: string[];
  priority?: number;
  source?: string;
}

// 搜索方法伪代码
function performSearch(criteria: SearchCriteria): SearchResult[] {
  let results = getAllRules();

  if (criteria.namePattern) {
    results = results.filter((rule) => rule.name.includes(criteria.namePattern));
  }

  if (criteria.contentPattern) {
    results = results.filter((rule) => rule.content.includes(criteria.contentPattern));
  }

  // ... 其他过滤条件

  return results;
}

// 搜索历史管理
class SearchHistory {
  private history: SearchCriteria[] = [];

  add(criteria: SearchCriteria): void {
    // 添加到历史记录，最多保留10条
    this.history.unshift(criteria);
    if (this.history.length > 10) {
      this.history.pop();
    }
  }

  get recent(): SearchCriteria[] {
    return this.history;
  }
}
```

---

### Task 2: 配置管理 Webview ⭐ 优先级高

**目标**：提供图形化配置界面，简化复杂配置项的设置。

**功能需求**：

1. 源管理（添加/编辑/删除/排序）
2. 适配器配置（启用/禁用/自定义输出路径）
3. 同步设置（自动同步间隔、忽略模式）
4. 验证和错误提示
5. 配置导入/导出

**界面布局**（ASCII）：

```
┌─────────────────────────────────────────────────┐
│ ⚙️  Configuration Manager              [Save] │
├─────────────────────────────────────────────────┤
│ [Sources] [Adapters] [Sync] [Advanced]         │
├─────────────────────────────────────────────────┤
│ Rule Sources (3)                    [+ Add]     │
│ ┌───────────────────────────────────────────┐   │
│ │ ≡ company-rules                           │   │
│ │   📁 github.com/company/ai-rules          │   │
│ │   Branch: main | Status: ✅ Synced        │   │
│ │   [Edit] [Remove] [↑] [↓]                 │   │
│ ├───────────────────────────────────────────┤   │
│ │ ≡ personal-rules                          │   │
│ │   📁 github.com/user/my-rules             │   │
│ │   Branch: develop | Status: 🔄 Syncing    │   │
│ └───────────────────────────────────────────┘   │
│                                                   │
│ Adapters                                         │
│ ┌───────────────────────────────────────────┐   │
│ │ [✓] Copilot    Output: .github/           │   │
│ │ [✓] Cursor     Output: .cursorrules       │   │
│ │ [ ] Continue   Output: .continue/         │   │
│ │ [ ] Custom     [Configure...]             │   │
│ └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

**配置验证**（伪代码）：

```typescript
// 配置验证器
class ConfigValidator {
  validateSource(source: RuleSource): ValidationResult {
    const errors: string[] = [];

    if (!isValidUrl(source.url)) {
      errors.push('Invalid repository URL');
    }

    if (source.subPath && !source.subPath.startsWith('/')) {
      errors.push('Subpath must start with /');
    }

    return { valid: errors.length === 0, errors };
  }

  validateAdapterConfig(config: AdapterConfig): ValidationResult {
    // 验证适配器配置
    // - 输出路径不冲突
    // - 自定义适配器有效
    // - 至少启用一个适配器
  }
}

// 配置持久化
class ConfigPersistence {
  async save(config: ExtensionConfig): Promise<void> {
    // 保存到 workspace configuration
    await vscode.workspace
      .getConfiguration('turbo-ai-rules')
      .update('sources', config.sources, vscode.ConfigurationTarget.Workspace);
  }

  async export(filePath: string): Promise<void> {
    // 导出为 JSON 文件
    const config = this.getCurrentConfig();
    await fs.writeFile(filePath, JSON.stringify(config, null, 2));
  }
}
```

---

### Task 3: 树视图批量操作

**目标**：支持多选和批量操作，提升管理效率。

**功能需求**：

1. 多选支持（Ctrl/Cmd + Click）
2. 批量启用/禁用
3. 批量导出
4. 批量删除（带确认）
5. 全选/反选快捷键

**交互流程**（伪代码）：

```typescript
// 树节点选择管理
class TreeSelectionManager {
  private selectedItems: Set<TreeItem> = new Set();

  toggleSelection(item: TreeItem, multiSelect: boolean): void {
    if (multiSelect) {
      if (this.selectedItems.has(item)) {
        this.selectedItems.delete(item);
      } else {
        this.selectedItems.add(item);
      }
    } else {
      this.selectedItems.clear();
      this.selectedItems.add(item);
    }

    this.updateUI();
  }

  selectAll(): void {
    this.selectedItems = new Set(this.getAllItems());
  }

  getSelectedCount(): number {
    return this.selectedItems.size;
  }
}

// 批量操作
class BatchOperations {
  async disableRules(rules: ParsedRule[]): Promise<void> {
    const confirmed = await vscode.window.showWarningMessage(
      `Disable ${rules.length} rules?`,
      { modal: true },
      'Disable',
    );

    if (confirmed === 'Disable') {
      await Promise.all(rules.map((rule) => configManager.disableRule(rule.path)));

      vscode.window.showInformationMessage(`Successfully disabled ${rules.length} rules`);
    }
  }

  async exportRules(rules: ParsedRule[]): Promise<void> {
    const exportPath = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file('rules-export.json'),
      filters: { JSON: ['json'] },
    });

    if (exportPath) {
      const data = rules.map((rule) => ({
        name: rule.name,
        content: rule.content,
        metadata: rule.metadata,
      }));

      await fs.writeFile(exportPath.fsPath, JSON.stringify(data, null, 2));
    }
  }
}
```

**界面提示**：

```
树视图工具栏新增：
[✓] Select All    - 全选当前视图
[◻️] Deselect All - 清除选择
[🗑️] Batch Delete  - 批量删除（仅选中项可见时显示）

底部状态：
"3 rules selected" - 显示选中数量
```

---

### Task 4: 拖放排序

**目标**：允许通过拖放调整源的优先级顺序。

**功能需求**：

1. 拖放源节点重新排序
2. 拖放规则到不同源（移动）
3. 视觉反馈（拖动预览、放置指示器）
4. 自动保存新顺序

**实现思路**（伪代码）：

```typescript
// 树视图拖放支持
class RulesTreeDragAndDrop implements vscode.TreeDragAndDropController<TreeItem> {
  dropMimeTypes = ['application/vnd.code.tree.turboAiRulesExplorer'];
  dragMimeTypes = ['application/vnd.code.tree.turboAiRulesExplorer'];

  async handleDrag(source: TreeItem[], dataTransfer: vscode.DataTransfer): Promise<void> {
    // 序列化拖动的项目
    dataTransfer.set(this.dragMimeTypes[0], new vscode.DataTransferItem(source));
  }

  async handleDrop(target: TreeItem | undefined, dataTransfer: vscode.DataTransfer): Promise<void> {
    const transferItem = dataTransfer.get(this.dropMimeTypes[0]);
    if (!transferItem) return;

    const draggedItems = transferItem.value;

    // 重新排序逻辑
    if (isSourceNode(target)) {
      await this.reorderSources(draggedItems, target);
    } else if (isRuleNode(target)) {
      await this.moveRule(draggedItems[0], target);
    }

    // 刷新视图
    this.refresh();
  }

  private async reorderSources(draggedSources: TreeItem[], targetSource: TreeItem): Promise<void> {
    const config = configManager.getConfig();
    const sources = [...config.sources];

    // 计算新的索引位置
    const dragIndex = sources.findIndex((s) => s === draggedSources[0].source);
    const dropIndex = sources.findIndex((s) => s === targetSource.source);

    // 移动数组元素
    const [removed] = sources.splice(dragIndex, 1);
    sources.splice(dropIndex, 0, removed);

    // 保存新顺序
    await configManager.updateSourceOrder(sources);
  }
}
```

**视觉反馈**：

- 拖动时显示半透明预览
- 放置位置显示蓝色线条指示器
- 不允许放置时显示禁止图标

---

## 性能优化

### 虚拟滚动

对于大量搜索结果（>100 条），使用虚拟滚动：

```typescript
// 虚拟滚动实现
class VirtualScroller {
  private visibleRange = { start: 0, end: 50 };
  private itemHeight = 60; // 每项高度（px）

  render(items: any[], scrollTop: number): string {
    const startIndex = Math.floor(scrollTop / this.itemHeight);
    const endIndex = startIndex + 50; // 渲染50项

    const visibleItems = items.slice(startIndex, endIndex);
    const offsetY = startIndex * this.itemHeight;

    return `
      <div style="height: ${items.length * this.itemHeight}px">
        <div style="transform: translateY(${offsetY}px)">
          ${visibleItems.map((item) => this.renderItem(item)).join('')}
        </div>
      </div>
    `;
  }
}
```

### 防抖搜索

避免频繁触发搜索：

```typescript
class SearchDebouncer {
  private timer: NodeJS.Timeout | null = null;
  private delay = 300; // 300ms 延迟

  debounce(fn: () => void): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      fn();
      this.timer = null;
    }, this.delay);
  }
}
```

---

## 消息协议

### SearchWebview 消息

```typescript
// Webview -> Extension
type SearchMessage =
  | { type: 'search'; criteria: SearchCriteria }
  | { type: 'exportResults'; format: 'json' | 'csv' }
  | { type: 'viewRule'; rulePath: string }
  | { type: 'loadHistory' };

// Extension -> Webview
type SearchResponse =
  | { type: 'searchResults'; results: SearchResult[] }
  | { type: 'searchHistory'; history: SearchCriteria[] }
  | { type: 'error'; message: string };
```

### ConfigWebview 消息

```typescript
// Webview -> Extension
type ConfigMessage =
  | { type: 'addSource'; source: RuleSource }
  | { type: 'updateSource'; index: number; source: RuleSource }
  | { type: 'removeSource'; index: number }
  | { type: 'reorderSources'; fromIndex: number; toIndex: number }
  | { type: 'updateAdapter'; adapter: string; enabled: boolean }
  | { type: 'saveConfig'; config: ExtensionConfig }
  | { type: 'exportConfig'; filePath: string }
  | { type: 'importConfig'; filePath: string };

// Extension -> Webview
type ConfigResponse =
  | { type: 'configData'; config: ExtensionConfig }
  | { type: 'validationError'; field: string; message: string }
  | { type: 'saved' }
  | { type: 'error'; message: string };
```

---

## 测试清单

### SearchWebview

- [ ] 单条件搜索正常工作
- [ ] 多条件组合搜索准确
- [ ] 搜索历史正确保存和加载
- [ ] 快捷过滤器生效
- [ ] 结果导出功能正常
- [ ] 大数据集（1000+规则）性能良好
- [ ] 实时搜索不卡顿（防抖生效）

### ConfigWebview

- [ ] 源的添加/编辑/删除正常
- [ ] 源顺序调整保存正确
- [ ] 适配器启用/禁用生效
- [ ] 配置验证提示准确
- [ ] 配置导入/导出完整
- [ ] 错误处理友好

### 批量操作

- [ ] 多选功能正常
- [ ] 批量启用/禁用生效
- [ ] 批量导出完整
- [ ] 批量删除带确认
- [ ] 全选/反选快捷键工作

### 拖放排序

- [ ] 源拖放重排序成功
- [ ] 规则拖放移动成功
- [ ] 视觉反馈清晰
- [ ] 不允许的操作被阻止
- [ ] 新顺序正确保存

---

## 集成计划

### 命令注册

```json
{
  "commands": [
    {
      "command": "turbo-ai-rules.advancedSearch",
      "title": "Advanced Rule Search",
      "category": "Turbo AI Rules"
    },
    {
      "command": "turbo-ai-rules.openConfig",
      "title": "Open Configuration",
      "category": "Turbo AI Rules"
    },
    {
      "command": "turbo-ai-rules.batchDisable",
      "title": "Batch Disable Rules",
      "category": "Turbo AI Rules"
    }
  ]
}
```

### 快捷键

```json
{
  "keybindings": [
    {
      "command": "turbo-ai-rules.advancedSearch",
      "key": "ctrl+shift+f",
      "mac": "cmd+shift+f",
      "when": "view == turboAiRulesExplorer"
    },
    {
      "command": "turbo-ai-rules.openConfig",
      "key": "ctrl+shift+,",
      "mac": "cmd+shift+,",
      "when": "view == turboAiRulesExplorer"
    }
  ]
}
```

### 工具栏按钮

- 高级搜索图标：`$(search)`
- 配置管理图标：`$(settings-gear)`
- 批量操作图标：`$(checklist)` （选中项时显示）

---

## 后续优化建议

1. **智能搜索**：使用模糊匹配算法（Fuse.js）提升搜索体验
2. **搜索过滤器预设**：允许保存常用搜索条件组合
3. **配置模板**：提供预定义的配置模板（公司、个人、团队）
4. **协作功能**：支持配置共享和团队同步
5. **规则推荐**：基于项目类型推荐相关规则

---

**状态**: Phase 3 设计完成，待实现
**下一步**: 实现 SearchWebviewProvider
