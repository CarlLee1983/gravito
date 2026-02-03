/**
 * Mock Inventory Lock Repository（用於測試和演示）
 *
 * 在實作階段 3 時，這個應該被替換為真實的 Redis 或 PostgreSQL 實現
 */

import type { PlanetCore } from '@gravito/core'
import type { IInventoryLockRepository } from '../../Application/Contracts/IInventoryLockRepository'
import { type InventoryLock, LockStatus } from '../../Domain/Models'

export class MockInventoryLockRepository implements IInventoryLockRepository {
  private locks: Map<string, InventoryLock> = new Map()
  private locksByOrderId: Map<string, string> = new Map()
  private locksByProductId: Map<string, string[]> = new Map()

  constructor(private core: PlanetCore) {}

  async findById(id: string): Promise<InventoryLock | null> {
    return this.locks.get(id) || null
  }

  async findByOrderId(orderId: string): Promise<InventoryLock | null> {
    const lockId = this.locksByOrderId.get(orderId)
    if (!lockId) return null
    return this.locks.get(lockId) || null
  }

  async findExpired(before: Date): Promise<InventoryLock[]> {
    const expired: InventoryLock[] = []
    for (const lock of this.locks.values()) {
      if (lock.expiresAt < before && lock.status === LockStatus.LOCKED) {
        expired.push(lock)
      }
    }
    return expired
  }

  async create(data: Omit<InventoryLock, 'id' | 'version'>): Promise<InventoryLock> {
    // 生成唯一 ID
    const id = `LOCK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const version = 1

    const lock: InventoryLock = {
      id,
      version,
      ...data,
    }

    this.locks.set(id, lock)
    this.locksByOrderId.set(data.orderId, id)

    // 按商品 ID 索引
    if (!this.locksByProductId.has(data.productId)) {
      this.locksByProductId.set(data.productId, [])
    }
    this.locksByProductId.get(data.productId)!.push(id)

    return lock
  }

  async updateStatus(id: string, status: LockStatus): Promise<InventoryLock> {
    const lock = this.locks.get(id)
    if (!lock) {
      throw new Error(`Lock not found: ${id}`)
    }

    const updatedLock: InventoryLock = {
      ...lock,
      status,
      version: lock.version + 1,
      releasedAt: status === LockStatus.RELEASED ? new Date() : lock.releasedAt,
    }

    this.locks.set(id, updatedLock)
    return updatedLock
  }

  async updateWithVersion(
    id: string,
    data: Partial<InventoryLock>,
    expectedVersion: number
  ): Promise<InventoryLock | null> {
    const lock = this.locks.get(id)
    if (!lock) {
      throw new Error(`Lock not found: ${id}`)
    }

    // 樂觀鎖檢查：版本號不匹配則返回 null
    if (lock.version !== expectedVersion) {
      this.core.logger.warn(
        `Version conflict for lock ${id}: expected ${expectedVersion}, got ${lock.version}`
      )
      return null
    }

    const updatedLock: InventoryLock = {
      ...lock,
      ...data,
      version: lock.version + 1,
    }

    this.locks.set(id, updatedLock)
    return updatedLock
  }

  async delete(id: string): Promise<void> {
    const lock = this.locks.get(id)
    if (!lock) {
      throw new Error(`Lock not found: ${id}`)
    }

    this.locks.delete(id)
    this.locksByOrderId.delete(lock.orderId)

    const productLocks = this.locksByProductId.get(lock.productId) || []
    this.locksByProductId.set(
      lock.productId,
      productLocks.filter((lockId) => lockId !== id)
    )
  }

  async countActive(productId: string): Promise<number> {
    const lockIds = this.locksByProductId.get(productId) || []
    let count = 0

    for (const lockId of lockIds) {
      const lock = this.locks.get(lockId)
      if (lock && lock.status === LockStatus.LOCKED) {
        count++
      }
    }

    return count
  }

  async sumLockedQuantity(productId: string): Promise<number> {
    const lockIds = this.locksByProductId.get(productId) || []
    let total = 0

    for (const lockId of lockIds) {
      const lock = this.locks.get(lockId)
      if (lock && lock.status === LockStatus.LOCKED) {
        total += lock.quantity
      }
    }

    return total
  }
}
