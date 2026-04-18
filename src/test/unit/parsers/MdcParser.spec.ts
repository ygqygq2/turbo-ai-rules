import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
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
  let tempDir: string;

  beforeEach(() => {
    parser = new MdcParser();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'turbo-ai-rules-parser-'));
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
      const extractId = (parser as any).extractIdFromFilename.bind(parser);

      expect(extractId('/path/to/clean-code.md')).toBe('clean-code');
      expect(extractId('rust-best-practices.md')).toBe('rust-best-practices');
      expect(extractId('/nested/folder/my-rule.md')).toBe('my-rule');
    });
  });

  describe('parseAssetFile', () => {
    it('should parse json asset files with structured metadata', async () => {
      const filePath = path.join(tempDir, 'server.json');
      fs.writeFileSync(
        filePath,
        JSON.stringify(
          {
            name: 'Context7 Server',
            description: 'MCP server config fragment',
            mcpServers: {
              context7: {
                command: 'npx',
              },
            },
          },
          null,
          2,
        ),
      );

      const asset = await parser.parseAssetFile(filePath, 'test-source');

      expect(asset.id).toBe('server');
      expect(asset.title).toBe('Context7 Server');
      expect(asset.format).toBe('json');
      expect(asset.content).toContain('mcpServers');
    });

    it('should parse shell script assets as text format', async () => {
      const filePath = path.join(tempDir, 'lint-on-save.sh');
      fs.writeFileSync(filePath, '#!/usr/bin/env bash\necho lint\n');

      const asset = await parser.parseAssetFile(filePath, 'test-source');

      expect(asset.id).toBe('lint-on-save');
      expect(asset.format).toBe('text');
      expect(asset.content).toContain('echo lint');
    });
  });

  describe('parseDirectory layout compatibility', () => {
    it('should parse skill directories in type-first layout', async () => {
      const skillDir = path.join(tempDir, 'skills', '0001-demo-skill');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# Demo Skill\n\nDo something useful.\n');

      const rules = await parser.parseDirectory(tempDir, 'type-first-source', { recursive: true });

      expect(rules).toHaveLength(1);
      expect(rules[0].kind).toBe('skill');
      expect(rules[0].relativePath).toBe(path.join('skills', '0001-demo-skill', 'SKILL.md'));
    });

    it('should parse skill directories in legacy mixed layout', async () => {
      const skillDir = path.join(tempDir, '1300-skills', '1301-demo-skill');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# Legacy Skill\n\nStill works.\n');

      const rules = await parser.parseDirectory(tempDir, 'legacy-source', { recursive: true });

      expect(rules).toHaveLength(1);
      expect(rules[0].kind).toBe('skill');
      expect(rules[0].relativePath).toBe(path.join('1300-skills', '1301-demo-skill', 'SKILL.md'));
    });
  });
});
