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
   * 設置庫存
   * 庫存邏輯應在 Role 層進行
   */
  public setStock(stock: Stock): void {
    this.props.stock = stock
    this.props.updatedAt = new Date()
  }

  /**
   * 設置價格
   */
  public setPrice(price: Money): void {
    this.props.price = price
    this.props.updatedAt = new Date()
  }

  /**
   * 設置比較價格
   */
  public setCompareAtPrice(compareAtPrice: Money | null): void {
    this.props.compareAtPrice = compareAtPrice
    this.props.updatedAt = new Date()
  }

  /**
   * 設置變體名稱
   */
  public setName(name: string | null): void {
    this.props.name = name
    this.props.updatedAt = new Date()
  }

  /**
   * 設置選項
   */
  public setOptions(options: Record<string, string>): void {
    this.props.options = options
    this.props.updatedAt = new Date()
  }

  /**
   * 取得完整的 props 物件（用於 Repository）
   */
  get propsObject(): VariantProps {
    return { ...this.props }
  }
}
