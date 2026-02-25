import { describe, expect, it } from 'bun:test'
import { ConcurrencyGate } from '../../src/consumer/ConcurrencyGate'

describe('ConcurrencyGate', () => {
  // ─── 基本行為 ───────────────────────────────────────────────────

  it('should initialize with correct state', () => {
    const gate = new ConcurrencyGate(5)
    expect(gate.available).toBe(5)
    expect(gate.activeCount).toBe(0)
    expect(gate.waitingCount).toBe(0)
    expect(gate.concurrencyLimit).toBe(5)
  })

  it('should acquire and release correctly', async () => {
    const gate = new ConcurrencyGate(3)

    await gate.acquire()
    expect(gate.activeCount).toBe(1)
    expect(gate.available).toBe(2)

    await gate.acquire()
    expect(gate.activeCount).toBe(2)
    expect(gate.available).toBe(1)

    gate.release()
    expect(gate.activeCount).toBe(1)
    expect(gate.available).toBe(2)
  })

  it('should allow immediate acquire when under limit', async () => {
    const gate = new ConcurrencyGate(5)

    const start = Date.now()
    await gate.acquire()
    const elapsed = Date.now() - start

    // 應立即回傳，不應等待
    expect(elapsed).toBeLessThan(50)
  })

  // ─── 超限阻塞 ────────────────────────────────────────────────────

  it('should block when at capacity', async () => {
    const gate = new ConcurrencyGate(1)
    await gate.acquire() // 達到上限

    let acquired = false
    const acquirePromise = gate.acquire().then(() => {
      acquired = true
    })

    // 尚未 release，應被阻塞
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(acquired).toBe(false)
    expect(gate.waitingCount).toBe(1)

    // release 後應立即獲取
    gate.release()
    await acquirePromise
    expect(acquired).toBe(true)
  })

  it('should handle multiple waiters correctly', async () => {
    const gate = new ConcurrencyGate(2)
    await gate.acquire()
    await gate.acquire() // 達到上限

    const order: number[] = []

    const p1 = gate.acquire().then(() => order.push(1))
    const p2 = gate.acquire().then(() => order.push(2))
    const p3 = gate.acquire().then(() => order.push(3))

    expect(gate.waitingCount).toBe(3)

    // 逐一 release，應按 FIFO 順序喚醒
    gate.release()
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(order).toEqual([1])

    gate.release()
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(order).toEqual([1, 2])

    gate.release()
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(order).toEqual([1, 2, 3])

    await Promise.all([p1, p2, p3])
  })

  // ─── FIFO 喚醒順序 ─────────────────────────────────────────────

  it('should wake up waiters in FIFO order', async () => {
    const gate = new ConcurrencyGate(1)
    await gate.acquire()

    const wakeOrder: number[] = []
    const promises: Promise<void>[] = []

    for (let i = 0; i < 5; i++) {
      const idx = i
      promises.push(
        gate.acquire().then(() => {
          wakeOrder.push(idx)
          gate.release()
        })
      )
    }

    // 釋放第一個許可，觸發連鎖
    gate.release()
    await Promise.all(promises)

    expect(wakeOrder).toEqual([0, 1, 2, 3, 4])
  })

  // ─── 邊界情況 ────────────────────────────────────────────────────

  it('should throw when limit is negative', () => {
    expect(() => new ConcurrencyGate(-1)).toThrow()
  })

  it('should handle limit=0 (blocks all acquires)', async () => {
    const gate = new ConcurrencyGate(0)
    expect(gate.available).toBe(0)

    // limit=0 的情況下，所有 acquire 都會阻塞
    let acquired = false
    gate.acquire().then(() => {
      acquired = true
    })

    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(acquired).toBe(false)
    expect(gate.waitingCount).toBe(1)
  })

  it('should handle limit=1 correctly', async () => {
    const gate = new ConcurrencyGate(1)

    await gate.acquire()
    expect(gate.available).toBe(0)
    expect(gate.activeCount).toBe(1)

    gate.release()
    expect(gate.available).toBe(1)
    expect(gate.activeCount).toBe(0)
  })

  it('should be safe to call release without active', () => {
    const gate = new ConcurrencyGate(3)
    // 不應拋出錯誤
    expect(() => gate.release()).not.toThrow()
    expect(gate.activeCount).toBe(0)
  })

  it('should report correct available count', async () => {
    const gate = new ConcurrencyGate(5)

    await gate.acquire()
    await gate.acquire()
    await gate.acquire()

    expect(gate.available).toBe(2)
    expect(gate.activeCount).toBe(3)

    gate.release()
    expect(gate.available).toBe(3)
    expect(gate.activeCount).toBe(2)
  })

  // ─── 並發正確性 ──────────────────────────────────────────────────

  it('should not exceed concurrency limit under concurrent load', async () => {
    const gate = new ConcurrencyGate(3)
    let maxObservedActive = 0
    let currentActive = 0
    const promises: Promise<void>[] = []

    for (let i = 0; i < 10; i++) {
      promises.push(
        (async () => {
          await gate.acquire()
          currentActive++
          maxObservedActive = Math.max(maxObservedActive, currentActive)
          // 模擬工作
          await new Promise((resolve) => setTimeout(resolve, 5))
          currentActive--
          gate.release()
        })()
      )
    }

    await Promise.all(promises)
    expect(maxObservedActive).toBeLessThanOrEqual(3)
  })
})
