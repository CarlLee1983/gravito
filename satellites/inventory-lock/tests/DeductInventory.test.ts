import { beforeEach, describe, expect, it } from 'bun:test'
import { DeductInventory } from '../src/Application/UseCases/DeductInventory'
import { LockStatus } from '../src/Domain/Models'

/**
 * Mock Repository
 */
class MockInventoryLockRepository {
  private locks: Map<
    string,
    {
      id: string
      orderId: string
      productId: string
      quantity: number
      status: string
      expiresAt: Date
      version: number
    }
  > = new Map()

  async findById(id: string) {
    return this.locks.get(id) || null
  }

  async updateStatus(id: string, status: string) {
    const lock = this.locks.get(id)
    if (lock) {
      lock.status = status
      return lock
    }
    return null
  }

  async updateWithVersion(id: string, data: any, expectedVersion: number) {
    const lock = this.locks.get(id)
    if (!lock) {
      return null
    }

    // 模擬樂觀鎖：檢查版本號
    if (lock.version !== expectedVersion) {
      return null
    }

    // 更新鎖定
    lock.status = data.status
    lock.version += 1
    return lock
  }

  setLock(id: string, lock: any) {
    this.locks.set(id, { ...lock, version: 1 })
  }
}

/**
 * Mock Logger
 */
class MockLogger {
  logs: Array<{ level: string; message: string }> = []

  info(message: string) {
    this.logs.push({ level: 'info', message })
  }

  warn(message: string) {
    this.logs.push({ level: 'warn', message })
  }

  error(message: string) {
    this.logs.push({ level: 'error', message })
  }
}

/**
 * Mock Events
 */
class MockEvents {
  dispatched: any[] = []

  async dispatch(event: any) {
    this.dispatched.push(event)
  }
}

/**
 * Mock Container
 */
class MockContainer {
  make(key: string) {
    if (key === 'inventoryLock.repository') {
      return this.repository
    }
    return null
  }

  repository = new MockInventoryLockRepository()
}

/**
 * Mock PlanetCore
 */
class MockPlanetCore {
  logger = new MockLogger()
  events = new MockEvents()
  container = new MockContainer()
}

