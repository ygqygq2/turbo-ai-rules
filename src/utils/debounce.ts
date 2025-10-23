/**
 * 防抖和节流工具函数
 */

/**
 * 防抖函数
 * @param fn 要防抖的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * 节流函数
 * @param fn 要节流的函数
 * @param delay 延迟时间（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();

    if (now - lastCall >= delay) {
      lastCall = now;
      fn.apply(this, args);
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(
        () => {
          lastCall = Date.now();
          fn.apply(this, args);
          timeoutId = null;
        },
        delay - (now - lastCall),
      );
    }
  };
}

/**
 * 异步防抖函数
 * @param fn 要防抖的异步函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的异步函数
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastPromise: Promise<ReturnType<T>> | null = null;

  return function (this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    lastPromise = new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await fn.apply(this, args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
        timeoutId = null;
      }, delay);
    });

    return lastPromise;
  };
}

/**
 * 异步节流函数
 * @param fn 要节流的异步函数
 * @param delay 延迟时间（毫秒）
 * @returns 节流后的异步函数
 */
export function throttleAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => Promise<ReturnType<T> | void> {
  let lastCall = 0;
  let pending: Promise<ReturnType<T>> | null = null;

  return async function (this: any, ...args: Parameters<T>): Promise<ReturnType<T> | void> {
    const now = Date.now();

    if (now - lastCall >= delay) {
      lastCall = now;
      pending = fn.apply(this, args);
      return pending;
    }

    // 如果在节流期间，返回上一次的 Promise
    return pending || Promise.resolve();
  };
}
