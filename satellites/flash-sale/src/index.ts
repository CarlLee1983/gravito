/**
 * @gravito/satellite-flash-sale
 *
 * 搶購系統核心模塊 - 商品、訂單、支付管理
 *
 * @packageDocumentation
 */

// === DTOs ===
export type { CreateOrderInput, OrderDTO, OrderItemDTO } from './Application/DTOs/OrderDTO'
export { OrderMapper } from './Application/DTOs/OrderDTO'
export type { CreateProductDTO, ProductDTO, ProductStockDTO } from './Application/DTOs/ProductDTO'
export { ProductMapper } from './Application/DTOs/ProductDTO'
// === Domain Errors ===
export { FlashSaleError, FlashSaleErrorCode } from './Application/Errors/FlashSaleError'
export { ConfirmOrder } from './Application/UseCases/ConfirmOrder'
export type { CreateBulkOrderInput } from './Application/UseCases/CreateBulkOrder'
export { CreateBulkOrder } from './Application/UseCases/CreateBulkOrder'
export type { CreateOrderInput as CreateOrderUseCaseInput } from './Application/UseCases/CreateOrder'
// === UseCases ===
export { CreateOrder } from './Application/UseCases/CreateOrder'
export { GetOrder } from './Application/UseCases/GetOrder'
export { GetProduct } from './Application/UseCases/GetProduct'
export { ListOrders } from './Application/UseCases/ListOrders'
export { ListProducts } from './Application/UseCases/ListProducts'
// === Domain Contracts ===
export type { IOrderRepository } from './Domain/Contracts/IOrderRepository'
export type { IProductRepository } from './Domain/Contracts/IProductRepository'
export type { BulkPurchaseItem as BulkPurchaseContextItem } from './Domain/DCI/Contexts/BulkPurchaseContext'
export { BulkPurchaseContext } from './Domain/DCI/Contexts/BulkPurchaseContext'
export { OrderLifecycleContext } from './Domain/DCI/Contexts/OrderLifecycleContext'
export { ProductQueryContext } from './Domain/DCI/Contexts/ProductQueryContext'
// === DCI Contexts ===
export { PurchaseContext } from './Domain/DCI/Contexts/PurchaseContext'
export type { CatalogManager } from './Domain/DCI/Roles/CatalogManagerRole'
export { injectCatalogManager } from './Domain/DCI/Roles/CatalogManagerRole'
export type { InventoryHolder } from './Domain/DCI/Roles/InventoryHolderRole'
export { injectInventoryHolder } from './Domain/DCI/Roles/InventoryHolderRole'
export type { OrderOwner } from './Domain/DCI/Roles/OrderOwnerRole'
export { injectOrderOwner } from './Domain/DCI/Roles/OrderOwnerRole'
export type { Purchaser } from './Domain/DCI/Roles/PurchaserRole'
// === DCI Roles ===
export { injectPurchaser } from './Domain/DCI/Roles/PurchaserRole'
export type { OrderProps } from './Domain/Entities/Order'
// === Domain Entities ===
export { Order } from './Domain/Entities/Order'
export type { ProductProps } from './Domain/Entities/Product'
export { Product } from './Domain/Entities/Product'
export { OrderConfirmed } from './Domain/Events/OrderConfirmed'
// === Domain Events ===
export { OrderCreated } from './Domain/Events/OrderCreated'
export { OrderRefunded } from './Domain/Events/OrderRefunded'
export { PaymentSucceeded } from './Domain/Events/PaymentSucceeded'
// === Domain Enums ===
export { OrderStatus, ProductStatus } from './Domain/Models'
// === Domain Value Objects ===
export { Money } from './Domain/ValueObjects/Money'
export { OrderItem } from './Domain/ValueObjects/OrderItem'
export { Stock } from './Domain/ValueObjects/Stock'

// === Service Provider ===
export { FlashSaleServiceProvider } from './FlashSaleServiceProvider'
export { OrderController } from './Interface/Http/Controllers/OrderController'
// === Controllers ===
export { ProductController } from './Interface/Http/Controllers/ProductController'
