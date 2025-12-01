/**
 * Webview 国际化工具
 * 支持中英双语
 * 直接使用 l10n JSON 文件，避免重复维护
 */

import enTranslations from '../../../l10n/bundle.l10n.json';
import zhTranslations from '../../../l10n/bundle.l10n.zh-cn.json';

// 翻译字典（直接从 l10n JSON 导入）
const translations: Record<string, Record<string, string>> = {
  en: enTranslations as Record<string, string>,
  'zh-cn': zhTranslations as Record<string, string>,
};

// 当前语言（默认英文，由 VSCode 环境变量决定）
let currentLocale: 'en' | 'zh-cn' = 'en';

/**
 * @description 设置当前语言
 * @param locale {string} - 语言代码
 */
export function setLocale(locale: string): void {
  const normalizedLocale = locale.toLowerCase();
  if (normalizedLocale === 'zh-cn' || normalizedLocale === 'zh') {
    currentLocale = 'zh-cn';
  } else {
    currentLocale = 'en';
  }
}

/**
 * @description 获取当前语言
 * @return default {string}
 */
export function getLocale(): string {
  return currentLocale;
}

/**
 * @description 获取翻译文本
 * 支持层级化 key (如 'welcome.title') 和句子 key (如 'No sources configured')
 * 支持位置参数 {0}, {1} 和命名参数 {name}, {count}
 * @return default {string}
 * @param key {string} - 翻译键
 * @param args {...(string | number | Record<string, string | number>)[]} - 格式化参数
 */
export function t(
  key: string,
  ...args: (string | number | Record<string, string | number>)[]
): string {
  const dict = translations[currentLocale] || translations.en;
  let text = dict[key] || key;

  // 支持命名占位符 {name}, {count} 等
  if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
    const params = args[0] as Record<string, string | number>;
    Object.keys(params).forEach((paramKey) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(params[paramKey]));
    });
  } else {
    // 支持 {0}, {1} 等位置占位符
    args.forEach((arg, index) => {
      if (typeof arg !== 'object') {
        text = text.replace(`{${index}}`, String(arg));
      }
    });
  }

  return text;
}

/**
 * @description 初始化国际化（从环境变量读取语言）
 * @return default {void}
 */
export function initI18n(): void {
  // VSCode 会通过 navigator.language 提供语言信息
  if (typeof navigator !== 'undefined') {
    setLocale(navigator.language);
  }
}

// 自动初始化
if (typeof window !== 'undefined') {
  initI18n();
}
