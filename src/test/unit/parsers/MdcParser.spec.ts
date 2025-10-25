import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MdcParser } from '../../../parsers/MdcParser';

// Mock vscode module
vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn((key: string, defaultValue: unknown) => {
        // 默认返回宽松模式配置
        if (key === 'strictMode') return false;
        if (key === 'requireFrontmatter') return false;
        return defaultValue;
      }),
    })),
  },
}));

describe('MdcParser', () => {
  let parser: MdcParser;

  beforeEach(() => {
    parser = new MdcParser();
    vi.clearAllMocks();
  });

  describe('validateMdcContent', () => {
    it('should validate content with frontmatter', () => {
      const content = `---
title: Test Rule
tags: [test]
---

# Test Rule

Content here.
`;

      expect(parser.validateMdcContent(content)).toBe(true);
    });

    it('should validate content without frontmatter in relaxed mode', () => {
      const content = `# Simple Rule
Simple content.
`;

      expect(parser.validateMdcContent(content)).toBe(true);
    });

    it('should invalidate empty content', () => {
      expect(parser.validateMdcContent('')).toBe(false);
      expect(parser.validateMdcContent('   ')).toBe(false);
    });

    it('should validate content without heading in relaxed mode', () => {
      const content = 'Just some text without any heading';

      // 宽松模式下，只要有内容就有效
      expect(parser.validateMdcContent(content)).toBe(true);
    });
  });

  describe('extractIdFromFilename', () => {
    it('should extract ID from filename', () => {
      // This is a private method, we test it indirectly through parseMdcFile
      // or we can use type assertion to access it
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extractId = (parser as any).extractIdFromFilename.bind(parser);

      expect(extractId('/path/to/clean-code.md')).toBe('clean-code');
      expect(extractId('rust-best-practices.md')).toBe('rust-best-practices');
      expect(extractId('/nested/folder/my-rule.md')).toBe('my-rule');
    });
  });
});
