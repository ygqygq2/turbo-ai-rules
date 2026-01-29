/**
 * 配置相关的类型定义
 */

/**
 * Git 认证类型
 */
export type AuthType = 'token' | 'ssh' | 'none';

/**
 * Git 认证配置
 */
export interface GitAuthentication {
  /** 认证类型 */
  type: AuthType;
  /** Token（HTTPS 认证，存储在本地配置文件，不同步） */
  token?: string;
  /** SSH 私钥路径（可选，默认使用系统 SSH agent） */
  sshKeyPath?: string;
  /** SSH 密码短语（如果私钥有密码，存储在本地配置文件） */
  sshPassphrase?: string;
}

/**
 * 规则源配置
 */
export interface RuleSource {
  /** 唯一标识 (kebab-case) */
  id: string;
  /** 显示名称 */
  name: string;
  /** Git 仓库地址 (https:// 或 git@) */
  gitUrl: string;
  /** 分支名，默认 'main' */
  branch?: string;
  /** 子目录路径，以 / 开头，如 '/rules' 或 '/'（仓库根） */
  subPath?: string;
  /** 是否启用 */
  enabled: boolean;
  /** 自动同步间隔(分钟)，0 表示禁用自动同步 */
  syncInterval?: number;
  /** 认证配置 - Token 存储在 Secret Storage */
  authentication?: GitAuthentication;
  /** 注意：同步时间不存储在此配置中，而是通过 WorkspaceStateManager.getLastSyncTime(sourceId) 获取 */
}

/**
 * 本地存储的源配置（包含敏感信息）
 * 存储在 Secret Storage 或本地配置文件
 * @deprecated 优先使用 Secret Storage，此配置仅用于向后兼容
 */
export interface LocalSourceConfig {
  /** 源 ID */
  sourceId: string;
  /** 认证信息 */
  authentication?: GitAuthentication;
}

/**
 * 存储策略配置
 */
export interface StorageConfig {
  /** 自动更新 .gitignore（添加生成的 AI 配置文件） */
  autoGitignore: boolean;
}

/**
 * 块标记配置
 */
export interface BlockMarkers {
  /** 开始标记 */
  begin: string;
  /** 结束标记 */
  end: string;
}

/**
 * 用户规则配置（顶层配置）
 */
export interface UserRulesConfig {
  /** 用户规则目录（相对于工作区根目录） */
  directory: string;
  /** 单文件模式的内容标记（用于保护用户内容） */
  markers: BlockMarkers;
}

/**
 * 规则排序方式（仅单文件适配器有效）
 */
export type RuleSortBy = 'id' | 'priority' | 'none';

/**
 * 排序顺序
 */
export type SortOrder = 'asc' | 'desc';

/**
 * AI 工具适配器配置
 */
export interface AdapterConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 是否启用用户规则（从顶层 userRules.directory 读取） */
  enableUserRules?: boolean;
  /** 是否是规则类型（默认 true，skills 类设为 false 不参与规则同步页） */
  isRuleType?: boolean;
  /** 排序方式（默认 'priority'） */
  sortBy?: RuleSortBy;
  /** 排序顺序（默认 'asc'，高优先级在文件末尾以利用 LLM 近因效应） */
  sortOrder?: SortOrder;
  /** 是否保持规则源的目录层级结构（仅对 directory 类型有效，默认 false 为平铺）
   * true: 保持相对于规则源 subPath 的完整目录结构
   * false: 所有文件平铺到输出目录根
   */
  preserveDirectoryStructure?: boolean;
  /** 是否启用自动更新（默认继承全局 sync.auto 配置）
   * true: 参与定时同步，当全局 sync.auto=true 且 sync.interval > 0 时自动同步
   * false: 不参与定时同步，只能手动同步
   * undefined: 继承全局 sync.auto 配置
   * 前提条件：适配器必须至少手动同步过一次（有持久化数据）才会参与定时同步
   */
  autoUpdate?: boolean;
}

/**
 * 输出类型
 */
