/// <reference path="./loadSourceDetailData.d.ts" />
import { Logger } from '../../utils/logger';
import { loadSourceDetailData } from './loadSourceDetailData.js';

export async function handleSourceDetailMessage(
  message: any,
  sourceId: string | undefined,
  context: any,
  provider: any,
) {
  try {
    switch (message.type) {
      case 'refresh': {
        // 只刷新数据
        const { source, sourceRules } = await loadSourceDetailData(sourceId, context);
        provider.postMessage({
          type: 'sourceData',
          payload: { source, rules: sourceRules },
        });
        break;
      }
      // 其他消息类型可继续拆分
      default:
        Logger.warn(`Unknown message type: ${message.type}`);
    }
  } catch (error) {
    Logger.error('Failed to handle webview message', error instanceof Error ? error : undefined);
    provider.postMessage({
      type: 'error',
      payload: { message: error instanceof Error ? error.message : 'Failed to handle action' },
    });
  }
}
