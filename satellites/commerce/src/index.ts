/**
 * @gravito/satellite-commerce
 *
 * 訂單管理與支付協調系統
 * 基於 DDD + DCI 架構，提供完整的訂單生命週期管理
 *
 * @packageDocumentation
 */

// === Domain Layer ===

// Contracts
export type { IInventoryService } from './Domain/Contracts/IInventoryService'
export type { IOrderRepository } from './Domain/Contracts/IOrderRepository'
// Entities
export { Order, OrderStatus } from './Domain/Entities/Order'
// Events
export { OrderConfirmed } from './Domain/Events/OrderConfirmed'
export { OrderPlaced } from './Domain/Events/OrderPlaced'
export { OrderRefundRequested } from './Domain/Events/OrderRefundRequested'
// ValueObjects
export { Adjustment, AdjustmentType } from './Domain/ValueObjects/Adjustment'
export { LineItem } from './Domain/ValueObjects/LineItem'
export { Money } from './Domain/ValueObjects/Money'

// === Application Layer ===

// DTOs
export type { OrderAdjustmentDTO, OrderDTO, OrderItemDTO } from './Application/DTOs/OrderDTO'
export { OrderMapper } from './Application/DTOs/OrderMapper'
// Errors
export { CommerceError, CommerceErrorCode } from './Application/Errors/CommerceError'

// UseCases
export type {
  AdminListOrdersInput,
  AdminListOrdersOutput,
} from './Application/UseCases/AdminListOrders'
export { AdminListOrders } from './Application/UseCases/AdminListOrders'

export type {
  ConfirmOrderInput,
  ConfirmOrderOutput,
} from './Application/UseCases/ConfirmOrder'
export { ConfirmOrder } from './Application/UseCases/ConfirmOrder'

export type { PlaceOrderInput, PlaceOrderOutput } from './Application/UseCases/PlaceOrder'
export { PlaceOrder } from './Application/UseCases/PlaceOrder'

export type {
  RequestRefundInput,
  RequestRefundOutput,
} from './Application/UseCases/RequestRefund'
export { RequestRefund } from './Application/UseCases/RequestRefund'

// === Infrastructure Layer ===

// Repositories
export { AtlasOrderRepository } from './Infrastructure/Repositories/AtlasOrderRepository'

// === Service Provider ===

export { CommerceServiceProvider } from './CommerceServiceProvider'
