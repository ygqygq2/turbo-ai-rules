/**
 * 工作区数据管理相关的类型定义
 */

/**
 * 规则索引数据
 */
export interface RulesIndex {
  version: number;
  workspacePath: string;
  lastUpdated: string;
  rules: RuleIndexItem[];
}

/**
 * 规则索引项（摘要信息）
 */
export interface RuleIndexItem {
  id: string;
  title: string;
  sourceId: string;
  tags: string[];
  priority: number;
  hash: string;
}

/**
 * 搜索索引数据
 */
export interface SearchIndex {
  version: number;
  lastUpdated: string;
  keywords: { [keyword: string]: string[] }; // keyword -> ruleIds
  tags: { [tag: string]: string[] }; // tag -> ruleIds
}

/**
 * 生成清单数据
 */
export interface GenerationManifest {
  version: number;
  workspacePath: string;
  lastGenerated: string;
  artifacts: ArtifactInfo[];
}

/**
 * 生成的文件信息
 */
export interface ArtifactInfo {
  path: string;
  sha256: string;
  size: number;
  policy: 'overwrite' | 'preserve' | 'merge' | 'backup';
  adapter: string;
  generatedAt: string;
}

/**
 * 规则选择配置
 */
export interface RuleSelection {
  paths: string[]; // 选中的规则路径（相对路径）
}

/**
 * 规则选择数据
 */
export interface RuleSelections {
  version: number;
  workspacePath: string;
  lastUpdated: string;
  selections: { [sourceId: string]: RuleSelection };
}

/**
 * 单个适配器的规则映射
 */
export interface AdapterRuleMapping {
  adapterId: string;
  selectedRules: string[]; // 格式：sourceId/relativePath
  lastSyncedAt?: string;
  autoSync: boolean;
}

/**
 * 适配器规则映射文件结构
 */
export interface AdapterMappings {
  version: number;
  workspacePath: string;
  lastUpdated: string;
  mappings: { [adapterId: string]: AdapterRuleMapping };
}
