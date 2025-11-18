import { describe, expect, it } from 'vitest';

import { GitManager } from '../../../services/GitManager';
import type { GitAuthentication } from '../../../types/config';

describe('GitManager Error Handling', () => {
  it('should return error for invalid connection', async () => {
    const manager = GitManager.getInstance();
    const auth: GitAuthentication = { type: 'none' };
    const result = await manager.testConnection('http://invalid-url-404', auth, 100);
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('should handle timeout error', async () => {
    const manager = GitManager.getInstance();
    const auth: GitAuthentication = { type: 'none' };
    const result = await manager.testConnection('https://github.com/delay-test', auth, 1);
    expect(result.success).toBe(false);
  });
});
