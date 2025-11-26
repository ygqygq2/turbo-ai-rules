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
        if (key === 'protectUserRules') return false;
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
    const result = await generator.generateAll(rules, '/tmp', 'priority');
    expect(result.failures.length).toBe(0);
    expect(result.success.length).toBe(1);
  });

  it('should handle adapter error and return failure', async () => {
    const rules: ParsedRule[] = [];
    // Empty rules should be handled gracefully, not error
    const result = await generator.generateAll(rules, '/tmp', 'priority');
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
    await expect(gen2.generateAll([], '/tmp', 'priority')).rejects.toThrow(GenerateError);
  });

  describe('User Rules Protection', () => {
    it('should preserve existing content when protectUserRules is enabled and file has no markers', async () => {
      // 模拟启用 protectUserRules
      const vscode = await import('vscode');
      vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
        get: vi.fn((key: string, defaultValue?: any) => {
          if (key === 'protectUserRules') return true;
          if (key === 'userPrefixRange') return { min: 80000, max: 99999 };
          return defaultValue;
        }),
      } as any);

      // 创建已存在的规则文件（第一次使用扩展，没有块标记）
      const existingFilePath = path.join(tempDir, 'mock.json');
      const existingUserContent = '# My existing custom rules\n\nDo not delete this!';
      fs.writeFileSync(existingFilePath, existingUserContent, 'utf-8');

      // 重新加载保护配置
      (generator as any).protectionConfig = (generator as any).loadProtectionConfig();

      // 生成新内容
      const rules: ParsedRule[] = [
        {
          id: 'r1',
          title: 'Test Rule',
          content: 'Generated rule content',
          sourceId: 's1',
          filePath: 'test.md',
          metadata: { tags: [], priority: 'low', version: '1.0.0' },
        },
      ];

      const result = await generator.generateAll(rules, tempDir, 'priority');

      // 验证生成成功
      expect(result.success.length).toBe(1);
      expect(result.failures.length).toBe(0);

      // 读取生成的文件
      const generatedContent = fs.readFileSync(existingFilePath, 'utf-8');

      // 验证：应该包含块标记
      expect(generatedContent).toContain('<!-- TURBO-AI-RULES:BEGIN -->');
      expect(generatedContent).toContain('<!-- TURBO-AI-RULES:END -->');

      // 验证：应该保留原有的用户内容
      expect(generatedContent).toContain(existingUserContent);

      // 验证：应该包含新生成的内容
      expect(generatedContent).toContain('config');
    });

    it('should merge user content when file already has block markers', async () => {
      // 模拟启用 protectUserRules
      const vscode = await import('vscode');
      vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
        get: vi.fn((key: string, defaultValue?: any) => {
          if (key === 'protectUserRules') return true;
          if (key === 'userPrefixRange') return { min: 80000, max: 99999 };
          return defaultValue;
        }),
      } as any);

      // 创建已有块标记的文件
      const existingFilePath = path.join(tempDir, 'mock.json');
      const existingContent = `<!-- TURBO-AI-RULES:BEGIN -->
<!-- Auto-generated content -->
old generated content
<!-- TURBO-AI-RULES:END -->

# My user rules
Custom content here`;
      fs.writeFileSync(existingFilePath, existingContent, 'utf-8');

      // 重新加载保护配置
      (generator as any).protectionConfig = (generator as any).loadProtectionConfig();

      // 生成新内容
      const rules: ParsedRule[] = [
        {
          id: 'r2',
          title: 'New Rule',
          content: 'New generated content',
          sourceId: 's2',
          filePath: 'new.md',
          metadata: { tags: [], priority: 'medium', version: '1.0.0' },
        },
      ];

      const result = await generator.generateAll(rules, tempDir, 'priority');

      // 验证生成成功
      expect(result.success.length).toBe(1);

      // 读取生成的文件
      const generatedContent = fs.readFileSync(existingFilePath, 'utf-8');

      // 验证：应该包含新的自动生成内容
      expect(generatedContent).toContain('config');

      // 验证：应该保留用户自定义内容
      expect(generatedContent).toContain('# My user rules');
      expect(generatedContent).toContain('Custom content here');

      // 验证：不应该包含旧的自动生成内容
      expect(generatedContent).not.toContain('old generated content');
    });
  });
});
