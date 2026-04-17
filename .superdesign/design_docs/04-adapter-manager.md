# SuperDesign 设计文档 - 适配器管理页

> **Webview 实现**: `src/webview/adapter-manager/`  
> **HTML 原型**: `design_iterations/04-adapter-manager_1.html`  
> **实施文档**: `docs/implementation/ui/04-adapter-manager-implementation.md`  
> **最后更新**: 2026-04-17  
> **页面名称**: Adapter Manager (适配器管理)  
> **用途**: 管理预置适配器和自定义适配器的启用状态和配置  
> **优先级**: high

---

## 📋 设计目标

创建一个统一的适配器管理界面,让用户能够:

- ✅ 启用/禁用预置适配器(Copilot、Cursor、Continue)
- 🔧 创建、编辑、删除自定义适配器
- 🧩 在综合体标签中区分管理内置综合体与自定义综合体
- 📁 配置输出路径和类型(文件/目录)
- 🎯 设置适配器行为(自动更新、元数据等)

> 说明：当前页面结构已经升级为三类主标签：`预设适配器`、`自定义适配器`、`综合体`；其中 `综合体` 再细分为 `内置综合体` 与 `自定义综合体` 两个子标签。

---

## 🎨 布局设计

### 整体结构（上下各 50% 布局）

```
┌──────────────────────────────────────────────────────────────┐
│  ⚙️ 适配器配置管理                                           │
├──────────────────────────────────────────────────────────────┤
│  📌 预置适配器                               [1 / 2] ◀ ▶   │ ← 50% 高度
│  ┌────────────────────────────────────────────────────────┐  │
│  │ ☑ Cursor       .cursorrules                  [已启用] │  │
│  │ ☑ Windsurf     .windsurfrules                [已启用] │  │
│  │ ☐ Copilot      .github/copilot-...          [已禁用] │  │
│  │ ☐ Continue     .continuerules               [已禁用] │  │
│  │ ☐ Cline        .clinerules                  [已禁用] │  │
│  │ ☐ Roo-Cline    .roorules                    [已禁用] │  │
│  └────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│  🔧 自定义适配器           [➕ 添加适配器]  [1 / 1] ◀ ▶   │ ← 50% 高度
│  ┌────────────────────────────────────────────────────────┐  │
│  │ ☑ Default Rules  📁 rules/                   [已启用] │  │
│  │    按源组织  .md,.mdc          [✏️ 编辑] [🗑️ 删除]   │  │
│  │                                                         │  │
│  │ ☑ AI Skills      📁 skills/                  [已启用] │  │
│  │    按源组织  .md,.mdc          [✏️ 编辑] [🗑️ 删除]   │  │
│  └────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│                                           [取消]  [保存全部] │
└──────────────────────────────────────────────────────────────┘
```

**布局说明**：

- 预设适配器和自定义适配器**上下布局**，各占 50% 屏幕高度
- 卡片更**紧凑**（减少内边距和间距）
- 每个区域都有**分页器**（当内容超过 6 个时显示）
- 一屏可以同时看到预设和自定义两个区域

### 添加/编辑自定义适配器弹窗

```
┌──────────────────────────────────────────────────────────┐
│  ✏️ 编辑自定义适配器                                 [X] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  适配器 ID *                                             │
│  [ai-skills                                        ]    │
│  (kebab-case, 仅字母、数字、连字符)                      │
│                                                          │
│  适配器名称 *                                            │
│  [AI Skills                                        ]    │
│                                                          │
│  输出路径 * (相对于工作区根目录)                         │
│  [skills/                                          ]    │
│                                                          │
│  适配器类型 *                                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │ (•) 📜 规则类型 (rules)                          │   │
│  │     用于 AI 编码助手的规则配置                   │   │
│  ├──────────────────────────────────────────────────┤   │
│  │ ( ) 🛠️ 技能类型 (skills)                         │   │
│  │     用于 AI 技能/能力配置                        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  输出格式 *                                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ( ) 📄 单个文件                                  │   │
│  │     合并所有规则到一个文件                       │   │
│  ├──────────────────────────────────────────────────┤   │
│  │ (•) 📁 目录结构                                  │   │
│  │     保持原有目录结构                             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  文件过滤 (不填写则同步所有文件)                         │
│  [.md, .mdc                                        ]    │
│  (逗号分隔,如: .md, .mdc)                               │
│                                                          │
│  【目录模式专属字段】                                    │
│  文件名模式 *                                            │
│  [{{name}}.md                                      ]    │
│  (支持变量: {{name}}, {{id}}, {{ext}})                   │
│                                                          │
│  路径模板 *                                              │
│  [{{sourceId}}/{{category}}/                       ]    │
│  (支持变量: {{sourceId}}, {{category}}, {{tags}})        │
│                                                          │
│  ┌────────────────────────────────────────────────┐     │
│  │ [✓] 📂 按源 ID 组织子目录                       │     │
│  └────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────┐     │
│  │ [ ] 📋 生成索引文件                             │     │
│  └────────────────────────────────────────────────┘     │
│                                                          │
│  【单文件模式专属字段】                                  │
│  文件模板 *                                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │ # My Rules                                       │   │
│  │                                                  │   │
│  │ {{rules}}                                        │   │
│  └──────────────────────────────────────────────────┘   │
│  (使用 {{rules}} 作为规则内容占位符)                     │
│                                                          │
│  排序依据                                                │
│  ┌──────────────────────────────────────────────────┐   │
│  │ [Priority ▼]                                     │   │
│  └──────────────────────────────────────────────────┘   │
│  (规则 ID / 优先级 / 无排序)                             │
│                                                          │
│  排序顺序                                                │
│  ┌──────────────────────────────────────────────────┐   │
│  │ [Ascending ▼]                                    │   │
│  └──────────────────────────────────────────────────┘   │
│  (升序 / 降序)                                           │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  💡 提示:                                                 │
│  • 适配器 ID 用于标识适配器,创建后不可修改               │
│  • 输出路径将自动创建,无需手动创建目录                   │
│  • Skills 类型适配器建议用于技能/能力相关的规则集        │
├──────────────────────────────────────────────────────────┤
│                                               [取消] [保存] │
└──────────────────────────────────────────────────────────┘
```

