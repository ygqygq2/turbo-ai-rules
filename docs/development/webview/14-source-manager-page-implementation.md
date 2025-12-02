# 规则源管理页面实施文档

> **设计文档**: `.superdesign/design_docs/14-source-manager-page.md`  
> **UI 原型**: `.superdesign/design_iterations/14-source-manager-page_2.html`  
> **实施日期**: 2025-12-01

---

## 📋 实施概览

将规则源管理页面从**左右分栏布局**重构为**卡片网格布局**，提升用户体验和操作效率。

### 核心改进

- ✅ 卡片网格替代左右分栏
- ✅ 所有操作在卡片上直接完成
- ✅ 复用现有 add-source 和 source-detail webview
- ✅ 简化状态管理，移除复杂视图切换
- ✅ 响应式设计，支持多种屏幕尺寸

---

## 🎯 实施路径

### 1. React 组件实现

**文件**: `src/webview/source-manager/SourceManager.tsx`

#### 主要变更

1. **移除旧组件依赖**

   ```typescript
   // ❌ 删除
   import { SourceList } from './SourceList';
   import { SourceDetails } from './SourceDetails';
   import { SourceForm } from './SourceForm';

   // ✅ 只需主组件
   export const SourceManager: React.FC = () => {
     // ...
   };
   ```

2. **简化状态管理**

   ```typescript
   // ❌ 删除复杂状态
   const [selectedSource, setSelectedSource] = useState<SourceDetails | null>(null);
   const [viewMode, setViewMode] = useState<ViewMode>('empty');

   // ✅ 只保留必要状态
   const [sources, setSources] = useState<Source[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [successMessage, setSuccessMessage] = useState<string | null>(null);
   ```

3. **卡片渲染逻辑**

   ```tsx
   <div className="source-cards-grid">
     {sources.map((source) => (
       <div key={source.id} className={`source-card ${source.enabled ? 'enabled' : 'disabled'}`}>
         {/* 卡片头部 */}
         <div className="card-header">
           <div className="source-title">
             <i
               className={`codicon ${
                 source.enabled ? 'codicon-pass-filled' : 'codicon-circle-large-outline'
               } status-icon`}
             ></i>
             <h3>{source.name}</h3>
           </div>
           <button className="icon-button" onClick={() => handleEditSource(source.id)}>
             <i className="codicon codicon-edit"></i>
           </button>
         </div>

         {/* 卡片内容 */}
         <div className="card-body">
           <div className="info-row">
             <span className="label">{t('form.label.gitUrl')}:</span>
             <span className="value truncate" title={source.gitUrl}>
               {source.gitUrl}
             </span>
           </div>
           {/* ... 更多信息行 */}
         </div>

         {/* 卡片操作 */}
         <div className="card-actions">
           <button
             className={`button ${source.enabled ? 'secondary' : 'primary'}`}
             onClick={() => handleToggleSource(source)}
           >
             <i
               className={`codicon ${
                 source.enabled ? 'codicon-debug-pause' : 'codicon-debug-start'
               }`}
             ></i>
             {source.enabled ? t('form.button.disable') : t('form.button.enable')}
           </button>
           <button
             className="button secondary"
             onClick={() => handleSyncSource(source.id)}
             disabled={!source.enabled}
           >
             <i className="codicon codicon-sync"></i>
             {t('form.button.sync')}
           </button>
           <button className="button danger" onClick={() => handleDeleteSource(source)}>
             <i className="codicon codicon-trash"></i>
           </button>
         </div>
       </div>
     ))}
   </div>
   ```

4. **时间格式化函数**
   ```typescript
   const formatLastSync = (lastSync: string | null): string => {
     if (!lastSync) return t('sourceManager.neverSynced');
     const date = new Date(lastSync);
     const now = new Date();
     const diff = now.getTime() - date.getTime();
     const minutes = Math.floor(diff / 60000);
     const hours = Math.floor(diff / 3600000);
     const days = Math.floor(diff / 86400000);

     if (minutes < 1) return t('sourceManager.justNow');
     if (minutes < 60) return t('sourceManager.minutesAgo', { count: minutes });
     if (hours < 24) return t('sourceManager.hoursAgo', { count: hours });
     return t('sourceManager.daysAgo', { count: days });
   };
   ```

---

### 2. CSS 样式实现

**文件**: `src/webview/source-manager/source-manager.css`

#### 关键样式点

1. **卡片网格布局**

   ```css
   .source-cards-grid {
     display: grid;
     grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
     gap: var(--spacing-lg);
     padding: var(--spacing-sm) 0;
   }
   ```

2. **卡片悬停效果**

   ```css
   .source-card:hover {
     border-color: var(--vscode-focusBorder);
     box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
     transform: translateY(-2px);
   }
   ```

3. **禁用状态**

   ```css
   .source-card.disabled {
     opacity: 0.7;
   }

   .source-card.disabled:hover {
     opacity: 0.85;
   }
   ```

4. **响应式设计**

   ```css
   @media (max-width: 768px) {
     .source-cards-grid {
       grid-template-columns: 1fr;
     }
   }

   @media (min-width: 1400px) {
     .source-cards-grid {
       grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
     }
   }
   ```

---

### 3. Provider 消息处理

**文件**: `src/providers/SourceManagerWebviewProvider.ts`

#### 消息处理变更

