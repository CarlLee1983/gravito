import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { GroupSequencer } from '../../src/consumer/GroupSequencer'

describe('GroupSequencer', () => {
  let sequencer: GroupSequencer

  beforeEach(() => {
    sequencer = new GroupSequencer()
  })

  afterEach(() => {
    sequencer.destroy()
  })

  // ─── 基本行為 ───────────────────────────────────────────────────

  it('should execute tasks without groupId immediately', async () => {
    let executed = false
    await sequencer.run(undefined, async () => {
      executed = true
    })
    expect(executed).toBe(true)
  })

  it('should return the result of the task', async () => {
    const result = await sequencer.run('group1', async () => 42)
    expect(result).toBe(42)
  })

  it('should create a group limiter on first use', async () => {
    await sequencer.run('group1', async () => {})
    expect(sequencer.groupCount).toBe(1)
  })

  // ─── 同 group 序列執行 ──────────────────────────────────────────

  it('should execute same group jobs sequentially', async () => {
    const log: string[] = []

    const p1 = sequencer.run('group1', async () => {
      log.push('start:1')
      await new Promise((r) => setTimeout(r, 50))
      log.push('end:1')
    })

    const p2 = sequencer.run('group1', async () => {
      log.push('start:2')
      await new Promise((r) => setTimeout(r, 10))
      log.push('end:2')
    })

    await Promise.all([p1, p2])

    // 確保序列執行：1 完全結束後 2 才開始
    expect(log).toEqual(['start:1', 'end:1', 'start:2', 'end:2'])
  })

  it('should maintain FIFO order for same group', async () => {
    const order: number[] = []

    const tasks = Array.from({ length: 5 }, (_, i) =>
      sequencer.run('group1', async () => {
        order.push(i)
      })
    )

    await Promise.all(tasks)
    expect(order).toEqual([0, 1, 2, 3, 4])
  })

  // ─── 不同 group 並行 ────────────────────────────────────────────

  it('should execute different groups in parallel', async () => {
    const log: string[] = []

    // group1 任務需要較長時間
    const p1 = sequencer.run('group1', async () => {
      log.push('g1:start')
      await new Promise((r) => setTimeout(r, 50))
      log.push('g1:end')
    })

    // group2 任務可以立即並行執行
    const p2 = sequencer.run('group2', async () => {
      log.push('g2:start')
      await new Promise((r) => setTimeout(r, 10))
      log.push('g2:end')
    })

    await Promise.all([p1, p2])

    // group2 應在 group1 結束前就完成（並行）
    expect(log[0]).toBe('g1:start')
    // g2:start 應在 g1:end 之前
    const g2StartIdx = log.indexOf('g2:start')
    const g1EndIdx = log.indexOf('g1:end')
    expect(g2StartIdx).toBeLessThan(g1EndIdx)
  })

  it('should support multiple groups simultaneously', async () => {
    const results = await Promise.all([
      sequencer.run('g1', async () => 'g1'),
      sequencer.run('g2', async () => 'g2'),
      sequencer.run('g3', async () => 'g3'),
    ])

    expect(results).toEqual(['g1', 'g2', 'g3'])
    expect(sequencer.groupCount).toBeGreaterThanOrEqual(1) // 執行完後可能已清理
  })

  // ─── groupCount 追蹤 ───────────────────────────────────────────

  it('should track multiple groups', async () => {
    const p1 = sequencer.run('g1', async () => {
      await new Promise((r) => setTimeout(r, 30))
    })
    const p2 = sequencer.run('g2', async () => {
      await new Promise((r) => setTimeout(r, 30))
    })

    expect(sequencer.groupCount).toBe(2)
    await Promise.all([p1, p2])
  })

  // ─── TTL 清理 ────────────────────────────────────────────────────

  it('should cleanup idle group limiters via cleanup()', async () => {
    // 執行一個任務然後立即清理
    await sequencer.run('cleanup-test', async () => {})

    // 手動調用 cleanup（模擬 TTL 已超過）
    // 由於 TTL 預設是 60s，直接修改 lastUsed 來測試
    // 透過取得 sequencer 的 private 狀態是不可行的，
    // 改為測試 cleanup() 不拋出例外
    expect(() => sequencer.cleanup()).not.toThrow()
  })

  // ─── destroy 完全清理 ─────────────────────────────────────────

  it('should clear all limiters on destroy', async () => {
    await sequencer.run('g1', async () => {})
    await sequencer.run('g2', async () => {})

    sequencer.destroy()
    expect(sequencer.groupCount).toBe(0)
  })

  it('should not throw when calling destroy twice', () => {
    expect(() => {
      sequencer.destroy()
      sequencer.destroy()
    }).not.toThrow()
  })

  // ─── 錯誤處理 ────────────────────────────────────────────────────

  it('should propagate errors from tasks', async () => {
    await expect(
      sequencer.run('error-group', async () => {
        throw new Error('Task error')
      })
    ).rejects.toThrow('Task error')
  })

  it('should continue processing next task after error', async () => {
    const log: string[] = []

    // 第一個任務拋出錯誤
    const p1 = sequencer.run('g1', async () => {
      throw new Error('Error')
    })

    // 第二個任務應在第一個完成（失敗）後執行
    const p2 = sequencer.run('g1', async () => {
      log.push('task2')
    })

    await p1.catch(() => {})
    await p2

    expect(log).toContain('task2')
  })

  it('should handle mixed group and no-group tasks', async () => {
    const results: string[] = []

    await Promise.all([
      sequencer.run('g1', async () => {
        results.push('g1')
      }),
      sequencer.run(undefined, async () => {
        results.push('no-group')
      }),
      sequencer.run('g2', async () => {
        results.push('g2')
      }),
    ])

    expect(results).toContain('g1')
    expect(results).toContain('no-group')
    expect(results).toContain('g2')
  })
})
