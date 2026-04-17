const NUMERIC_PREFIX_RE = /^\d+-/;

export const TYPE_FIRST_ROOT_DIRS = new Set([
  'rules',
  'skills',
  'agents',
  'prompts',
  'commands',
  'hooks',
  'mcp',
]);

export const LEGACY_ROOT_DIRS = new Set([
  '1300-skills',
  '1400-agents',
  '1500-prompts',
  '1600-commands',
  '1700-hooks',
  '1800-mcp',
]);

export function normalizeDirectoryToken(token: string): string {
  return token.toLowerCase().replace(NUMERIC_PREFIX_RE, '');
}

export function splitNormalizedDirectoryParts(targetPath: string): string[] {
  return targetPath
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .map((part) => normalizeDirectoryToken(part));
}

export function splitRawDirectoryParts(targetPath: string): string[] {
  return targetPath
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .map((part) => part.toLowerCase());
}
