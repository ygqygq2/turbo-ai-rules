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
  Logger.info('Executing addSource command');

  try {
    const configManager = ConfigManager.getInstance();
    const localConfigManager = LocalConfigManager.getInstance();

    // 1. 输入 Git URL
    const gitUrl = await vscode.window.showInputBox({
      title: 'Turbo AI Rules - Add Source',
      prompt: "Enter the Git repository URL (Press 'Enter' to confirm or 'Escape' to cancel)",
      placeHolder: 'https://github.com/username/repo.git or git@github.com:username/repo.git',
      validateInput: (value) => {
        if (!value) {
          return 'Git URL is required';
        }
        if (!validateGitUrl(value)) {
          return 'Invalid Git URL format';
        }
        return null;
      },
    });

    if (!gitUrl) {
      Logger.info('Add source cancelled: no URL provided');
      return;
    }

    // 2. 输入分支名（可选）
    const branch = await vscode.window.showInputBox({
      prompt: 'Enter the branch name (optional)',
      placeHolder: 'main',
      value: 'main',
      validateInput: (value) => {
        if (value && !validateBranchName(value)) {
          return 'Invalid branch name format';
        }
        return null;
      },
    });

    // 3. 输入子路径（可选，默认 /）
    const subPath = await vscode.window.showInputBox({
      prompt: 'Enter the sub-path to rules directory (must start with /)',
      placeHolder: '/ or /rules or /docs/rules',
      value: '/',
      validateInput: (value) => {
        if (value && !value.startsWith('/')) {
          return 'Sub-path must start with /';
        }
        return null;
      },
    });

    // 4. 输入显示名称（可选）
    const name = await vscode.window.showInputBox({
      prompt: 'Enter a display name for this source (optional)',
      placeHolder: 'My Rules',
    });

    // 5. 选择认证类型
    const authType = await vscode.window.showQuickPick(
      [
        { label: 'None', description: 'Public repository', value: 'none' as const },
        {
          label: 'HTTPS Token',
          description: 'Private repository with Personal Access Token',
          value: 'token' as const,
        },
        { label: 'SSH Key', description: 'Private repository with SSH key', value: 'ssh' as const },
      ],
      {
        placeHolder: 'Select authentication type',
      },
    );

    if (authType === undefined) {
      Logger.info('Add source cancelled: authentication type not selected');
      return;
    }

    // 6. 根据认证类型收集信息
    let authentication: GitAuthentication | undefined;

    if (authType.value === 'token') {
      // HTTPS Token
      const token = await vscode.window.showInputBox({
        prompt: 'Enter your Personal Access Token',
        placeHolder: 'ghp_xxxxxxxxxxxx (GitHub) or glpat-xxxxxxxxxxxx (GitLab)',
        password: true,
        validateInput: (value) => {
          if (!value) {
            return 'Token is required for HTTPS authentication';
          }
          return null;
        },
      });

      if (!token) {
        Logger.info('Add source cancelled: no token provided');
        return;
      }

      authentication = {
        type: 'token',
        token,
      };
    } else if (authType.value === 'ssh') {
      // SSH Key
      const useCustomKey = await vscode.window.showQuickPick(
        [
          {
            label: 'Default SSH Key',
            description: 'Use system default SSH key (~/.ssh/id_rsa or ~/.ssh/id_ed25519)',
            value: false,
          },
          { label: 'Custom SSH Key', description: 'Specify a custom SSH key path', value: true },
        ],
        {
          placeHolder: 'SSH key configuration',
        },
      );

      if (useCustomKey === undefined) {
        Logger.info('Add source cancelled: SSH key choice not made');
        return;
      }

      let sshKeyPath: string | undefined;
      let sshPassphrase: string | undefined;

      if (useCustomKey.value) {
        sshKeyPath = await vscode.window.showInputBox({
          prompt: 'Enter the path to your SSH private key',
          placeHolder: '~/.ssh/id_ed25519_custom or /home/user/.ssh/custom_key',
          validateInput: (value) => {
            if (!value) {
              return 'SSH key path is required';
            }
            return null;
          },
        });

        if (!sshKeyPath) {
          Logger.info('Add source cancelled: no SSH key path provided');
          return;
        }
      }

      // 询问是否有密码
      const hasPassphrase = await vscode.window.showQuickPick(
        [
          { label: 'No', description: 'SSH key has no passphrase', value: false },
          { label: 'Yes', description: 'SSH key requires passphrase', value: true },
        ],
        {
          placeHolder: 'Does your SSH key have a passphrase?',
        },
      );

      if (hasPassphrase === undefined) {
        Logger.info('Add source cancelled: passphrase choice not made');
        return;
      }

      if (hasPassphrase.value) {
        sshPassphrase = await vscode.window.showInputBox({
          prompt: 'Enter the SSH key passphrase',
          password: true,
          validateInput: (value) => {
            if (!value) {
              return 'Passphrase is required';
            }
            return null;
          },
        });

        if (!sshPassphrase) {
          Logger.info('Add source cancelled: no passphrase provided');
          return;
        }
      }

      authentication = {
        type: 'ssh',
        sshKeyPath,
        sshPassphrase,
      };
    } else {
      // No authentication
      authentication = {
        type: 'none',
      };
    }

    // 7. 生成唯一 ID
    const id = generateSourceId(gitUrl);

    // 8. 检查是否已存在
    const existingSources = await configManager.getSources();
    if (existingSources.some((s) => s.id === id)) {
      throw new ConfigError('A source with this URL already exists', 'TAI-1003');
    }

    // 9. 创建源配置
    const source: RuleSource = {
      id,
      name: name || gitUrl,
      gitUrl,
      branch: branch || 'main',
      subPath: subPath || '/',
      enabled: true,
    };

    // 10. 添加到配置
    // 打开规则源详细页面（新增源模式）
    const context = (global as any).extensionContext as import('vscode').ExtensionContext;
    const provider = SourceDetailWebviewProvider.getInstance(context);
    await provider.showSourceDetail('new');

    // 11. 保存认证配置
    if (authentication && authentication.type !== 'none') {
      // 检查用户配置：是否使用本地配置文件
      const useLocalConfig = vscode.workspace
        .getConfiguration('turbo-ai-rules.storage')
        .get<boolean>('useLocalConfig', false);

      if (useLocalConfig) {
        // 使用本地配置文件（不同步）
        const saveScope = await vscode.window.showQuickPick(
          [
            {
              label: 'Global',
              description: 'Save to global config (~/.config/turbo-ai-rules)',
              value: false,
            },
            {
              label: 'Project',
              description: 'Save to project config (.turbo-ai-rules)',
              value: true,
            },
          ],
          {
            placeHolder: 'Where to save authentication?',
          },
        );

        if (saveScope === undefined) {
          Logger.warn('Authentication not saved: scope not selected');
        } else {
          // 设置工作区路径（如果选择项目级）
          if (saveScope.value && vscode.workspace.workspaceFolders?.[0]) {
            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
            localConfigManager.setProjectConfigPath(workspaceRoot);

            // 自动添加到 .gitignore
            await ensureIgnored(workspaceRoot, [PROJECT_CONFIG_DIR + '/']);
          }

          await localConfigManager.setSourceAuth(id, authentication, saveScope.value);
          Logger.info('Authentication saved to local config', {
            scope: saveScope.label,
            authType: authentication.type,
          });
        }
      } else {
        // 使用 VSCode 配置（可同步）
        const configKey = `turbo-ai-rules.sources.${id}.authentication`;
        await vscode.workspace
          .getConfiguration()
          .update(configKey, authentication, vscode.ConfigurationTarget.Global);

        Logger.info('Authentication saved to VSCode settings', {
          authType: authentication.type,
          synced: true,
        });

        vscode.window.showInformationMessage(
          '✓ Authentication saved to VSCode settings (will be synced)',
        );
      }
    }

    Logger.info('Source added successfully', { id, gitUrl });

    // 12. 询问是否立即同步
    const shouldSync = await vscode.window.showInformationMessage(
      `Source "${name || gitUrl}" added successfully. Would you like to sync rules now?`,
      'Sync Now',
      'Later',
    );

    if (shouldSync === 'Sync Now') {
      await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
    }
  } catch (error) {
    Logger.error('Failed to add source', error instanceof Error ? error : undefined);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(`Failed to add source: ${errorMessage}`);
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
