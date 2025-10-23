import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MdcParser } from '../../../parsers/MdcParser';

vi.mock('vscode');

describe('MdcParser', () => {
  let parser: MdcParser;

  beforeEach(() => {
    parser = new MdcParser();
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

    it('should invalidate content without frontmatter', () => {
      const content = `# Simple Rule
Simple content.
`;

      expect(parser.validateMdcContent(content)).toBe(false);
    });
    it('should invalidate empty content', () => {
      expect(parser.validateMdcContent('')).toBe(false);
      expect(parser.validateMdcContent('   ')).toBe(false);
    });

    it('should invalidate content without heading', () => {
      const content = 'Just some text without any heading';

      expect(parser.validateMdcContent(content)).toBe(false);
    });
  });

  describe('extractIdFromFilename', () => {
    it('should extract ID from filename', () => {
      // This is a private method, we test it indirectly through parseMdcFile
      // or we can use type assertion to access it
      const extractId = (parser as any).extractIdFromFilename.bind(parser);

      expect(extractId('/path/to/clean-code.md')).toBe('clean-code');
      expect(extractId('rust-best-practices.md')).toBe('rust-best-practices');
      expect(extractId('/nested/folder/my-rule.md')).toBe('my-rule');
    });
  });
});
