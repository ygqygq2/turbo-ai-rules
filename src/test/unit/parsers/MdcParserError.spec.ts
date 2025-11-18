import { describe, expect, it } from 'vitest';

import { MdcParser } from '../../../parsers/MdcParser';

describe('MdcParser Error Handling', () => {
  it('should throw error for invalid frontmatter', () => {
    const invalid = '---\ntitle: test\n---\n# missing closing';
    expect(() => MdcParser.parseMdcFile(invalid, 'f')).toThrow();
  });

  it('should throw error for missing title', () => {
    const noTitle = '---\n---\n# No title';
    expect(() => MdcParser.parseMdcFile(noTitle, 'f')).toThrow();
  });
});
