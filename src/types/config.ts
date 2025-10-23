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
  /** 上次同步时间 (ISO 8601) */
  lastSync?: string;
  /** 认证配置 */
  authentication?: GitAuthentication;
}

/**
 * 本地存储的源配置（包含敏感信息）
 * 存储在 ~/.turbo-ai-rules/config 或 .turbo-ai-rules/config
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
  /** 使用全局缓存 */
  useGlobalCache: boolean;
  /** 项目本地目录，默认 '.ai-rules' */
  projectLocalDir: string;
  /** 自动更新 .gitignore */
  autoGitignore: boolean;
}

/**
 * AI 工具适配器配置
 */
export interface AdapterConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 同步后自动更新配置文件 */
  autoUpdate: boolean;
  /** 是否在生成的文件中包含元数据 */
  includeMetadata?: boolean;
}

/**
 * AI 工具适配器配置集合
 */
export interface AdaptersConfig {
  /** Cursor 配置 */
  cursor?: AdapterConfig;
  /** GitHub Copilot 配置 */
  copilot?: AdapterConfig;
  /** Continue.dev 配置 */
  continue?: AdapterConfig;
  /** 自定义适配器 */
  [key: string]: AdapterConfig | undefined;
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
 * 扩展完整配置
 */
export interface ExtensionConfig {
  /** 规则源列表 */
  sources: RuleSource[];
  /** 存储策略 */
  storage: StorageConfig;
  /** AI 工具适配器配置 */
  adapters: AdaptersConfig;
  /** 同步策略 */
  sync: SyncConfig;
}

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: ExtensionConfig = {
  sources: [],
  storage: {
    useGlobalCache: true,
    projectLocalDir: '.ai-rules',
    autoGitignore: true,
  },
  adapters: {
    cursor: {
      enabled: true,
      autoUpdate: true,
      includeMetadata: true,
    },
    copilot: {
      enabled: true,
      autoUpdate: true,
      includeMetadata: false,
    },
    continue: {
      enabled: false,
      autoUpdate: true,
    },
  },
  sync: {
    auto: true,
    interval: 30,
    onStartup: true,
    conflictStrategy: 'priority',
  },
};
