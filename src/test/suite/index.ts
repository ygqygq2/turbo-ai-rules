import { glob } from 'glob';
import Mocha from 'mocha';
import * as path from 'path';

// 为了解析别名
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('tsconfig-paths/register');
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('ts-node/register');

export async function run() {
  const testsRoot = path.resolve(__dirname, '..');

  // 创建 mocha 实例
  const mocha = new Mocha({
    ui: 'bdd',
    color: true,
  });

  // 支持通过环境变量指定单个测试文件
  const testFile = process.env.TEST_FILE;
  let tsFiles: string[];

  if (testFile) {
    // 只运行指定的测试文件
    tsFiles = [`suite/${testFile}.test.js`];
    console.log('运行指定测试文件:', testFile);
  } else {
    // 获取所有测试文件（只匹配 suite/ 目录，排除 unit/ 目录）
    tsFiles = await glob('suite/**/*.test.js', { cwd: testsRoot });
    console.log('获取到以下测试文件:');
  }
  console.log('🚀 ~ file: index.ts:26 ~ tsFiles:', tsFiles);

  return new Promise<void>((resolve, reject) => {
    // 添加测试文件
    tsFiles.forEach((file: string) => {
      mocha.addFile(path.resolve(testsRoot, file));
    });

    // 运行测试
    mocha.run((failures) => {
      if (failures > 0) {
        reject(new Error(`${failures} tests failed.`));
      } else {
        resolve();
      }
    });
  }).catch((err) => {
    console.error(err);
    return Promise.reject(err);
  });
}
