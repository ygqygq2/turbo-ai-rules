import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { SourceLayoutDetector } from '../../../parsers/sourceLayout/SourceLayoutDetector';

describe('SourceLayoutDetector', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('should detect type-first layout from repository root and subpath', async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'turbo-ai-rules-type-first-'));
    tempDirs.push(rootDir);

    fs.mkdirSync(path.join(rootDir, 'rules'));
    fs.mkdirSync(path.join(rootDir, 'skills'));

    expect(await SourceLayoutDetector.detect(rootDir)).toBe('type-first');
    expect(SourceLayoutDetector.detectFromPath(path.join(rootDir, 'skills', '0001-demo'))).toBe(
      'type-first',
    );
  });

  it('should detect legacy mixed layout from repository root and subpath', async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'turbo-ai-rules-legacy-'));
    tempDirs.push(rootDir);

    fs.mkdirSync(path.join(rootDir, '1300-skills'));
    fs.mkdirSync(path.join(rootDir, '1700-hooks'));

    expect(await SourceLayoutDetector.detect(rootDir)).toBe('legacy-mixed');
    expect(
      SourceLayoutDetector.detectFromPath(path.join(rootDir, '1300-skills', '1301-demo-skill')),
    ).toBe('legacy-mixed');
  });
});
