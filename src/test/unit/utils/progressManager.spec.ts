/**
 * @file ProgressManager 单元测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProgressManager, SubProgressManager } from '../../../utils/progressManager';

describe('ProgressManager', () => {
  let mockProgress: any;

  beforeEach(() => {
    mockProgress = {
      report: vi.fn(),
    };
  });

  describe('基本进度报告', () => {
    it('应该正确报告进度增量', () => {
      const pm = new ProgressManager({ progress: mockProgress });

      pm.report(10, 'Step 1');
      expect(mockProgress.report).toHaveBeenCalledWith({
        message: 'Step 1',
        increment: 10,
      });
      expect(pm.getCurrentProgress()).toBe(10);

      pm.report(20, 'Step 2');
      expect(mockProgress.report).toHaveBeenCalledWith({
        message: 'Step 2',
        increment: 20,
      });
      expect(pm.getCurrentProgress()).toBe(30);
    });

    it('应该防止进度超过 100%', () => {
      const pm = new ProgressManager({ progress: mockProgress });

      pm.report(90);
      expect(pm.getCurrentProgress()).toBe(90);

      pm.report(20); // 尝试超过 100%
      expect(mockProgress.report).toHaveBeenLastCalledWith({
        increment: 10, // 应该被限制为 10
        message: undefined,
      });
      expect(pm.getCurrentProgress()).toBe(100);
    });

    it('应该忽略已达到 100% 后的进度报告', () => {
      const pm = new ProgressManager({ progress: mockProgress });

      pm.report(100);
      mockProgress.report.mockClear();

      pm.report(10); // 应该被忽略
      expect(mockProgress.report).not.toHaveBeenCalled();
      expect(pm.getCurrentProgress()).toBe(100);
    });
  });

  describe('自动步骤进度', () => {
    it('应该基于总步骤数自动计算增量', () => {
      const pm = new ProgressManager({ progress: mockProgress, totalSteps: 5 });

      pm.reportStep('Step 1');
      expect(mockProgress.report).toHaveBeenCalledWith({
        message: 'Step 1',
        increment: 20, // 100 / 5 = 20
      });

      pm.reportStep('Step 2');
      expect(pm.getCurrentProgress()).toBe(40);
    });

    it('未设置 totalSteps 时应该警告', () => {
      const pm = new ProgressManager({ progress: mockProgress });

      pm.reportStep('Step 1');
      // 不应该调用 report
      expect(mockProgress.report).not.toHaveBeenCalled();
    });
  });

  describe('绝对进度设置', () => {
    it('应该能够设置绝对进度值', () => {
      const pm = new ProgressManager({ progress: mockProgress });

      pm.setProgress(50, 'Half way');
      expect(pm.getCurrentProgress()).toBe(50);

      pm.setProgress(75, 'Three quarters');
      expect(pm.getCurrentProgress()).toBe(75);
    });

    it('应该防止设置超过 100% 的值', () => {
      const pm = new ProgressManager({ progress: mockProgress });

      pm.setProgress(150);
      expect(pm.getCurrentProgress()).toBe(100);
    });

    it('应该防止设置负值', () => {
      const pm = new ProgressManager({ progress: mockProgress });

      pm.setProgress(-10);
      expect(pm.getCurrentProgress()).toBe(0);
    });

    it('应该忽略向后设置进度', () => {
      const pm = new ProgressManager({ progress: mockProgress });

      pm.report(50);
      mockProgress.report.mockClear();

      pm.setProgress(30); // 向后设置，应该被忽略
      expect(mockProgress.report).not.toHaveBeenCalled();
      expect(pm.getCurrentProgress()).toBe(50);
    });
  });

  describe('确保完成', () => {
    it('应该将进度补齐到 100%', () => {
      const pm = new ProgressManager({ progress: mockProgress });

      pm.report(70);
      mockProgress.report.mockClear();

      pm.ensureComplete('Done');
      expect(mockProgress.report).toHaveBeenCalledWith({
        message: 'Done',
        increment: 30,
      });
      expect(pm.getCurrentProgress()).toBe(100);
    });

    it('已经是 100% 时不应该重复报告', () => {
      const pm = new ProgressManager({ progress: mockProgress });

      pm.report(100);
      mockProgress.report.mockClear();

      pm.ensureComplete('Done');
      expect(mockProgress.report).not.toHaveBeenCalled();
    });

    it('应该使用默认消息', () => {
      const pm = new ProgressManager({ progress: mockProgress });

      pm.report(80);
      mockProgress.report.mockClear();

      pm.ensureComplete();
      expect(mockProgress.report).toHaveBeenCalledWith({
        message: 'Completing...',
        increment: 20,
      });
    });
  });

  describe('工具方法', () => {
    it('getRemaining 应该返回剩余进度', () => {
      const pm = new ProgressManager({ progress: mockProgress });

      expect(pm.getRemaining()).toBe(100);

      pm.report(30);
      expect(pm.getRemaining()).toBe(70);

      pm.report(70);
      expect(pm.getRemaining()).toBe(0);
    });

    it('isComplete 应该正确判断是否完成', () => {
      const pm = new ProgressManager({ progress: mockProgress });

      expect(pm.isComplete()).toBe(false);

      pm.report(50);
      expect(pm.isComplete()).toBe(false);

      pm.report(50);
      expect(pm.isComplete()).toBe(true);
    });
  });

  describe('子进度管理器', () => {
    it('应该正确创建子进度管理器', () => {
      const pm = new ProgressManager({ progress: mockProgress });

      const subPm = pm.createSubProgress(50, 'Sub task');
      expect(subPm).toBeInstanceOf(SubProgressManager);
    });

    it('子进度应该正确映射到父进度', () => {
      const pm = new ProgressManager({ progress: mockProgress });

      const subPm = pm.createSubProgress(50, 'Sub task');

      subPm.report(50, 'Half'); // 子任务的 50%
      expect(pm.getCurrentProgress()).toBe(25); // 父任务的 25% (50% * 50%)

      subPm.report(50, 'Done'); // 子任务的剩余 50%
      expect(pm.getCurrentProgress()).toBe(50); // 父任务的 50%
    });

    it('子进度消息应该包含基础消息', () => {
      const pm = new ProgressManager({ progress: mockProgress });

      const subPm = pm.createSubProgress(50, 'Loading');

      subPm.report(50, 'Files');
      expect(mockProgress.report).toHaveBeenCalledWith({
        message: 'Loading: Files',
        increment: 25,
      });
    });

    it('子进度应该能够确保完成', () => {
      const pm = new ProgressManager({ progress: mockProgress });

      const subPm = pm.createSubProgress(60, 'Task');

      subPm.report(50);
      expect(pm.getCurrentProgress()).toBe(30); // 60% * 50%

      subPm.ensureComplete('Finished');
      expect(pm.getCurrentProgress()).toBe(60); // 完整的 60%
    });

    it('子进度不应该超过分配的额度', () => {
      const pm = new ProgressManager({ progress: mockProgress });

      const subPm = pm.createSubProgress(40, 'Task');

      subPm.report(100); // 子任务 100%
      expect(pm.getCurrentProgress()).toBe(40); // 父任务只增加 40%

      subPm.report(50); // 超过 100%，应该被忽略
      expect(pm.getCurrentProgress()).toBe(40);
    });
  });

  describe('实际使用场景', () => {
    it('应该正确处理复杂的同步流程', () => {
      const pm = new ProgressManager({ progress: mockProgress });

      // 初始化 (5%)
      pm.report(5, 'Initializing...');
      expect(pm.getCurrentProgress()).toBe(5);

      // 同步 3 个源 (75%)
      const progressPerSource = 75 / 3;
      pm.report(progressPerSource, 'Source 1');
      pm.report(progressPerSource, 'Source 2');
      pm.report(progressPerSource, 'Source 3');
      expect(pm.getCurrentProgress()).toBe(80);

      // 保存索引 (10%)
      pm.report(10, 'Saving index...');
      expect(pm.getCurrentProgress()).toBe(90);

      // 生成配置 (10%)
      pm.report(10, 'Generating configs...');
      expect(pm.getCurrentProgress()).toBe(100);

      // 确保完成（应该不再报告）
      mockProgress.report.mockClear();
      pm.ensureComplete();
      expect(mockProgress.report).not.toHaveBeenCalled();
    });

    it('应该处理提前结束的情况', () => {
      const pm = new ProgressManager({ progress: mockProgress });

      pm.report(30, 'Step 1');
      pm.report(20, 'Step 2');
      // 假设出现错误，直接结束

      expect(pm.getCurrentProgress()).toBe(50);

      pm.ensureComplete('Error occurred');
      expect(mockProgress.report).toHaveBeenCalledWith({
        message: 'Error occurred',
        increment: 50,
      });
      expect(pm.getCurrentProgress()).toBe(100);
    });
  });
});
