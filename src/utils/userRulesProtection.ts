/**
 * User Rules Protection Utilities
 *
 * Provides functions to protect user-defined rules from being overwritten
 * during sync operations. Supports two modes:
 * 1. Directory mode: Rule ID prefix protection (80000-99999 range)
 * 2. Single-file mode: Block marker protection
 */

import * as fs from 'fs';
import * as path from 'path';

import type { ParsedRule } from '../types/rules';
import { Logger } from './logger';

/**
 * Block marker constants for single-file mode
 */
export const BLOCK_MARKERS = {
  begin: '<!-- TURBO-AI-RULES:BEGIN -->',
  end: '<!-- TURBO-AI-RULES:END -->',
} as const;

/**
 * Default prefix ranges for directory mode
 */
export const PREFIX_RANGES = {
  AUTO_MIN: 0,
  AUTO_MAX: 79999,
  USER_MIN: 80000,
  USER_MAX: 99999,
} as const;

/**
 * Configuration for user rules protection
 */
export interface UserRulesProtectionConfig {
  /**
   * Enable user rules protection
   */
  enabled: boolean;

  /**
   * User-defined prefix range (for directory mode)
   * @default { min: 800, max: 999 }
   */
  userPrefixRange?: {
    min: number;
    max: number;
  };

  /**
   * Custom block markers (for single-file mode)
   */
  blockMarkers?: {
    begin: string;
    end: string;
  };
}

/**
 * Extract numeric prefix from rule ID or filename
 * @example
 * extractNumericPrefix("85000") => 85000
 * extractNumericPrefix("85000-custom") => 85000
 * extractNumericPrefix("typescript") => null
 */
