/**
 * 通用规则适配器
 * 输出到 rules/<sourceId>/<ruleId>.md，保留原始格式
 */

import * as path from 'path';
import * as vscode from 'vscode';

import type { ParsedRule } from '../types/rules';
import { safeWriteFile } from '../utils/fileSystem';
import { Logger } from '../utils/logger';
import { BaseAdapter, GeneratedConfig } from './AIToolAdapter';

/**
 * 通用规则适配器
 * @deprecated 使用 CustomAdapter 或 PresetAdapter 替代
 */
export class RulesAdapter extends BaseAdapter {
  public readonly name: string = 'Generic Rules';
  public readonly enabled: boolean = true;

  protected getOutputType(): 'file' | 'directory' {
    return 'directory';
  }

  protected generateHeaderContent(_rules: ParsedRule[]): string {
    return '';
  }

  /**
   * 获取配置文件路径
   */
  public getFilePath(): string {
    return 'rules';
  }

  /**
   * 生成输出配置
   */
  public async generate(rules: ParsedRule[], _allRules?: ParsedRule[]): Promise<GeneratedConfig> {
    try {
      Logger.info('Generating rules output', { ruleCount: rules.length });

      const files: Map<string, string> = new Map();

      // 按源 ID 分组
      const rulesBySource = new Map<string, ParsedRule[]>();
      for (const rule of rules) {
        const sourceRules = rulesBySource.get(rule.sourceId) || [];
        sourceRules.push(rule);
        rulesBySource.set(rule.sourceId, sourceRules);
      }

      // 获取工作区根路径
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        throw new Error('No workspace folder found');
      }

      // 为每个源生成并写入规则文件
      for (const [sourceId, sourceRules] of rulesBySource) {
        for (const rule of sourceRules) {
          // 输出路径：rules/<sourceId>/<ruleId>.md
          const relativePath = path.join('rules', sourceId, `${rule.id}.md`);
          const absolutePath = path.join(workspaceRoot, relativePath);

          // 使用原始内容（包含 frontmatter）
          const fullContent = rule.rawContent;

          // 写入文件
          await safeWriteFile(absolutePath, fullContent);
          files.set(relativePath, fullContent);

          Logger.debug(`Written rule file: ${relativePath}`);
        }
      }

      // 生成并写入主文件：rules/index.md
      const indexContent = this.generateIndex(rulesBySource);
      const indexPath = path.join('rules', 'index.md');
      const indexAbsolutePath = path.join(workspaceRoot, indexPath);
      await safeWriteFile(indexAbsolutePath, indexContent);

      Logger.info('Rules output generated', {
        fileCount: files.size + 1,
        sourceCount: rulesBySource.size,
      });

      return {
        filePath: indexPath,
        content: indexContent,
        generatedAt: new Date(),
        ruleCount: rules.length,
      };
    } catch (error) {
      Logger.error('Failed to generate rules output', error as Error);
      throw error;
    }
  }

  /**
   * 生成索引文件
   */
  private generateIndex(rulesBySource: Map<string, ParsedRule[]>): string {
    const lines: string[] = [];

    lines.push('# Turbo AI Rules Index\n');
    lines.push(this.generateMetadata(Array.from(rulesBySource.values()).flat().length));

    for (const [sourceId, sourceRules] of rulesBySource) {
      lines.push(`## Source: ${sourceId}\n`);
      lines.push(`Total rules: ${sourceRules.length}\n`);

      for (const rule of sourceRules) {
        lines.push(`- [${rule.title}](./${sourceId}/${rule.id}.md)`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }
}
