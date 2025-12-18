# 文件树构建逻辑重构

## 背景

规则同步页和规则选择器都需要构建文件树结构，但之前两者使用了不同的实现方式：

- **规则选择器**：从解析后的规则列表构建树（`buildFileTreeFromRules`）
- **规则同步页**：直接扫描文件系统构建树（`buildFileTree`）

这导致两个问题：

1. **代码重复**：90% 的逻辑相同但分别实现
2. **行为不一致**：规则同步页显示所有目录，规则选择器正确显示 subPath 限定的内容

## 解决方案

### 1. 提取公共方法

创建 `src/utils/fileTreeBuilder.ts`，包含：

```typescript
// 通用文件树节点
export interface FileTreeNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
}

// 从规则列表构建文件树
export function buildFileTreeFromRules(rules: ParsedRule[], basePath: string): FileTreeNode[];
```

### 2. 更新规则选择器

- 导入并使用公共方法 `buildFileTreeFromRules`
- 移除本地 `buildFileTreeFromRules` 方法定义
- 移除本地 `FileTreeNode` 接口定义

### 3. 更新规则同步页

#### 替换文件树构建

```typescript
// 旧代码：扫描文件系统
const children = await this.buildFileTree(actualPath, actualPath, source.id);
this.markSelectedNodes(children, selectedSet);

// 新代码：从规则构建
const fileTree = buildFileTreeFromRules(rules, actualPath);
const children = this.convertToRuleTreeNodes(fileTree, source.id, selectedSet);
```

#### 添加转换方法

由于规则同步页使用 `RuleTreeNode` 格式（包含额外字段如 `id`, `sourceId`, `checked`, `expanded`），需要转换：

```typescript
private convertToRuleTreeNodes(
  fileTree: FileTreeNode[],
  sourceId: string,
  selectedSet: Set<string>
): RuleTreeNode[] {
  // 递归转换，同时计算 checked 状态
}
```

#### 移除旧方法

- 删除 `buildFileTree()` - 文件系统扫描方法
- 删除 `markSelectedNodes()` - 选中状态标记方法（逻辑合并到 `convertToRuleTreeNodes`）

### 4. 修复单元测试

- 删除 `buildFileTree` 方法测试（方法已移除）
- 修正 `checked` 字段预期值（默认未启用时为 `false`）

## 效果

### 代码复用

- ✅ 两个页面共享 90% 的文件树构建逻辑
- ✅ 统一使用 `buildFileTreeFromRules` 从规则构建树
- ✅ 一致的排序和结构化逻辑

### 行为一致性

- ✅ 规则同步页现在也正确遵循 `subPath` 限制
- ✅ 两个页面显示的目录结构一致
- ✅ 都从 `RulesManager` 缓存的规则构建树

### 可维护性

- ✅ 单一数据源（解析后的规则）
- ✅ 集中的树构建逻辑
- ✅ 更容易测试和调试

## 相关文件

- `src/utils/fileTreeBuilder.ts` - 新增公共工具
- `src/providers/RuleSelectorWebviewProvider.ts` - 简化使用公共方法
- `src/providers/RuleSyncPageWebview/RuleSyncPageWebviewProvider.ts` - 重构使用公共方法
- `src/test/unit/providers/RuleSyncPageWebviewProvider.spec.ts` - 更新测试

## 测试结果

所有单元测试通过（424 个测试）✅

## 注意事项

- `FileTreeNode` 是通用格式（简单结构）
- `RuleTreeNode` 是规则同步页专用格式（扩展字段）
- 转换在 `convertToRuleTreeNodes` 中完成
- 保持了后向兼容性（接口未改变）
