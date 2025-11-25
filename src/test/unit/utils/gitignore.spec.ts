/**
 * gitignore 工具函数单元测试
 */

import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ensureIgnored, isPatternIgnored, removeAllIgnorePatterns } from '@/utils/gitignore';

describe('gitignore 单元测试', () => {
  let testDir: string;

  beforeEach(async () => {
    // 创建临时测试目录
    testDir = path.join(os.tmpdir(), `turbo-ai-rules-gitignore-test-${Date.now()}`);
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    // 清理测试目录
    await fs.remove(testDir).catch(() => {});
  });

  describe('ensureIgnored', () => {
    it('应该创建新的 .gitignore 文件', async () => {
      const patterns = ['.turbo-ai-rules/', '*.cache'];

      await ensureIgnored(testDir, patterns);

      const gitignorePath = path.join(testDir, '.gitignore');
      expect(await fs.pathExists(gitignorePath)).toBe(true);

      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toContain('# Turbo AI Rules - Auto-generated files');
      expect(content).toContain('.turbo-ai-rules/');
      expect(content).toContain('*.cache');
    });

    it('应该动态更新模式（替换而非追加）', async () => {
      const gitignorePath = path.join(testDir, '.gitignore');
      await fs.writeFile(gitignorePath, 'node_modules/\n.env\n');

      // 第一次添加模式
      const patterns1 = ['.cursorrules', '.continue/config.json'];
      await ensureIgnored(testDir, patterns1);

      let content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toContain('.cursorrules');
      expect(content).toContain('.continue/config.json');

      // 第二次更新模式（移除 .continue/config.json，添加 .github/copilot-instructions.md）
      const patterns2 = ['.cursorrules', '.github/copilot-instructions.md'];
      await ensureIgnored(testDir, patterns2);

      content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toContain('.cursorrules');
      expect(content).toContain('.github/copilot-instructions.md');
      expect(content).not.toContain('.continue/config.json');

      // 确保用户内容仍然存在
      expect(content).toContain('node_modules/');
      expect(content).toContain('.env');
    });

    it('应该在模式未变化时不修改文件', async () => {
      const gitignorePath = path.join(testDir, '.gitignore');
      const patterns = ['.cursorrules', '.continue/config.json'];

      await ensureIgnored(testDir, patterns);
      const stat1 = await fs.stat(gitignorePath);

      // 等待确保时间戳不同
      await new Promise((resolve) => setTimeout(resolve, 10));

      // 再次使用相同模式
      await ensureIgnored(testDir, patterns);
      const stat2 = await fs.stat(gitignorePath);

      // 文件修改时间应该相同（未被修改）
      expect(stat1.mtimeMs).toBe(stat2.mtimeMs);
    });

    it('应该支持空模式列表（移除所有模式但保留标记）', async () => {
      const gitignorePath = path.join(testDir, '.gitignore');
      await fs.writeFile(gitignorePath, 'node_modules/\n');

      // 先添加一些模式
      await ensureIgnored(testDir, ['.cursorrules', '.continue/config.json']);

      let content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toContain('.cursorrules');

      // 传入空数组应该移除所有模式但保留标记区域
      await ensureIgnored(testDir, []);

      content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toContain('# Turbo AI Rules - Auto-generated files');
      expect(content).not.toContain('.cursorrules');
      expect(content).not.toContain('.continue/config.json');
      expect(content).toContain('node_modules/');
    });

    it('应该处理空模式列表', async () => {
      await ensureIgnored(testDir, []);

      // 不应该创建文件或报错
      const gitignorePath = path.join(testDir, '.gitignore');
      expect(await fs.pathExists(gitignorePath)).toBe(false);
    });
  });

  describe('removeAllIgnorePatterns', () => {
    it('应该移除 turbo-ai-rules 模式', async () => {
      const gitignorePath = path.join(testDir, '.gitignore');
      await fs.writeFile(
        gitignorePath,
        'node_modules/\n\n# Turbo AI Rules - Auto-generated files\n.turbo-ai-rules/\n*.cache\n\n.env\n',
      );

      await removeAllIgnorePatterns(testDir);

      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('.env');
      expect(content).not.toContain('# Turbo AI Rules');
      expect(content).not.toContain('*.cache');
    });

    it('应该处理不存在的 .gitignore', async () => {
      await expect(removeAllIgnorePatterns(testDir)).resolves.toBeUndefined();
    });

    it('应该处理没有标记的 .gitignore', async () => {
      const gitignorePath = path.join(testDir, '.gitignore');
      await fs.writeFile(gitignorePath, 'node_modules/\n.env\n');

      await removeAllIgnorePatterns(testDir);

      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('.env');
    });

    it('应该正确处理标记在文件末尾的情况', async () => {
      const gitignorePath = path.join(testDir, '.gitignore');
      await fs.writeFile(
        gitignorePath,
        'node_modules/\n\n# Turbo AI Rules - Auto-generated files\n.turbo-ai-rules/',
      );

      await removeAllIgnorePatterns(testDir);

      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toContain('node_modules/');
      expect(content).not.toContain('# Turbo AI Rules');
      expect(content).not.toContain('.turbo-ai-rules/');
    });
  });

  describe('isPatternIgnored', () => {
    it('应该检测模式存在', async () => {
      const gitignorePath = path.join(testDir, '.gitignore');
      await fs.writeFile(gitignorePath, 'node_modules/\n.turbo-ai-rules/\n*.cache\n');

      expect(await isPatternIgnored(testDir, 'node_modules/')).toBe(true);
      expect(await isPatternIgnored(testDir, '.turbo-ai-rules/')).toBe(true);
      expect(await isPatternIgnored(testDir, '*.cache')).toBe(true);
    });

    it('应该检测模式不存在', async () => {
      const gitignorePath = path.join(testDir, '.gitignore');
      await fs.writeFile(gitignorePath, 'node_modules/\n');

      expect(await isPatternIgnored(testDir, '.turbo-ai-rules/')).toBe(false);
      expect(await isPatternIgnored(testDir, '*.cache')).toBe(false);
    });

    it('应该处理不存在的 .gitignore', async () => {
      expect(await isPatternIgnored(testDir, 'node_modules/')).toBe(false);
    });

    it('应该忽略空行和空格', async () => {
      const gitignorePath = path.join(testDir, '.gitignore');
      await fs.writeFile(gitignorePath, '  node_modules/  \n\n  \n*.cache\n');

      expect(await isPatternIgnored(testDir, 'node_modules/')).toBe(true);
      expect(await isPatternIgnored(testDir, '*.cache')).toBe(true);
    });
  });

  describe('集成场景', () => {
    it('应该支持添加-移除-再添加的循环', async () => {
      const patterns = ['.turbo-ai-rules/', '*.cache'];

      // 第一次添加
      await ensureIgnored(testDir, patterns);
      expect(await isPatternIgnored(testDir, '.turbo-ai-rules/')).toBe(true);

      // 移除
      await removeAllIgnorePatterns(testDir);
      expect(await isPatternIgnored(testDir, '.turbo-ai-rules/')).toBe(false);

      // 再次添加
      await ensureIgnored(testDir, patterns);
      expect(await isPatternIgnored(testDir, '.turbo-ai-rules/')).toBe(true);
    });

    it('应该保留用户自定义的内容', async () => {
      const gitignorePath = path.join(testDir, '.gitignore');
      const userContent = '# My custom rules\nnode_modules/\n.env\n';
      await fs.writeFile(gitignorePath, userContent);

      const patterns = ['.turbo-ai-rules/'];
      await ensureIgnored(testDir, patterns);
      await removeAllIgnorePatterns(testDir);

      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toContain('# My custom rules');
      expect(content).toContain('node_modules/');
      expect(content).toContain('.env');
    });
  });
});
