import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(__dirname, '../../../..');
const sampleWorkspaceRoot = path.resolve(__dirname, '../../../../sampleWorkspace');

function parseWorkspaceFolders(workspaceFilePath: string): string[] {
  const raw = fs.readFileSync(workspaceFilePath, 'utf-8');
  const withoutLineComments = raw.replace(/^\s*\/\/.*$/gm, '');
  const parsed = JSON.parse(withoutLineComments) as { folders?: Array<{ path?: string }> };
  return (parsed.folders || [])
    .map((folder) => folder.path)
    .filter((folder): folder is string => !!folder);
}

describe('sampleWorkspace inventory', () => {
  it('sampleWorkspace 根目录应使用 README.md 作为测试入口文档', () => {
    const rootReadmePath = path.join(sampleWorkspaceRoot, 'README.md');
    const legacyGuidePath = path.join(sampleWorkspaceRoot, 'TESTING_GUIDE.md');
    const rootReadme = fs.readFileSync(rootReadmePath, 'utf-8');

    expect(fs.existsSync(rootReadmePath)).toBe(true);
    expect(fs.existsSync(legacyGuidePath)).toBe(false);
    expect(rootReadme).toContain('sampleWorkspace README');
    expect(rootReadme).toContain('commands/');
    expect(rootReadme).toContain('adapters/');
    expect(rootReadme).toContain('scenarios/');
    expect(rootReadme).toContain('workflows/');
    expect(rootReadme).toContain('首次同步成功');
    expect(rootReadme).toContain('不另起灶台');
  });

  it('test.code-workspace 中的每个工作区都应在映射文档中说明用途', () => {
    const workspaceFolders = parseWorkspaceFolders(
      path.join(sampleWorkspaceRoot, 'test.code-workspace'),
    );
    const mappingContent = fs.readFileSync(
      path.join(sampleWorkspaceRoot, 'TEST-WORKSPACE-MAPPING.md'),
      'utf-8',
    );

    for (const folder of workspaceFolders) {
      expect(
        mappingContent.includes(`\`${folder}/\``),
        `Workspace ${folder} should be documented in TEST-WORKSPACE-MAPPING.md`,
      ).toBe(true);
    }
  });

  it('multiAdapterUserProtection 工作区应保持可读的基线夹具状态', () => {
    const workspaceDir = path.join(sampleWorkspaceRoot, 'scenarios-multiAdapterUserProtection');
    const readme = fs.readFileSync(path.join(workspaceDir, 'README.md'), 'utf-8');
    const settings = fs.readFileSync(path.join(workspaceDir, '.vscode', 'settings.json'), 'utf-8');

    expect(fs.existsSync(path.join(workspaceDir, 'rules', 'index.md'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceDir, 'ai-rules'))).toBe(true);
    expect(readme).toContain('基线夹具');
    expect(settings).toContain('"turbo-ai-rules.adapters.custom"');
    expect(settings).not.toContain('"fileExtension"');
  });

  it('集成测试文档应明确 workflow 闭环必测项', () => {
    const designDoc = fs.readFileSync(
      path.join(projectRoot, 'docs', 'development', '70-integration-test-design.md'),
      'utf-8',
    );
    const referenceDoc = fs.readFileSync(
      path.join(projectRoot, 'docs', 'development', '72-integration-test-reference.md'),
      'utf-8',
    );

    expect(designDoc).toContain('首次同步成功 → 修改选择 → 再次同步成功');
    expect(designDoc).toContain('隔离恢复');
    expect(referenceDoc).toContain('Workflow 闭环新增前检查表');
    expect(referenceDoc).toContain('修改选择后再次同步');
    expect(referenceDoc).toContain('createWorkspaceSnapshot');
    expect(referenceDoc).toContain('restoreWorkspaceSnapshot');
  });
});
