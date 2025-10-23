import * as fs from 'fs-extra';
import * as path from 'path';
import * as tmp from 'tmp';

/**
 * 创建临时的 VSCode 设置文件
 * @param workspaceDir 工作区目录
 * @param adapterType 适配器类型：cursor, copilot, continue, rules
 */
export async function createTempSettings(
  workspaceDir: string,
  adapterType: 'cursor' | 'copilot' | 'continue' | 'rules',
): Promise<void> {
  const vscodeDir = path.join(workspaceDir, '.vscode');
  await fs.ensureDir(vscodeDir);

  const settings = {
    'turbo-ai-rules.adapters.cursor.enabled': adapterType === 'cursor',
    'turbo-ai-rules.adapters.copilot.enabled': adapterType === 'copilot',
    'turbo-ai-rules.adapters.continue.enabled': adapterType === 'continue',
    'turbo-ai-rules.adapters.rules.enabled': adapterType === 'rules',
  };

  const settingsPath = path.join(vscodeDir, 'settings.json');
  await fs.writeJson(settingsPath, settings, { spaces: 2 });
}

/**
 * 创建临时工作区目录
 */
export function createTempWorkspace(): string {
  return tmp.dirSync({ prefix: 'turbo-ai-rules-test-' }).name;
}

/**
 * 清理生成的配置文件
 * @param workspaceDir 工作区目录
 */
export async function cleanupGeneratedFiles(workspaceDir: string): Promise<void> {
  const filesToClean = [
    '.cursorrules',
    '.github/copilot-instructions.md',
    '.continue/prompts/codebase.mdt',
    'rules',
    '.turbo-ai-rules',
    '.vscode/settings.json', // 清理临时设置
  ];

  for (const file of filesToClean) {
    const filePath = path.join(workspaceDir, file);
    try {
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
        console.log(`Cleaned up: ${file}`);
      }
    } catch (error) {
      console.warn(`Failed to clean up ${file}:`, error);
    }
  }
}

/**
 * 验证文件是否存在且内容不为空
 */
export async function verifyFileExists(filePath: string): Promise<boolean> {
  if (!(await fs.pathExists(filePath))) {
    return false;
  }
  const content = await fs.readFile(filePath, 'utf-8');
  return content.trim().length > 0;
}
