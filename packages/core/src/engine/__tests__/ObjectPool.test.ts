import { describe, expect, it, mock } from 'bun:test'
import { ObjectPool } from '../pool'

class TestObject {
  id: number
  active = true

  constructor(id: number) {
    this.id = id
  }

  reset() {
    this.active = false
  }
}

describe('ObjectPool', () => {
  it('should create new objects when empty', () => {
    let count = 0
    const factory = mock(() => new TestObject(++count))
    const reset = mock((obj: TestObject) => obj.reset())
    const pool = new ObjectPool(factory, reset)

    const obj1 = pool.acquire()
    expect(obj1.id).toBe(1)
    expect(factory).toHaveBeenCalledTimes(1)

    const obj2 = pool.acquire()
    expect(obj2.id).toBe(2)
    expect(factory).toHaveBeenCalledTimes(2)
  })

  it('should reuse released objects', () => {
    let count = 0
    const factory = () => new TestObject(++count)
    const reset = mock((obj: TestObject) => obj.reset())
    const pool = new ObjectPool(factory, reset)

    const obj1 = pool.acquire()
    pool.release(obj1)
    expect(reset).toHaveBeenCalledWith(obj1)
    expect(pool.size).toBe(1)

    const obj2 = pool.acquire()
    expect(obj2).toBe(obj1) // Should remain same instance
    expect(pool.size).toBe(0)
  })

  it('should respect max size', () => {
    const pool = new ObjectPool(
      () => new TestObject(0),
      (o) => o.reset(),
      2
    )

    const o1 = pool.acquire()
    const o2 = pool.acquire()
    const o3 = pool.acquire()

    pool.release(o1)
    expect(pool.size).toBe(1)

    pool.release(o2)
    expect(pool.size).toBe(2)

    pool.release(o3)
    expect(pool.size).toBe(2) // Should discard o3 because pool is full
  })

  it('should prewarm pool', () => {
    let count = 0
    const pool = new ObjectPool(
      () => new TestObject(++count),
      (o) => o.reset(),
      10
    )

    pool.prewarm(5)
    expect(pool.size).toBe(5)
    expect(count).toBe(5)

    const obj = pool.acquire()
    expect(obj.id).toBe(5) // LIFO
  })

  it('should clear pool', () => {
    const pool = new ObjectPool(
      () => new TestObject(0),
      (o) => o.reset(),
      10
    )
    pool.prewarm(5)
    expect(pool.size).toBe(5)

    pool.clear()
    expect(pool.size).toBe(0)
  })
})
