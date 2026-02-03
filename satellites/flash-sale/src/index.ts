/**
 * @gravito/satellite-flash-sale
 *
 * 搶購系統核心模塊 - 商品、訂單、支付管理
 *
 * @packageDocumentation
 */

export type { IOrderRepository } from './Application/Contracts/IOrderRepository'
// Repository Contracts
export type { IProductRepository } from './Application/Contracts/IProductRepository'
export { CreateOrder } from './Application/UseCases/CreateOrder'
export { GetOrder } from './Application/UseCases/GetOrder'
// Use Cases
export { ListProducts } from './Application/UseCases/ListProducts'
export { OrderConfirmed } from './Domain/Events/OrderConfirmed'

// Events
export { OrderCreated } from './Domain/Events/OrderCreated'
export { OrderRefunded } from './Domain/Events/OrderRefunded'
export { PaymentSucceeded } from './Domain/Events/PaymentSucceeded'
// Domain Models
export type { Order, OrderItem, Product } from './Domain/Models'
export { CreateOrderRequest, OrderStatus } from './Domain/Models'
export { FlashSaleServiceProvider } from './FlashSaleServiceProvider'
export { OrderController } from './Interface/Http/Controllers/OrderController'
// Controllers
export { ProductController } from './Interface/Http/Controllers/ProductController'
