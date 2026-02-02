/**
 * @gravito/satellite-flash-sale
 *
 * 搶購系統核心模塊 - 商品、訂單、支付管理
 *
 * @packageDocumentation
 */

export { FlashSaleServiceProvider } from './FlashSaleServiceProvider'

// Domain Models
export type { Product, Order, OrderItem } from './Domain/Models'
export { CreateOrderRequest, OrderStatus } from './Domain/Models'

// Use Cases
export { ListProducts } from './Application/UseCases/ListProducts'
export { CreateOrder } from './Application/UseCases/CreateOrder'
export { GetOrder } from './Application/UseCases/GetOrder'

// Events
export { OrderCreated } from './Domain/Events/OrderCreated'
export { PaymentSucceeded } from './Domain/Events/PaymentSucceeded'
export { OrderConfirmed } from './Domain/Events/OrderConfirmed'
export { OrderRefunded } from './Domain/Events/OrderRefunded'

// Controllers
export { ProductController } from './Interface/Http/Controllers/ProductController'
export { OrderController } from './Interface/Http/Controllers/OrderController'

// Repository Contracts
export type { IProductRepository } from './Application/Contracts/IProductRepository'
export type { IOrderRepository } from './Application/Contracts/IOrderRepository'
