/**
 * gitignore 工具函数单元测试
 */

import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ensureIgnored, isPatternIgnored, removeIgnorePatterns } from '@/utils/gitignore';

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

    it('应该追加到已存在的 .gitignore', async () => {
      const gitignorePath = path.join(testDir, '.gitignore');
      await fs.writeFile(gitignorePath, 'node_modules/\n.env\n');

      const patterns = ['.turbo-ai-rules/', '*.cache'];
      await ensureIgnored(testDir, patterns);

      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('.env');
      expect(content).toContain('# Turbo AI Rules - Auto-generated files');
      expect(content).toContain('.turbo-ai-rules/');
    });

    it('应该跳过已存在的模式', async () => {
      const gitignorePath = path.join(testDir, '.gitignore');
      await fs.writeFile(gitignorePath, 'node_modules/\n.turbo-ai-rules/\n');

      const patterns = ['.turbo-ai-rules/', '*.cache'];
      await ensureIgnored(testDir, patterns);

      const content = await fs.readFile(gitignorePath, 'utf-8');
      const turboRulesCount = (content.match(/\.turbo-ai-rules\//g) || []).length;

      // 应该只有原有的一个(因为已存在不会重复添加)
      expect(turboRulesCount).toBe(1);
      // 应该添加新的 *.cache 模式
      expect(content).toContain('*.cache');
    });

    it('应该在已有标记时跳过', async () => {
      const gitignorePath = path.join(testDir, '.gitignore');
      await fs.writeFile(
        gitignorePath,
        '# Turbo AI Rules - Auto-generated files\n.turbo-ai-rules/\n',
      );

      const patterns = ['*.cache'];
      await ensureIgnored(testDir, patterns);

      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).not.toContain('*.cache'); // 不应该添加新模式
    });

    it('应该处理空模式列表', async () => {
      await ensureIgnored(testDir, []);

      // 不应该创建文件或报错
      const gitignorePath = path.join(testDir, '.gitignore');
      expect(await fs.pathExists(gitignorePath)).toBe(false);
    });
  });

  describe('removeIgnorePatterns', () => {
    it('应该移除 turbo-ai-rules 模式', async () => {
      const gitignorePath = path.join(testDir, '.gitignore');
      await fs.writeFile(
        gitignorePath,
        'node_modules/\n\n# Turbo AI Rules - Auto-generated files\n.turbo-ai-rules/\n*.cache\n\n.env\n',
      );

      await removeIgnorePatterns(testDir);

      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('.env');
      expect(content).not.toContain('# Turbo AI Rules');
      expect(content).not.toContain('*.cache');
    });

    it('应该处理不存在的 .gitignore', async () => {
      await expect(removeIgnorePatterns(testDir)).resolves.toBeUndefined();
    });

    it('应该处理没有标记的 .gitignore', async () => {
      const gitignorePath = path.join(testDir, '.gitignore');
      await fs.writeFile(gitignorePath, 'node_modules/\n.env\n');

      await removeIgnorePatterns(testDir);

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

      await removeIgnorePatterns(testDir);

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
      await removeIgnorePatterns(testDir);
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
      await removeIgnorePatterns(testDir);

      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toContain('# My custom rules');
      expect(content).toContain('node_modules/');
      expect(content).toContain('.env');
    });
  });
});
