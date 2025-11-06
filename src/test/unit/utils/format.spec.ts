import { describe, it, expect } from 'vitest';
import { formatBytes } from '../../../utils/format';

describe('utils/format.formatBytes', () => {
  it('returns 0 Bytes for zero and invalid', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
    expect(formatBytes(NaN as unknown as number)).toBe('0 Bytes');
    expect(formatBytes(-1)).toBe('0 Bytes');
  });

  it('formats bytes to KB/MB/GB correctly', () => {
    expect(formatBytes(1)).toBe('1 Bytes');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('keeps two decimals', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(10.5 * 1024 * 1024)).toBe('10.5 MB');
  });
});
