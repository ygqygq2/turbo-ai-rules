/// <reference types="vitest" />

import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'webview' ? [react()] : [],
  resolve: {
    alias: [
      {
        find: /^~(.+)/,
        replacement: path.join(process.cwd(), 'node_modules/$1'),
      },
      {
        find: /^@\/(.+)/,
        replacement: path.join(process.cwd(), 'src/$1'),
      },
    ],
  },
  // Webview 构建配置
  build:
    mode === 'webview'
      ? (() => {
          const fs = require('fs');
          const webviewDir = path.resolve(__dirname, 'src/webview');
          const globalCss = path.resolve(webviewDir, 'global.css');
          const excludeDirs = ['components', 'utils'];
          const input: Record<string, string> = {};

          // 自动检测页面入口
          fs.readdirSync(webviewDir, { withFileTypes: true })
            .filter(
              (dirent: { isDirectory: () => boolean; name: string }) =>
                dirent.isDirectory() && !excludeDirs.includes(dirent.name),
            )
            .forEach((dirent: { name: string }) => {
              const htmlPath = path.join(webviewDir, dirent.name, 'index.html');
              if (fs.existsSync(htmlPath)) {
                // 入口 key 只用页面名，确保输出目录简洁
                input[dirent.name] = htmlPath;
              }
            });

          // 全局样式入口
          if (fs.existsSync(globalCss)) {
            input['global'] = globalCss;
          }

          return {
            outDir: 'out/webview',
            emptyOutDir: true,
            rollupOptions: {
              input,
              output: {
                // 关键修改：移除多余的目录层级
                entryFileNames: '[name].js',
                chunkFileNames: 'chunks/[name]-[hash].js',
                assetFileNames: (assetInfo: { name?: string }) => {
                  if (assetInfo.name === 'global.css') {
                    return 'global.css';
                  }
                  // CSS文件输出到对应页面目录
                  if (assetInfo.name && assetInfo.name.endsWith('.css')) {
                    return '[name].css';
                  }
                  // 图片等资源统一管理
                  if (assetInfo.name && /\.(png|jpe?g|gif|svg|webp)$/i.test(assetInfo.name)) {
                    return 'assets/[name]-[hash].[ext]';
                  }
                  return 'assets/[name]-[hash].[ext]';
                },
              },
            },
          };
        })()
      : undefined,
  test: {
    include: ['src/test/unit/**/*.spec.ts'],
    setupFiles: 'src/test/unit/setup.ts',
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      clean: true,
      exclude: [
        'node_modules',
        'out',
        'src/test',
        'src/types',
        '.vscode-test',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'coverage',
      ],
    },
  },
}));
