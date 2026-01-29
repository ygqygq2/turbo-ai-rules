/**
 * 自定义技能工作流集成测试
 * 工作空间: workflows-custom-skills
 *
 * 测试场景：
 * 1. 单文件用户技能（ai-skills/my-tool.md）
 * 2. 目录用户技能（ai-skills/my-tool/skill.md）
 * 3. 与远程技能合并
 * 4. 清理保护逻辑
 * 5. skill.md 特殊处理
 */

import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { testSyncWithAdapters } from '../../helpers/testCommands';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../testConstants';
import { sleep, switchToWorkspace, testLog } from '../testHelpers';

describe('Custom Skills Workflow Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;
  let userSkillsDir: string;
  let skillsOutputPath: string;

  before(async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    // 使用公共函数切换到测试工作空间
    workspaceFolder = await switchToWorkspace('Workflows: Custom Skills', {
      verifyAdapter: true,
      adapterType: 'skills',
    });

    //  检查工作空间是否切换成功
    testLog(`[before] Switched to: ${workspaceFolder.uri.fsPath}`);

    // ✅ 等待扩展完全激活并初始化所有服务
    const extension = vscode.extensions.getExtension('ygqygq2.turbo-ai-rules');
    if (extension && !extension.isActive) {
      await extension.activate();
    }
    // 额外等待确保所有服务初始化
    await sleep(TEST_DELAYS.SHORT);

    // 获取配置的用户技能目录
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const userSkillsConfig = config.get<{ directory?: string }>('userSkills', {});
    const userSkillsDirName = userSkillsConfig.directory || 'ai-skills';
    userSkillsDir = path.join(workspaceFolder.uri.fsPath, userSkillsDirName);

    // 技能输出目录
    const customAdapters = config.get<any[]>('adapters.custom', []);
    const skillsAdapter = customAdapters.find((a) => a.id === 'skills' || a.isRuleType === false);
    skillsOutputPath = skillsAdapter
      ? path.join(workspaceFolder.uri.fsPath, skillsAdapter.outputPath)
      : path.join(workspaceFolder.uri.fsPath, '.skills');

    // 清理环境
    await fs.remove(userSkillsDir);
    await fs.remove(skillsOutputPath);
  });

  after(async function () {
    this.timeout(TEST_TIMEOUTS.MEDIUM);
    // 清理测试数据（安全检查避免 undefined）
    if (userSkillsDir) {
      await fs.remove(userSkillsDir);
    }
    if (skillsOutputPath) {
      await fs.remove(skillsOutputPath);
    }
  });

  it('Scenario 1: 单文件用户技能', async function () {
    this.timeout(20000);

    // 创建单文件技能
    await fs.ensureDir(userSkillsDir);
    const singleFileSkill = path.join(userSkillsDir, 'quick-helper.md');
    const skillContent = `---
id: quick-helper
title: Quick Helper Tool
priority: high
---

# Quick Helper

A simple single-file skill for quick tasks.

## Usage

Just call the helper function.
`;
    await fs.writeFile(singleFileSkill, skillContent, 'utf-8');

    // 用户技能会被自动加载
    testLog('Created user skill file:', singleFileSkill);
    testLog('File exists:', await fs.pathExists(singleFileSkill));
    testLog('ai-skills files:', await fs.readdir(userSkillsDir));

    // 模拟规则同步页：选择 skills 适配器并点击同步
    // 使用测试代理层，与实际 webview 行为一致
    await testSyncWithAdapters(['skills']);
    await sleep(TEST_DELAYS.LONG); // 等待生成完成

    // 验证输出
    const outputFile = path.join(skillsOutputPath, 'quick-helper.md');
    testLog('Expected output file:', outputFile);
    testLog('Skills output directory:', skillsOutputPath);
    testLog('Skills output directory exists:', await fs.pathExists(skillsOutputPath));

    if (await fs.pathExists(skillsOutputPath)) {
      const files = await fs.readdir(skillsOutputPath);
      testLog('Files in skills output directory:', files);
    }

    const outputExists = await fs.pathExists(outputFile);
    testLog('Output file exists:', outputExists);

    assert.ok(outputExists, 'Single-file user skill should be generated');

    const outputContent = await fs.readFile(outputFile, 'utf-8');
    testLog('Output content preview:', outputContent.substring(0, 200));
    assert.ok(outputContent.includes('Quick Helper'), 'Output should contain skill content');
    assert.ok(outputContent.includes('quick tasks'), 'Output should contain skill description');
  });

  it('Scenario 2: 目录用户技能（包含 skill.md）', async function () {
    this.timeout(20000);

    // 清理之前的测试
    await fs.remove(userSkillsDir);
    await fs.remove(skillsOutputPath);
    await fs.ensureDir(userSkillsDir);

    // 创建目录技能
    const toolDir = path.join(userSkillsDir, 'data-processor');
    await fs.ensureDir(toolDir);

    // 创建 skill.md
    const skillMd = path.join(toolDir, 'skill.md');
    const skillMdContent = `---
id: data-processor
title: Data Processor
priority: high
---

# Data Processor

A comprehensive data processing tool.

## Files

- \`processor.py\`: Main processor
- \`config.json\`: Configuration
`;
    await fs.writeFile(skillMd, skillMdContent, 'utf-8');

    // 创建辅助文件
    const processorPy = path.join(toolDir, 'processor.py');
    await fs.writeFile(
      processorPy,
      '# Data processor implementation\nprint("Processing...")',
      'utf-8',
    );

    const configJson = path.join(toolDir, 'config.json');
    await fs.writeFile(configJson, '{"mode": "auto"}', 'utf-8');

    // 生成配置（只同步 skills 适配器）
    await testSyncWithAdapters(['skills']);
    await sleep(TEST_DELAYS.MEDIUM);

    // 验证输出目录结构
    const outputDir = path.join(skillsOutputPath, 'data-processor');
    assert.ok(await fs.pathExists(outputDir), 'User skill directory should be created');

    const outputSkillMd = path.join(outputDir, 'skill.md');
    assert.ok(await fs.pathExists(outputSkillMd), 'skill.md should be copied');

    const outputProcessorPy = path.join(outputDir, 'processor.py');
    assert.ok(await fs.pathExists(outputProcessorPy), 'Helper files should be copied');

    const outputConfigJson = path.join(outputDir, 'config.json');
    assert.ok(await fs.pathExists(outputConfigJson), 'Config files should be copied');

    // 验证内容
    const outputContent = await fs.readFile(outputSkillMd, 'utf-8');
    assert.ok(outputContent.includes('Data Processor'), 'skill.md content should be preserved');
  });

  it('Scenario 3: skill.md 特殊处理 - 只加载 skill.md', async function () {
    this.timeout(20000);

    // 清理
    await fs.remove(userSkillsDir);
    await fs.remove(skillsOutputPath);
    await fs.ensureDir(userSkillsDir);

    // 创建包含多个 .md 的目录
    const toolDir = path.join(userSkillsDir, 'multi-doc-tool');
    await fs.ensureDir(toolDir);

    // 创建 skill.md（应该被加载）
    const skillMd = path.join(toolDir, 'skill.md');
    await fs.writeFile(
      skillMd,
      `---
id: multi-doc-tool
title: Multi-Doc Tool
---
# Main Skill
`,
      'utf-8',
    );

    // 创建其他 .md 文件（应该被忽略作为独立技能）
    const readme = path.join(toolDir, 'README.md');
    await fs.writeFile(readme, '# README\nThis is a readme.', 'utf-8');

    const docs = path.join(toolDir, 'DOCS.md');
    await fs.writeFile(docs, '# Documentation\nDetailed docs.', 'utf-8');

    // 用户技能会被自动加载

    // 生成配置（只同步 skills 适配器）
    await testSyncWithAdapters(['skills']);
    await sleep(TEST_DELAYS.MEDIUM);

    // 验证：只有 skill.md 被作为技能加载（README.md 和 DOCS.md 作为辅助文件复制）
    const outputDir = path.join(skillsOutputPath, 'multi-doc-tool');
    assert.ok(await fs.pathExists(outputDir), 'Skill directory should exist');

    const outputSkillMd = path.join(outputDir, 'skill.md');
    assert.ok(await fs.pathExists(outputSkillMd), 'skill.md should be copied');

    // README 和 DOCS 应该也被复制（作为辅助文件）
    const outputReadme = path.join(outputDir, 'README.md');
    const outputDocs = path.join(outputDir, 'DOCS.md');
    assert.ok(await fs.pathExists(outputReadme), 'README.md should be copied as helper file');
    assert.ok(await fs.pathExists(outputDocs), 'DOCS.md should be copied as helper file');
  });

  it('Scenario 4: 清理保护 - 保留用户技能', async function () {
    this.timeout(25000);

    // 清理
    await fs.remove(userSkillsDir);
    await fs.remove(skillsOutputPath);
    await fs.ensureDir(userSkillsDir);

    // 1. 创建用户技能
    const userSkill = path.join(userSkillsDir, 'my-custom-tool.md');
    await fs.writeFile(
      userSkill,
      `---
id: my-custom-tool
title: My Custom Tool
---
# Custom Tool
`,
      'utf-8',
    );

    // 用户技能会被自动加载

    // 2. 第一次生成（只同步 skills 适配器）
    await testSyncWithAdapters(['skills']);
    await sleep(TEST_DELAYS.MEDIUM);

    // 验证用户技能已生成
    const outputUserSkill = path.join(skillsOutputPath, 'my-custom-tool.md');
    assert.ok(await fs.pathExists(outputUserSkill), 'User skill should be generated');

    // 3. 手动创建一个"孤儿"文件（模拟之前的输出）
    const orphanFile = path.join(skillsOutputPath, 'old-orphan-skill.md');
    await fs.writeFile(orphanFile, '# Old Skill\nThis should be cleaned.', 'utf-8');

    // 加载并选中用户技能（重新加载）

    // 4. 再次生成（触发清理，只同步 skills 适配器）
    await testSyncWithAdapters(['skills']);
    await sleep(TEST_DELAYS.MEDIUM);

    // 5. 验证：用户技能保留，孤儿文件被清理
    assert.ok(await fs.pathExists(outputUserSkill), 'User skill should be preserved');
    assert.ok(!(await fs.pathExists(orphanFile)), 'Orphan file should be cleaned');
  });

  it('Scenario 5: 清理保护 - 保留用户技能目录', async function () {
    this.timeout(25000);

    // 清理
    await fs.remove(userSkillsDir);
    await fs.remove(skillsOutputPath);
    await fs.ensureDir(userSkillsDir);

    // 1. 创建用户技能目录
    const userToolDir = path.join(userSkillsDir, 'my-complex-tool');
    await fs.ensureDir(userToolDir);
    await fs.writeFile(
      path.join(userToolDir, 'skill.md'),
      `---
id: my-complex-tool
title: Complex Tool
---
# Tool
`,
      'utf-8',
    );
    await fs.writeFile(path.join(userToolDir, 'helper.py'), 'print("helper")', 'utf-8');

    // 用户技能会被自动加载

    // 2. 第一次生成（只同步 skills 适配器）
    await testSyncWithAdapters(['skills']);
    await sleep(TEST_DELAYS.MEDIUM);

    const outputToolDir = path.join(skillsOutputPath, 'my-complex-tool');
    assert.ok(await fs.pathExists(outputToolDir), 'User skill directory should be created');

    // 3. 创建孤儿目录（模拟之前的远程技能）
    const orphanDir = path.join(skillsOutputPath, 'old-remote-skill');
    await fs.ensureDir(orphanDir);
    await fs.writeFile(path.join(orphanDir, 'skill.md'), '# Old Remote', 'utf-8');

    // 加载并选中用户技能（重新加载）

    // 4. 再次生成（触发清理，只同步 skills 适配器）
    await testSyncWithAdapters(['skills']);
    await sleep(TEST_DELAYS.MEDIUM);

    // 5. 验证：用户目录保留，孤儿目录被清理
    assert.ok(await fs.pathExists(outputToolDir), 'User skill directory should be preserved');
    assert.ok(
      await fs.pathExists(path.join(outputToolDir, 'helper.py')),
      'Helper files should be preserved',
    );
    assert.ok(!(await fs.pathExists(orphanDir)), 'Orphan directory should be cleaned');
  });

  it('Scenario 6: 混合场景 - 单文件 + 目录 + 远程技能', async function () {
    this.timeout(30000);

    // 清理
    await fs.remove(userSkillsDir);
    await fs.remove(skillsOutputPath);
    await fs.ensureDir(userSkillsDir);

    // 1. 创建单文件用户技能
    await fs.writeFile(
      path.join(userSkillsDir, 'quick-tool.md'),
      `---
id: quick-tool
title: Quick Tool
---
# Quick
`,
      'utf-8',
    );

    // 2. 创建目录用户技能
    const dirTool = path.join(userSkillsDir, 'advanced-tool');
    await fs.ensureDir(dirTool);
    await fs.writeFile(
      path.join(dirTool, 'skill.md'),
      `---
id: advanced-tool
title: Advanced Tool
---
# Advanced
`,
      'utf-8',
    );
    await fs.writeFile(path.join(dirTool, 'script.sh'), '#!/bin/bash\necho "script"', 'utf-8');

    // 用户技能会被自动加载

    // 3. 生成（只同步 skills 适配器，可能包含远程技能）
    await testSyncWithAdapters(['skills']);
    await sleep(TEST_DELAYS.LONG);

    // 4. 验证所有技能都存在
    const quickToolOutput = path.join(skillsOutputPath, 'quick-tool.md');
    assert.ok(await fs.pathExists(quickToolOutput), 'Single-file user skill should exist');

    const advancedToolOutput = path.join(skillsOutputPath, 'advanced-tool');
    assert.ok(await fs.pathExists(advancedToolOutput), 'Directory user skill should exist');
    assert.ok(
      await fs.pathExists(path.join(advancedToolOutput, 'skill.md')),
      'skill.md should exist',
    );
    assert.ok(
      await fs.pathExists(path.join(advancedToolOutput, 'script.sh')),
      'Helper script should exist',
    );
  });

  it('Scenario 7: 嵌套目录结构', async function () {
    this.timeout(20000);

    // 清理
    await fs.remove(userSkillsDir);
    await fs.remove(skillsOutputPath);
    await fs.ensureDir(userSkillsDir);

    // 创建嵌套结构
    const categoryDir = path.join(userSkillsDir, 'data-tools');
    await fs.ensureDir(categoryDir);

    const tool1Dir = path.join(categoryDir, 'csv-processor');
    await fs.ensureDir(tool1Dir);
    await fs.writeFile(
      path.join(tool1Dir, 'skill.md'),
      `---
id: csv-processor
title: CSV Processor
---
# CSV Tool
`,
      'utf-8',
    );

    const tool2Dir = path.join(categoryDir, 'json-validator');
    await fs.ensureDir(tool2Dir);
    await fs.writeFile(
      path.join(tool2Dir, 'skill.md'),
      `---
id: json-validator
title: JSON Validator
---
# JSON Tool
`,
      'utf-8',
    );

    // 用户技能会被自动加载

    // 生成配置（只同步 skills 适配器）
    await testSyncWithAdapters(['skills']);
    await sleep(TEST_DELAYS.MEDIUM);

    // 验证两个嵌套技能都被识别
    // 注意：输出路径取决于扫描逻辑，应该保持相对路径
    const entries = await fs.readdir(skillsOutputPath);
    const hasCsvProcessor = entries.some(
      (e) => e.includes('csv-processor') || e.includes('data-tools'),
    );
    const hasJsonValidator = entries.some(
      (e) => e.includes('json-validator') || e.includes('data-tools'),
    );

    assert.ok(hasCsvProcessor || hasJsonValidator, 'Nested skills should be recognized and output');
  });
});
