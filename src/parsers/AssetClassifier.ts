/**
 * 资产分类器 (v3)
 *
 * 根据文件路径、文件名和可选的 frontmatter 数据，将文件分类为 AssetKind，
 * 并确定其 AssetFormat。
 *
 * 分类优先级（由高到低）：
 *   1. 文件扩展名（.json / .yaml / .yml → mcp / hook / unknown）
 *   2. 精确文件名匹配（SKILL.md / CLAUDE.md / AGENTS.md 等）
 *   3. 文件名后缀模式（*.agent.md / *.prompt.md 等）
 *   4. 父目录名称（skills/ agents/ prompts/ commands/ hooks/）
 *   5. frontmatter 字段（applyTo → instruction，tools/agents → agent）
 *   6. 默认：rule
 */

import * as path from 'path';

import type { AssetFormat, AssetKind } from '../types/rules';

export class AssetClassifier {
  private static readonly NUMERIC_PREFIX_RE = /^\d+-/;

  // ─────────────────────────────────────────────────────────────────────
  // 公共 API
  // ─────────────────────────────────────────────────────────────────────

  /**
   * 根据文件路径（以及可选的 frontmatter）对单个文件进行分类。
   *
   * @param filePath - 文件的绝对或相对路径
   * @param frontmatter - 已解析的 frontmatter 键值对（可选）
   */
  static classifyFile(filePath: string, frontmatter?: Record<string, unknown>): AssetKind {
    const ext = path.extname(filePath).toLowerCase();

    // ── 1. 结构化格式（.json / .yaml / .yml）────────────────────────
    if (ext === '.json' || ext === '.yaml' || ext === '.yml') {
      return AssetClassifier.classifyStructuredFile(filePath);
    }

    const basename = path.basename(filePath);
    const basenameLC = basename.toLowerCase();
    const nameWithoutExt = path.basename(filePath, ext);
    const nameWithoutExtLC = nameWithoutExt.toLowerCase();

    // ── 2. 精确文件名匹配 ────────────────────────────────────────────
    if (basenameLC === 'skill.md') return 'skill';
    if (basenameLC === 'claude.md') return 'instruction';
    if (basenameLC === 'agents.md') return 'instruction';

    // ── 3. 文件名后缀模式（扩展名前的最后一段）────────────────────────
    if (nameWithoutExtLC.endsWith('.agent')) return 'agent';
    if (nameWithoutExtLC.endsWith('.prompt')) return 'prompt';
    if (nameWithoutExtLC.endsWith('.instructions')) return 'instruction';

    // ── 4. 父目录名称 ─────────────────────────────────────────────────
    const dirKind = AssetClassifier.classifyByDirectory(filePath);
    if (dirKind !== null) return dirKind;

    // ── 5. frontmatter 字段 ──────────────────────────────────────────
    if (frontmatter) {
      if (frontmatter['applyTo'] !== undefined) return 'instruction';
      if (frontmatter['tools'] !== undefined || frontmatter['agents'] !== undefined) {
        return 'agent';
      }
    }

    // ── 6. 默认 ──────────────────────────────────────────────────────
    // .mdc → rule；其他 .md → rule
    return 'rule';
  }

  /**
   * 判断一个目录是否为技能目录（含 SKILL.md）。
   *
   * @param hasSkillMd - 该目录是否含有 SKILL.md 文件
   */
  static classifyDirectory(hasSkillMd: boolean): AssetKind {
    return hasSkillMd ? 'skill' : 'unknown';
  }

  /**
   * 根据文件路径确定文件格式。
   */
  static getFormat(filePath: string): AssetFormat {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.md':
        return 'markdown';
      case '.mdc':
        return 'mdc';
      case '.json':
        return 'json';
      case '.yaml':
      case '.yml':
        return 'yaml';
      case '.sh':
        return 'text';
      default:
        return 'markdown';
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // 私有辅助方法
  // ─────────────────────────────────────────────────────────────────────

  /**
   * 对 .json / .yaml / .yml 文件按文件名和目录进行分类。
   */
  private static classifyStructuredFile(filePath: string): AssetKind {
    const basenameLC = path.basename(filePath).toLowerCase();

    // 已知 MCP 配置文件名
    if (basenameLC === 'mcp.json' || basenameLC === '.mcp.json') {
      return 'mcp';
    }

    // hooks 目录下的文件
    const normalizedDirParts = AssetClassifier.getNormalizedDirectoryParts(filePath);
    if (normalizedDirParts.includes('hooks') || normalizedDirParts.includes('hook')) {
      return 'hook';
    }

    return 'unknown';
  }

  /**
   * 根据规范化的父目录名称推导 AssetKind。
   * 返回 `null` 表示无法通过目录名确定。
   */
  private static classifyByDirectory(filePath: string): AssetKind | null {
    // 统一路径分隔符后逐段检查
    const parts = filePath.replace(/\\/g, '/').split('/');
    // 去掉最后一段（文件名本身）
    const dirParts = parts.slice(0, -1).map((p) => AssetClassifier.normalizeDirectoryToken(p));

    // 优先精确匹配直接父目录（最近一级）
    const parentDir = dirParts[dirParts.length - 1];
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
        return 'hook';
    }

    // 再检查任意祖先目录（处理深层嵌套与编号目录）
    if (dirParts.some((p) => p === 'skills' || p === 'skill')) return 'skill';
    if (dirParts.some((p) => p === 'agents' || p === 'agent')) return 'agent';
    if (dirParts.some((p) => p === 'prompts' || p === 'prompt')) return 'prompt';
    if (dirParts.some((p) => p === 'commands' || p === 'command')) return 'command';
    if (dirParts.some((p) => p === 'hooks' || p === 'hook')) return 'hook';

    return null;
  }

  private static normalizeDirectoryToken(token: string): string {
    return token.toLowerCase().replace(AssetClassifier.NUMERIC_PREFIX_RE, '');
  }

  private static getNormalizedDirectoryParts(filePath: string): string[] {
    return filePath
      .replace(/\\/g, '/')
      .split('/')
      .slice(0, -1)
      .map((part) => AssetClassifier.normalizeDirectoryToken(part));
  }
}