export type OutputType = 'file' | 'directory';

/**
 * 自定义适配器配置
 */
export interface CustomAdapterConfig extends AdapterConfig {
  /** 适配器唯一标识 (kebab-case) */
  id: string;
  /** 适配器显示名称 */
  name: string;
  /** 输出目标路径(相对于工作区根目录) */
  outputPath: string;
  /** 输出类型: file=单个文件, directory=目录结构 */
  outputType: OutputType;
  /** 文件过滤规则(文件后缀,如 ['.md', '.mdc']), 不配置或空数组则不过滤(同步所有文件) */
  fileExtensions?: string[];
  /** 是否按源ID组织子目录(仅对 directory 类型有效), 默认 false */
  organizeBySource?: boolean;
  /** 是否使用原文件名(仅对 directory 类型有效), 默认 true。false 时使用 sourceId-ruleId.md 格式 */
  useOriginalFilename?: boolean;
  /** 是否保持目录结构(仅对 directory 类型有效), 默认 true。false 为平铺模式 */
  preserveDirectoryStructure?: boolean;
  /** 是否生成索引文件(仅对 directory 类型有效), 默认 true */
  generateIndex?: boolean;
  /** 是否为每个源目录生成单独索引(仅当 organizeBySource=true 且 generateIndex=true 时有效), 默认 false */
  indexPerSource?: boolean;
  /** 索引文件名(默认 'index.md') */
  indexFileName?: string;
  /** 目录结构配置(仅对 directory 类型有效) */
  directoryStructure?: {
    /** 文件模式(如 '*.md') */
    filePattern: string;
    /** 路径模板，支持占位符: {{ruleId}}, {{ruleName}}, {{sourceId}} */
    pathTemplate: string;
  };
  /** 单文件模板(仅对 file 类型有效), 使用 {{rules}} 作为规则内容占位符 */
  fileTemplate?: string;
  /** 是否为规则类型适配器，false 表示 Skills 类型适配器，默认 true */
  isRuleType?: boolean;
  /** Skills 类型的规则源 ID（仅当 isRuleType=false 时有效） */
  sourceId?: string;
  /** Skills 类型的子目录路径（仅当 isRuleType=false 时有效） */
  subPath?: string;
  /** 限定只处理指定规则源的规则（规则类型适配器可选配置） */
  sourceIds?: string[];
}

/**
 * AI 工具适配器配置集合
 *
 * 支持预设适配器和自定义适配器：
 * - 预设适配器：cursor, copilot, continue, windsurf, aider, cline, roo-cline, bolt, qodo-gen
 * - 自定义适配器：通过 custom 数组配置
 */
export interface AdaptersConfig {
  // === IDE 集成类工具 ===
  /** Cursor AI editor */
  cursor?: AdapterConfig;
  /** Windsurf (Codeium IDE) */
  windsurf?: AdapterConfig;
  /** GitHub Copilot */
  copilot?: AdapterConfig;

  // === VSCode 扩展类工具 ===
  /** Continue.dev */
  continue?: AdapterConfig;
  /** Cline (formerly Claude Dev) */
  cline?: AdapterConfig;

  // 索引签名支持动态访问
  [key: string]: AdapterConfig | CustomAdapterConfig[] | undefined;
  /** Roo-Cline (Cline fork) */
  'roo-cline'?: AdapterConfig;

  // === 命令行工具 ===
  /** Aider - AI pair programming */
  aider?: AdapterConfig;

  // === Web 平台类工具 ===
  /** Bolt.new (StackBlitz) */
  bolt?: AdapterConfig;
  /** Qodo Gen (test generation) */
  'qodo-gen'?: AdapterConfig;

  /** 自定义适配器列表 */
  custom?: CustomAdapterConfig[];
}

/**
 * 同步策略配置
 */
export interface SyncConfig {
  /** 启用自动同步 */
  auto: boolean;
  /** 全局同步间隔(分钟) */
  interval: number;
  /** 启动时同步 */
  onStartup: boolean;
  /** 冲突解决策略 */
  conflictStrategy?: 'priority' | 'merge' | 'skip-duplicates';
}

