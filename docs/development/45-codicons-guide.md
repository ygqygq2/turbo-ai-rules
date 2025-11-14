# VSCode Codicons 图标使用指南

## 图标库

项目使用 `@vscode/codicons` - VSCode 官方图标库，完美集成 VSCode Webview 环境，自动适配主题。

## 已使用的图标

### 欢迎页 (Welcome)

- `add` - 添加规则源
- `sync` - 同步规则
- `file-code` - 生成配置
- `book` - 文档
- `question` - 帮助
- `check` - 确认/完成

### 常用图标列表

#### 文件和文件夹

- `folder` - 文件夹
- `folder-opened` - 打开的文件夹
- `file` - 文件
- `file-code` - 代码文件
- `file-text` - 文本文件

#### 操作

- `add` - 添加
- `remove` - 移除
- `edit` - 编辑
- `trash` - 删除
- `save` - 保存
- `close` - 关闭
- `refresh` / `sync` - 刷新/同步
- `search` - 搜索

#### 导航

- `arrow-left` - 向左
- `arrow-right` - 向右
- `arrow-up` - 向上
- `arrow-down` - 向下
- `chevron-left` - 左箭头（小）
- `chevron-right` - 右箭头（小）
- `chevron-up` - 上箭头（小）
- `chevron-down` - 下箭头（小）

#### 状态

- `check` - 成功/完成
- `x` / `close` - 关闭/错误
- `circle-filled` - 圆点
- `info` - 信息
- `warning` - 警告
- `error` - 错误
- `pass` - 通过
- `issue-opened` - 问题

#### 设置和工具

- `gear` / `settings` - 设置
- `wrench` - 工具
- `menu` - 菜单
- `more` - 更多

#### Git 相关

- `git-commit` - 提交
- `git-branch` - 分支
- `git-pull-request` - PR
- `repo` - 仓库
- `repo-forked` - Fork

#### 其他

- `home` - 首页
- `book` - 文档
- `question` - 帮助
- `organization` - 组织
- `person` - 用户
- `lock` - 锁定
- `key` - 密钥

## 使用方法

### 在 Button 中使用

```tsx
import { Button } from '../components/Button';

<Button type="primary" icon="add" iconSize={16}>
  Add Source
</Button>;
```

### 单独使用 Icon 组件

```tsx
import { Icon } from '../components/Icon';

<Icon icon="check" size={20} />
<Icon icon="error" style={{ color: 'red' }} />
```

## 主题适配

Codicons 自动继承 VSCode 的主题颜色，完美适配亮色/暗色主题，无需额外配置。

## 图标参考

完整图标列表：https://microsoft.github.io/vscode-codicons/dist/codicon.html

## 优势

✅ **官方支持**：VSCode 官方图标库  
✅ **完美集成**：专为 VSCode Webview 设计  
✅ **主题适配**：自动适应 VSCode 主题  
✅ **零配置**：无需 CSP 配置，开箱即用  
✅ **体积小**：仅包含必需的图标

## 注意事项

1. 图标名称不需要 `codicon-` 前缀，组件会自动添加
2. 图标默认大小为字体大小，可通过 `size` 属性调整
3. 图标颜色自动继承父元素的文字颜色
4. 推荐图标大小：14px（小）、16px（默认）、20px（大）、24px（特大）
