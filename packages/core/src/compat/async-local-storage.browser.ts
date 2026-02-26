/**
 * Browser-safe AsyncLocalStorage mock
 */
export class AsyncLocalStorage<T> {
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
