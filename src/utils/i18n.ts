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
 * @description 翻译函数
 * @return default {string}
 * @param key {string}
 * @param args {any}
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function t(key: string, ...args: any[]): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (i18next.t as any)(key, ...args) as string;
}

export async function changeLanguage(locale: string): Promise<void> {
  const normalized = normalizeLocale(locale);
  await i18next.changeLanguage(normalized);
}

export function getCurrentLanguage(): string {
  return i18next.language;
}

export { i18next };