/**
 * 解析器配置
 */
export interface ParserConfig {
  /** 启用严格模式：要求所有规则必须包含 id、title 和有效元数据 */
  strictMode: boolean;
  /** 要求 YAML 前置元数据：禁用时可接受纯 Markdown 文件 */
  requireFrontmatter: boolean;
}

/**
 * 扩展完整配置
 */
export interface ExtensionConfig {
  /** 规则源列表 */
  sources: RuleSource[];
  /** 存储策略 */
  storage: StorageConfig; /** 用户规则配置 */ /** 用户规则配置 */
  userRules: UserRulesConfig; /** AI 工具适配器配置 */
  adapters: AdaptersConfig;
  /** 同步策略 */
  sync: SyncConfig;
  /** 解析器配置 */
  parser: ParserConfig;
}

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: ExtensionConfig = {
  sources: [],
  storage: {
    autoGitignore: true,
  },
  userRules: {
    directory: 'ai-rules',
    markers: {
      begin: '<!-- TURBO-AI-RULES:BEGIN -->',
      end: '<!-- TURBO-AI-RULES:END -->',
    },
  },
  adapters: {
    cursor: {
      enabled: true,
      enableUserRules: true,
      sortBy: 'priority',
      sortOrder: 'asc',
    },
    copilot: {
      enabled: true,
      enableUserRules: true,
      sortBy: 'priority',
      sortOrder: 'asc',
    },
    continue: {
      enabled: false,
      enableUserRules: true,
      sortBy: 'priority',
      sortOrder: 'asc',
    },
    custom: [
      {
        id: 'default-rules',
        name: 'Generic Rules',
        enabled: true,
        outputPath: 'rules',
        outputType: 'directory',
        // fileExtensions 不设置 = 同步所有文件,不过滤
        organizeBySource: true,
        generateIndex: true,
        indexFileName: 'index.md',
      },
    ],
  },
  sync: {
    auto: true,
    interval: 60,
    onStartup: true,
    conflictStrategy: 'priority',
  },
  parser: {
    strictMode: false,
    requireFrontmatter: false,
  },
};

/**
 * 规则同步相关数据结构 (v2.0.2 新增)
 */

/**
 * 规则同步配置（临时状态，用于规则同步页）
 */
export interface RuleSyncConfig {
  /** 选中的规则（按源组织） */
  selectedRules: {
    /** 规则源 ID */
    sourceId: string;
    /** 文件路径列表（相对于源目录） */
    filePaths: string[];
  }[];
  /** 目标适配器 ID 列表 */
  targetAdapters: string[];
}

/**
 * 适配器状态（用于 UI 展示）
 */
export interface AdapterState {
  /** 适配器 ID */
  id: string;
  /** 适配器名称 */
  name: string;
  /** 适配器类型 */
  type: 'preset' | 'custom';
  /** 是否启用 */
  enabled: boolean;
  /** 是否被勾选（用于同步） */
  checked: boolean;
  /** 是否禁止选择（因类型互斥） */
  selectDisabled: boolean;
  /** 输出路径 */
  outputPath: string;
  /** 当前规则数量 */
  ruleCount: number;
  /** 是否是规则类型（false 时为 Skills 类型） */
  isRuleType: boolean;
}

/**
 * 规则树节点（用于多源树形展示）
 */
export interface RuleTreeNode {
  /** 节点类型 */
  type: 'source' | 'directory' | 'file';
  /** 节点唯一 ID */
  id: string;
  /** 显示名称 */
  name: string;
  /** 文件路径（仅 file 类型） */
  path?: string;
  /** 所属规则源 ID */
  sourceId?: string;
  /** 是否被选中 */
  checked?: boolean;
  /** 是否展开（目录节点） */
  expanded?: boolean;
  /** 子节点 */
  children?: RuleTreeNode[];
  /** 已选/总数 */
  stats?: {
    selected: number;
    total: number;
  };
}
