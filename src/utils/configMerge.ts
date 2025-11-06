/**
 * 配置合并工具：用于处理 VS Code 配置中数组类型的显式合并
 * 规则：Folder > Workspace > Global，按顺序去重合并
 */

/**
 * 将多个数组按给定 key 去重合并，保持优先顺序（前面的优先级更高）
 * @param arrays 多个数组，按优先级从高到低传入
 * @param getKey 获取去重键的方法
 */
export function mergeArraysUnique<T>(
  arrays: Array<T[] | undefined>,
  getKey: (item: T) => string,
): T[] {
  const result: T[] = [];
  const seen = new Set<string>();
  for (const arr of arrays) {
    if (!arr || arr.length === 0) continue;
    for (const item of arr) {
      const key = getKey(item);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    }
  }
  return result;
}

/**
 * 基于 id 字段的数组合并（对象项需包含 id: string）
 * @param folder 子工作区级数组（最高优先级）
 * @param workspace 工作区级数组
 * @param global 全局级数组（最低优先级）
 */
export function mergeById<T extends { id: string }>(
  folder?: T[],
  workspace?: T[],
  global?: T[],
): T[] {
  return mergeArraysUnique<T>([folder, workspace, global], (x) => x.id);
}

/**
 * 基于字符串值去重的数组合并（如文件后缀列表等）
 */
export function mergeStrings(folder?: string[], workspace?: string[], global?: string[]): string[] {
  return mergeArraysUnique<string>([folder, workspace, global], (x) => x);
}