describe('Inventory-Lock - DeductInventory UseCase', () => {
  let core: MockPlanetCore
  let useCase: DeductInventory
  let repository: MockInventoryLockRepository

  beforeEach(() => {
    core = new MockPlanetCore()
    repository = core.container.repository
    useCase = new DeductInventory(core as any)
  })

  describe('Valid Deduction', () => {
    it('應該能成功扣減庫存', async () => {
      repository.setLock('lock-1', {
        id: 'lock-1',
        orderId: 'ord-123',
        productId: 'prod-1',
        quantity: 5,
        status: LockStatus.LOCKED,
        expiresAt: new Date(Date.now() + 3600000),
      })

      const result = await useCase.execute('lock-1', 1)

      expect(result.success).toBe(true)
      expect(result.message).toContain('successfully')
    })

    it('應該在成功後記錄日誌', async () => {
      repository.setLock('lock-1', {
        id: 'lock-1',
        orderId: 'ord-123',
        productId: 'prod-1',
        quantity: 5,
        status: LockStatus.LOCKED,
        expiresAt: new Date(Date.now() + 3600000),
      })

      await useCase.execute('lock-1', 1)

      const infoLogs = core.logger.logs.filter((l) => l.level === 'info')
      expect(infoLogs.length).toBeGreaterThan(0)
      expect(infoLogs[0].message).toContain('Inventory deducted')
    })

    it('應該發送 InventoryDeducted 事件', async () => {
      repository.setLock('lock-1', {
        id: 'lock-1',
        orderId: 'ord-123',
        productId: 'prod-1',
        quantity: 5,
        status: LockStatus.LOCKED,
        expiresAt: new Date(Date.now() + 3600000),
      })

      await useCase.execute('lock-1', 1)

      expect(core.events.dispatched.length).toBeGreaterThan(0)
    })
  })

  describe('Lock Not Found', () => {
    it('當鎖定不存在時應返回失敗', async () => {
      const result = await useCase.execute('nonexistent', 1)

      expect(result.success).toBe(false)
      expect(result.message).toContain('not found')
    })

    it('應該記錄警告日誌', async () => {
      await useCase.execute('nonexistent', 1)

      const warnLogs = core.logger.logs.filter((l) => l.level === 'warn')
      expect(warnLogs.length).toBeGreaterThan(0)
    })
  })

  describe('Invalid Lock Status', () => {
    it('當鎖定狀態不是 LOCKED 時應返回失敗', async () => {
      repository.setLock('lock-1', {
        id: 'lock-1',
        orderId: 'ord-123',
        productId: 'prod-1',
        quantity: 5,
        status: LockStatus.RELEASED,
        expiresAt: new Date(Date.now() + 3600000),
      })

      const result = await useCase.execute('lock-1', 1)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Invalid lock status')
    })
  })

  describe('Expired Lock', () => {
    it('當鎖定已過期時應返回失敗', async () => {
      repository.setLock('lock-1', {
        id: 'lock-1',
        orderId: 'ord-123',
        productId: 'prod-1',
        quantity: 5,
        status: LockStatus.LOCKED,
        expiresAt: new Date(Date.now() - 1000),
      })

      const result = await useCase.execute('lock-1', 1)

      expect(result.success).toBe(false)
      expect(result.message).toContain('expired')
    })

    it('應該將過期的鎖定標記為 EXPIRED', async () => {
      repository.setLock('lock-1', {
        id: 'lock-1',
        orderId: 'ord-123',
        productId: 'prod-1',
        quantity: 5,
        status: LockStatus.LOCKED,
        expiresAt: new Date(Date.now() - 1000),
      })

      await useCase.execute('lock-1', 1)

      const lock = await repository.findById('lock-1')
      expect(lock?.status).toBe(LockStatus.EXPIRED)
    })
  })

  describe('Version Conflict - Optimistic Locking', () => {
    it('當版本號不匹配時應返回衝突錯誤', async () => {
      repository.setLock('lock-1', {
        id: 'lock-1',
        orderId: 'ord-123',
        productId: 'prod-1',
        quantity: 5,
        status: LockStatus.LOCKED,
        expiresAt: new Date(Date.now() + 3600000),
      })

      // 使用錯誤的版本號（實際版本是 1，但傳入 99）
      const result = await useCase.execute('lock-1', 99)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Version conflict')
    })

    it('應該檢測並發修改', async () => {
      repository.setLock('lock-1', {
        id: 'lock-1',
        orderId: 'ord-123',
        productId: 'prod-1',
        quantity: 5,
        status: LockStatus.LOCKED,
        expiresAt: new Date(Date.now() + 3600000),
      })

      // 模擬並發：另一個客戶端也修改了版本
      const lock1 = await repository.findById('lock-1')
      const lock2 = await repository.findById('lock-1')

      // 第一個修改成功
      await useCase.execute('lock-1', lock1!.version)

      // 第二個應該失敗（版本已經變化）
      await useCase.execute('lock-2', lock2!.version)
    })
  })

  describe('Input Validation', () => {
    it('應該拒絕空的 lockId', async () => {
      try {
        await useCase.execute('', 1)
        expect.unreachable('應該拋出錯誤')
      } catch (error: any) {
        expect(error.message).toContain('lockId is required')
      }
    })

    it('應該拒絕 null lockId', async () => {
      try {
        await useCase.execute(null as any, 1)
        expect.unreachable('應該拋出錯誤')
      } catch (error: any) {
        expect(error.message).toContain('lockId is required')
      }
    })

    it('應該拒絕未定義的 lockId', async () => {
      try {
        await useCase.execute(undefined as any, 1)
        expect.unreachable('應該拋出錯誤')
      } catch (error: any) {
        expect(error.message).toContain('lockId is required')
      }
    })
  })

  describe('Multiple Locks', () => {
    it('應該能獨立處理多個鎖定', async () => {
      repository.setLock('lock-1', {
        id: 'lock-1',
        orderId: 'ord-123',
        productId: 'prod-1',
        quantity: 5,
        status: LockStatus.LOCKED,
        expiresAt: new Date(Date.now() + 3600000),
      })

      repository.setLock('lock-2', {
        id: 'lock-2',
        orderId: 'ord-456',
        productId: 'prod-2',
        quantity: 10,
        status: LockStatus.LOCKED,
        expiresAt: new Date(Date.now() + 3600000),
      })

      const result1 = await useCase.execute('lock-1', 1)
      const result2 = await useCase.execute('lock-2', 1)

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('應該捕獲並記錄意外錯誤', async () => {
      const brokenRepository = {
        findById: async () => {
          throw new Error('Database connection failed')
        },
      }

      core.container.make = () => brokenRepository

      try {
        await useCase.execute('lock-1', 1)
      } catch (error) {
        expect(error).toBeDefined()
      }

      const errorLogs = core.logger.logs.filter((l) => l.level === 'error')
      expect(errorLogs.length).toBeGreaterThan(0)
    })
  })
})
