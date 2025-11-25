/**
 * @file 进度管理工具
 * @description 确保 VSCode withProgress 进度条始终达到 100% 后才消失
 */

import type * as vscode from 'vscode';

import { Logger } from './logger';

/**
 * 进度管理器配置
 */
export interface ProgressManagerOptions {
  /** 进度报告对象 */
  progress: vscode.Progress<{ message?: string; increment?: number }>;
  /** 总步骤数（可选，用于自动计算增量） */
  totalSteps?: number;
  /** 是否启用详细日志 */
  verbose?: boolean;
}

/**
 * 进度管理器
 *
 * 功能：
 * - 自动追踪当前进度
 * - 确保进度达到 100%
 * - 防止进度超过 100%
 * - 提供便捷的进度报告方法
 *
 * 使用示例：
 * ```typescript
 * await vscode.window.withProgress({ ... }, async (progress) => {
 *   const pm = new ProgressManager({ progress, totalSteps: 5 });
 *
 *   pm.report('Step 1'); // 自动计算增量 (20%)
 *   await doSomething();
 *
 *   pm.report('Step 2'); // 自动计算增量 (20%)
 *   await doSomethingElse();
 *
 *   pm.ensureComplete('Done'); // 确保达到 100%
 * });
 * ```
 */
export class ProgressManager {
  private currentProgress: number = 0;
  private readonly progress: vscode.Progress<{ message?: string; increment?: number }>;
  private readonly totalSteps?: number;
  private readonly stepIncrement?: number;
  private readonly verbose: boolean;
  private currentStep: number = 0;

  constructor(options: ProgressManagerOptions) {
    this.progress = options.progress;
    this.totalSteps = options.totalSteps;
    this.verbose = options.verbose ?? false;

    // 如果指定了总步骤数，计算每步的增量
    if (this.totalSteps && this.totalSteps > 0) {
      this.stepIncrement = 100 / this.totalSteps;
    }

    if (this.verbose) {
      Logger.debug('ProgressManager initialized', {
        totalSteps: this.totalSteps,
        stepIncrement: this.stepIncrement,
      });
    }
  }

  /**
   * 报告进度（自动计算增量）
   * @param message 进度消息
   */
  reportStep(message?: string): void {
    if (!this.stepIncrement) {
      Logger.warn('Cannot auto-report step: totalSteps not set');
      return;
    }

    this.currentStep++;
    this.report(this.stepIncrement, message);
  }

  /**
   * 报告进度（手动指定增量）
   * @param increment 进度增量 (0-100)
   * @param message 进度消息
   */
  report(increment: number, message?: string): void {
    // 防止进度超过 100%
    const remaining = 100 - this.currentProgress;
    const actualIncrement = Math.min(increment, remaining);

    if (actualIncrement > 0) {
      this.currentProgress += actualIncrement;
      this.progress.report({
        message,
        increment: actualIncrement,
      });

      if (this.verbose) {
        Logger.debug('Progress reported', {
          increment: actualIncrement,
          currentProgress: this.currentProgress,
          message,
        });
      }
    } else if (this.verbose) {
      Logger.debug('Progress report skipped (already at 100%)', {
        requestedIncrement: increment,
        currentProgress: this.currentProgress,
      });
    }
  }

  /**
   * 设置进度到指定值（绝对值）
   * @param value 目标进度值 (0-100)
   * @param message 进度消息
   */
  setProgress(value: number, message?: string): void {
    const targetValue = Math.min(100, Math.max(0, value));
    const increment = targetValue - this.currentProgress;

    if (increment > 0) {
      this.report(increment, message);
    }
  }

  /**
   * 确保进度达到 100%，并暂停 500ms 让用户看到完成状态
   * @param message 完成消息
   */
  async ensureComplete(message?: string): Promise<void> {
    const remaining = 100 - this.currentProgress;

    if (remaining > 0) {
      if (this.verbose) {
        Logger.debug('Ensuring progress completion', {
          currentProgress: this.currentProgress,
          remaining,
        });
      }

      this.progress.report({
        message: message || 'Completing...',
        increment: remaining,
      });

      this.currentProgress = 100;
    }

    // 暂停 500ms，让用户看到 100% 的进度条（提升用户体验）
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (this.verbose) {
      Logger.debug('Progress completed', {
        finalProgress: this.currentProgress,
        totalSteps: this.totalSteps,
        completedSteps: this.currentStep,
      });
    }
  }

  /**
   * 获取当前进度值
   */
  getCurrentProgress(): number {
    return this.currentProgress;
  }

  /**
   * 获取剩余进度
   */
  getRemaining(): number {
    return 100 - this.currentProgress;
  }

  /**
   * 检查是否已完成
   */
  isComplete(): boolean {
    return this.currentProgress >= 100;
  }

  /**
   * 创建子进度管理器（用于嵌套进度）
   * @param allocation 分配给子任务的进度百分比
   * @param message 子任务消息
   * @returns 子进度管理器
   */
  createSubProgress(allocation: number, message?: string): SubProgressManager {
    const remaining = this.getRemaining();
    const actualAllocation = Math.min(allocation, remaining);

    return new SubProgressManager(this, actualAllocation, message);
  }
}

/**
 * 子进度管理器
 * 用于管理嵌套的子任务进度
 */
export class SubProgressManager {
  private currentProgress: number = 0;
  private readonly parent: ProgressManager;
  private readonly allocation: number;
  private readonly baseMessage?: string;

  constructor(parent: ProgressManager, allocation: number, baseMessage?: string) {
    this.parent = parent;
    this.allocation = allocation;
    this.baseMessage = baseMessage;
  }

  /**
   * 报告子进度
   * @param increment 子进度增量 (0-100，相对于子任务)
   * @param message 进度消息
   */
  report(increment: number, message?: string): void {
    const remaining = 100 - this.currentProgress;
    const actualIncrement = Math.min(increment, remaining);

    if (actualIncrement > 0) {
      this.currentProgress += actualIncrement;

      // 转换为父进度的增量
      const parentIncrement = (actualIncrement / 100) * this.allocation;

      const fullMessage = this.baseMessage
        ? message
          ? `${this.baseMessage}: ${message}`
          : this.baseMessage
        : message;

      this.parent.report(parentIncrement, fullMessage);
    }
  }

  /**
   * 确保子进度完成
   */
  ensureComplete(message?: string): void {
    const remaining = 100 - this.currentProgress;
    if (remaining > 0) {
      this.report(remaining, message);
    }
  }

  /**
   * 获取当前子进度
   */
  getCurrentProgress(): number {
    return this.currentProgress;
  }
}
