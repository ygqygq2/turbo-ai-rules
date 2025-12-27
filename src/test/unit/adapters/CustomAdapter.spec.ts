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
});
