# RuleSyncPageWebview 模块

规则同步页面 Webview 提供者模块（757 行）

## 文件组织

```
RuleSyncPageWebview/
├── RuleSyncPageWebviewProvider.ts  # 主类（757行，继承 BaseWebviewProvider）
└── index.ts                        # 统一导出
```

## 说明

当前版本保持完整性，未进行进一步拆分。未来可以考虑将以下部分拆分到独立文件：

- **DataHelper**：数据处理逻辑（getRuleSyncData, buildFileTreeFromRules 等）
- **MessageHandler**：消息处理逻辑（handleMessage, handleSync 等）

## 设计原则

1. 继承 `BaseWebviewProvider` 获取 webview 管理能力
2. 订阅 `SelectionStateManager` 事件实时更新前端
3. 使用 RPC 模式处理前后端通信
