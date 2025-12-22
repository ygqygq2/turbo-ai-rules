/**
 * Webview 国际化工具
 * 使用 i18next，与后端统一
 */

import i18next from 'i18next';

import enTranslations from '../../../l10n/bundle.l10n.json';
import zhTranslations from '../../../l10n/bundle.l10n.zh-cn.json';

/**
 * @description 初始化 i18next（Webview 端）
 * @return default {Promise<void>}
 */
export async function initI18n(): Promise<void> {
  // 直接使用 navigator.language，在 VSCode Webview 中会跟随 VSCode 语言设置
  const navigatorLang = typeof navigator !== 'undefined' ? navigator.language : 'en';
  const locale = normalizeLocale(navigatorLang);

  await i18next.init({
    lng: locale,
    fallbackLng: 'en',
    debug: false,
    resources: {
      en: {
        translation: enTranslations as Record<string, string>,
      },
      // 同时支持多种中文语言代码
      zh: {
        translation: zhTranslations as Record<string, string>,
      },
      'zh-CN': {
        translation: zhTranslations as Record<string, string>,
      },
      'zh-cn': {
        translation: zhTranslations as Record<string, string>,
      },
    },
    interpolation: {
      escapeValue: false,
    },
  });
}

/**
 * @description 标准化语言代码
 * @return default {string}
 * @param locale {string} 浏览器语言代码
 */
function normalizeLocale(locale: string): string {
  const normalized = locale.toLowerCase();
  // 所有中文变体都返回 'zh'
  if (normalized.startsWith('zh')) {
    return 'zh';
  }
  return 'en';
}

/**
 * @description 设置当前语言（兼容旧代码）
 * @param locale {string} - 语言代码
 */
export async function setLocale(locale: string): Promise<void> {
  const normalized = normalizeLocale(locale);
  await i18next.changeLanguage(normalized);
}

/**
 * @description 获取当前语言
 * @return default {string}
 */
export function getLocale(): string {
  return i18next.language;
}

/**
 * @description 翻译函数
 * @return default {string}
 * @param key {string} - 翻译键
 * @param options {i18next.TOptions} - i18next 参数（支持字符串、对象、数字等）
 */
export function t(key: string, options?: i18next.TOptions): string {
  return i18next.t(key, options) as string;
}

// 注意：不再自动初始化，由各个入口文件显式调用 initI18n()
