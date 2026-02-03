/**
 * @gravito/satellite-commerce
 *
 * 訂單管理與庫存扣減 - 連接 Payment 和 Flash-Sale 的橋樑
 *
 * @packageDocumentation
 */

// Use Cases
export { DeductInventory } from './Application/UseCases/DeductInventory'
export { CommerceServiceProvider } from './CommerceServiceProvider'
export type { OrderStatusTransition } from './Domain/Models'
// Domain Models
export { ConfirmOrderRequest, DeductInventoryRequest, RefundOrderRequest } from './Domain/Models'