---

## 🎨 视觉设计

### 配色方案

**VSCode 主题变量**:
- 背景：`var(--vscode-editor-background)`
- 文字：`var(--vscode-foreground)`
- 边框：`var(--vscode-editorWidget-border)`
- 按钮：`var(--vscode-button-primaryBackground)`
- 错误：`var(--vscode-errorForeground)`
- 成功：`var(--vscode-testing-iconPassed)`

**样式实现详见**: `src/webview/adapter-manager/adapter-manager.css`


### 图标使用

```html
<!-- 预置适配器标签页和卡片 -->
<i class="codicon codicon-verified-filled"></i>

<!-- 自定义适配器标签页和卡片 -->
<i class="codicon codicon-symbol-property"></i>

<!-- 添加 -->
<i class="codicon codicon-add"></i>

<!-- 编辑 -->
<i class="codicon codicon-edit"></i>

<!-- 删除 -->
<i class="codicon codicon-trash"></i>

<!-- 文件 -->
<i class="codicon codicon-file"></i>

<!-- 目录 -->
<i class="codicon codicon-folder"></i>

<!-- 启用 -->
<i class="codicon codicon-pass"></i>

<!-- 禁用 -->
<i class="codicon codicon-circle-slash"></i>
```

---

## ✨ 交互设计

### 预置适配器操作

**启用/禁用**:

- 点击复选框切换启用状态
- 禁用时配置项变灰
- 自动保存状态

**展开/折叠详细配置**:

- 点击"详细配置"按钮展开/折叠
- 显示输出路径、自动更新、元数据等选项
- 支持直接修改配置项

### 自定义适配器操作

**添加适配器**:

1. 点击"添加适配器"按钮
2. 弹出表单对话框
3. 填写必填项(ID、名称、输出路径、输出类型)
4. 选择可选项(文件过滤、组织方式等)
5. 验证输入
6. 保存到配置

**编辑适配器**:

1. 点击"编辑"按钮
2. 弹出表单对话框(预填现有配置)
3. 修改配置项(ID 不可修改)
4. 验证输入
5. 保存更新

**删除适配器**:

1. 点击"删除"按钮
2. 弹出确认对话框
3. 确认后删除适配器配置

### 验证规则

**适配器 ID**:

- 必填
- kebab-case 格式
- 仅包含小写字母、数字、连字符
- 不能与已有 ID 重复
- 创建后不可修改

**适配器名称**:

- 必填
- 1-50 个字符

**输出路径**:

- 必填
- 相对路径(不能以 / 或 .. 开头)
- 自动创建目录

**文件过滤**:

- 可选
- 逗号分隔的扩展名列表
- 格式: `.md, .mdc`
- 为空时同步所有文件

### 动画效果

```css
/* 卡片展开动画 */
@keyframes slideDown {
  from {
    max-height: 0;
    opacity: 0;
  }
  to {
    max-height: 500px;
    opacity: 1;
  }
}

.adapter-options {
  overflow: hidden;
  animation: slideDown 0.3s ease-out;
}

/* 弹窗动画 */
@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-content {
  animation: modalFadeIn 0.3s ease-out;
}
```

---

## 🔌 消息通信

