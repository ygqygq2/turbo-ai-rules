/// <reference types="vitest" />
import path from 'path';

import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
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
});