1. **简化消息类型**

   ```typescript
   // ❌ 删除
   case 'selectSource': // 不再需要选择逻辑

   // ✅ 新逻辑 - 打开独立 webview
   case 'addSource':
     await vscode.commands.executeCommand('turbo-ai-rules.addSource');
     break;

   case 'editSource':
     await vscode.commands.executeCommand('turbo-ai-rules.manageSource', message.payload.sourceId);
     break;
   ```

2. **保留的消息处理**
   - `ready` - 发送初始数据
   - `deleteSource` - 删除规则源
   - `toggleSource` - 启用/禁用
   - `syncSource` - 同步规则

---

### 4. 国际化更新

**文件**: `l10n/bundle.l10n.json` 和 `l10n/bundle.l10n.zh-cn.json`

#### 新增翻译键

```json
{
  "sourceManager.neverSynced": "Never synced / 从未同步",
  "sourceManager.justNow": "Just now / 刚刚",
  "sourceManager.minutesAgo": "{count} minutes ago / {count} 分钟前",
  "sourceManager.hoursAgo": "{count} hours ago / {count} 小时前",
  "sourceManager.daysAgo": "{count} days ago / {count} 天前",
  "form.button.sync": "Sync / 同步"
}
```

---

## 🔧 技术要点

### 1. 组件解耦

**原设计问题**:

- 左侧列表 + 右侧详情，需要维护选中状态
- 内联编辑表单，状态管理复杂
- 三种视图模式（empty/detail/edit）切换逻辑复杂

**新设计优势**:

- 单一卡片组件，无选中状态
- 复用现有表单 webview（add-source/source-detail）
- 无视图切换，只有数据刷新

### 2. 消息协议简化

| 操作       | 旧方式   | 新方式                     |
| ---------- | -------- | -------------------------- |
| 添加规则源 | 内联表单 | 打开 add-source webview    |
| 编辑规则源 | 内联表单 | 打开 source-detail webview |
| 删除规则源 | 消息通信 | 消息通信（保持不变）       |
| 同步规则源 | 消息通信 | 消息通信（保持不变）       |
| 启用/禁用  | 消息通信 | 消息通信（保持不变）       |

### 3. 性能优化

- **虚拟化**: 当规则源数量 > 50 时，考虑使用虚拟滚动
- **防抖**: 搜索过滤（未来功能）使用防抖
- **批量操作**: 使用 Promise.all 并行处理多个同步

---

## 🧪 测试要点

### 手动测试清单

- [x] 页面加载显示正确的规则源列表
- [x] 空状态显示正确（无规则源时）
- [x] 点击"添加规则源"打开 add-source webview
- [x] 点击卡片"编辑"按钮打开 source-detail webview
- [x] 点击"启用/禁用"按钮切换状态，卡片样式更新
- [x] 点击"同步"按钮执行同步，规则数更新
- [x] 点击"删除"按钮显示确认对话框，删除后列表更新
- [x] 禁用的规则源"同步"按钮被禁用
- [x] 时间格式化正确显示（刚刚/X 分钟前/X 小时前/X 天前）
- [x] 响应式布局在不同屏幕尺寸下正常工作
- [x] 悬停效果正常（边框高亮、阴影、上移）
- [x] 长 URL 正确截断，鼠标悬停显示完整 URL

---

## 🐛 已知问题和解决方案

### 问题 1: SuperDesign 白屏

**原因**: 旧的 HTML 原型使用 `var(--vscode-*)` 变量，但 SuperDesign 环境未定义这些变量。

**解决**: 创建新的 `14-source-manager-page_2.html`，硬编码所有颜色变量为深色主题实际值。

### 问题 2: 时间格式化国际化

**原因**: 需要支持相对时间显示（X 分钟前、X 小时前等）。

**解决**: 添加 `formatLastSync` 函数和相应的国际化键。

### 问题 3: 卡片操作按钮布局

**原因**: 按钮数量不一致时布局错位。

**解决**: 使用 flex 布局，最后一个按钮（删除）固定宽度，其他按钮平分空间。

---

## 📝 代码审查要点

### 遵循的规范

✅ **日志规范**: 使用 `@ygqygq2/vscode-log`，包含错误码（TAI-xxxx）  
✅ **JSDoc 注释**: 所有导出函数都有完整注释  
✅ **类型安全**: 无 `any` 类型，严格模式通过  
✅ **命名规范**: camelCase 函数、PascalCase 组件  
✅ **文件组织**: 按功能模块拆分，单文件 < 500 行  
✅ **错误处理**: 所有异步操作都有 try-catch  
✅ **用户提示**: 错误消息包含"问题+建议"

### Lint 检查结果

```bash
pnpm lint
# ✓ No errors found
```

---

## 🎯 后续优化方向

1. **搜索过滤** - 支持按名称、URL、分支筛选规则源
2. **批量操作** - 支持全选、批量启用/禁用/同步
3. **排序功能** - 支持按名称、规则数、最后同步时间排序
4. **标签过滤** - 支持按 tags 筛选规则源
5. **虚拟滚动** - 规则源数量 > 50 时启用虚拟化
6. **拖拽排序** - 支持拖拽调整规则源优先级

---

## 📚 相关文档

- **设计文档**: `.superdesign/design_docs/14-source-manager-page.md`
- **UI 原型**: `.superdesign/design_iterations/14-source-manager-page_2.html`
- **架构设计**: `docs/development/20-architecture.md`
- **UI 开发流程**: `docs/development/32-ui-development-process.md`
- **Webview 最佳实践**: `docs/development/43-webview-best-practices.md`

---

_实施完成日期: 2025-12-01_  
_文档版本: 2.0_