### Extension → Webview

```typescript
// 初始化数据
{
  type: 'init',
  payload: {
    presetAdapters: [
      {
        id: string,
        name: string,
        description: string,
        enabled: boolean,
        outputPath: string,
        type: 'file' | 'directory',
        isRuleType: boolean,
        sortBy?: 'id' | 'priority' | 'none',
        sortOrder?: 'asc' | 'desc',
        organizeBySource?: boolean,
        preserveDirectoryStructure?: boolean,
        useOriginalFilename?: boolean,
        generateIndex?: boolean,
        indexPerSource?: boolean
      }
    ],
    customAdapters: [
      {
        id: string,
        name: string,
        outputPath: string,
        format: 'single-file' | 'directory',
        isRuleType: boolean,
        enabled: boolean,
        fileExtensions?: string[],
        organizeBySource?: boolean,
        generateIndex?: boolean,
        indexPerSource?: boolean,
        indexFileName?: string,
        preserveDirectoryStructure?: boolean,
        useOriginalFilename?: boolean,
        sortBy?: 'id' | 'priority' | 'none',
        sortOrder?: 'asc' | 'desc',
        singleFileTemplate?: string,
        directoryStructure?: {
          filePattern: string,
          pathTemplate: string
        }
      }
    ]
  }
}

// 保存成功
{
  type: 'saveResult',
  payload: {
    success: true
  }
}

// 保存失败
{
  type: 'saveResult',
  payload: {
    success: false,
    message: string
  }
}
```

### Webview → Extension

```typescript
// 保存所有适配器配置
{
  type: 'saveAllAdapters',
  payload: {
    presetAdapters: [{ ... }],
    customAdapters: [{ ... }]
  }
}

// 保存单个自定义适配器
{
  type: 'saveAdapter',
  payload: {
    adapter: {
      id: string,
      name: string,
      outputPath: string,
      format: 'single-file' | 'directory',
      isRuleType: boolean,
      enabled: boolean,
      fileExtensions?: string[],
      organizeBySource?: boolean,
      generateIndex?: boolean,
      indexPerSource?: boolean,
      indexFileName?: string,
      preserveDirectoryStructure?: boolean,
      useOriginalFilename?: boolean,
      sortBy?: 'id' | 'priority' | 'none',
      sortOrder?: 'asc' | 'desc',
      singleFileTemplate?: string,
      directoryStructure?: {
        filePattern: string,
        pathTemplate: string
      },
      isNew: boolean
    }
  }
}

// 删除自定义适配器
{
  type: 'deleteAdapter',
  payload: {
    id: string
  }
}

// 打开预设适配器设置
{
  type: 'openPresetSettings',
  payload: {
    adapterId: string
  }
}

// 保存预设适配器设置
{
  type: 'savePresetSettings',
  payload: {
    adapter: {
      id: string,
      name: string,
      sortBy?: 'id' | 'priority' | 'none',
      sortOrder?: 'asc' | 'desc',
      organizeBySource?: boolean,
      preserveDirectoryStructure?: boolean,
      useOriginalFilename?: boolean,
      generateIndex?: boolean,
      indexPerSource?: boolean
    }
  }
}
```
    id: string,
    excludeId?: string // 编辑时排除自身
  }
}
```

---

## ♿ 无障碍支持

### 键盘导航

| 按键        | 功能                 |
| ----------- | -------------------- |
| `Tab`       | 切换焦点到下一个元素 |
| `Shift+Tab` | 切换焦点到上一个元素 |
| `Enter`     | 激活按钮或切换复选框 |
| `Space`     | 切换复选框或单选按钮 |
| `Esc`       | 关闭弹窗             |

### ARIA 属性

```html
<!-- 预置适配器 -->
<div class="preset-adapter" role="article" aria-label="GitHub Copilot 适配器">
  <input type="checkbox" role="switch" aria-checked="true" aria-label="启用 GitHub Copilot" />
</div>

<!-- 自定义适配器 -->
<div class="custom-adapter" role="article" aria-label="AI Skills 自定义适配器">
  <!-- 内容 -->
</div>

<!-- 表单输入 -->
<label for="adapter-id" class="form-label required">适配器 ID</label>
<input
  id="adapter-id"
  type="text"
  aria-required="true"
  aria-invalid="false"
  aria-describedby="adapter-id-hint"
