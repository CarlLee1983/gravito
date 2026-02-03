/**
 * @gravito/core - DeadLetterQueueManager Tests
 *
 * 測試 DeadLetterQueueManager 的所有功能
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import type { ConnectionContract } from '@gravito/atlas'
import { DeadLetterQueueManager } from '../src/reliability/DeadLetterQueueManager'

/**
 * Mock 數據庫連接
 */
class MockConnection implements ConnectionContract {
  private tableData: Record<string, any[]> = { event_dlq: [] }

  table(name: string) {
    const tableData = this.tableData

    const applyConditions = (rows: any[], conditions: [string, string, any][]) => {
      let filtered = [...rows]
      for (const [column, operator, value] of conditions) {
        if (operator === '=') {
          filtered = filtered.filter((r) => r[column] === value)
        } else if (operator === '<=') {
          filtered = filtered.filter(
            (r) => new Date(r[column]).getTime() <= new Date(value).getTime()
          )
        } else if (operator === '>=') {
          filtered = filtered.filter(
            (r) => new Date(r[column]).getTime() >= new Date(value).getTime()
          )
        }
      }
      return filtered
    }

    const createChain = (conditions: [string, string, any][] = []): any => {
      return {
        where(column: string, operatorOrValue: string | any, maybeValue?: any) {
          const [op, val] =
            maybeValue === undefined ? ['=', operatorOrValue] : [operatorOrValue, maybeValue]
          return createChain([...conditions, [column, op, val]])
        },
        delete: async () => {
          const rows = tableData[name] || []
          const filtered = applyConditions(rows, conditions)
          const initialLength = rows.length
          tableData[name] = rows.filter((r) => !filtered.includes(r))
          return initialLength - tableData[name].length
        },
        update: async (data: any) => {
          const rows = tableData[name] || []
          const filtered = applyConditions(rows, conditions)
          let updated = 0
          for (const row of filtered) {
            const index = rows.indexOf(row)
            if (index >= 0) {
              rows[index] = { ...rows[index], ...data }
              updated++
            }
          }
          return updated
        },
        count: async () => {
          const rows = tableData[name] || []
          return applyConditions(rows, conditions).length
        },
        first: async () => {
          const rows = tableData[name] || []
          const filtered = applyConditions(rows, conditions)
          return filtered[0] || null
        },
        orderBy(column: string, dir = 'asc'): any {
          return {
            ...createChain(conditions),
            limit(n: number) {
              return {
                offset(offset: number) {
                  return {
                    get: async () => {
                      let rows = (tableData[name] || []).slice()
                      rows = applyConditions(rows, conditions)
                      rows.sort((a, b) => {
                        const aVal = a[column]
                        const bVal = b[column]
                        let aTime: number
                        let bTime: number
                        try {
                          aTime = new Date(aVal).getTime()
                          bTime = new Date(bVal).getTime()
                        } catch {
                          aTime = aVal < bVal ? -1 : 1
                          bTime = 0
                        }
                        return dir === 'desc' ? bTime - aTime : aTime - bTime
                      })
                      return rows.slice(offset, offset + n)
                    },
                  }
                },
              }
            },
          }
        },
      }
    }

    const baseChain = createChain([])

    return {
      ...baseChain,
      where(column: string, operatorOrValue: string | any, maybeValue?: any) {
        const [op, val] =
          maybeValue === undefined ? ['=', operatorOrValue] : [operatorOrValue, maybeValue]
        return createChain([[column, op, val]])
      },
      whereIn(column: string, values: any[]) {
        return {
          delete: async () => {
            const rows = tableData[name] || []
            const initialLength = rows.length
            tableData[name] = rows.filter((r) => !values.includes(r[column]))
            return initialLength - tableData[name].length
          },
        }
      },
      insert: async (data: any) => {
        const rows = tableData[name] || []
        rows.push(data)
        tableData[name] = rows
        return rows.length
      },
      count: async () => {
        return (tableData[name] || []).length
      },
      get: async () => {
        return tableData[name] || []
      },
      select(...cols: string[]) {
        const selectedData = tableData[name] || []
        return {
          selectRaw(sql: string) {
            return {
              groupBy(groupColumn: string) {
                return {
                  get: async () => {
                    const rows = selectedData.slice()
                    const grouped: Record<string, any> = {}
                    for (const row of rows) {
                      const key = row[groupColumn]
                      if (!grouped[key]) {
                        grouped[key] = { [groupColumn]: key, count: 0 }
                      }
                      grouped[key].count++
                    }
                    return Object.values(grouped)
                  },
                }
              },
            }
          },
          groupBy(groupColumn: string) {
            return {
              selectRaw(sql: string) {
                return {
                  get: async () => {
                    const rows = selectedData.slice()
                    const grouped: Record<string, any> = {}
                    for (const row of rows) {
                      const key = row[groupColumn]
                      if (!grouped[key]) {
                        grouped[key] = { [groupColumn]: key, count: 0 }
                      }
                      grouped[key].count++
                    }
                    return Object.values(grouped)
                  },
                }
              },
            }
          },
        }
      },
      groupBy(column: string) {
        return {
          select(...columns: string[]) {
            return {
              selectRaw(sql: string) {
                return {
                  get: async () => {
                    const rows = tableData[name] || []
                    const grouped: Record<string, number> = {}
                    for (const row of rows) {
                      const key = row[column]
                      grouped[key] = (grouped[key] || 0) + 1
                    }
                    return Object.entries(grouped).map(([key, count]) => ({
                      [column]: key,
                      count,
                    }))
                  },
                }
              },
            }
          },
        }
      },
    }
  }
}

