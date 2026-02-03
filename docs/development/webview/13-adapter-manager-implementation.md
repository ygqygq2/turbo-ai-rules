# 适配器管理页实施文档

> **页面名称**: Adapter Manager (适配器管理)  
> **Provider**: `AdapterManagerWebviewProvider`  
> **设计文档**: `.superdesign/design_docs/13-adapter-manager.md`  
> **UI 原型**: `.superdesign/design_iterations/13-adapter-manager_1.html`

---

## 功能概述

适配器管理页用于管理 AI 规则的输出配置：

- **预设适配器**: GitHub Copilot、Cursor、Continue 等预定义的适配器
- **自定义适配器**: 用户自定义的输出配置（支持单文件或目录结构）

### 主要功能

1. 启用/禁用预设适配器
2. 创建、编辑、删除自定义适配器
3. 配置输出路径和格式
4. 设置文件过滤和目录组织方式

---

## 架构实现

### 组件结构

```
src/webview/adapter-manager/
├── index.tsx              # 入口文件
├── AdapterManager.tsx     # 主组件（状态管理和数据流）
├── AdapterCard.tsx        # 适配器卡片组件
├── AdapterModal.tsx       # 添加/编辑模态框
└── adapter-manager.css    # 样式定义
```

### 关键类型定义

```typescript
// 预设适配器
interface PresetAdapter {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  outputPath: string;
  type: 'file' | 'directory';
  isRuleType: boolean;
  sortBy?: 'id' | 'priority' | 'none';
  sortOrder?: 'asc' | 'desc';
  organizeBySource?: boolean;
  preserveDirectoryStructure?: boolean;
  useOriginalFilename?: boolean;
  generateIndex?: boolean;
  indexPerSource?: boolean;
}

// 自定义适配器
interface CustomAdapter {
  id: string;
  name: string;
  outputPath: string;
  format: 'single-file' | 'directory';
  isRuleType: boolean;
  enabled: boolean;
  fileExtensions?: string[];
  organizeBySource?: boolean;
  generateIndex?: boolean;
  indexPerSource?: boolean;
  indexFileName?: string;
  preserveDirectoryStructure?: boolean;
  useOriginalFilename?: boolean;
  singleFileTemplate?: string;
  sortBy?: 'id' | 'priority' | 'none'; // 排序依据（仅单文件模式）
  sortOrder?: 'asc' | 'desc'; // 排序顺序（仅单文件模式）
  directoryStructure?: {
    filePattern: string;
    pathTemplate: string;
  };
  isNew?: boolean; // 标识是新增还是编辑
}
```

### Provider 实现要点

- 继承 `BaseWebviewProvider`
- 实现 `handleMessage` 处理 Webview 消息
- 通过 `ConfigManager` 读写适配器配置

---

## 消息协议

### Extension → Webview

#### 初始化数据

```typescript
{
  type: 'init',
  payload: {
    presetAdapters: PresetAdapter[],
    customAdapters: CustomAdapter[]
  }
}
```

#### 保存结果

```typescript
{
  type: 'saveResult',
  payload: {
    success: boolean,
    message?: string
  }
}
```

#### 更新适配器列表

```typescript
{
  type: 'updateAdapters',
  payload: {
    presetAdapters: PresetAdapter[],
    customAdapters: CustomAdapter[]
  }
}
```

### Webview → Extension

#### 就绪信号

```typescript
{
  type: 'ready';
}
```

#### 保存适配器

```typescript
{
  type: 'saveAdapter',
  payload: {
    adapter: CustomAdapter
  }
}
```

#### 删除适配器

```typescript
{
  type: 'deleteAdapter',
  payload: {
    id: string
  }
}
```

#### 保存所有配置

```typescript
{
  type: 'saveAll',
  payload: {
    presetAdapters: PresetAdapter[],
    customAdapters: CustomAdapter[]
  }
}
```

#### 取消

```typescript
{
  type: 'cancel';
}
```

---

## 关键流程

### 预设适配器启用/禁用

1. 用户点击启用/禁用按钮
2. 更新本地状态，标记有未保存更改
3. 底部操作栏显示"有未保存的更改"
4. 用户点击保存，发送 `saveAll` 消息
5. Provider 更新配置并返回结果

### 添加自定义适配器

1. 用户点击"添加适配器"按钮
2. 打开模态框，显示空表单
3. 用户填写 ID、名称、输出路径等
4. 选择输出格式（单文件/目录结构）
5. 配置相应的格式选项
6. 验证表单
7. 发送 `saveAdapter` 消息
8. 更新列表

### 编辑自定义适配器

1. 用户点击"编辑"按钮
2. 打开模态框，预填现有配置（ID 不可修改）
3. 修改配置
4. 验证表单
5. 发送 `saveAdapter` 消息
6. 更新列表

### 删除自定义适配器

1. 用户点击"删除"按钮
2. 弹出确认对话框
3. 确认后发送 `deleteAdapter` 消息
4. 从列表中移除

---

## 表单验证

### 适配器 ID

- 必填（新建时）
- 仅支持 kebab-case 格式（小写字母、数字、连字符）
- 不能与已有 ID 重复

### 适配器名称

- 必填
- 长度限制 1-50 字符

### 输出路径

- 必填
- 必须是相对路径

### 格式相关验证

**单文件模式**:

- 文件模板必填

**目录模式**:

- 文件名模式必填
- 路径模板必填

---

## UI 特性

### 卡片展开/折叠

预设适配器支持展开详细配置：

- 自动更新选项
- 包含元数据选项

### 类型标签

- **规则类型 (Rule)**: 蓝色标签
- **技能类型 (Skill)**: 橙色标签

### 复选框组

目录模式下的选项：

- 按源 ID 组织子目录
- 生成索引文件

---

## 测试覆盖

### 单元测试

- [ ] AdapterCard 组件渲染
- [ ] AdapterModal 表单验证
- [ ] 类型标签显示逻辑
- [ ] 展开/折叠交互

### 集成测试

- [ ] 加载适配器列表
- [ ] 添加自定义适配器
- [ ] 编辑自定义适配器
- [ ] 删除自定义适配器
- [ ] 保存所有配置

---

## 相关文件

### 源码文件

- `src/providers/AdapterManagerWebviewProvider.ts` - Provider 实现
- `src/webview/adapter-manager/` - React 组件
- `src/services/ConfigManager.ts` - 配置管理

### 设计文件

- `.superdesign/design_docs/13-adapter-manager.md` - 设计文档
- `.superdesign/design_iterations/13-adapter-manager_1.html` - UI 原型

### i18n 文件

- `l10n/bundle.l10n.zh-cn.json` - 中文翻译
- `l10n/bundle.l10n.json` - 英文翻译

---

## 注意事项

1. **ID 唯一性**: 适配器 ID 创建后不可修改，需要在创建时验证唯一性
2. **配置持久化**: 自定义适配器存储在 `turboAiRules.adapters.custom` 配置项
3. **未保存提示**: 用户关闭页面时，如有未保存更改需要提示
4. **格式切换**: 切换输出格式时，相关字段需要重新初始化

---

_文档版本: 1.0_  
_创建日期: 2025-01-XX_  
_最后更新: 2025-01-XX_
