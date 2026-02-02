/**
 * @gravito/satellite-commerce
 *
 * 訂單管理與庫存扣減 - 連接 Payment 和 Flash-Sale 的橋樑
 *
 * @packageDocumentation
 */

export { CommerceServiceProvider } from './CommerceServiceProvider'

// Domain Models
export { DeductInventoryRequest, ConfirmOrderRequest, RefundOrderRequest } from './Domain/Models'
export type { OrderStatusTransition } from './Domain/Models'

// Use Cases
export { DeductInventory } from './Application/UseCases/DeductInventory'
