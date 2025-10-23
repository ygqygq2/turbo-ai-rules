/**
 * Git 相关的类型定义
 */

/**
 * Git 仓库状态
 */
export interface GitStatus {
  /** 仓库路径 */
  path: string;
  /** 当前分支 */
  branch: string;
  /** 是否有未提交的更改 */
  isDirty: boolean;
  /** 是否有远程更新 */
  hasRemoteUpdate: boolean;
  /** 最后一次提交的 SHA */
  lastCommitSha?: string;
  /** 最后一次提交的时间 */
  lastCommitDate?: Date;
}

/**
 * Git 克隆选项
 */
export interface CloneOptions {
  /** Git 仓库 URL */
  url: string;
  /** 目标路径 */
  targetPath: string;
  /** 分支名 */
  branch?: string;
  /** 深度（浅克隆） */
  depth?: number;
  /** Token（用于 HTTPS 认证） */
  token?: string;
}

/**
 * Git 拉取选项
 */
export interface PullOptions {
  /** 仓库路径 */
  repoPath: string;
  /** 分支名 */
  branch?: string;
  /** 是否强制拉取 */
  force?: boolean;
}

/**
 * Git 拉取结果
 */
export interface PullResult {
  /** 是否成功 */
  success: boolean;
  /** 是否有更新 */
  hasUpdates: boolean;
  /** 更新的文件列表 */
  updatedFiles?: string[];
  /** 错误信息 */
  error?: string;
}

/**
 * Git 认证信息
 */
export interface GitAuthInfo {
  /** 认证类型 */
  type: 'token' | 'ssh' | 'none';
  /** Token */
  token?: string;
  /** SSH Key 路径 */
  sshKeyPath?: string;
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
 * Git 操作错误
 */
export class GitError extends Error {
  constructor(
    message: string,
    public type: GitErrorType,
    public code: string,
    public cause?: Error,
  ) {
    super(message);
    this.name = 'GitError';
  }
}
