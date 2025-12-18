export class LockTimeoutError extends Error {
  override name = 'LockTimeoutError'
}

export interface CacheLock {
  acquire(): Promise<boolean>
  release(): Promise<void>
  block<T>(
    seconds: number,
    callback: () => Promise<T> | T,
    options?: { sleepMillis?: number }
  ): Promise<T>
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
