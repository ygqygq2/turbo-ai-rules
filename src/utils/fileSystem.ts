/**
 * 安全的文件系统操作工具
 */

import * as fs from 'fs-extra';
import * as path from 'path';

import { ErrorCodes, SystemError } from '../types/errors';
import { Logger } from './logger';
import { toRelativePath } from './pathHelper';
import { validatePath } from './validator';

/**
 * 安全地读取文件
 * @param filePath 文件路径
 * @param basePath 基础路径（用于安全验证）
 * @returns 文件内容
 */
export async function safeReadFile(filePath: string, basePath?: string): Promise<string> {
  try {
    // 如果提供了 basePath，验证路径安全性
    if (basePath && !validatePath(filePath, basePath)) {
      throw new SystemError(
        `Path traversal attempt detected: ${filePath}`,
        ErrorCodes.SYSTEM_PATH_TRAVERSAL,
      );
    }

    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    if (error instanceof SystemError) {
      throw error;
    }

    Logger.error('Failed to read file', error as Error, { filePath });
    throw new SystemError(
      `Failed to read file: ${filePath}`,
      ErrorCodes.SYSTEM_IO_ERROR,
      error as Error,
    );
  }
}

/**
 * 安全地写入文件（原子操作）
 * @param filePath 文件路径
 * @param content 文件内容
 * @param basePath 基础路径（用于安全验证）
 */
export async function safeWriteFile(
  filePath: string,
  content: string,
  basePath?: string,
): Promise<void> {
  try {
    // 如果提供了 basePath，验证路径安全性
    if (basePath && !validatePath(filePath, basePath)) {
      throw new SystemError(
        `Path traversal attempt detected: ${filePath}`,
        ErrorCodes.SYSTEM_PATH_TRAVERSAL,
      );
    }

    // 确保目录存在
    await fs.ensureDir(path.dirname(filePath));

    // 原子写入：先写临时文件，再重命名
    const tmpPath = `${filePath}.tmp.${Date.now()}`;
    try {
      await fs.writeFile(tmpPath, content, 'utf-8');
      await fs.rename(tmpPath, filePath);
    } catch (error) {
      // 清理临时文件
      await fs.remove(tmpPath).catch(() => {});
      throw error;
    }

    Logger.debug('File written successfully', { filePath });
  } catch (error) {
    if (error instanceof SystemError) {
      throw error;
    }

    Logger.error('Failed to write file', error as Error, { filePath });
    throw new SystemError(
      `Failed to write file: ${filePath}`,
      ErrorCodes.SYSTEM_IO_ERROR,
      error as Error,
    );
  }
}

/**
 * 安全地删除文件或目录
 * @param targetPath 目标路径
 * @param basePath 基础路径（用于安全验证）
 */
export async function safeRemove(targetPath: string, basePath?: string): Promise<void> {
  try {
    if (basePath && !validatePath(targetPath, basePath)) {
      throw new SystemError(
        `Path traversal attempt detected: ${targetPath}`,
        ErrorCodes.SYSTEM_PATH_TRAVERSAL,
      );
    }

    await fs.remove(targetPath);
    Logger.debug('Path removed successfully', { targetPath });
  } catch (error) {
    if (error instanceof SystemError) {
      throw error;
    }

    Logger.error('Failed to remove path', error as Error, { targetPath });
    throw new SystemError(
      `Failed to remove path: ${targetPath}`,
      ErrorCodes.SYSTEM_IO_ERROR,
      error as Error,
    );
  }
}

/**
 * 检查文件或目录是否存在
 * @param targetPath 目标路径
 * @returns 是否存在
 */
export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    return await fs.pathExists(targetPath);
  } catch (_error) {
    Logger.warn('Error checking path existence', { targetPath });
    return false;
  }
}

/**
 * 确保目录存在
 * @param dirPath 目录路径
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.ensureDir(dirPath);
  } catch (error) {
    Logger.error('Failed to ensure directory', error as Error, { dirPath });
    throw new SystemError(
      `Failed to ensure directory: ${dirPath}`,
      ErrorCodes.SYSTEM_IO_ERROR,
      error as Error,
    );
  }
}

/**
 * 读取目录下的所有文件
 * @param dirPath 目录路径
 * @param extension 文件扩展名过滤（可选）
 * @returns 文件路径列表
 */
export async function readDir(dirPath: string, extension?: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // 递归读取子目录
        const subFiles = await readDir(fullPath, extension);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        // 如果指定了扩展名，进行过滤
        if (!extension || fullPath.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  } catch (error) {
    Logger.error('Failed to read directory', error as Error, { dirPath });
    throw new SystemError(
      `Failed to read directory: ${dirPath}`,
      ErrorCodes.SYSTEM_IO_ERROR,
      error as Error,
    );
  }
}

/**
 * 复制文件或目录
 * @param src 源路径
 * @param dest 目标路径
 */
export async function copyPath(src: string, dest: string): Promise<void> {
  try {
    await fs.copy(src, dest);
    Logger.debug('Path copied successfully', { src, dest });
  } catch (error) {
    Logger.error('Failed to copy path', error as Error, { src, dest });
    throw new SystemError(
      `Failed to copy from ${src} to ${dest}`,
      ErrorCodes.SYSTEM_IO_ERROR,
      error as Error,
    );
  }
}

/**
 * 安全地复制目录
 * @param srcDir 源目录路径
 * @param destDir 目标目录路径
 * @param basePath 基础路径（用于安全验证）
 */
export async function safeCopyDir(
  srcDir: string,
  destDir: string,
  basePath?: string,
): Promise<void> {
  try {
    // 如果提供了 basePath，验证目标路径安全性
    if (basePath && !validatePath(destDir, basePath)) {
      throw new SystemError(
        `Path traversal attempt detected: ${destDir}`,
        ErrorCodes.SYSTEM_PATH_TRAVERSAL,
      );
    }

    // 确保源目录存在
    const srcExists = await fs.pathExists(srcDir);
    if (!srcExists) {
      throw new SystemError(
        `Source directory does not exist: ${srcDir}`,
        ErrorCodes.SYSTEM_IO_ERROR,
      );
    }

    // 确保源是目录
    const srcStat = await fs.stat(srcDir);
    if (!srcStat.isDirectory()) {
      throw new SystemError(
        `Source path is not a directory: ${srcDir}`,
        ErrorCodes.SYSTEM_IO_ERROR,
      );
    }

    // 复制目录
    await fs.copy(srcDir, destDir, { overwrite: true });
    Logger.debug('Directory copied successfully', {
      srcDir: toRelativePath(srcDir),
      destDir: toRelativePath(destDir),
    });
  } catch (error) {
    if (error instanceof SystemError) {
      throw error;
    }

    Logger.error('Failed to copy directory', error as Error, { srcDir, destDir });
    throw new SystemError(
      `Failed to copy directory from ${srcDir} to ${destDir}`,
      ErrorCodes.SYSTEM_IO_ERROR,
      error as Error,
    );
  }
}

/**
 * 获取文件统计信息
 * @param filePath 文件路径
 * @returns 文件统计信息
 */
export async function getFileStat(filePath: string): Promise<fs.Stats> {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    Logger.error('Failed to get file stat', error as Error, { filePath });
    throw new SystemError(
      `Failed to get file stat: ${filePath}`,
      ErrorCodes.SYSTEM_IO_ERROR,
      error as Error,
    );
  }
}
