/**
 * 添加规则源命令
 */

import * as vscode from 'vscode';

import { ConfigManager } from '../services/ConfigManager';
import { LocalConfigManager } from '../services/LocalConfigManager';
import type { GitAuthentication, RuleSource } from '../types/config';
import { ConfigError } from '../types/errors';
import { PROJECT_CONFIG_DIR } from '../utils/constants';
import { ensureIgnored } from '../utils/gitignore';
import { Logger } from '../utils/logger';
import { validateBranchName, validateGitUrl } from '../utils/validator';
import { SourceDetailWebviewProvider } from '../providers/SourceDetailWebviewProvider';

/**
 * 添加规则源命令处理器
 */
export async function addSourceCommand(): Promise<void> {
  Logger.info('Executing addSource command (open SourceDetailWebviewProvider in add mode)');
  try {
    const context = (global as any).extensionContext as import('vscode').ExtensionContext;
    const provider = SourceDetailWebviewProvider.getInstance(context);
    await provider.showSourceDetail('new');
  } catch (error) {
    Logger.error('Failed to open add source webview', error instanceof Error ? error : undefined);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(`Failed to open add source page: ${errorMessage}`);
  }
}

/**
 * 生成源 ID（基于 Git URL）
 * 使用 URL 的哈希值确保同一个仓库总是生成相同的 ID
 */
function generateSourceId(gitUrl: string): string {
  // 标准化 URL（移除 .git 后缀、尾部斜杠）
  const normalizedUrl = gitUrl
    .toLowerCase()
    .replace(/\.git$/, '')
    .replace(/\/$/, '');

  // 从 URL 中提取仓库名
  const match = normalizedUrl.match(/\/([^/]+?)$/);
  const repoName = match ? match[1] : 'source';

  // 使用简单的哈希函数生成稳定的 ID
  const hash = hashCode(normalizedUrl);

  return `${repoName}-${hash}`;
}

/**
 * 简单的字符串哈希函数（Java hashCode 算法）
 * 返回一个 8 位的十六进制字符串
 */
function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // 转换为无符号 32 位整数并转为 16 进制，填充到 8 位
  return (hash >>> 0).toString(16).padStart(8, '0');
}
