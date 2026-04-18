import * as path from 'path';

import type { AssetKind } from '../../types/rules';
import {
  normalizeDirectoryToken,
  splitNormalizedDirectoryParts,
  splitRawDirectoryParts,
  TYPE_FIRST_ROOT_DIRS,
} from './shared';
import type { SourceLayout } from './types';

function classifyStructuredFile(filePath: string, sourceLayout: SourceLayout): AssetKind {
  const basenameLC = path.basename(filePath).toLowerCase();
  const normalizedDirParts = splitNormalizedDirectoryParts(path.dirname(filePath));

  if (basenameLC === 'mcp.json' || basenameLC === '.mcp.json') {
    return 'mcp';
  }

  if (normalizedDirParts.includes('mcp')) {
    return 'mcp';
  }

  if (normalizedDirParts.includes('hooks') || normalizedDirParts.includes('hook')) {
    return 'hook';
  }

  if (sourceLayout === 'type-first' && normalizedDirParts.includes('rules')) {
    return 'rule';
  }

  return 'unknown';
}

function classifyTypeFirstDirectory(filePath: string): AssetKind | null {
  const rawDirParts = splitRawDirectoryParts(path.dirname(filePath));
  const normalizedDirParts = rawDirParts.map((part) => normalizeDirectoryToken(part));

  const typedRoot = normalizedDirParts.find((part) => TYPE_FIRST_ROOT_DIRS.has(part));
  if (typedRoot) {
    switch (typedRoot) {
      case 'rules':
        return 'rule';
      case 'skills':
        return 'skill';
      case 'agents':
        return 'agent';
      case 'prompts':
        return 'prompt';
      case 'commands':
        return 'command';
      case 'hooks':
        return 'hook';
      case 'mcp':
        return 'mcp';
      default:
        return null;
    }
  }

  const parentDir = normalizedDirParts[normalizedDirParts.length - 1];
  switch (parentDir) {
    case 'rules':
      return 'rule';
    case 'skills':
    case 'skill':
      return 'skill';
    case 'agents':
    case 'agent':
      return 'agent';
    case 'prompts':
    case 'prompt':
      return 'prompt';
    case 'commands':
    case 'command':
      return 'command';
    case 'hooks':
    case 'hook':
      return 'hook';
    case 'mcp':
      return 'mcp';
  }

  return null;
}

function classifyLegacyDirectory(filePath: string): AssetKind | null {
  const normalizedDirParts = splitNormalizedDirectoryParts(path.dirname(filePath));
  const parentDir = normalizedDirParts[normalizedDirParts.length - 1];

  switch (parentDir) {
    case 'skills':
    case 'skill':
      return 'skill';
    case 'agents':
    case 'agent':
      return 'agent';
    case 'prompts':
    case 'prompt':
      return 'prompt';
    case 'commands':
    case 'command':
      return 'command';
    case 'hooks':
    case 'hook':
      return 'hook';
    case 'mcp':
      return 'mcp';
    default:
      break;
  }

  if (normalizedDirParts.some((part) => part === 'skills' || part === 'skill')) return 'skill';
  if (normalizedDirParts.some((part) => part === 'agents' || part === 'agent')) return 'agent';
  if (normalizedDirParts.some((part) => part === 'prompts' || part === 'prompt')) return 'prompt';
  if (normalizedDirParts.some((part) => part === 'commands' || part === 'command')) {
    return 'command';
  }
  if (normalizedDirParts.some((part) => part === 'hooks' || part === 'hook')) return 'hook';
  if (normalizedDirParts.some((part) => part === 'mcp')) return 'mcp';

  return null;
}

export function classifyBySourceLayout(
  filePath: string,
  sourceLayout: SourceLayout,
): AssetKind | null {
  if (sourceLayout === 'type-first') {
    return classifyTypeFirstDirectory(filePath);
  }

  if (sourceLayout === 'legacy-mixed') {
    return classifyLegacyDirectory(filePath);
  }

  return classifyTypeFirstDirectory(filePath) ?? classifyLegacyDirectory(filePath);
}

export function classifyStructuredBySourceLayout(
  filePath: string,
  sourceLayout: SourceLayout,
): AssetKind {
  return classifyStructuredFile(filePath, sourceLayout);
}
