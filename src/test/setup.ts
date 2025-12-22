/**
 * Vitest setup file
 * 全局 mock 配置
 */

import { vi } from 'vitest';

// Mock i18next globally for all tests
vi.mock('../../utils/i18n', () => ({
  t: vi.fn((key: string, options?: any) => {
    if (!options) {
      return key;
    }
    let result = key;
    if (typeof options === 'object') {
      Object.keys(options).forEach((k) => {
        result = result.replace(`{${k}}`, String(options[k]));
      });
    }
    return result;
  }),
  initI18n: vi.fn(),
  changeLanguage: vi.fn(),
  getCurrentLanguage: vi.fn(() => 'en'),
  i18next: {
    t: vi.fn((key: string) => key),
    init: vi.fn(),
    changeLanguage: vi.fn(),
    language: 'en',
  },
}));
