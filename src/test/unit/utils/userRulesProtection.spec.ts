/**
 * userRulesProtection 新功能单元测试
 * 测试基于规则 ID 的保护逻辑
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ParsedRule } from '@/types/rules';
import type { UserRulesProtectionConfig } from '@/utils/userRulesProtection';
import {
  cleanDirectoryByRules,
  extractIdFromFilename,
  extractNumericPrefix,
  isUserDefinedRule,
  mergeRuleLists,
} from '@/utils/userRulesProtection';

describe('userRulesProtection - 基于规则 ID 的新功能', () => {
  const enabledConfig: UserRulesProtectionConfig = {
    enabled: true,
    userPrefixRange: { min: 80000, max: 99999 },
  };

  describe('extractNumericPrefix', () => {
    it('should extract numeric prefix from ID', () => {
      expect(extractNumericPrefix('85000')).toBe(85000);
      expect(extractNumericPrefix('85000-custom')).toBe(85000);
      expect(extractNumericPrefix('12345-test-rule')).toBe(12345);
    });

    it('should return null for non-numeric IDs', () => {
      expect(extractNumericPrefix('typescript')).toBeNull();
      expect(extractNumericPrefix('my-custom-rule')).toBeNull();
      expect(extractNumericPrefix('test-123')).toBeNull();
    });

    it('should handle edge cases', () => {
      expect(extractNumericPrefix('0')).toBe(0);
      expect(extractNumericPrefix('00001')).toBe(1);
      expect(extractNumericPrefix('99999')).toBe(99999);
    });
  });

  describe('extractIdFromFilename', () => {
    it('should extract ID from filename (kebab-case)', () => {
      expect(extractIdFromFilename('80000-custom.md')).toBe('80000-custom');
      expect(extractIdFromFilename('typescript-guide.mdc')).toBe('typescript-guide');
      expect(extractIdFromFilename('MyRules.md')).toBe('myrules');
    });

    it('should handle various file extensions', () => {
      expect(extractIdFromFilename('test.md')).toBe('test');
      expect(extractIdFromFilename('test.mdc')).toBe('test');
      expect(extractIdFromFilename('test.txt')).toBe('test');
    });

    it('should convert to kebab-case', () => {
      expect(extractIdFromFilename('My Custom Rule.md')).toBe('my-custom-rule');
      expect(extractIdFromFilename('Rule_With_Underscores.md')).toBe('rule-with-underscores');
    });
  });

  describe('isUserDefinedRule', () => {
    it('should identify user-defined rules by ID prefix', () => {
      const userRule: ParsedRule = {
        id: '85000-custom',
        title: 'Custom Rule',
        content: 'content',
        rawContent: 'raw',
        metadata: { id: '85000-custom' },
        sourceId: 'test',
        filePath: '/path/to/rule.md',
      };

      expect(isUserDefinedRule(userRule, enabledConfig)).toBe(true);
    });

    it('should NOT identify auto-generated rules', () => {
      const autoRule: ParsedRule = {
        id: '50000-auto',
        title: 'Auto Rule',
        content: 'content',
        rawContent: 'raw',
        metadata: { id: '50000-auto' },
        sourceId: 'test',
        filePath: '/path/to/rule.md',
      };

      expect(isUserDefinedRule(autoRule, enabledConfig)).toBe(false);
    });

    it('should handle numeric IDs', () => {
      const userRule: ParsedRule = {
        id: '85000',
        title: 'User Rule',
        content: 'content',
        rawContent: 'raw',
        metadata: { id: 85000 },
        sourceId: 'test',
        filePath: '/path/to/rule.md',
      };

      expect(isUserDefinedRule(userRule, enabledConfig)).toBe(true);
    });

    it('should handle non-numeric IDs', () => {
      const textRule: ParsedRule = {
        id: 'typescript-guide',
        title: 'TypeScript Guide',
        content: 'content',
        rawContent: 'raw',
        metadata: { id: 'typescript-guide' },
        sourceId: 'test',
        filePath: '/path/to/rule.md',
      };

      expect(isUserDefinedRule(textRule, enabledConfig)).toBe(false);
    });

    it('should respect config enabled flag', () => {
      const disabledConfig: UserRulesProtectionConfig = {
        enabled: false,
        userPrefixRange: { min: 80000, max: 99999 },
      };

      const userRule: ParsedRule = {
        id: '85000',
        title: 'Rule',
        content: 'content',
        rawContent: 'raw',
        metadata: { id: 85000 },
        sourceId: 'test',
        filePath: '/path/to/rule.md',
      };

      expect(isUserDefinedRule(userRule, disabledConfig)).toBe(false);
    });

    it('should handle custom prefix range', () => {
      const customConfig: UserRulesProtectionConfig = {
        enabled: true,
        userPrefixRange: { min: 90000, max: 95000 },
      };

      const rule1: ParsedRule = {
        id: '92000',
        title: 'Rule',
        content: '',
        rawContent: '',
        metadata: {},
        sourceId: 'test',
        filePath: '/path/to/rule.md',
      };

      const rule2: ParsedRule = {
        id: '85000',
        title: 'Rule',
        content: '',
        rawContent: '',
        metadata: {},
        sourceId: 'test',
        filePath: '/path/to/rule.md',
      };

      expect(isUserDefinedRule(rule1, customConfig)).toBe(true);
      expect(isUserDefinedRule(rule2, customConfig)).toBe(false);
    });
  });

  describe('mergeRuleLists', () => {
    it('should merge selected and protected rules without duplicates', () => {
      const selectedRules: ParsedRule[] = [
        {
          id: 'rule1',
          title: 'Rule 1',
          content: 'content1',
          rawContent: 'raw1',
          metadata: {},
          sourceId: 'source1',
          filePath: '/path/rule1.md',
        },
        {
          id: 'rule2',
          title: 'Rule 2',
          content: 'content2',
          rawContent: 'raw2',
          metadata: {},
          sourceId: 'source1',
          filePath: '/path/rule2.md',
        },
      ];

      const protectedRules: ParsedRule[] = [
        {
          id: '85000',
          title: 'Protected',
          content: 'protected',
          rawContent: 'raw_protected',
          metadata: {},
          sourceId: 'source2',
          filePath: '/path/protected.md',
        },
      ];

      const merged = mergeRuleLists(selectedRules, protectedRules);

      expect(merged).toHaveLength(3);
      expect(merged.map((r) => r.id)).toEqual(['rule1', 'rule2', '85000']);
    });

    it('should not duplicate rules with same ID', () => {
      const selectedRules: ParsedRule[] = [
        {
          id: 'rule1',
          title: 'Rule 1 Selected',
          content: 'selected',
          rawContent: 'raw_selected',
          metadata: {},
          sourceId: 'source1',
          filePath: '/path/rule1.md',
        },
      ];

      const protectedRules: ParsedRule[] = [
        {
          id: 'rule1',
          title: 'Rule 1 Protected',
          content: 'protected',
          rawContent: 'raw_protected',
          metadata: {},
          sourceId: 'source2',
          filePath: '/path/rule1.md',
        },
      ];

      const merged = mergeRuleLists(selectedRules, protectedRules);

      expect(merged).toHaveLength(1);
      expect(merged[0].title).toBe('Rule 1 Selected'); // 选中的优先
    });

    it('should handle empty lists', () => {
      const selected: ParsedRule[] = [];
      const protected_: ParsedRule[] = [];

      expect(mergeRuleLists(selected, protected_)).toEqual([]);
    });
  });

  describe('cleanDirectoryByRules', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'turbo-ai-rules-test-'));
    });

    afterEach(() => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should delete unselected files', async () => {
      // 创建测试文件
      fs.writeFileSync(path.join(tempDir, '10000-auto.md'), 'auto rule');
      fs.writeFileSync(path.join(tempDir, '20000-another.md'), 'another rule');
      fs.writeFileSync(path.join(tempDir, '30000-selected.md'), 'selected rule');

      const rules: ParsedRule[] = [
        {
          id: '30000-selected',
          title: 'Selected',
          content: '',
          rawContent: '',
          metadata: {},
          sourceId: 'test',
          filePath: '/path/30000-selected.md',
        },
      ];

      const result = await cleanDirectoryByRules(tempDir, rules, enabledConfig);

      expect(result.deleted).toHaveLength(2);
      expect(result.deleted).toContain('10000-auto.md');
      expect(result.deleted).toContain('20000-another.md');
      expect(result.kept).toContain('30000-selected.md');
      expect(fs.existsSync(path.join(tempDir, '30000-selected.md'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, '10000-auto.md'))).toBe(false);
    });

    it('should protect user-defined files', async () => {
      fs.writeFileSync(path.join(tempDir, '85000-user.md'), 'user rule');
      fs.writeFileSync(path.join(tempDir, '10000-auto.md'), 'auto rule');

      const rules: ParsedRule[] = []; // 没有选中任何规则

      const result = await cleanDirectoryByRules(tempDir, rules, enabledConfig);

      expect(result.deleted).toHaveLength(1);
      expect(result.deleted).toContain('10000-auto.md');
      expect(result.protectedFiles).toHaveLength(1);
      expect(result.protectedFiles).toContain('85000-user.md');
      expect(fs.existsSync(path.join(tempDir, '85000-user.md'))).toBe(true);
    });

    it('should skip non-rule files', async () => {
      fs.writeFileSync(path.join(tempDir, 'README.md'), 'readme');
      fs.writeFileSync(path.join(tempDir, 'config.json'), '{}');
      fs.writeFileSync(path.join(tempDir, '10000-rule.md'), 'rule');

      const rules: ParsedRule[] = [];

      const result = await cleanDirectoryByRules(tempDir, rules, enabledConfig);

      // README.md 匹配 .md 后缀，会被删除（因为不在规则列表中）
      expect(result.deleted).toContain('README.md');
      expect(result.kept).toContain('config.json');
      expect(result.deleted).toContain('10000-rule.md');
    });

    it('should handle non-existent directory', async () => {
      const nonExistentDir = path.join(tempDir, 'does-not-exist');
      const result = await cleanDirectoryByRules(nonExistentDir, [], enabledConfig);

      expect(result.deleted).toHaveLength(0);
      expect(result.kept).toHaveLength(0);
      expect(result.protectedFiles).toHaveLength(0);
    });

    it('should handle directories inside target directory', async () => {
      fs.mkdirSync(path.join(tempDir, 'subdir'));
      fs.writeFileSync(path.join(tempDir, '10000-rule.md'), 'rule');

      const rules: ParsedRule[] = [];

      const result = await cleanDirectoryByRules(tempDir, rules, enabledConfig);

      expect(result.kept).toContain('subdir');
      expect(result.deleted).toContain('10000-rule.md');
    });
  });
});
