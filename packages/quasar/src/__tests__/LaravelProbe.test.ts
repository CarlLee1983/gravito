import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { LaravelProbe } from '../probes/LaravelProbe'

describe('LaravelProbe', () => {
  let mockRedis: any
  let probe: LaravelProbe

  beforeEach(() => {
    mockRedis = {
      llen: mock(() => Promise.resolve(5)),
      zcard: mock(() => Promise.resolve(2)),
      pipeline: mock(() => ({
        llen: mock(() => {}),
        zcard: mock(() => {}),
        exec: mock(() =>
          Promise.resolve([
            [null, 5],
            [null, 2],
            [null, 3],
          ])
        ),
      })),
    }
    probe = new LaravelProbe(mockRedis, 'default')
  })

  it('should return snapshot with correct metrics', async () => {
    const snapshot = await probe.getSnapshot()

    expect(snapshot.name).toBe('default')
    expect(snapshot.driver).toBe('laravel')
    expect(snapshot.size.waiting).toBe(5)
    expect(snapshot.size.active).toBe(2)
    expect(snapshot.size.delayed).toBe(3)
  })
})
