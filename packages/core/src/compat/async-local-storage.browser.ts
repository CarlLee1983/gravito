/**
 * Browser-safe AsyncLocalStorage mock
 */
export class AsyncLocalStorage<T> {
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