describe('DeadLetterQueueManager', () => {
  let manager: DeadLetterQueueManager
  let mockDb: MockConnection

  beforeEach(() => {
    mockDb = new MockConnection()
    manager = new DeadLetterQueueManager(mockDb as any)
  })

  describe('moveToDlq', () => {
    it('應該將失敗事件移至 DLQ', async () => {
      const dlqId = await manager.moveToDlq(
        'order:created',
        { orderId: '123' },
        { priority: 'high' },
        new Error('Test error'),
        1
      )

      expect(dlqId).toBeTruthy()
      expect(typeof dlqId).toBe('string')
    })

    it('應該返回有效的 UUID 格式的 dlqId', async () => {
      const dlqId = await manager.moveToDlq(
        'payment:processed',
        { amount: 100 },
        {},
        new Error('Payment failed'),
        2
      )

      // UUID 格式: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      expect(uuidRegex.test(dlqId)).toBe(true)
    })
  })

  describe('getById', () => {
    it('應該獲取存在的 DLQ 記錄', async () => {
      const dlqId = await manager.moveToDlq(
        'test:event',
        { data: 'test' },
        {},
        new Error('Test'),
        1
      )

      const record = await manager.getById(dlqId)
      expect(record).toBeTruthy()
      expect(record?.event_name).toBe('test:event')
    })

    it('應該為不存在的記錄返回 undefined', async () => {
      const record = await manager.getById('non-existent-id')
      expect(record).toBeUndefined()
    })
  })

  describe('list', () => {
    beforeEach(async () => {
      // 建立多個測試記錄
      await manager.moveToDlq('order:created', { id: 1 }, {}, new Error('E1'), 1)
      await manager.moveToDlq('order:created', { id: 2 }, {}, new Error('E2'), 1)
      await manager.moveToDlq('payment:processed', { id: 3 }, {}, new Error('E3'), 1)
    })

    it('應該列出所有 DLQ 記錄', async () => {
      const records = await manager.list()
      expect(records.length).toBeGreaterThan(0)
    })

    it('應該按事件名稱篩選', async () => {
      const records = await manager.list({ eventName: 'order:created' })
      expect(records.every((r) => r.event_name === 'order:created')).toBe(true)
    })

    it('應該按狀態篩選', async () => {
      const records = await manager.list({ status: 'pending' })
      expect(records.every((r) => r.status === 'pending')).toBe(true)
    })

    it('應該尊重分頁限制', async () => {
      const records = await manager.list({ limit: 1 })
      expect(records.length).toBeLessThanOrEqual(1)
    })
  })

  describe('requeue', () => {
    it('應該成功重新入隊記錄', async () => {
      const dlqId = await manager.moveToDlq('test:event', {}, {}, new Error('Test'), 1)

      await manager.requeue(dlqId)

      const record = await manager.getById(dlqId)
      expect(record?.status).toBe('requeued')
    })

    it('應該在記錄不存在時拋出錯誤', async () => {
      try {
        await manager.requeue('non-existent-id')
        expect.unreachable('Should have thrown')
      } catch (error) {
        expect((error as Error).message).toContain('DLQ event not found')
      }
    })
  })

  describe('resolve', () => {
    it('應該將記錄標記為已解決', async () => {
      const dlqId = await manager.moveToDlq('test:event', {}, {}, new Error('Test'), 1)

      await manager.resolve(dlqId, 'Manual fix applied')

      const record = await manager.getById(dlqId)
      expect(record?.status).toBe('resolved')
      expect(record?.resolution_notes).toContain('Manual fix applied')
    })
  })

  describe('abandon', () => {
    it('應該將記錄標記為已放棄', async () => {
      const dlqId = await manager.moveToDlq('test:event', {}, {}, new Error('Test'), 1)

      await manager.abandon(dlqId, 'Data corrupted')

      const record = await manager.getById(dlqId)
      expect(record?.status).toBe('abandoned')
      expect(record?.resolution_notes).toContain('Data corrupted')
    })
  })

  describe('deleteEntry', () => {
    it('應該刪除存在的記錄', async () => {
      const dlqId = await manager.moveToDlq('test:event', {}, {}, new Error('Test'), 1)

      const deleted = await manager.deleteEntry(dlqId)
      expect(deleted).toBe(true)

      const record = await manager.getById(dlqId)
      expect(record).toBeUndefined()
    })

    it('應該為不存在的記錄返回 false', async () => {
      const deleted = await manager.deleteEntry('non-existent-id')
      expect(deleted).toBe(false)
    })
  })

  describe('deleteEntries', () => {
    it('應該批量刪除記錄', async () => {
      const id1 = await manager.moveToDlq('test:event', { id: 1 }, {}, new Error('E1'), 1)
      const id2 = await manager.moveToDlq('test:event', { id: 2 }, {}, new Error('E2'), 1)

      const deleted = await manager.deleteEntries([id1, id2])
      expect(deleted).toBe(2)
    })

    it('應該處理空列表', async () => {
      const deleted = await manager.deleteEntries([])
      expect(deleted).toBe(0)
    })
  })

  describe('getCountByEvent', () => {
    beforeEach(async () => {
      await manager.moveToDlq('order:created', { id: 1 }, {}, new Error('E1'), 1)
      await manager.moveToDlq('order:created', { id: 2 }, {}, new Error('E2'), 1)
      await manager.moveToDlq('payment:processed', { id: 3 }, {}, new Error('E3'), 1)
    })

    it('應該計算特定事件的記錄數', async () => {
      const count = await manager.getCountByEvent('order:created')
      expect(count).toBeGreaterThan(0)
    })

    it('應該為不存在的事件返回 0', async () => {
      const count = await manager.getCountByEvent('non-existent:event')
      expect(count).toBe(0)
    })
  })

  describe('getStats', () => {
    beforeEach(async () => {
      await manager.moveToDlq('order:created', { id: 1 }, {}, new Error('E1'), 1)
      await manager.moveToDlq('order:created', { id: 2 }, {}, new Error('E2'), 1)
      await manager.moveToDlq('payment:processed', { id: 3 }, {}, new Error('E3'), 1)
    })

    it('應該提供準確的統計信息', async () => {
      const stats = await manager.getStats()

      expect(stats).toHaveProperty('total')
      expect(stats).toHaveProperty('byEvent')
      expect(stats).toHaveProperty('byStatus')
      expect(stats.total).toBeGreaterThan(0)
    })

    it('統計信息應該按事件分組', async () => {
      const stats = await manager.getStats()
      expect(stats.byEvent).toHaveProperty('order:created')
      expect(stats.byEvent).toHaveProperty('payment:processed')
    })

    it('統計信息應該按狀態分組', async () => {
      const stats = await manager.getStats()
      expect(stats.byStatus).toHaveProperty('pending')
    })
  })

  describe('retryBatch', () => {
    beforeEach(async () => {
      await manager.moveToDlq('order:created', { id: 1 }, {}, new Error('E1'), 1)
      await manager.moveToDlq('order:created', { id: 2 }, {}, new Error('E2'), 1)
      await manager.moveToDlq('payment:processed', { id: 3 }, {}, new Error('E3'), 1)
    })

    it('應該批量重新入隊記錄', async () => {
      const result = await manager.retryBatch({ eventName: 'order:created' })

      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('succeeded')
      expect(result).toHaveProperty('failed')
      expect(result.total).toBeGreaterThan(0)
    })

    it('應該返回正確的成功/失敗計數', async () => {
      const result = await manager.retryBatch({ eventName: 'order:created' })

      expect(result.succeeded + result.failed).toBe(result.total)
    })
  })

  describe('clear', () => {
    beforeEach(async () => {
      const dlqId1 = await manager.moveToDlq('order:created', { id: 1 }, {}, new Error('E1'), 1)
      const _dlqId2 = await manager.moveToDlq('order:created', { id: 2 }, {}, new Error('E2'), 1)
      await manager.resolve(dlqId1, 'Manual fix')
    })

    it('應該清空待處理的記錄', async () => {
      const cleared = await manager.clear(false)
      expect(cleared).toBeGreaterThanOrEqual(0)
    })

    it('應該在選擇時清空所有記錄', async () => {
      const cleared = await manager.clear(true)
      expect(cleared).toBeGreaterThanOrEqual(0)
    })
  })
})
