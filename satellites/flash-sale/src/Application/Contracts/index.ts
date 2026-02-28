/**
 * Application Contracts
 *
 * 向後相容層：re-export Application 層的舊版 Repository 介面。
 *
 * 新程式碼應直接使用 Domain/Contracts 的 IOrderRepository 和 IProductRepository。
 * 此處保留舊版介面以支援 CacheWarmupService 等既有基礎設施服務。
 */

export type { IOrderRepository } from './IOrderRepository'
export type { IProductRepository } from './IProductRepository'
