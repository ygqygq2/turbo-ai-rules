import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock vscode and logger before importing the adapter so module initialization
// doesn't call the real logger which depends on vscode.window
vi.mock('vscode');
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

import { CursorAdapter } from '../../../adapters/CursorAdapter';
import type { ParsedRule } from '../../../types/rules';

vi.mock('vscode');

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
      expect(result.content).toContain('Test Rule');
      expect(result.content).toContain('Test content');
      expect(result.content).toContain('**Priority:** high');
      expect(result.content).toContain('**Tags:** test, example');
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
          sourceId: 'source',
          metadata: { priority: 'low' },
          filePath: '/low.md',
        },
        {
          id: 'high-rule',
          title: 'High Priority',
          content: 'High content',
          sourceId: 'source',
          metadata: { priority: 'high' },
          filePath: '/high.md',
        },
        {
          id: 'medium-rule',
          title: 'Medium Priority',
          content: 'Medium content',
          sourceId: 'source',
          metadata: { priority: 'medium' },
          filePath: '/medium.md',
        },
      ];

      const result = await adapter.generate(rules);

      // High priority should come first
      const highIndex = result.content.indexOf('High Priority');
      const mediumIndex = result.content.indexOf('Medium Priority');
      const lowIndex = result.content.indexOf('Low Priority');

      expect(highIndex).toBeLessThan(mediumIndex);
      expect(mediumIndex).toBeLessThan(lowIndex);
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
