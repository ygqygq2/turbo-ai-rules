import { PRESET_ADAPTERS } from '../adapters';
import type { CustomAdapterConfig } from '../types/config';

export interface SyncAdapterStats {
  targetAdapterCount: number;
  ruleAdapterCount: number;
  skillAdapterCount: number;
  totalSyncedSkills: number;
}

function isSkillAdapter(
  adapterId: string,
  customAdapters: CustomAdapterConfig[],
): boolean {
  const customAdapter = customAdapters.find((adapter) => adapter.id === adapterId);
  if (customAdapter) {
    return customAdapter.isRuleType === false;
  }

  const presetAdapter = PRESET_ADAPTERS.find((adapter) => adapter.id === adapterId);
  return presetAdapter?.isRuleType === false;
}

export function calculateTargetAdapterStats(
  targetAdapterIds: string[],
  customAdapters: CustomAdapterConfig[],
  selectedSkillAssetCount: number,
): SyncAdapterStats {
  const uniqueAdapterIds = Array.from(new Set(targetAdapterIds));

  let ruleAdapterCount = 0;
  let skillAdapterCount = 0;

  for (const adapterId of uniqueAdapterIds) {
    if (isSkillAdapter(adapterId, customAdapters)) {
      skillAdapterCount++;
    } else {
      ruleAdapterCount++;
    }
  }

  return {
    targetAdapterCount: uniqueAdapterIds.length,
    ruleAdapterCount,
    skillAdapterCount,
    totalSyncedSkills: selectedSkillAssetCount * skillAdapterCount,
  };
}
