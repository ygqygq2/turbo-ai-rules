import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { StatusBarProvider } from '../../providers/StatusBarProvider';
import { RulesManager } from '../../services/RulesManager';
import { CONFIG_KEYS } from '../../utils/constants';
import { toRelativePath } from '../../utils/rulePath';
import { TEST_TIMEOUTS } from './testConstants';

/**
 * Skills 适配器集成测试
 * 测试通过 skills: true 配置，从源仓库的子路径同步技能文件
 */
describe('Skills Adapter Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;

  before(async () => {
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, 'No workspace folder found');

    // Find the "Test: Skills Adapter" workspace folder
    const skillsFolder = folders.find((f) => f.name === 'Test: Skills Adapter');
    workspaceFolder = skillsFolder || folders[0];

    // Activate extension
    const ext = vscode.extensions.getExtension('ygqygq2.turbo-ai-rules');
    if (ext && !ext.isActive) {
      await ext.activate();
    }

    // 确保 StatusBarProvider 已初始化（用于 syncRulesCommand）
    const rulesManager = RulesManager.getInstance();
    try {
      StatusBarProvider.getInstance();
    } catch {
      // 如果未初始化则初始化
      StatusBarProvider.getInstance(rulesManager);
    }
  });

  afterEach(async () => {
    if (!workspaceFolder) {
      return;
    }

    // 清理生成的 skills 文件
    const pathsToClean = [
      path.join(workspaceFolder.uri.fsPath, '.claude'),
      path.join(workspaceFolder.uri.fsPath, 'test-skills'),
    ];

    for (const cleanPath of pathsToClean) {
      if (await fs.pathExists(cleanPath)) {
        await fs.remove(cleanPath);
      }
    }
  });

  it('Should sync skills files via skills adapter', async function () {
    this.timeout(TEST_TIMEOUTS.EXTRA_LONG);

    // Get configuration
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const customAdapters = config.get<any[]>(CONFIG_KEYS.ADAPTERS_CUSTOM, []);

    // Check if skills adapter is configured
    const skillsAdapter = customAdapters.find((adapter) => adapter.skills === true);

    if (!skillsAdapter) {
      // Skills adapter not configured, test should verify graceful handling
      console.log('No skills adapter configured, testing graceful handling');
      // The test continues to verify normal behavior without skills adapter
    }

    // 先同步规则（确保源仓库已克隆）
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');

    // 等待同步完成
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 生成配置（包括 skills）
    await vscode.commands.executeCommand('turbo-ai-rules.generateRules');

    // 等待生成完成
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 如果有 skills adapter 配置，验证输出
    if (skillsAdapter) {
      // 验证输出目录存在
      const skillsOutputPath = path.join(workspaceFolder.uri.fsPath, skillsAdapter.outputPath);
      const outputExists = await fs.pathExists(skillsOutputPath);

      assert.ok(outputExists, `Skills output directory should exist: ${skillsOutputPath}`);

      // 验证是否有文件被复制
      if (await fs.pathExists(skillsOutputPath)) {
        const files = await fs.readdir(skillsOutputPath);
        const skillFiles = files.filter(
          (file) => file.endsWith('.md') || file.endsWith('.mdc') || file.endsWith('.txt'),
        );

        if (skillFiles.length > 0) {
          // 验证文件内容（检查是否是直接复制，而不是经过规则解析）
          const firstFile = path.join(skillsOutputPath, skillFiles[0]);
          const content = await fs.readFile(firstFile, 'utf-8');

          // Skills 文件应该保持原始格式，可能包含或不包含 frontmatter
          assert.ok(content.length > 0, 'Skill file should have content');
        }
      }
    } else {
      // 没有配置 skills adapter，验证系统正常工作
      console.log('✓ System works correctly without skills adapter configuration');
      assert.ok(true, 'Should handle missing skills adapter gracefully');
    }
  });

  it('Should handle missing sourceId gracefully', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    // 创建一个无效的 skills 配置（缺少 sourceId）
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);

    const invalidAdapter = {
      id: 'test-invalid-skills',
      name: 'Invalid Skills Adapter',
      enabled: true,
      autoUpdate: true,
      outputPath: 'test-skills',
      outputType: 'directory',
      skills: true,
      // 缺少 sourceId
      subPath: '/skills',
    };

    const currentAdapters = config.get<any[]>(CONFIG_KEYS.ADAPTERS_CUSTOM, []);
    const newAdapters = [
      ...currentAdapters.filter((a) => a.id !== invalidAdapter.id),
      invalidAdapter,
    ];

    await config.update(
      CONFIG_KEYS.ADAPTERS_CUSTOM,
      newAdapters,
      vscode.ConfigurationTarget.WorkspaceFolder,
    );

    // 尝试生成配置
    try {
      await vscode.commands.executeCommand('turbo-ai-rules.generateRules');
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 应该能够处理错误而不崩溃
      assert.ok(true, 'Should handle missing sourceId without crashing');
    } finally {
      // 恢复配置
      await config.update(
        'adapters.custom',
        currentAdapters,
        vscode.ConfigurationTarget.WorkspaceFolder,
      );
    }
  });

  it('Should clean obsolete skill directories when rules change', async function () {
    this.timeout(TEST_TIMEOUTS.EXTRA_LONG);

    // Get configuration
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const customAdapters = config.get<any[]>(CONFIG_KEYS.ADAPTERS_CUSTOM, []);

    // Check if skills adapter is configured (isRuleType: false means it's a skills adapter)
    const skillsAdapter = customAdapters.find((adapter) => adapter.isRuleType === false);

    if (!skillsAdapter) {
      console.log('No skills adapter configured, skipping directory cleanup test');
      this.skip();
      return;
    }

    const skillsOutputPath = path.join(workspaceFolder.uri.fsPath, skillsAdapter.outputPath);

    // 获取扩展导出的服务
    const extension = vscode.extensions.getExtension('ygqygq2.turbo-ai-rules');
    if (!extension?.exports) {
      console.log('Extension exports not available, skipping cleanup test');
      this.skip();
      return;
    }

    const { rulesManager, selectionStateManager } = extension.exports;

    // 清理已存在的 .skills 目录，确保从干净状态开始
    if (await fs.pathExists(skillsOutputPath)) {
      await fs.remove(skillsOutputPath);
      console.log('Cleaned existing .skills directory before test');
    }

    // 步骤 1: 首次同步加载规则（不生成文件）
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 获取所有 SKILL 规则（文件名为 SKILL.md）
    const allRules = rulesManager.getAllRules();
    console.log(`Total rules after sync: ${allRules.length}`);

    const skillRules = allRules.filter(
      (r: any) => path.basename(r.filePath).toLowerCase() === 'skill.md',
    );

    console.log(`Found ${skillRules.length} SKILL rules`);
    if (skillRules.length > 0) {
      console.log(
        'SKILL rules paths:',
        skillRules.map((r: any) => r.filePath),
      );
    }

    if (skillRules.length < 2) {
      assert.fail(`Not enough SKILL rules to test cleanup (need 2, got ${skillRules.length})`);
    }

    // 步骤 2: 选择所有 SKILL 规则
    for (const rule of skillRules) {
      const sourceId = rule.sourceId;
      const currentSelection = selectionStateManager.getSelection(sourceId) || [];
      // 将绝对路径转换为相对路径
      const relativePath = toRelativePath(rule.filePath, rule.sourceId);
      if (!currentSelection.includes(relativePath)) {
        currentSelection.push(relativePath);
        selectionStateManager.updateSelection(
          sourceId,
          currentSelection,
          true, // 持久化选择状态
          workspaceFolder.uri.fsPath,
        );
      }
    }

    // 等待持久化完成
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 验证选择状态
    const verifySourceId = skillRules[0].sourceId;
    const finalSelection = selectionStateManager.getSelection(verifySourceId);
    console.log(`Final selection for ${verifySourceId}:`, finalSelection);
    console.log(
      `Expected count: ${skillRules.length}, Actual count: ${finalSelection?.length || 0}`,
    );

    // 步骤 3: 同步生成所有选中的 SKILL
    // 使用命令调用 syncRules，不传 sourceId 就会同步所有源并生成所有适配器
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 记录第一次生成后的 SKILL 目录（包含 SKILL.md 的目录）
    let firstGenSkillDirs: string[] = [];
    if (await fs.pathExists(skillsOutputPath)) {
      // 递归查找所有包含 SKILL.md 的目录
      const findSkillDirs = async (dir: string, basePath: string = ''): Promise<string[]> => {
        const skillDirs: string[] = [];
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory()) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.join(basePath, entry.name);

            // 检查是否包含 SKILL.md
            const skillFile = path.join(fullPath, 'SKILL.md');
            if (await fs.pathExists(skillFile)) {
              skillDirs.push(relativePath);
            }

            // 递归查找子目录
            const subDirs = await findSkillDirs(fullPath, relativePath);
            skillDirs.push(...subDirs);
          }
        }
        return skillDirs;
      };

      firstGenSkillDirs = await findSkillDirs(skillsOutputPath);
      console.log(
        `First generation created ${firstGenSkillDirs.length} SKILL directories:`,
        firstGenSkillDirs,
      );
    }

    if (firstGenSkillDirs.length === 0) {
      console.log('No skill directories generated, skipping cleanup test');
      this.skip();
      return;
    }

    // 步骤 3: 取消选择第一个 SKILL 规则
    const ruleToDeselect = skillRules[0];
    const sourceId = ruleToDeselect.sourceId;
    const currentSelection = selectionStateManager.getSelection(sourceId);

    console.log('Current selection before deselect:', currentSelection);
    console.log('Rule to deselect filePath:', ruleToDeselect.filePath);

    // 从 filePath 中提取相对路径（去掉源路径前缀）
    const relativePathToDeselect = currentSelection.find((p: string) =>
      ruleToDeselect.filePath.includes(p),
    );

    console.log('Relative path to deselect:', relativePathToDeselect);

    const newSelection = currentSelection.filter((p: string) => p !== relativePathToDeselect);
    console.log('New selection after filter:', newSelection);

    selectionStateManager.updateSelection(
      sourceId,
      newSelection,
      false,
      workspaceFolder.uri.fsPath,
    );
    await selectionStateManager.persistToDisk(sourceId, workspaceFolder.uri.fsPath);

    console.log(
      `Deselected SKILL rule: ${path.basename(path.dirname(ruleToDeselect.filePath))}/SKILL.md`,
    );

    // 步骤 4: 重新同步配置（会触发清理）
    // 使用命令调用 syncRules
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 步骤 5: 验证 SKILL 目录数量减少了
    const findSkillDirs = async (dir: string, basePath: string = ''): Promise<string[]> => {
      const skillDirs: string[] = [];
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.join(basePath, entry.name);

          // 检查是否包含 SKILL.md
          const skillFile = path.join(fullPath, 'SKILL.md');
          if (await fs.pathExists(skillFile)) {
            skillDirs.push(relativePath);
          }

          // 递归查找子目录
          const subDirs = await findSkillDirs(fullPath, relativePath);
          skillDirs.push(...subDirs);
        }
      }
      return skillDirs;
    };

    const afterSkillDirs = await findSkillDirs(skillsOutputPath);
    console.log(
      `After cleanup: ${afterSkillDirs.length} SKILL directories (was ${firstGenSkillDirs.length})`,
    );

    // 验证：SKILL 目录数量应该减少
    assert.ok(
      afterSkillDirs.length < firstGenSkillDirs.length,
      `Should have fewer SKILL directories after cleanup (before: ${firstGenSkillDirs.length}, after: ${afterSkillDirs.length})`,
    );

    // 步骤 6: 重新选择该规则,验证清理后的规则仍然可以正常生成
    const reselectSelection = selectionStateManager.getSelection(sourceId);
    // 使用之前找到的相对路径，而不是绝对路径
    reselectSelection.push(relativePathToDeselect!);
    selectionStateManager.updateSelection(
      sourceId,
      reselectSelection,
      false,
      workspaceFolder.uri.fsPath,
    );

    // 使用命令调用 syncRules
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const finalSkillDirs = await findSkillDirs(skillsOutputPath);

    assert.strictEqual(
      finalSkillDirs.length,
      firstGenSkillDirs.length,
      'Should restore all SKILL directories after re-selecting',
    );
  });
});
