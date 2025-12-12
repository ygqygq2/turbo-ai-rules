/**
 * removeSource 命令单元测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

import { removeSourceCommand } from '@/commands/removeSource';
import { ConfigManager } from '@/services/ConfigManager';
import { RulesManager } from '@/services/RulesManager';
import type { RuleSource } from '@/types/config';

// Mock 模块
vi.mock('vscode');
vi.mock('@/services/ConfigManager');
vi.mock('@/services/RulesManager');
vi.mock('@/utils/logger');
vi.mock('@/utils/notifications');

describe('removeSource 命令单元测试（核心功能）', () => {
  // 注意：removeSource 命令的完整功能在集成测试中验证
  // 此处仅保留最基本的类型和导入测试
  let mockConfigManager: any;
  let mockRulesManager: any;
  let mockSources: RuleSource[];

  beforeEach(() => {
    vi.clearAllMocks();

    mockSources = [
      {
        id: 'source-1',
        name: 'Test Source 1',
        gitUrl: 'https://github.com/test/repo1',
        branch: 'main',
        enabled: true,
      },
      {
        id: 'source-2',
        name: 'Test Source 2',
        gitUrl: 'https://github.com/test/repo2',
        branch: 'develop',
        enabled: false,
      },
    ];

    mockConfigManager = {
      getSources: vi.fn().mockResolvedValue(mockSources),
      removeSource: vi.fn().mockResolvedValue(undefined),
      deleteToken: vi.fn().mockResolvedValue(undefined),
    };
    (ConfigManager.getInstance as any) = vi.fn().mockReturnValue(mockConfigManager);

    mockRulesManager = {
      clearSource: vi.fn(),
    };
    (RulesManager.getInstance as any) = vi.fn().mockReturnValue(mockRulesManager);

    // Ensure vscode mock objects exist
    if (!vscode.window) {
      (vscode as any).window = {} as any;
    }
    if (!vscode.commands) {
      (vscode as any).commands = {} as any;
    }
    if (!vscode.l10n) {
      (vscode as any).l10n = {
        t: vi.fn((key: string, ...args: any[]) => {
          return args.length > 0 ? `${key} ${args.join(' ')}` : key;
        }),
      };
    }

    // Mock vscode.window
    vscode.window.showQuickPick = vi.fn().mockResolvedValue(undefined);
    vscode.window.showInformationMessage = vi.fn().mockResolvedValue(undefined);
    vscode.commands.executeCommand = vi.fn().mockResolvedValue(undefined);
  });

  it('命令函数应该存在', () => {
    expect(removeSourceCommand).toBeDefined();
    expect(typeof removeSourceCommand).toBe('function');
  });

  it('应该能够处理无源的情况', async () => {
    mockConfigManager.getSources.mockResolvedValue([]);
    // 基本验证：命令不应抛出错误
    await expect(removeSourceCommand()).resolves.not.toThrow();
  });
});
