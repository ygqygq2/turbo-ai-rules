import * as fs from 'fs-extra';
import * as path from 'path';
import * as tmp from 'tmp';

/**
 * 创建临时目录
 */
async function createTempDir(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    tmp.dir((err: any, dir: string | PromiseLike<string>) => {
      if (err) {
        return reject(err);
      }
      resolve(dir);
    });
  });
}

/**
 * 创建临时的用户数据目录和默认设置
 * 用于集成测试，避免交互式配置
 */
export async function createSettings(): Promise<string> {
  const userDataDirectory = await createTempDir();
  process.env.VSC_JUPYTER_VSCODE_SETTINGS_DIR = userDataDirectory;

  // 创建用户设置目录
  const settingsFile = path.join(userDataDirectory, 'User', 'settings.json');

  // 预配置规则源，避免测试时弹出交互提示
  const defaultSettings: Record<string, string | boolean | string[]> = {
    'security.workspace.trust.enabled': false, // 禁用工作区信任
  };

  await fs.ensureDir(path.dirname(settingsFile));
  await fs.writeFile(settingsFile, JSON.stringify(defaultSettings, undefined, 4));

  return userDataDirectory;
}

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