export function extractNumericPrefix(id: string): number | null {
  const match = id.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Extract ID from filename (same logic as MdcParser)
 * @param filePath - File path
 * @returns ID extracted from filename
 * @example
 * extractIdFromFilename("80000-custom.md") => "80000-custom"
 * extractIdFromFilename("typescript-guide.mdc") => "typescript-guide"
 */
export function extractIdFromFilename(filePath: string): string {
  const filename = path.basename(filePath, path.extname(filePath));
  // Convert to kebab-case (same as MdcParser)
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Check if a rule is user-defined (based on rule ID)
 * @param rule - Parsed rule
 * @param config - Protection configuration
 * @returns true if the rule is user-defined
 *
 * @example
 * isUserDefinedRule({ id: "85000", ... }) => true
 * isUserDefinedRule({ id: "85000-custom", ... }) => true
 * isUserDefinedRule({ id: "typescript", ... }) => false
 * isUserDefinedRule({ id: "79999", ... }) => false
 */
export function isUserDefinedRule(rule: ParsedRule, config: UserRulesProtectionConfig): boolean {
  if (!config.enabled) {
    return false;
  }

  const prefix = extractNumericPrefix(rule.id);
  if (prefix === null) {
    return false; // No numeric prefix, not a user rule
  }

  const range = config.userPrefixRange || {
    min: PREFIX_RANGES.USER_MIN,
    max: PREFIX_RANGES.USER_MAX,
  };

  return prefix >= range.min && prefix <= range.max;
}

/**
 * Merge selected rules with protected rules (deduplication by rule ID)
 * @param selectedRules - Rules selected for generation
 * @param protectedRules - User-defined rules to protect
 * @returns Merged rules list without duplicates
 */
export function mergeRuleLists(
  selectedRules: ParsedRule[],
  protectedRules: ParsedRule[],
): ParsedRule[] {
  const ruleMap = new Map<string, ParsedRule>();

  // Add selected rules first
  for (const rule of selectedRules) {
    ruleMap.set(rule.id, rule);
  }

  // Add protected rules (don't override selected ones)
  for (const rule of protectedRules) {
    if (!ruleMap.has(rule.id)) {
      ruleMap.set(rule.id, rule);
    }
  }

  return Array.from(ruleMap.values());
}

/**
 * Extract user content from a file with block markers (single-file mode)
 * @param content - The file content
 * @param config - Protection configuration
 * @returns Object with autoContent (inside blocks) and userContent (outside blocks)
 *
 * @example
 * const { userContent } = extractUserContent(fileContent);
 * // Returns content outside <!-- TURBO-AI-RULES:BEGIN/END --> blocks
 */
export function extractUserContent(
  content: string,
  config: UserRulesProtectionConfig,
): { autoContent: string; userContent: string } {
  const markers = config.blockMarkers || BLOCK_MARKERS;

  // Escape special regex characters in markers
  const beginMarker = markers.begin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const endMarker = markers.end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Match everything between BEGIN and END markers (including markers)
  const blockRegex = new RegExp(`${beginMarker}[\\s\\S]*?${endMarker}`, 'g');

  // Extract auto-generated content (inside blocks)
  const autoMatches = content.match(blockRegex) || [];
  const autoContent = autoMatches.join('\n\n');

  // Extract user content (outside blocks)
  const userContent = content.replace(blockRegex, '').trim();

  return { autoContent, userContent };
}

/**
 * Merge auto-generated content with user content (single-file mode)
 * @param autoContent - Auto-generated content (will be wrapped in block markers)
 * @param userContent - User-defined content
 * @param config - Protection configuration
 * @returns Merged content with block markers
 */
export function mergeContent(
  autoContent: string,
  userContent: string,
  config: UserRulesProtectionConfig,
): string {
  const markers = config.blockMarkers || BLOCK_MARKERS;

  // Wrap auto-generated content with markers and metadata
  const wrappedAutoContent = [
    markers.begin,
    `<!-- Generated by Turbo AI Rules at ${new Date().toISOString()} -->`,
    `<!-- ⚠️  WARNING: Auto-generated content - Will be overwritten on sync -->`,
    `<!-- ⚠️  警告：自动生成内容 - 同步时会被覆盖 -->`,
    '',
    autoContent,
    '',
    markers.end,
  ].join('\n');

  // If user content exists, append it after the auto-generated block
  if (userContent) {
    return `${wrappedAutoContent}\n\n${userContent}`;
  }

  // No user content: just return the wrapped auto-generated content
  return wrappedAutoContent;
}

/**
 * Clean directory by removing files not in the rules list
 * @param dirPath - Directory path to clean
 * @param rules - Rules that should be kept
 * @param config - Protection configuration
 * @returns Object with deleted and kept file lists
 */
export async function cleanDirectoryByRules(
  dirPath: string,
  rules: ParsedRule[],
  config: UserRulesProtectionConfig,
): Promise<{ deleted: string[]; kept: string[]; protectedFiles: string[] }> {
  if (!fs.existsSync(dirPath)) {
    Logger.debug('Directory does not exist, skipping cleanup', { dirPath });
    return { deleted: [], kept: [], protectedFiles: [] };
  }

  const existingFiles = fs.readdirSync(dirPath, { withFileTypes: true });

  // Build a set of filenames that should be kept (use basename from rule.filePath)
  const shouldKeepFilenames = new Set(rules.map((r) => path.basename(r.filePath)));

  const deleted: string[] = [];
  const kept: string[] = [];
  const protectedFiles: string[] = [];

  for (const dirent of existingFiles) {
    const fileName = dirent.name;
    const fullPath = path.join(dirPath, fileName);

    // Skip directories and non-rule files
    if (dirent.isDirectory() || !fileName.match(/\.(md|mdc)$/i)) {
      kept.push(fileName);
      continue;
    }

    // Check if filename is in the keep list
    if (shouldKeepFilenames.has(fileName)) {
      // File is in the keep list
      kept.push(fileName);
    } else {
      // Check if file is in user-defined range (double protection)
      const fileId = extractIdFromFilename(fileName);
      const prefix = extractNumericPrefix(fileId);
      const range = config.userPrefixRange || {
        min: PREFIX_RANGES.USER_MIN,
        max: PREFIX_RANGES.USER_MAX,
      };

      if (config.enabled && prefix !== null && prefix >= range.min && prefix <= range.max) {
        // User-defined file, skip deletion
        protectedFiles.push(fileName);
        Logger.warn('Protected user-defined file from deletion', { fileName, fileId, prefix });
      } else {
        // Safe to delete
        try {
          fs.unlinkSync(fullPath);
          deleted.push(fileName);
          Logger.info('Deleted unselected rule file', { fileName, fileId });
        } catch (error) {
          Logger.error('Failed to delete file', error as Error, { fileName });
        }
      }
    }
  }

  if (deleted.length > 0) {
    Logger.info('Directory cleanup completed', {
      deleted: deleted.length,
      kept: kept.length,
      protectedFiles: protectedFiles.length,
      dirPath,
    });
  }

  return { deleted, kept, protectedFiles };
}
