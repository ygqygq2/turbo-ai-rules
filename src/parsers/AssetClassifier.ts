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
import {
  classifyBySourceLayout,
  classifyStructuredBySourceLayout,
} from './sourceLayout/AssetClassificationStrategy';
import type { AssetClassifierOptions } from './sourceLayout/types';

export class AssetClassifier {
  // ─────────────────────────────────────────────────────────────────────
  // 公共 API
  // ─────────────────────────────────────────────────────────────────────

  /**
   * 根据文件路径（以及可选的 frontmatter）对单个文件进行分类。
   *
   * @param filePath - 文件的绝对或相对路径
   * @param frontmatter - 已解析的 frontmatter 键值对（可选）
   */
  static classifyFile(
    filePath: string,
    frontmatter?: Record<string, unknown>,
    options: AssetClassifierOptions = {},
  ): AssetKind {
    const sourceLayout = options.sourceLayout ?? 'unknown';
    const ext = path.extname(filePath).toLowerCase();

    // ── 1. 结构化格式（.json / .yaml / .yml）────────────────────────
    if (ext === '.json' || ext === '.yaml' || ext === '.yml') {
      return classifyStructuredBySourceLayout(filePath, sourceLayout);
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
    const dirKind = classifyBySourceLayout(filePath, sourceLayout);
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
}
