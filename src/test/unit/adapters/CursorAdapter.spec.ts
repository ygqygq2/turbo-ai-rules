import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock vscode and logger before importing the adapter
vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }],
    getConfiguration: vi.fn(() => ({
      get: vi.fn((key: string) => {
        if (key === 'directory') return 'ai-rules';
        return undefined;
      }),
    })),
  },
  Uri: {
    file: (p: string) => ({ fsPath: p }),
  },
}));

vi.mock('../../../utils/logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  initLogger: vi.fn(),
  getLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Mock userRules to avoid loading actual files
vi.mock('../../../utils/userRules', () => ({
  getUserRulesDirectory: vi.fn(() => '/test/workspace/ai-rules'),
  loadUserRules: vi.fn(async () => []),
  isUserRule: vi.fn(() => false),
}));

import { CursorAdapter } from '../../../adapters/CursorAdapter';
import type { ParsedRule } from '../../../types/rules';

describe('CursorAdapter', () => {
  let adapter: CursorAdapter;

  beforeEach(() => {
    adapter = new CursorAdapter(true);
  });

  describe('generate', () => {
    it('should generate .cursorrules content', async () => {
      const rules: ParsedRule[] = [
        {
          id: 'test-rule',
          title: 'Test Rule',
          content: 'Test content',
          rawContent: 'Test content',
          sourceId: 'test-source',
          metadata: {
            priority: 'high',
            tags: ['test', 'example'],
          },
          filePath: '/path/to/test.md',
        },
      ];

      const result = await adapter.generate(rules);

      expect(result.filePath).toBe('.cursorrules');
      expect(result.content).toContain('# AI Coding Rules for Cursor');
      expect(result.content).toContain('Test content');
      expect(result.ruleCount).toBe(1);
    });

    it('should handle empty rules array', async () => {
      const result = await adapter.generate([]);

      expect(result.filePath).toBe('.cursorrules');
      expect(result.content).toContain('No rules configured yet');
      expect(result.ruleCount).toBe(0);
    });

    it('should sort rules by priority', async () => {
      const rules: ParsedRule[] = [
        {
          id: 'low-rule',
          title: 'Low Priority',
          content: 'Low content',
          rawContent: 'Low content',
          sourceId: 'source',
          metadata: { priority: 'low' },
          filePath: '/low.md',
        },
        {
          id: 'high-rule',
          title: 'High Priority',
          content: 'High content',
          rawContent: 'High content',
          sourceId: 'source',
          metadata: { priority: 'high' },
          filePath: '/high.md',
        },
        {
          id: 'medium-rule',
          title: 'Medium Priority',
          content: 'Medium content',
          rawContent: 'Medium content',
          sourceId: 'source',
          metadata: { priority: 'medium' },
          filePath: '/medium.md',
        },
      ];

      const result = await adapter.generate(rules);

      // 默认 sortOrder: 'asc' → low -> medium -> high（高优先级在后，利用 LLM 近因效应）
      const lowIndex = result.content.indexOf('Low Priority');
      const mediumIndex = result.content.indexOf('Medium Priority');
      const highIndex = result.content.indexOf('High Priority');

      expect(lowIndex).toBeLessThan(mediumIndex);
      expect(mediumIndex).toBeLessThan(highIndex);
    });
  });

  describe('validate', () => {
    it('should validate correct content', () => {
      const content = '# AI Coding Rules\n\nSome content here.';

      expect(adapter.validate(content)).toBe(true);
    });

    it('should invalidate empty content', () => {
      expect(adapter.validate('')).toBe(false);
      expect(adapter.validate('   ')).toBe(false);
    });

    it('should invalidate content without heading', () => {
      const content = 'Just some text without heading';

      expect(adapter.validate(content)).toBe(false);
    });
  });

  describe('getFilePath', () => {
    it('should return correct file path', () => {
      expect(adapter.getFilePath()).toBe('.cursorrules');
    });
  });
});
