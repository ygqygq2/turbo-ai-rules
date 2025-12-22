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
 * @description 翻译函数（支持 l10n 格式 {0}, {1} 和 i18next 格式 {{key}}）
 * @return default {string}
 * @param key {string} - 翻译键
 * @param options {any} - 可以是对象（i18next 格式）或其他类型（l10n 格式）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function t(key: string, options?: any): string {
  let translated = i18next.t(key) as string;

  // 如果翻译键不存在或返回空值，返回键本身
  if (!translated) {
    return key;
  }

  // 如果参数是对象且包含具名属性，使用 i18next 原生插值
  if (options && typeof options === 'object' && !Array.isArray(options)) {
    translated = i18next.t(key, options) as string;
  }
  // 否则作为位置参数处理 l10n 格式 {0}
  else if (options !== undefined) {
    translated = translated.replace(/\{0\}/g, String(options));
  }

  return translated;
}

// 注意：不再自动初始化，由各个入口文件显式调用 initI18n()
