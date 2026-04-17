import { beforeAll, describe, expect, it } from 'vitest';

import { initI18n, setLocale, t } from '../../../webview/utils/i18n';

describe('webview i18n', () => {
  beforeAll(async () => {
    await initI18n();
    await setLocale('zh-CN');
  });

  it('should replace multiple positional placeholders', () => {
    expect(t('ruleSyncPage.footerInfo', 13, 6)).toBe('已选择 13 项内容将同步到 6 个适配器');
  });

  it('should keep object interpolation working', () => {
    expect(t('dashboard.sources.enabled', { enabled: 2, total: 5 })).toBe('已启用 2/5 个规则源');
  });
});
