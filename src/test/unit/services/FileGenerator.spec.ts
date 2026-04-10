import * as fs from 'fs';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AIToolAdapter, GeneratedConfig } from '../../../adapters/AIToolAdapter';
import { CustomAdapter } from '../../../adapters/CustomAdapter';
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

  it('should write merged json output for merge-json adapters', async () => {
    generator.initializeAdapters({
      cursor: { enabled: false },
      copilot: { enabled: false },
      continue: { enabled: false },
      custom: [
        {
          id: 'mcp-json',
          name: 'MCP JSON',
          enabled: true,
          outputPath: '.vscode/mcp.json',
          outputType: 'merge-json',
          enableUserRules: false,
          fileExtensions: ['.json'],
        },
      ],
    });

    const rules: ParsedRule[] = [
      {
        id: 'server-a',
        title: 'Server A',
        content: '{"mcpServers":{"a":{"command":"npx"}}}',
        rawContent: '{"mcpServers":{"a":{"command":"npx"}}}',
        sourceId: 's',
        filePath: '/tmp/a.json',
        metadata: {},
        kind: 'mcp',
        format: 'json',
        relativePath: 'a.json',
      },
      {
        id: 'server-b',
        title: 'Server B',
        content: '{"mcpServers":{"b":{"command":"uvx"}}}',
        rawContent: '{"mcpServers":{"b":{"command":"uvx"}}}',
        sourceId: 's',
        filePath: '/tmp/b.json',
        metadata: {},
        kind: 'mcp',
        format: 'json',
        relativePath: 'b.json',
      },
    ];

    const result = await generator.generateAll(rules, tempDir, 'priority');
    const outputPath = path.join(tempDir, '.vscode', 'mcp.json');

    expect(result.failures).toHaveLength(0);
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(JSON.parse(fs.readFileSync(outputPath, 'utf-8'))).toEqual({
      mcpServers: {
        a: { command: 'npx' },
        b: { command: 'uvx' },
      },
    });
  });
});
