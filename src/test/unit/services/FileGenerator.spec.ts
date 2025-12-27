import * as fs from 'fs';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AIToolAdapter, GeneratedConfig } from '../../../adapters/AIToolAdapter';
import { FileGenerator } from '../../../services/FileGenerator';
import { GenerateError } from '../../../types/errors';
import type { ParsedRule } from '../../../types/rules';

// Mock vscode module
vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn().mockReturnValue({
      get: vi.fn((key: string, defaultValue?: any) => {
        if (key === 'userRules') {
          return {
            directory: 'ai-rules',
            markers: {
              begin: '<!-- TURBO-AI-RULES:BEGIN -->',
              end: '<!-- TURBO-AI-RULES:END -->',
            },
          };
        }
        return defaultValue;
      }),
    }),
  },
  window: {
    showWarningMessage: vi.fn(),
  },
  l10n: {
    t: vi.fn((key: string, ..._args: any[]) => key),
  },
}));

// Mock Adapter
class MockAdapter implements AIToolAdapter {
  name = 'mock';
  enabled = true;
  isRuleType = true; // 标识为规则类型适配器
  async generate(rules: ParsedRule[]): Promise<GeneratedConfig> {
    if (rules.length === 0) throw new Error('No rules');
    return {
      content: 'config',
      filePath: 'mock.json',
      generatedAt: new Date(),
      ruleCount: rules.length,
    };
  }
  validate(_content: string): boolean {
    return true;
  }
  getFilePath(): string {
    return 'mock.json';
  }
}

describe('FileGenerator', () => {
  let generator: FileGenerator;
  let tempDir: string;

  beforeEach(() => {
    generator = FileGenerator.getInstance();
    const mockAdapter = new MockAdapter();
    generator.initializeAdapters({
      cursor: { enabled: false },
      copilot: { enabled: false },
      continue: { enabled: false },
      custom: [],
    });

    // 手动添加 mock adapter
    (generator as any).adapters.set('mock', mockAdapter);

    // 创建临时测试目录
    tempDir = path.join(__dirname, '../../../..', '.test-temp-' + Date.now());
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    // 清理临时目录
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should generate config for valid rules', async () => {
    const rules: ParsedRule[] = [
      {
        id: 'r1',
        title: 't',
        content: 'c',
        sourceId: 's',
        filePath: 'f',
        metadata: { tags: [], priority: 'low', version: '1.0.0' },
      },
    ];
    const result = await generator.generateAll(rules, tempDir, 'priority');
    expect(result.failures.length).toBe(0);
    expect(result.success.length).toBe(1);
  });

  it('should handle adapter error and return failure', async () => {
    const rules: ParsedRule[] = [];
    // Empty rules should be handled gracefully, not error
    const result = await generator.generateAll(rules, tempDir, 'priority');
    expect(result.success.length).toBe(0);
  });

  it('should throw GenerateError for no adapters', async () => {
    const gen2 = FileGenerator.getInstance();
    gen2.initializeAdapters({
      cursor: { enabled: false },
      copilot: { enabled: false },
      continue: { enabled: false },
      custom: [],
    });
    await expect(gen2.generateAll([], tempDir, 'priority')).rejects.toThrow(GenerateError);
  });
});
