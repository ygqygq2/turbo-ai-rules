/**
 * i18next 国际化配置（后端）
 */

import * as fs from 'fs';
import i18next from 'i18next';
import * as path from 'path';
import * as vscode from 'vscode';

export async function initI18n(context: vscode.ExtensionContext): Promise<void> {
  const vscodeLocale = vscode.env.language;
  const locale = normalizeLocale(vscodeLocale);

  const l10nDir = path.join(context.extensionPath, 'l10n');
  const enPath = path.join(l10nDir, 'bundle.l10n.json');
  const zhPath = path.join(l10nDir, 'bundle.l10n.zh-cn.json');

  const enTranslations = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
  const zhTranslations = JSON.parse(fs.readFileSync(zhPath, 'utf-8'));

  await i18next.init({
    lng: locale,
    fallbackLng: 'en',
    debug: false,
    resources: {
      en: { translation: enTranslations },
      zh: { translation: zhTranslations },
      'zh-cn': { translation: zhTranslations },
      'zh-CN': { translation: zhTranslations },
    },
    interpolation: { escapeValue: false },
  });
}

function normalizeLocale(locale: string): string {
  const normalized = locale.toLowerCase();
  return normalized.startsWith('zh') ? 'zh' : 'en';
}

/**
 * @description 翻译函数（支持 l10n 格式 {0}, {1} 和 i18next 格式 {{key}}）
 * @return default {string}
 * @param key {string} - 翻译键
 * @param args {any} - 可以是数组（l10n 格式）或对象（i18next 格式）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function t(key: string, ...args: any[]): string {
  let translated = i18next.t(key) as string;

  // 如果翻译键不存在或返回空值，返回键本身
  if (!translated) {
    return key;
  }

  // 如果第一个参数是对象，使用 i18next 原生插值
  if (args.length > 0 && typeof args[0] === 'object' && !Array.isArray(args[0])) {
    translated = i18next.t(key, args[0]) as string;
  }
  // 否则使用 l10n 格式 {0}, {1}, {2}...
  else if (args.length > 0) {
    args.forEach((arg, index) => {
      translated = translated.replace(new RegExp(`\\{${index}\\}`, 'g'), String(arg));
    });
  }

  return translated;
}

export async function changeLanguage(locale: string): Promise<void> {
  const normalized = normalizeLocale(locale);
  await i18next.changeLanguage(normalized);
}

export function getCurrentLanguage(): string {
  return i18next.language;
}

export { i18next };
