/**
 * WorkspaceDataManager 模块统一导出
 */

// 导出主类
export { WorkspaceDataManager } from './WorkspaceDataManager';

// 导出所有类型
export type {
  AdapterMappings,
  AdapterRuleMapping,
  ArtifactInfo,
  GenerationManifest,
  RuleIndexItem,
  RuleSelection,
  RuleSelections,
  RulesIndex,
  SearchIndex,
} from './types';

// 导出子管理器（供高级用户或测试使用）
export { AdapterMappingManager } from './AdapterMappingManager';
export { GenerationManifestManager } from './GenerationManifestManager';
export { RuleSelectionManager } from './RuleSelectionManager';
export { RulesIndexManager } from './RulesIndexManager';
export { SearchIndexManager } from './SearchIndexManager';
