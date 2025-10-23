import { runTests } from '@vscode/test-electron';
import * as path from 'path';

async function main(): Promise<void> {
  try {
    // Extension 根目录 (package.json 所在目录)
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');

    // 测试运行入口
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    // 使用 sampleWorkspace 作为测试工作区
    const workspacePath = path.resolve(__dirname, '../../sampleWorkspace/test.code-workspace');

    console.log('Extension path:', extensionDevelopmentPath);
    console.log('Tests path:', extensionTestsPath);
    console.log('Workspace path:', workspacePath);

    // 下载 VS Code, 解压并运行集成测试
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [workspacePath, '--disable-extensions'], // 禁用其他扩展避免干扰
    });
  } catch (err) {
    console.error('Failed to run tests:', err);
    process.exit(1);
  }
}

main();
