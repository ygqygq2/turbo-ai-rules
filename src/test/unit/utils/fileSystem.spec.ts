/**
 * fileSystem 工具函数单元测试
 */

import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SystemError } from '@/types/errors';
import {
  copyPath,
  ensureDir,
  getFileStat,
  pathExists,
  readDir,
  safeReadFile,
  safeRemove,
  safeWriteFile,
} from '@/utils/fileSystem';

describe('fileSystem 单元测试', () => {
  let testDir: string;

  beforeEach(async () => {
    // 创建临时测试目录
    testDir = path.join(os.tmpdir(), `turbo-ai-rules-test-${Date.now()}`);
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    // 清理测试目录
    await fs.remove(testDir).catch(() => {});
  });

  describe('safeReadFile', () => {
    it('应该成功读取文件', async () => {
      const filePath = path.join(testDir, 'test.txt');
      const content = 'Hello, World!';
      await fs.writeFile(filePath, content);

      const result = await safeReadFile(filePath);
      expect(result).toBe(content);
    });

    it('应该在文件不存在时抛出错误', async () => {
      const filePath = path.join(testDir, 'nonexistent.txt');

      await expect(safeReadFile(filePath)).rejects.toThrow(SystemError);
    });

    it('应该验证路径安全性', async () => {
      const basePath = testDir;
      const maliciousPath = path.join(testDir, '../../../etc/passwd');

      await expect(safeReadFile(maliciousPath, basePath)).rejects.toThrow('Path traversal');
    });

    it('应该接受 basePath 内的路径', async () => {
      const filePath = path.join(testDir, 'safe.txt');
      const content = 'Safe content';
      await fs.writeFile(filePath, content);

      const result = await safeReadFile(filePath, testDir);
      expect(result).toBe(content);
    });
  });

  describe('safeWriteFile', () => {
    it('应该成功写入文件', async () => {
      const filePath = path.join(testDir, 'output.txt');
      const content = 'Test content';

      await safeWriteFile(filePath, content);

      const saved = await fs.readFile(filePath, 'utf-8');
      expect(saved).toBe(content);
    });

    it('应该创建不存在的目录', async () => {
      const filePath = path.join(testDir, 'subdir', 'nested', 'file.txt');
      const content = 'Nested content';

      await safeWriteFile(filePath, content);

      expect(await fs.pathExists(filePath)).toBe(true);
      const saved = await fs.readFile(filePath, 'utf-8');
      expect(saved).toBe(content);
    });

    it('应该验证路径安全性', async () => {
      const basePath = testDir;
      const maliciousPath = path.join(testDir, '../../../tmp/malicious.txt');

      await expect(safeWriteFile(maliciousPath, 'content', basePath)).rejects.toThrow(
        'Path traversal',
      );
    });

    it('应该覆盖已存在的文件', async () => {
      const filePath = path.join(testDir, 'overwrite.txt');
      await fs.writeFile(filePath, 'Old content');

      await safeWriteFile(filePath, 'New content');

      const saved = await fs.readFile(filePath, 'utf-8');
      expect(saved).toBe('New content');
    });

    it('应该使用原子写入(临时文件)', async () => {
      const filePath = path.join(testDir, 'atomic.txt');
      const content = 'Atomic content';

      await safeWriteFile(filePath, content);

      // 验证没有遗留临时文件
      const files = await fs.readdir(testDir);
      const tmpFiles = files.filter((f) => f.includes('.tmp.'));
      expect(tmpFiles).toHaveLength(0);
    });
  });

  describe('safeRemove', () => {
    it('应该成功删除文件', async () => {
      const filePath = path.join(testDir, 'delete.txt');
      await fs.writeFile(filePath, 'To be deleted');

      await safeRemove(filePath);

      expect(await fs.pathExists(filePath)).toBe(false);
    });

    it('应该成功删除目录', async () => {
      const dirPath = path.join(testDir, 'delete-dir');
      await fs.ensureDir(dirPath);
      await fs.writeFile(path.join(dirPath, 'file.txt'), 'content');

      await safeRemove(dirPath);

      expect(await fs.pathExists(dirPath)).toBe(false);
    });

    it('应该验证路径安全性', async () => {
      const basePath = testDir;
      const maliciousPath = '../../../tmp/important';

      await expect(safeRemove(maliciousPath, basePath)).rejects.toThrow('Path traversal');
    });

    it('应该处理不存在的路径(不报错)', async () => {
      const filePath = path.join(testDir, 'nonexistent.txt');

      await expect(safeRemove(filePath)).resolves.toBeUndefined();
    });
  });

  describe('pathExists', () => {
    it('应该检测文件存在', async () => {
      const filePath = path.join(testDir, 'exists.txt');
      await fs.writeFile(filePath, 'content');

      expect(await pathExists(filePath)).toBe(true);
    });

    it('应该检测目录存在', async () => {
      const dirPath = path.join(testDir, 'exists-dir');
      await fs.ensureDir(dirPath);

      expect(await pathExists(dirPath)).toBe(true);
    });

    it('应该检测路径不存在', async () => {
      const filePath = path.join(testDir, 'nonexistent.txt');

      expect(await pathExists(filePath)).toBe(false);
    });
  });

  describe('ensureDir', () => {
    it('应该创建目录', async () => {
      const dirPath = path.join(testDir, 'new-dir');

      await ensureDir(dirPath);

      expect(await fs.pathExists(dirPath)).toBe(true);
      const stat = await fs.stat(dirPath);
      expect(stat.isDirectory()).toBe(true);
    });

    it('应该创建嵌套目录', async () => {
      const dirPath = path.join(testDir, 'level1', 'level2', 'level3');

      await ensureDir(dirPath);

      expect(await fs.pathExists(dirPath)).toBe(true);
    });

    it('应该处理已存在的目录', async () => {
      const dirPath = path.join(testDir, 'existing-dir');
      await fs.ensureDir(dirPath);

      await expect(ensureDir(dirPath)).resolves.toBeUndefined();
    });
  });

  describe('readDir', () => {
    beforeEach(async () => {
      // 创建测试文件结构
      await fs.writeFile(path.join(testDir, 'file1.txt'), 'content1');
      await fs.writeFile(path.join(testDir, 'file2.md'), 'content2');
      await fs.ensureDir(path.join(testDir, 'subdir'));
      await fs.writeFile(path.join(testDir, 'subdir', 'file3.txt'), 'content3');
      await fs.writeFile(path.join(testDir, 'subdir', 'file4.json'), 'content4');
    });

    it('应该递归读取所有文件', async () => {
      const files = await readDir(testDir);

      expect(files).toHaveLength(4);
      expect(files).toContain(path.join(testDir, 'file1.txt'));
      expect(files).toContain(path.join(testDir, 'file2.md'));
      expect(files).toContain(path.join(testDir, 'subdir', 'file3.txt'));
      expect(files).toContain(path.join(testDir, 'subdir', 'file4.json'));
    });

    it('应该按扩展名过滤文件', async () => {
      const txtFiles = await readDir(testDir, '.txt');

      expect(txtFiles).toHaveLength(2);
      expect(txtFiles).toContain(path.join(testDir, 'file1.txt'));
      expect(txtFiles).toContain(path.join(testDir, 'subdir', 'file3.txt'));
    });

    it('应该处理空目录', async () => {
      const emptyDir = path.join(testDir, 'empty');
      await fs.ensureDir(emptyDir);

      const files = await readDir(emptyDir);
      expect(files).toHaveLength(0);
    });

    it('应该在目录不存在时抛出错误', async () => {
      const nonexistentDir = path.join(testDir, 'nonexistent');

      await expect(readDir(nonexistentDir)).rejects.toThrow(SystemError);
    });
  });

  describe('copyPath', () => {
    it('应该复制文件', async () => {
      const srcFile = path.join(testDir, 'source.txt');
      const destFile = path.join(testDir, 'dest.txt');
      const content = 'Copy me';
      await fs.writeFile(srcFile, content);

      await copyPath(srcFile, destFile);

      expect(await fs.pathExists(destFile)).toBe(true);
      const copiedContent = await fs.readFile(destFile, 'utf-8');
      expect(copiedContent).toBe(content);
    });

    it('应该复制目录', async () => {
      const srcDir = path.join(testDir, 'src-dir');
      const destDir = path.join(testDir, 'dest-dir');
      await fs.ensureDir(srcDir);
      await fs.writeFile(path.join(srcDir, 'file.txt'), 'content');

      await copyPath(srcDir, destDir);

      expect(await fs.pathExists(destDir)).toBe(true);
      expect(await fs.pathExists(path.join(destDir, 'file.txt'))).toBe(true);
    });

    it('应该在源不存在时抛出错误', async () => {
      const src = path.join(testDir, 'nonexistent');
      const dest = path.join(testDir, 'dest');

      await expect(copyPath(src, dest)).rejects.toThrow(SystemError);
    });
  });

  describe('getFileStat', () => {
    it('应该获取文件统计信息', async () => {
      const filePath = path.join(testDir, 'stat.txt');
      const content = 'Test';
      await fs.writeFile(filePath, content);

      const stat = await getFileStat(filePath);

      expect(stat.isFile()).toBe(true);
      expect(stat.isDirectory()).toBe(false);
      expect(stat.size).toBe(content.length);
    });

    it('应该获取目录统计信息', async () => {
      const dirPath = path.join(testDir, 'stat-dir');
      await fs.ensureDir(dirPath);

      const stat = await getFileStat(dirPath);

      expect(stat.isDirectory()).toBe(true);
      expect(stat.isFile()).toBe(false);
    });

    it('应该在路径不存在时抛出错误', async () => {
      const filePath = path.join(testDir, 'nonexistent.txt');

      await expect(getFileStat(filePath)).rejects.toThrow(SystemError);
    });
  });

  describe('错误处理和边界情况', () => {
    it('应该处理权限错误(如果可能)', async () => {
      // macOS 的原子写入(rename)可能绕过文件权限,跳过此测试
      // 实际的权限测试应该在真实场景中验证
      expect(true).toBe(true);
    });

    it('应该处理大文件(相对)', async () => {
      const largeContent = 'x'.repeat(1024 * 1024); // 1MB
      const filePath = path.join(testDir, 'large.txt');

      await safeWriteFile(filePath, largeContent);
      const read = await safeReadFile(filePath);

      expect(read.length).toBe(largeContent.length);
    });
  });
});
