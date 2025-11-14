# 规则选择同步机制流程图

## 整体架构

```mermaid
graph TB
    subgraph "左侧树视图"
        A[用户勾选复选框]
        B[RuleFileTreeDataProvider]
        C[handleCheckboxChange]
        D[saveSelection]
    end

    subgraph "事件总线"
        E[SelectionStateManager]
        F[onSelectionChanged Event]
    end

    subgraph "右侧 Webview"
        G[RuleSelectorWebviewProvider]
        H[setupSelectionListener]
        I[loadAndSendInitialData]
        J[messenger.notify]
        K[Webview UI]
    end

    subgraph "数据持久化"
        L[WorkspaceDataManager]
        M[rule-selections.json]
    end

    A --> C
    C --> D
    D --> L
    L --> M
    D --> E
    E --> F
    F --> H
    H --> I
    I --> J
    J --> K

    style E fill:#f9f,stroke:#333,stroke-width:4px
    style F fill:#bbf,stroke:#333,stroke-width:2px
```

## 左侧 → 右侧同步流程

```mermaid
sequenceDiagram
    participant User
    participant TreeView as RuleFileTreeDataProvider
    participant Manager as WorkspaceDataManager
    participant EventBus as SelectionStateManager
    participant WebviewProvider as RuleSelectorWebviewProvider
    participant Webview as Webview UI

    User->>TreeView: 勾选规则
    TreeView->>TreeView: handleCheckboxChange()
    TreeView->>TreeView: saveSelection()
    TreeView->>Manager: setRuleSelection()
    Manager->>Manager: 写入 rule-selections.json
    Manager-->>TreeView: 保存成功
    TreeView->>EventBus: notifySelectionChanged(sourceId, 5, 10)
    EventBus->>WebviewProvider: onSelectionChanged event

    alt Webview 已打开且源匹配
        WebviewProvider->>WebviewProvider: loadAndSendInitialData()
        WebviewProvider->>Manager: getRuleSelection()
        Manager-->>WebviewProvider: selection data
        WebviewProvider->>Webview: messenger.notify('initialData', {...})
        Webview->>Webview: setInitialData()
        Webview->>Webview: UI 重新渲染
        Webview-->>User: 显示更新后的选择状态
    else Webview 未打开或源不匹配
        WebviewProvider->>WebviewProvider: 忽略事件
    end
```

## 右侧 → 左侧同步流程

```mermaid
sequenceDiagram
    participant User
    participant Webview as Webview UI
    participant WebviewProvider as RuleSelectorWebviewProvider
    participant Manager as WorkspaceDataManager
    participant EventBus as SelectionStateManager
    participant TreeView as RulesTreeProvider

    User->>Webview: 选择规则并保存
    Webview->>WebviewProvider: rpc.request('saveRuleSelection', {...})
    WebviewProvider->>Manager: setRuleSelection(workspacePath, sourceId, selection)
    Manager->>Manager: 写入 rule-selections.json
    Manager-->>WebviewProvider: 保存成功
    WebviewProvider->>EventBus: notifySelectionChanged(sourceId, 10, 20)
    WebviewProvider-->>Webview: 返回成功消息
    Webview->>Webview: updateAfterSave()
    Webview-->>User: 显示保存成功

    EventBus->>TreeView: onSelectionChanged event
    TreeView->>TreeView: 触发防抖 (150ms)

    Note over TreeView: 防抖延迟后
    TreeView->>TreeView: refresh()
    TreeView->>TreeView: getChildren()
    TreeView->>Manager: getRuleSelection(sourceId)
    Manager-->>TreeView: selection data
    TreeView->>TreeView: 计算复选框状态
    TreeView-->>User: VSCode UI 自动更新
```

## 事件过滤逻辑

```mermaid
flowchart TD
    Start([收到 onSelectionChanged 事件])
    Check1{Webview 是否打开?}
    Check2{Messenger 是否初始化?}
    Check3{事件源是否匹配当前源?}
    Process[重新加载并推送数据]
    Ignore[忽略事件]

    Start --> Check1
    Check1 -- 否 --> Ignore
    Check1 -- 是 --> Check2
    Check2 -- 否 --> Ignore
    Check2 -- 是 --> Check3
    Check3 -- 否 --> Ignore
    Check3 -- 是 --> Process

    Process --> LoadData[loadAndSendInitialData]
    LoadData --> Notify[messenger.notify('initialData')]

    style Start fill:#e1f5e1
    style Process fill:#ffe1e1
    style Ignore fill:#f0f0f0
    style Check3 fill:#fff4e1
```

## 数据流

```mermaid
graph LR
    subgraph "用户操作"
        U1[左侧勾选]
        U2[右侧保存]
    end

    subgraph "持久化层"
        D1[rule-selections.json]
    end

    subgraph "事件层"
        E1[SelectionStateManager]
    end

    subgraph "视图层"
        V1[TreeView]
        V2[Webview]
    end

    U1 --> V1
    U2 --> V2
    V1 --> D1
    V2 --> D1
    D1 --> E1
    E1 --> V1
    E1 --> V2

    style D1 fill:#ffd700
    style E1 fill:#87ceeb
    style V1 fill:#98fb98
    style V2 fill:#ffa07a
```

## 关键数据结构

### SelectionStateChangeEvent

```typescript
interface SelectionStateChangeEvent {
  sourceId: string; // 规则源 ID
  selectedCount: number; // 已选择的规则数量
  totalCount: number; // 总规则数量
  timestamp: number; // 事件时间戳
}
```

### RuleSelection (持久化格式)

```typescript
interface RuleSelection {
  mode: 'include' | 'exclude'; // 选择模式
  paths?: string[]; // 包含的文件路径
  excludePaths?: string[]; // 排除的文件路径（未来扩展）
}
```

---

**说明**：

- 蓝色框：事件总线核心
- 绿色框：用户操作入口
- 橙色框：视图层
- 黄色框：数据持久化层
