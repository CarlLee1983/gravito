import { Entity } from '@gravito/enterprise'
import type { Money } from '../ValueObjects/Money'
import type { Stock } from '../ValueObjects/Stock'

export interface VariantProps {
  productId: string
  sku: string
  name: string | null
  price: Money
  compareAtPrice: Money | null
  stock: Stock
  options: Record<string, string>
  createdAt: Date
  updatedAt: Date
  metadata?: Record<string, unknown>
}

export class Variant extends Entity<string> {
  constructor(
    id: string,
    private props: VariantProps
  ) {
    super(id)
  }

  // Getters
  get productId(): string {
    return this.props.productId
  }

  get sku(): string {
    return this.props.sku
  }

  get price(): Money {
    return this.props.price
  }

  get stock(): Stock {
    return this.props.stock
  }

  get options(): Record<string, string> {
    return this.props.options
  }

  get metadata(): Record<string, unknown> {
    return this.props.metadata || {}
  }

  get name(): string | null {
    return this.props.name ?? null
  }

  get compareAtPrice(): Money | null {
    return this.props.compareAtPrice ?? null
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  /**
   * 扣減庫存，返回新的 Stock 實例（不可變）
   */
  public reduceStock(quantity: number): Stock {
    const newStock = this.props.stock.deduct(quantity)
    this.props.stock = newStock
    this.props.updatedAt = new Date()
    return newStock
  }

  /**
   * 補充庫存，返回新的 Stock 實例（不可變）
   */
  public addStock(quantity: number): Stock {
    const newStock = this.props.stock.add(quantity)
    this.props.stock = newStock
    this.props.updatedAt = new Date()
    return newStock
  }
}
