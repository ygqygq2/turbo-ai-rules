/**
 * 工作区数据管理服务（向后兼容导出）
 *
 * @deprecated 此文件已重构为模块化结构，请从 './WorkspaceDataManager/index' 导入
 * 为保持向后兼容，此文件将继续导出相同的 API
 */

// 从新的模块化结构导出所有类型和类
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
} from './WorkspaceDataManager/types';
export { WorkspaceDataManager } from './WorkspaceDataManager/WorkspaceDataManager';
