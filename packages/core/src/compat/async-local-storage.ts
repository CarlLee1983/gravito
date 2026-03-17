/**
 * Universal AsyncLocalStorage wrapper.
 * Automatically switches between node:async_hooks and a browser mock.
 */

let AsyncLocalStorageClass: any

// Try to load Node.js AsyncLocalStorage
const tryGetNodeAsyncHooks = () => {
  try {
    if (
      typeof window === 'undefined' &&
      typeof process !== 'undefined' &&
      !(process as any).browser
    ) {
      // Try direct import for Bun/Node.js ESM compatibility
      try {
        const module = require('node:async_hooks')
        return module.AsyncLocalStorage
      } catch (_e1) {
        // Fallback to eval for CommonJS require hiding
        try {
          // biome-ignore lint/security/noGlobalEval: specialized case for hiding node built-ins
          return eval('require')('node:async_hooks').AsyncLocalStorage
        } catch (_e2) {
          return null
        }
      }
    }
  } catch (_e) {
    return null
  }
}

AsyncLocalStorageClass = tryGetNodeAsyncHooks()

if (!AsyncLocalStorageClass) {
  /**
   * Browser-safe AsyncLocalStorage mock.
   * Note: This mock only works with synchronous functions.
   * For proper async support, ensure Node.js AsyncLocalStorage is available.
   */
  AsyncLocalStorageClass = class AsyncLocalStorage<T> {
    private store: T | undefined

    run<R>(store: T, fn: () => R): R {
      const prev = this.store
      this.store = store
      try {
        return fn()
      } finally {
        this.store = prev
      }
    }

    getStore(): T | undefined {
      return this.store
    }

    disable(): void {
      this.store = undefined
    }
  }
}

// biome-ignore lint/suspicious/noExplicitAny: generic class mock
export const AsyncLocalStorage: { new <_T>(): any } = AsyncLocalStorageClass
