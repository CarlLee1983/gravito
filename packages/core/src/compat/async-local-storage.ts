/**
 * Universal AsyncLocalStorage wrapper.
 * Automatically switches between node:async_hooks and a browser mock.
 */

let AsyncLocalStorageClass: any

// Use eval('require') to hide the dependency from bundlers like Vite
const tryGetNodeAsyncHooks = () => {
  try {
    if (
      typeof window === 'undefined' &&
      typeof process !== 'undefined' &&
      !(process as any).browser
    ) {
      // biome-ignore lint/security/noGlobalEval: specialized case for hiding node built-ins
      return eval('require')('node:async_hooks').AsyncLocalStorage
    }
  } catch (_e) {
    return null
  }
}

AsyncLocalStorageClass = tryGetNodeAsyncHooks()

if (!AsyncLocalStorageClass) {
  /**
   * Browser-safe AsyncLocalStorage mock
   */
  AsyncLocalStorageClass = class AsyncLocalStorage<T> {
    private store: T | null = null

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
      return this.store || undefined
    }

    disable(): void {
      this.store = null
    }
  }
}

// biome-ignore lint/suspicious/noExplicitAny: generic class mock
export const AsyncLocalStorage: { new <_T>(): any } = AsyncLocalStorageClass
