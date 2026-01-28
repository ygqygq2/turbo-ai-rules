/**
 * 测试常量配置
 * 统一管理测试超时、重试次数等配置
 */

/**
 * @description 测试超时时间（毫秒）
 */
export const TEST_TIMEOUTS = {
  /** 短操作：配置读取、Mock设置等 */
  SHORT: 5000,
  /** 中等操作：命令执行、状态更新等 */
  MEDIUM: 30000,
  /** 长操作：同步规则、Git克隆等 */
  LONG: 120000,
  /** 超长操作：完整的端到端测试流程 */
  EXTRA_LONG: 180000,
} as const;

/**
 * @description 测试等待延迟（毫秒）
 */
export const TEST_DELAYS = {
  /** 极短延迟：状态更新后的快速检查 */
  TINY: 100,
  /** 短延迟：UI更新、配置变更等 */
  SHORT: 500,
  /** 中延迟：命令执行后的状态稳定 */
  MEDIUM: 1000,
  /** 长延迟：规则同步、文件生成等 */
  LONG: 2000,
  /** 超长延迟：Git操作、大量文件生成 */
  EXTRA_LONG: 5000,
} as const;

/**
 * @description 重试配置
 */
export const TEST_RETRY = {
  /** 默认最大重试次数 */
  MAX_RETRIES: 5,
  /** 快速重试次数（轻量操作） */
  QUICK_RETRIES: 3,
  /** 重试间隔时间（毫秒） */
  RETRY_DELAY: 1000,
  /** 快速重试间隔（毫秒） */
  QUICK_RETRY_DELAY: 500,
} as const;

/**
 * @description 测试调试配置
 * 通过环境变量 TEST_DEBUG=1 启用详细日志
 */
export const TEST_DEBUG = {
  /** 是否启用详细调试日志 */
  ENABLED: process.env.TEST_DEBUG === '1' || process.env.TEST_DEBUG === 'true',
  /** 详细程度：silent（静默）| minimal（最少）| verbose（详细） */
  LEVEL: (process.env.TEST_DEBUG_LEVEL || 'minimal') as 'silent' | 'minimal' | 'verbose',
} as const;

/**
 * @description 测试工作区名称
 */
export const TEST_WORKSPACES = {
  CURSOR: 'Test: Cursor Adapter',
  USER_PROTECTION: 'Test: Multi-Adapter + User Protection',
  MULTI_SOURCE: 'Test: Multi Source',
  CUSTOM_ADAPTERS: 'rules-for-custom-adapters',
  SKILLS: 'Test: Skills Adapter',
} as const;
