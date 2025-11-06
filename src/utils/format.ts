/**
 * @description 格式化字节数为可读字符串（保留两位小数）
 * @return default {string}
 * @param bytes {number}
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 Bytes';
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const sizeIndex = Math.min(i, sizes.length - 1);

  const value = bytes / Math.pow(k, sizeIndex);
  return `${parseFloat(value.toFixed(2))} ${sizes[sizeIndex]}`;
}
