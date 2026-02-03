/**
 * @gravito/satellite-inventory-lock
 *
 * 庫存鎖定系統 - 高併發庫存管理
 *
 * @packageDocumentation
 */

// Repository Contracts
export type { IInventoryLockRepository } from './Application/Contracts/IInventoryLockRepository'
export { DeductInventory } from './Application/UseCases/DeductInventory'
export { DetectDeadlock } from './Application/UseCases/DetectDeadlock'

// Use Cases
export { LockInventory } from './Application/UseCases/LockInventory'
export { ReleaseInventory } from './Application/UseCases/ReleaseInventory'
// Domain Models
export type { InventoryLock } from './Domain/Models'
export {
  InventoryDeducted,
  InventoryLocked,
  InventoryReleased,
  LockFailed,
  LockInventoryRequest,
  LockStatus,
  ReleaseLockRequest,
} from './Domain/Models'
export { InventoryLockServiceProvider } from './InventoryLockServiceProvider'
