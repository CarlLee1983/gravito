import { Entity } from '@gravito/enterprise'
import { ProductStatus } from '../Models'
import type { Money } from '../ValueObjects/Money'
import type { Stock } from '../ValueObjects/Stock'

/**
 * Product 屬性介面（用於從 DB 重建）
 */
export interface ProductProps {
  name: string
  sku: string
  description: string
  price: Money
  cost: Money
  stock: Stock
  images: string[]
  status: ProductStatus
  createdAt: Date
  updatedAt: Date
}

/**
 * Product Entity
 *
 * 商品實體，以 ID 為唯一識別。
 * 內部狀態可變（stock、status），但透過方法控制修改。
 */
export class Product extends Entity<string> {
  private _name: string
  private _sku: string
  private _description: string
  private _price: Money
  private _cost: Money
  private _stock: Stock
  private _images: string[]
  private _status: ProductStatus
  private _createdAt: Date
  private _updatedAt: Date

  private constructor(id: string, props: ProductProps) {
    super(id)
    this._name = props.name
    this._sku = props.sku
    this._description = props.description
    this._price = props.price
    this._cost = props.cost
    this._stock = props.stock
    this._images = [...props.images]
    this._status = props.status
    this._createdAt = props.createdAt
    this._updatedAt = props.updatedAt
  }

  /**
   * 建立新的 Product
   */
  static create(
    id: string,
    name: string,
    sku: string,
    description: string,
    price: Money,
    cost: Money,
    stock: Stock,
    images: string[]
  ): Product {
    const now = new Date()
    return new Product(id, {
      name,
      sku,
      description,
      price,
      cost,
      stock,
      images,
      status: ProductStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    })
  }

  /**
   * 從資料庫重建 Product
   */
  static reconstitute(id: string, props: ProductProps): Product {
    return new Product(id, props)
  }

  /**
   * 扣減庫存
   *
   * @param n - 扣減數量
   * @throws FlashSaleError 若庫存不足
   */
  deductStock(n: number): void {
    this._stock = this._stock.deduct(n)
    this._updatedAt = new Date()
  }

  /**
   * 補充庫存
   *
   * @param n - 補充數量
   */
  replenishStock(n: number): void {
    this._stock = this._stock.add(n)
    this._updatedAt = new Date()
  }

  /**
   * 啟用商品
   *
   * 狀態機：INACTIVE -> ACTIVE
   */
  activate(): void {
    this._status = ProductStatus.ACTIVE
    this._updatedAt = new Date()
  }

  /**
   * 停用商品
   *
   * 狀態機：ACTIVE -> INACTIVE
   */
  deactivate(): void {
    this._status = ProductStatus.INACTIVE
    this._updatedAt = new Date()
  }

  get name(): string {
    return this._name
  }

  get sku(): string {
    return this._sku
  }

  get description(): string {
    return this._description
  }

  get price(): Money {
    return this._price
  }

  get cost(): Money {
    return this._cost
  }

  get stock(): Stock {
    return this._stock
  }

  get images(): string[] {
    return [...this._images]
  }

  get status(): ProductStatus {
    return this._status
  }

  get createdAt(): Date {
    return this._createdAt
  }

  get updatedAt(): Date {
    return this._updatedAt
  }
}
