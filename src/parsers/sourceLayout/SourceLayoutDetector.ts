import * as fs from 'fs-extra';
import * as path from 'path';

import {
  LEGACY_ROOT_DIRS,
  splitNormalizedDirectoryParts,
  splitRawDirectoryParts,
  TYPE_FIRST_ROOT_DIRS,
} from './shared';
import type { SourceLayout } from './types';

export class SourceLayoutDetector {
  public static async detect(dirPath: string): Promise<SourceLayout> {
    const layoutFromPath = this.detectFromPath(dirPath);
    if (layoutFromPath !== 'unknown') {
      return layoutFromPath;
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const directoryNames = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name.toLowerCase());

      if (directoryNames.some((name) => TYPE_FIRST_ROOT_DIRS.has(name))) {
        return 'type-first';
      }

      if (directoryNames.some((name) => LEGACY_ROOT_DIRS.has(name))) {
        return 'legacy-mixed';
      }
    } catch {
      // ignore and fallback to unknown
    }

    return 'unknown';
  }

  public static detectFromPath(targetPath: string): SourceLayout {
    const rawParts = splitRawDirectoryParts(targetPath);
    const normalizedParts = splitNormalizedDirectoryParts(targetPath);

    if (rawParts.some((part) => LEGACY_ROOT_DIRS.has(part))) {
      return 'legacy-mixed';
    }

    if (normalizedParts.some((part) => TYPE_FIRST_ROOT_DIRS.has(part))) {
      return 'type-first';
    }

    const basename = path.basename(targetPath).toLowerCase();
    if (LEGACY_ROOT_DIRS.has(basename)) {
      return 'legacy-mixed';
    }
    if (TYPE_FIRST_ROOT_DIRS.has(basename)) {
      return 'type-first';
    }

    return 'unknown';
  }
}
