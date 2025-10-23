/**
 * 自定义错误类型定义
 */

/**
 * 基础扩展错误
 */
export class ExtensionError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: Error,
  ) {
    super(message);
    this.name = 'ExtensionError';
  }
}

/**
 * 配置错误 (TAI-100x)
 */
export class ConfigError extends ExtensionError {
  constructor(message: string, code: string, cause?: Error) {
    super(message, code, cause);
    this.name = 'ConfigError';
  }
}

/**
 * Git 错误类型
 */
export type GitErrorType =
  | 'clone-failed'
  | 'pull-failed'
  | 'auth-failed'
  | 'branch-not-found'
  | 'network-error'
  | 'invalid-url'
  | 'unknown';

/**
 * Git 错误 (TAI-200x)
 */
export class GitError extends ExtensionError {
  constructor(
    message: string,
    public type: GitErrorType,
    code: string,
    cause?: Error,
  ) {
    super(message, code, cause);
    this.name = 'GitError';
  }
}

/**
 * 解析错误 (TAI-300x)
 */
export class ParseError extends ExtensionError {
  constructor(
    message: string,
    code: string,
    public filePath?: string,
    cause?: Error,
  ) {
    super(message, code, cause);
    this.name = 'ParseError';
  }
}

/**
 * 生成错误 (TAI-400x)
 */
export class GenerateError extends ExtensionError {
  constructor(
    message: string,
    code: string,
    public targetPath?: string,
    cause?: Error,
  ) {
    super(message, code, cause);
    this.name = 'GenerateError';
  }
}

/**
 * 系统错误 (TAI-500x)
 */
export class SystemError extends ExtensionError {
  constructor(message: string, code: string, cause?: Error) {
    super(message, code, cause);
    this.name = 'SystemError';
  }
}

/**
 * 错误码常量
 */
export const ErrorCodes = {
  // 配置类 TAI-100x
  CONFIG_MISSING: 'TAI-1001',
  CONFIG_INVALID_FORMAT: 'TAI-1002',
  CONFIG_MISSING_FIELD: 'TAI-1003',
  CONFIG_OUT_OF_RANGE: 'TAI-1004',

  // Git 类 TAI-200x
  GIT_INVALID_URL: 'TAI-2001',
  GIT_CLONE_FAILED: 'TAI-2002',
  GIT_PULL_FAILED: 'TAI-2003',
  GIT_AUTH_FAILED: 'TAI-2004',
  GIT_BRANCH_NOT_FOUND: 'TAI-2005',

  // 解析类 TAI-300x
  PARSE_INVALID_FORMAT: 'TAI-3001',
  PARSE_MISSING_METADATA: 'TAI-3002',
  PARSE_VALIDATION_FAILED: 'TAI-3003',
  PARSE_ENCODING_ERROR: 'TAI-3004',

  // 生成类 TAI-400x
  GENERATE_FILE_FAILED: 'TAI-4001',
  GENERATE_CONFLICT: 'TAI-4002',
  GENERATE_TEMPLATE_ERROR: 'TAI-4003',

  // 系统类 TAI-500x
  SYSTEM_IO_ERROR: 'TAI-5001',
  SYSTEM_PERMISSION_DENIED: 'TAI-5002',
  SYSTEM_PATH_TRAVERSAL: 'TAI-5003',
  SYSTEM_DISK_FULL: 'TAI-5004',
} as const;

/**
 * 错误码类型
 */
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
