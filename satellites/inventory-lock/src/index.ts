/**
 * @gravito/satellite-inventory-lock
 *
 * 庫存鎖定系統 - 高併發庫存管理
 *
 * @packageDocumentation
 */

export { InventoryLockServiceProvider } from './InventoryLockServiceProvider'

// Domain Models
export type { InventoryLock, LockStatus } from './Domain/Models'
export { CreateLockRequest, LockStrategy } from './Domain/Models'

// Use Cases
export { LockInventory } from './Application/UseCases/LockInventory'
export { ReleaseInventory } from './Application/UseCases/ReleaseInventory'
export { DeductInventory } from './Application/UseCases/DeductInventory'

// Services
export { DistributedLockService } from './Application/Services/DistributedLockService'
export { InventoryDeductionService } from './Application/Services/InventoryDeductionService'

// Events
export { InventoryLocked } from './Domain/Events/InventoryLocked'
export { InventoryDeducted } from './Domain/Events/InventoryDeducted'
export { InventoryLockFailed } from './Domain/Events/InventoryLockFailed'

// Repository Contracts
export type { IInventoryLockRepository } from './Application/Contracts/IInventoryLockRepository'
