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
 */
export const CONFIG_PREFIX = 'turbo-ai-rules';

/**
 * 全局缓存目录
 * 使用 XDG 规范：优先 XDG_CACHE_HOME，否则 ~/.cache/turbo-ai-rules
 */
export const GLOBAL_CACHE_DIR = resolveCachePath();

/**
 * 全局配置目录
 * 用于存储本地配置文件（不同步到 VSCode Settings Sync）
 * 使用 XDG 规范：优先 XDG_CONFIG_HOME，否则 ~/.config/turbo-ai-rules (Linux/macOS)
 * 或 %LOCALAPPDATA%/turbo-ai-rules (Windows)
 */
export const GLOBAL_CONFIG_DIR = resolveConfigPath();

/**
 * 项目级配置目录
 */
export const PROJECT_CONFIG_DIR = '.turbo-ai-rules';

/**
 * 源缓存目录（相对于 GLOBAL_CACHE_DIR）
 */
export const SOURCES_CACHE_DIR = 'sources';

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
 */
export const BRANCH_NAME_REGEX = /^[\w./]+$/;

/**
 * 规则 ID 正则
 */
export const RULE_ID_REGEX = /^[\w-]+$/;

/**
 * LRU 缓存大小
 */
export const LRU_CACHE_SIZE = 1000;

/**
 * 递归解析最大深度
 */
export const MAX_PARSE_DEPTH = 6;

/**
 * 递归解析最大文件数
 */
export const MAX_PARSE_FILES = 500;

/**
 * 支持的规则文件扩展名
 */
export const RULE_FILE_EXTENSIONS = ['.md', '.mdc'];

/**
 * .gitignore 标记
 */
export const GITIGNORE_MARKER = '# Turbo AI Rules - Auto-generated files';
