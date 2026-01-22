import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

import { CustomAdapter } from '../../../adapters/CustomAdapter';

describe('CustomAdapter', () => {
  beforeEach(() => {
    // Mock vscode workspace configuration
    vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({
      get: (key: string, defaultValue?: any) => {
        if (key === 'userRules') {
          return {
            directory: 'ai-rules',
            markers: {
              begin: '<!-- TURBO-AI-RULES:BEGIN -->',
              end: '<!-- TURBO-AI-RULES:END -->',
            },
          };
        }
        if (key === 'userPrefixRange') {
          return { min: 80000, max: 99999 };
        }
        return defaultValue;
      },
    } as any);
  });

  it('should generate empty config for empty rules', async () => {
    const config = {
      id: 'custom-test',
      name: 'test',
      enabled: true,
      templatePath: '/tmp/test.hbs',
      outputPath: 'out.txt',
      outputType: 'file' as const,
      autoUpdate: false,
    };
    const adapter = new CustomAdapter(config);
    const result = await adapter.generate([]);

    expect(result.ruleCount).toBe(0);
    expect(result.content).toContain('test');
    expect(result.filePath).toBe('out.txt');
  });

  describe('getRuleFileName override', () => {
    it('should use pathTemplate when configured', () => {
      const config = {
        id: 'custom-template',
        name: 'Template Test',
        enabled: true,
        templatePath: '/tmp/test.hbs',
        outputPath: 'out',
        outputType: 'directory' as const,
        autoUpdate: false,
        directoryStructure: {
          pathTemplate: '{{sourceId}}/{{ruleId}}.md',
        },
      };
      const adapter = new CustomAdapter(config);
      const rule = {
        id: 'test-rule',
        title: 'Test Rule',
        content: 'test content',
        rawContent: '---\nid: test-rule\n---\ntest content',
        sourceId: 'my-source',
        metadata: { priority: 'medium' as const },
        filePath: '/path/to/original.md',
      };

      const fileName = adapter['getRuleFileName'](rule);
      expect(fileName).toBe('my-source/test-rule.md');
    });

    it('should use original filename when useOriginalFilename=true', () => {
      const config = {
        id: 'custom-original',
        name: 'Original Test',
        enabled: true,
        templatePath: '/tmp/test.hbs',
        outputPath: 'out',
        outputType: 'directory' as const,
        autoUpdate: false,
        useOriginalFilename: true,
      };
      const adapter = new CustomAdapter(config);
      const rule = {
        id: 'test-rule',
        title: 'Test Rule',
        content: 'test content',
        rawContent: '---\nid: test-rule\n---\ntest content',
        sourceId: 'my-source',
        metadata: { priority: 'medium' as const },
        filePath: '/path/to/my-original-file.md',
      };

      const fileName = adapter['getRuleFileName'](rule);
      expect(fileName).toBe('my-original-file.md');
    });

    it('should use sourceId-ruleId format when useOriginalFilename=false', () => {
      const config = {
        id: 'custom-format',
        name: 'Format Test',
        enabled: true,
        templatePath: '/tmp/test.hbs',
        outputPath: 'out',
        outputType: 'directory' as const,
        autoUpdate: false,
        useOriginalFilename: false,
      };
      const adapter = new CustomAdapter(config);
      const rule = {
        id: 'test-rule',
        title: 'Test Rule',
        content: 'test content',
        rawContent: '---\nid: test-rule\n---\ntest content',
        sourceId: 'my-source',
        metadata: { priority: 'medium' as const },
        filePath: '/path/to/original.md',
      };

      const fileName = adapter['getRuleFileName'](rule);
      expect(fileName).toBe('my-source-test-rule.md');
    });
  });

  describe('Template methods override', () => {
    it('should return correct organizeBySource value', () => {
      const config = {
        id: 'custom-organize',
        name: 'Organize Test',
        enabled: true,
        templatePath: '/tmp/test.hbs',
        outputPath: 'out',
        outputType: 'directory' as const,
        autoUpdate: false,
        organizeBySource: true,
      };
      const adapter = new CustomAdapter(config);

      expect(adapter['shouldOrganizeBySource']()).toBe(true);
    });

    it('should return correct generateIndex value', () => {
      const config = {
        id: 'custom-index',
        name: 'Index Test',
        enabled: true,
        templatePath: '/tmp/test.hbs',
        outputPath: 'out',
        outputType: 'directory' as const,
        autoUpdate: false,
        generateIndex: false,
      };
      const adapter = new CustomAdapter(config);

      expect(adapter['shouldGenerateIndex']()).toBe(false);
    });

    it('should return correct indexFileName', () => {
      const config = {
        id: 'custom-index-name',
        name: 'Index Name Test',
        enabled: true,
        templatePath: '/tmp/test.hbs',
        outputPath: 'out',
        outputType: 'directory' as const,
        autoUpdate: false,
        indexFileName: 'README.md',
      };
      const adapter = new CustomAdapter(config);

      expect(adapter['getIndexFileName']()).toBe('README.md');
    });

    it('should return default indexFileName when not configured', () => {
      const config = {
        id: 'custom-default-index',
        name: 'Default Index Test',
        enabled: true,
        templatePath: '/tmp/test.hbs',
        outputPath: 'out',
        outputType: 'directory' as const,
        autoUpdate: false,
      };
      const adapter = new CustomAdapter(config);

      expect(adapter['getIndexFileName']()).toBe('index.md');
    });

    it('should return correct directoryOutputPath', () => {
      const config = {
        id: 'custom-output',
        name: 'Output Test',
        enabled: true,
        templatePath: '/tmp/test.hbs',
        outputPath: '.ai/custom-rules',
        outputType: 'directory' as const,
        autoUpdate: false,
      };
      const adapter = new CustomAdapter(config);

      expect(adapter['getDirectoryOutputPath']()).toBe('.ai/custom-rules');
    });
  });
});
