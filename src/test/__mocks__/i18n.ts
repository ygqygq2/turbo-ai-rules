/**
 * Mock for i18next in tests
 * 提供简单的翻译函数 mock
 */

import { vi } from 'vitest';

// Mock t 函数
export const t = vi.fn((key: string, options?: any) => {
  // 简单返回 key，或者处理插值
  if (!options) {
    return key;
  }

  let result = key;
  // 处理数字占位符 {0}, {1}
  if (typeof options === 'object') {
    Object.keys(options).forEach((k) => {
      result = result.replace(`{${k}}`, String(options[k]));
    });
  }

  return result;
});

// Mock initI18n
export const initI18n = vi.fn();

// Mock changeLanguage
export const changeLanguage = vi.fn();

// Mock getCurrentLanguage
export const getCurrentLanguage = vi.fn(() => 'en');

// Mock i18next instance
export const i18next = {
  t,
  init: vi.fn(),
  changeLanguage,
  language: 'en',
};
