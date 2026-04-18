import * as fs from 'fs';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AIToolAdapter, GeneratedConfig } from '../../../adapters/AIToolAdapter';
import { FileGenerator } from '../../../services/FileGenerator';
import { GenerateError } from '../../../types/errors';
import type { ParsedRule } from '../../../types/rules';

const { mockState } = vi.hoisted(() => ({
  mockState: {
    workspaceRoot: '/tmp',
    remoteSourceRoot: '/tmp/remote-source',
  },
}));

// Mock vscode module
vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [
      {
        uri: { fsPath: mockState.workspaceRoot },
      },
    ],
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

vi.mock('../../../services/WorkspaceContextManager', () => ({
  WorkspaceContextManager: {
    getInstance: vi.fn(() => ({
      getCurrentWorkspaceFolder: vi.fn(() => ({
        uri: { fsPath: mockState.workspaceRoot },
      })),
    })),
  },
}));

vi.mock('../../../services/ConfigManager', () => ({
  ConfigManager: {
    getInstance: vi.fn(() => ({
      getConfig: vi.fn(async () => ({
        sources: [
          {
            id: 'remote-source',
            subPath: 'skills',
          },
        ],
      })),
    })),
  },
}));

vi.mock('../../../services/GitManager', () => ({
  GitManager: {
    getInstance: vi.fn(() => ({
      getSourcePath: vi.fn(() => mockState.remoteSourceRoot),
    })),
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
    mockState.workspaceRoot = tempDir;
    mockState.remoteSourceRoot = path.join(tempDir, 'remote-source');
    fs.mkdirSync(mockState.remoteSourceRoot, { recursive: true });
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

  it('should replace managed root keys when writing preset merge-json adapters', async () => {
    generator.initializeAdapters({
      cursor: { enabled: false },
      copilot: { enabled: false },
      continue: { enabled: false },
      'claude-hooks-settings': { enabled: true },
      custom: [],
    });

    const settingsPath = path.join(tempDir, '.claude', 'settings.json');
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(
      settingsPath,
      JSON.stringify(
        {
          permissions: { defaultMode: 'acceptEdits' },
          hooks: { PreToolUse: [{ matcher: 'Bash' }] },
        },
        null,
        2,
      ),
    );

    const rules: ParsedRule[] = [
      {
        id: 'pre-bash-hook',
        title: 'Bash Validation Hook',
        content:
          '{"hooks":{"PreToolUse":[{"matcher":"Bash","hooks":[{"type":"command","command":"\\"$CLAUDE_PROJECT_DIR\\"/.claude/hooks/validate-bash.sh"}]}]}}',
        rawContent:
          '{"hooks":{"PreToolUse":[{"matcher":"Bash","hooks":[{"type":"command","command":"\\"$CLAUDE_PROJECT_DIR\\"/.claude/hooks/validate-bash.sh"}]}]}}',
        sourceId: 's',
        filePath: '/tmp/pre-bash-hook.json',
        metadata: {},
        kind: 'hook',
        format: 'json',
        relativePath: 'hooks/0001-settings-fragments/pre-bash-hook.json',
      },
    ];

    const result = await generator.generateAll(rules, tempDir, 'priority', [
      'claude-hooks-settings',
    ]);

    expect(result.failures).toHaveLength(0);
    expect(JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))).toEqual({
      permissions: { defaultMode: 'acceptEdits' },
      hooks: {
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [
              {
                type: 'command',
                command: '"$CLAUDE_PROJECT_DIR"/.claude/hooks/validate-bash.sh',
              },
            ],
          },
        ],
      },
    });
  });

  it('should not treat directory adapters without index as invalid', async () => {
    generator.initializeAdapters({
      cursor: { enabled: false },
      copilot: { enabled: false },
      continue: { enabled: false },
      custom: [
        {
          id: 'skills-dir',
          name: 'Skills Dir',
          enabled: true,
          outputPath: '.skills',
          outputType: 'directory',
          generateIndex: false,
          preserveDirectoryStructure: false,
          enableUserRules: false,
        },
      ],
    });

    const rules: ParsedRule[] = [
      {
        id: 'python-dev',
        title: 'Python Development',
        content: '# Python Development',
        rawContent: '# Python Development',
        sourceId: 's',
        filePath: '/tmp/0001-python-development.mdc',
        metadata: { tags: [], priority: 'low', version: '1.0.0' },
      },
    ];

    const result = await generator.generateAll(rules, tempDir, 'priority', ['skills-dir']);

    expect(result.failures).toHaveLength(0);
    expect(fs.existsSync(path.join(tempDir, '.skills', '0001-python-development.mdc'))).toBe(true);
  });

  it('should cleanup deselected directory files on subsequent sync', async () => {
    generator.initializeAdapters({
      cursor: { enabled: false },
      copilot: { enabled: false },
      continue: { enabled: false },
      custom: [
        {
          id: 'skills-dir',
          name: 'Skills Dir',
          enabled: true,
          outputPath: '.skills',
          outputType: 'directory',
          generateIndex: false,
          preserveDirectoryStructure: false,
          enableUserRules: false,
        },
      ],
    });

    const ruleA: ParsedRule = {
      id: 'python-dev',
      title: 'Python Development',
      content: '# Python Development',
      rawContent: '# Python Development',
      sourceId: 's',
      filePath: '/tmp/0001-python-development.mdc',
      metadata: { tags: [], priority: 'low', version: '1.0.0' },
    };
    const ruleB: ParsedRule = {
      id: 'incident-response',
      title: 'Incident Response',
      content: '# Incident Response',
      rawContent: '# Incident Response',
      sourceId: 's',
      filePath: '/tmp/0012-incident-response.mdc',
      metadata: { tags: [], priority: 'low', version: '1.0.0' },
    };

    await generator.generateAll([ruleA, ruleB], tempDir, 'priority', ['skills-dir']);
    expect(fs.existsSync(path.join(tempDir, '.skills', '0001-python-development.mdc'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.skills', '0012-incident-response.mdc'))).toBe(true);

    const secondResult = await generator.generateAll([ruleB], tempDir, 'priority', ['skills-dir']);

    expect(secondResult.failures).toHaveLength(0);
    expect(fs.existsSync(path.join(tempDir, '.skills', '0012-incident-response.mdc'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.skills', '0001-python-development.mdc'))).toBe(false);
  });

  it('should cleanup all directory files when selection becomes empty', async () => {
    generator.initializeAdapters({
      cursor: { enabled: false },
      copilot: { enabled: false },
      continue: { enabled: false },
      custom: [
        {
          id: 'skills-dir',
          name: 'Skills Dir',
          enabled: true,
          outputPath: '.skills',
          outputType: 'directory',
          generateIndex: false,
          preserveDirectoryStructure: false,
          enableUserRules: false,
        },
      ],
    });

    const rule: ParsedRule = {
      id: 'python-dev',
      title: 'Python Development',
      content: '# Python Development',
      rawContent: '# Python Development',
      sourceId: 's',
      filePath: '/tmp/0001-python-development.mdc',
      metadata: { tags: [], priority: 'low', version: '1.0.0' },
    };

    await generator.generateAll([rule], tempDir, 'priority', ['skills-dir']);
    expect(fs.existsSync(path.join(tempDir, '.skills', '0001-python-development.mdc'))).toBe(true);

    const emptyResult = await generator.generateAll([], tempDir, 'priority', ['skills-dir']);

    expect(emptyResult.failures).toHaveLength(0);
    expect(fs.existsSync(path.join(tempDir, '.skills', '0001-python-development.mdc'))).toBe(false);
  });

  it('should cleanup orphan files when directory adapters generate index files', async () => {
    generator.initializeAdapters({
      cursor: { enabled: false },
      copilot: { enabled: false },
      continue: { enabled: false },
      custom: [
        {
          id: 'skills-dir-with-index',
          name: 'Skills Dir With Index',
          enabled: true,
          outputPath: '.skills',
          outputType: 'directory',
          generateIndex: true,
          preserveDirectoryStructure: false,
          enableUserRules: false,
        },
      ],
    });

    const rule: ParsedRule = {
      id: 'python-dev',
      title: 'Python Development',
      content: '# Python Development',
      rawContent: '# Python Development',
      sourceId: 's',
      filePath: '/tmp/0001-python-development.mdc',
      metadata: { tags: [], priority: 'low', version: '1.0.0' },
    };

    await generator.generateAll([rule], tempDir, 'priority', ['skills-dir-with-index']);

    const orphanFile = path.join(tempDir, '.skills', 'old-orphan-skill.md');
    fs.writeFileSync(orphanFile, '# Orphan Skill\n');
    expect(fs.existsSync(orphanFile)).toBe(true);

    const result = await generator.generateAll([rule], tempDir, 'priority', [
      'skills-dir-with-index',
    ]);

    expect(result.failures).toHaveLength(0);
    expect(fs.existsSync(path.join(tempDir, '.skills', 'index.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.skills', '0001-python-development.mdc'))).toBe(true);
    expect(fs.existsSync(orphanFile)).toBe(false);
  });

  it('should cleanup orphan directories when skill adapters regenerate with the same selection', async () => {
    generator.initializeAdapters({
      cursor: { enabled: false },
      copilot: { enabled: false },
      continue: { enabled: false },
      'copilot-skills': { enabled: true },
      custom: [],
    });

    const sourceSkillDir = path.join(
      mockState.remoteSourceRoot,
      'skills',
      '0012-incident-response',
    );
    fs.mkdirSync(sourceSkillDir, { recursive: true });
    fs.writeFileSync(path.join(sourceSkillDir, 'SKILL.md'), '# Incident Response\n');
    fs.writeFileSync(path.join(sourceSkillDir, 'guide.md'), 'guide');

    const skillRule: ParsedRule = {
      id: 'incident-response',
      title: 'Incident Response',
      content: '# Incident Response',
      rawContent: '# Incident Response',
      sourceId: 'remote-source',
      filePath: path.join(sourceSkillDir, 'SKILL.md'),
      metadata: { tags: [], priority: 'low', version: '1.0.0' },
      kind: 'skill',
    };

    await generator.generateAll([skillRule], tempDir, 'priority', ['copilot-skills']);

    const orphanDir = path.join(tempDir, '.github', 'skills', 'old-remote-skill');
    fs.mkdirSync(orphanDir, { recursive: true });
    fs.writeFileSync(path.join(orphanDir, 'SKILL.md'), '# Old Remote\n');
    expect(fs.existsSync(orphanDir)).toBe(true);

    const result = await generator.generateAll([skillRule], tempDir, 'priority', [
      'copilot-skills',
    ]);

    expect(result.failures).toHaveLength(0);
    expect(
      fs.existsSync(path.join(tempDir, '.github', 'skills', '0012-incident-response', 'SKILL.md')),
    ).toBe(true);
    expect(fs.existsSync(orphanDir)).toBe(false);
  });

  it('should keep preset skill directories after cleanup and remove them when deselected', async () => {
    generator.initializeAdapters({
      cursor: { enabled: false },
      copilot: { enabled: false },
      continue: { enabled: false },
      'copilot-skills': { enabled: true },
      custom: [],
    });

    const sourceSkillDir = path.join(
      mockState.remoteSourceRoot,
      'skills',
      '0012-incident-response',
    );
    fs.mkdirSync(sourceSkillDir, { recursive: true });
    fs.writeFileSync(path.join(sourceSkillDir, 'SKILL.md'), '# Incident Response\n');
    fs.writeFileSync(path.join(sourceSkillDir, 'guide.md'), 'guide');

    const skillRule: ParsedRule = {
      id: 'incident-response',
      title: 'Incident Response',
      content: '# Incident Response',
      rawContent: '# Incident Response',
      sourceId: 'remote-source',
      filePath: path.join(sourceSkillDir, 'SKILL.md'),
      metadata: { tags: [], priority: 'low', version: '1.0.0' },
      kind: 'skill',
    };

    const firstResult = await generator.generateAll([skillRule], tempDir, 'priority', [
      'copilot-skills',
    ]);

    expect(firstResult.failures).toHaveLength(0);
    expect(
      fs.existsSync(path.join(tempDir, '.github', 'skills', '0012-incident-response', 'SKILL.md')),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(tempDir, '.github', 'skills', '0012-incident-response', 'guide.md')),
    ).toBe(true);

    const secondResult = await generator.generateAll([], tempDir, 'priority', ['copilot-skills']);

    expect(secondResult.failures).toHaveLength(0);
    expect(
      fs.existsSync(path.join(tempDir, '.github', 'skills', '0012-incident-response', 'SKILL.md')),
    ).toBe(false);
  });
});