/>
<small id="adapter-id-hint" class="form-hint"> kebab-case, 仅字母、数字、连字符 </small>
```

---

## 📊 数据验证

### 客户端验证

```typescript
// 适配器 ID 验证
function validateAdapterId(id: string): ValidationResult {
  const errors: string[] = [];

  if (!id || id.trim() === '') {
    errors.push('适配器 ID 不能为空');
  }

  if (!/^[a-z0-9-]+$/.test(id)) {
    errors.push('适配器 ID 只能包含小写字母、数字和连字符');
  }

  if (id.startsWith('-') || id.endsWith('-')) {
    errors.push('适配器 ID 不能以连字符开头或结尾');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// 输出路径验证
function validateOutputPath(path: string): ValidationResult {
  const errors: string[] = [];

  if (!path || path.trim() === '') {
    errors.push('输出路径不能为空');
  }

  if (path.startsWith('/') || path.startsWith('..')) {
    errors.push('输出路径必须是相对路径');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// 文件扩展名验证
function validateFileExtensions(extensions: string): ValidationResult {
  const errors: string[] = [];

  if (extensions.trim() === '') {
    return { valid: true, errors: [] }; // 空值有效
  }

  const exts = extensions.split(',').map((e) => e.trim());

  for (const ext of exts) {
    if (!ext.startsWith('.')) {
      errors.push(`扩展名必须以 . 开头: ${ext}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

---

## 🎯 实现要点

### 配置持久化

- 预置适配器配置存储在 VS Code settings
- 自定义适配器存储在 `turboAiRules.adapters.custom` 配置项
- 使用 `ConfigManager` 统一管理

### 错误处理

- ID 重复检查
- 路径安全性验证
- 配置格式验证
- 友好错误提示

### 排序选项设计

**适用范围**: 仅单文件模式适配器显示排序选项

**字段说明**:

- `sortBy`: 排序依据
  - `'id'`: 按规则 ID 字典序排序
  - `'priority'`: 按优先级排序 (high > medium > low)
  - `'none'`: 不排序,保持源文件顺序
  - 默认值: `'priority'`

- `sortOrder`: 排序顺序
  - `'asc'`: 升序 (A→Z, low→high)
  - `'desc'`: 降序 (Z→A, high→low)
  - 默认值: `'asc'`

**UI 行为**:

- 仅在输出格式选择"📄 单个文件"时显示
- 输出格式切换为"📁 目录结构"时,自动隐藏
- 下拉框默认值为 Priority / Ascending
- 修改后立即更新配置,无需手动保存

**状态管理**:

```typescript
interface AdapterFormState {
  // ... 其他字段
  outputType: 'file' | 'directory';
  sortBy: 'id' | 'priority' | 'none';
  sortOrder: 'asc' | 'desc';
}

// 显示逻辑
const showSortingOptions = formState.outputType === 'file';
```

**验证规则**:

- 无需特殊验证 (下拉框限制了有效值)
- 保存时确保 sortBy 和 sortOrder 一起保存
- 如果 outputType 为 'directory', sortBy 和 sortOrder 不发送到后端

### 性能优化

- 防抖保存
- 懒加载适配器详情
- 缓存验证结果

---

## 📝 技术备注

### 集成到 BaseWebviewProvider

```typescript
export class AdapterManagerWebviewProvider extends BaseWebviewProvider {
  constructor(
    context: vscode.ExtensionContext,
    private configManager: ConfigManager,
  ) {
    super(context);
  }

  protected getHtmlContent(webview: vscode.Webview): string {
    // 返回适配器管理页 HTML
  }

  protected async handleMessage(message: WebviewMessage): Promise<void> {
    switch (message.type) {
      case 'saveConfig':
        await this.handleSaveConfig(message.payload);
        break;
      case 'addCustomAdapter':
        await this.handleAddCustomAdapter(message.payload);
        break;
      case 'updateCustomAdapter':
        await this.handleUpdateCustomAdapter(message.payload);
        break;
      case 'deleteCustomAdapter':
        await this.handleDeleteCustomAdapter(message.payload);
        break;
      case 'validateAdapterId':
        await this.handleValidateAdapterId(message.payload);
        break;
    }
  }

  private async handleSaveConfig(payload: any) {
    try {
      // 更新预置适配器配置
      await this.configManager.updateConfig('adapters', payload);

      this.postMessage({
        type: 'saveSuccess',
        payload: { message: '配置已保存' },
      });
    } catch (error) {
      this.postMessage({
        type: 'saveError',
        payload: {
          message: '保存失败',
          errors: [(error as Error).message],
        },
      });
    }
  }
}
```

---

## 🔍 参考

- **Dashboard 设计**: [12-dashboard.md](./12-dashboard.md)
- **规则同步页**: [05-rule-sync-page.md](./05-rule-sync-page.md)
- **配置管理**: `src/services/ConfigManager.ts`
- **数据模型**: [docs/development/10-data-model.md](../../docs/development/10-data-model.md)

---

_设计版本: 1.0_  
_创建日期: 2025-11-27_  
_设计师: AI (SuperDesign)_
