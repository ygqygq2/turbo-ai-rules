import { runTests } from '@vscode/test-electron';
import * as path from 'path';

import { createSettings } from './ready';

async function main(): Promise<void> {
  try {
    // Extension 根目录 (package.json 所在目录)
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');

    // 测试运行入口
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    // 使用 sampleWorkspace 作为测试工作区
    const workspacePath = path.resolve(__dirname, '../../sampleWorkspace/test.code-workspace');

    // 创建临时的用户数据目录，避免交互式配置
    const userDataDirectory = await createSettings();

    console.log('Extension path:', extensionDevelopmentPath);
    console.log('Tests path:', extensionTestsPath);
    console.log('Workspace path:', workspacePath);
    console.log('User data directory:', userDataDirectory);

    // 下载 VS Code, 解压并运行集成测试
    await runTests({
      version: '1.88.0', // 指定版本，确保一致性
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [workspacePath]
        .concat(['--skip-welcome']) // 跳过欢迎页
        .concat(['--disable-extensions']) // 禁用其他扩展避免干扰
        .concat(['--skip-release-notes']) // 跳过发布说明
        .concat(['--disable-workspace-trust']) // 禁用工作区信任提示
        .concat(['--disable-telemetry']) // 禁用遥测
        .concat(['--no-sandbox']) // 禁用沙箱（测试环境）
        .concat(['--user-data-dir', userDataDirectory]), // 使用临时用户数据目录
      extensionTestsEnv: {
        NODE_ENV: 'test',
        VSCODE_TEST_MODE: 'true',
      },
    });
  } catch (error) {
    console.error('Failed to run tests');
    if (error instanceof Error) {
      console.error('error message: ' + error.message);
      console.error('error name: ' + error.name);
      console.error('error stack: ' + error.stack);
    } else {
      console.error('No error object: ' + JSON.stringify(error));
    }
    process.exit(1);
  }
}

main();
