/**
 * 全局常量定义
 */

import { resolveCachePath, resolveConfigPath } from './path';

/**
 * 扩展 ID
 */
export const EXTENSION_ID = 'turbo-ai-rules';

/**
 * 扩展名称
 */
export const EXTENSION_NAME = 'Turbo AI Rules';

/**
 * 配置前缀
 * 用于 vscode.workspace.getConfiguration(CONFIG_PREFIX)
 */
export const CONFIG_PREFIX = 'turbo-ai-rules';

/**
 * 配置键定义
 * 使用示例:
 * ```typescript
 * const config = vscode.workspace.getConfiguration(CONFIG_PREFIX);
 * const sources = config.get<RuleSource[]>(CONFIG_KEYS.SOURCES, []);
 * ```
 */
export const CONFIG_KEYS = {
  /** 规则源列表 */
  SOURCES: 'sources',
  /** 同步策略 */
  SYNC_STRATEGY: 'syncStrategy',
  /** 默认适配器 */
  DEFAULT_ADAPTER: 'defaultAdapter',
  /** 自动同步 */
  AUTO_SYNC: 'autoSync',
  /** 用户规则保护 */
  USER_RULES_PROTECTION: 'userRulesProtection',
} as const;

/**
 * 全局缓存目录
 * Linux: ~/.cache/.turbo-ai-rules/
 * macOS: ~/Library/Caches/.turbo-ai-rules/
 * Windows: %LOCALAPPDATA%\.turbo-ai-rules\
 */
export const GLOBAL_CACHE_DIR = resolveCachePath(undefined, '.turbo-ai-rules');

/**
 * 全局配置目录
 * 用于存储本地配置文件（不同步到 VSCode Settings Sync）
 * Linux/macOS: ~/.config/.turbo-ai-rules/ (XDG 规范)
 * Windows: %LOCALAPPDATA%\.turbo-ai-rules\
 */
export const GLOBAL_CONFIG_DIR = resolveConfigPath(undefined, '.turbo-ai-rules');

/**
 * 项目级配置目录（已废弃，不再使用）
 * 新存储策略：项目目录零污染
 * @deprecated
 */
export const PROJECT_CONFIG_DIR = '.turbo-ai-rules';

/**
 * 规则源缓存目录（相对于 GLOBAL_CACHE_DIR）
 */
export const SOURCES_CACHE_DIR = 'sources';

/**
 * 工作区数据目录（相对于 GLOBAL_CACHE_DIR）
 */
export const WORKSPACES_DATA_DIR = 'workspaces';

/**
 * 默认分支
 */
export const DEFAULT_BRANCH = 'main';

/**
 * Git 克隆深度
 */
export const GIT_CLONE_DEPTH = 1;

/**
 * Git URL 正则
 * 支持 HTTPS 和 SSH 格式，.git 后缀可选
 */
export const GIT_URL_REGEX =
  /^(https?:\/\/[\w.-]+(:\d+)?(\/[\w.~:/?#[\]@!$&'()*+,;=-]*)*(\.git)?|git@[\w.-]+:[\w./-]+(\.git)?)$/;

/**
 * 分支名正则
 * 支持字母、数字、下划线、点、斜杠和连字符
 */
export const BRANCH_NAME_REGEX = /^[\w./-]+$/;

/**
 * 规则 ID 正则
 * 允许: 纯数字(102)、kebab-case(react-hooks)、数字-文字(102-typescript)
 */
export const RULE_ID_REGEX = /^[a-z0-9][a-z0-9-]*$/i;

/**
 * LRU 缓存大小
 */
export const LRU_CACHE_SIZE = 1000;

/**
 * 递归解析最大深度
 */
export const MAX_PARSE_DEPTH = 10;

/**
 * 递归解析最大文件数
 */
export const MAX_PARSE_FILES = 1000;

/**
 * 支持的规则文件扩展名
 */
export const RULE_FILE_EXTENSIONS = ['.md', '.mdc'];

/**
 * .gitignore 标记
 */
export const GITIGNORE_MARKER = '# Turbo AI Rules - Auto-generated files';

/**
 * 扩展图标路径
 * 用于 Webview 标签页图标（使用固定颜色，适合标签页显示）
 */
export const EXTENSION_ICON_PATH = 'resources/images/logo-icon-webview.svg';
