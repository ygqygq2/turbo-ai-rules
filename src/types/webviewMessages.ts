/**
 * Webview 消息类型定义（判别联合类型）
 * 所有 Webview 的消息类型统一定义在此文件
 */

// ==================== Welcome Page ====================
export type WelcomeMessage =
  | { type: 'ready' }
  | { type: 'addSource' }
  | { type: 'openTemplates'; payload: { template?: string } }
  | { type: 'selectRules'; payload: { checked?: boolean } }
  | { type: 'syncAndGenerate' }
  | { type: 'openAdvancedOptions' }
  | { type: 'syncRules' }
  | { type: 'generateConfigs' }
  | { type: 'useTemplate'; payload: { template?: string } }
  | { type: 'viewDocs' | 'openDocs' }
  | { type: 'getHelp' }
  | { type: 'dismiss' | 'dismissWelcome' }
  | { type: 'updateDontShowAgain'; payload: { checked?: boolean } };

// ==================== Source Manager ====================
export type SourceManagerMessage =
  | { type: 'ready' }
  | { type: 'refresh' }
  | { type: 'addSource' }
  | { type: 'editSource'; payload: { sourceId: string } }
  | { type: 'deleteSource'; payload: { sourceId: string } }
  | { type: 'toggleSource'; payload: { sourceId: string; enabled: boolean } }
  | { type: 'syncSource'; payload: { sourceId: string } }
  | { type: 'viewSourceDetail'; payload: { sourceId: string } };

// ==================== Source Detail ====================
export type SourceDetailMessage =
  | { type: 'ready' }
  | { type: 'loadSourceData'; payload: { sourceId: string } }
  | { type: 'addSource' }
  | { type: 'updateSource'; payload: { sourceId: string } }
  | { type: 'testConnection'; payload: { sourceId: string } }
  | { type: 'refresh' }
  | { type: 'syncSource'; payload: { sourceId: string } }
  | { type: 'editSource'; payload: { sourceId: string } }
  | { type: 'toggleSource'; payload: { sourceId: string; enabled: boolean } }
  | { type: 'deleteSource'; payload: { sourceId: string } }
  | { type: 'viewRule'; payload: { rulePath: string } }
  | { type: 'filterByTag' | 'searchRules' };

// ==================== Search Page ====================
export type SearchMessage =
  | { type: 'ready' }
  | { type: 'search'; payload: { criteria?: unknown } }
  | { type: 'viewRule'; payload: { ruleId: string } }
  | { type: 'selectRule'; payload: { ruleId: string } }
  | { type: 'selectRules'; payload: { ruleIds: string[] } }
  | { type: 'exportRules'; payload: { ruleIds: string[]; format: string } }
  | { type: 'clearSearch' };

// ==================== Rule Details ====================
export type RuleDetailsMessage =
  | { type: 'ready' }
  | { type: 'refresh' }
  | { type: 'filterByTag'; payload: { tag: string } }
  | { type: 'viewSource' }
  | { type: 'editRule' }
  | { type: 'copyRule' };

// ==================== Statistics ====================
export type StatisticsMessage =
  | { type: 'ready' }
  | { type: 'refresh' }
  | { type: 'filterByTag'; payload: { tag: string } }
  | { type: 'exportData' };

// ==================== Dashboard ====================
export type DashboardMessage =
  | { type: 'ready' }
  | { type: 'refresh' }
  | { type: 'addSource' }
  | { type: 'syncAll' }
  | { type: 'generateConfigs' }
  | { type: 'viewSource'; payload: { sourceId: string } }
  | { type: 'viewAdapter'; payload: { adapterId: string } }
  | { type: 'openSettings' };

// ==================== 联合所有消息类型 ====================
export type WebviewMessage =
  | WelcomeMessage
  | SourceManagerMessage
  | SourceDetailMessage
  | SearchMessage
  | RuleDetailsMessage
  | StatisticsMessage
  | DashboardMessage;

/**
 * 辅助类型：提取特定类型的 payload
 */
export type PayloadOf<T extends WebviewMessage, Type extends T['type']> =
  Extract<T, { type: Type }> extends { payload: infer P } ? P : never;

/**
 * 辅助类型：判断消息是否有 payload
 */
export type HasPayload<T extends WebviewMessage, Type extends T['type']> =
  Extract<T, { type: Type }> extends { payload: unknown } ? true : false;
