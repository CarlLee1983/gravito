import { ValueObject } from '@gravito/enterprise'
import type { Money } from './Money'

/**
 * LineItem 值物件屬性
 */
interface LineItemProps {
  productId: string
  variantId: string
  sku: string
  name: string
  unitPrice: Money
  quantity: number
  options?: Record<string, string>
}

/**
 * LineItem 值物件
 *
 * 訂單明細項目，包含商品快照和數量。
 * 不可變，表示訂單建立時商品的狀態。
 */
export class LineItem extends ValueObject<LineItemProps> {
  private constructor(props: LineItemProps) {
    super(props)
  }

  /**
   * 建立 LineItem 實例
   */
  static create(
    productId: string,
    variantId: string,
    sku: string,
    name: string,
    unitPrice: Money,
    quantity: number,
    options?: Record<string, string>
  ): LineItem {
    return new LineItem({
      productId,
      variantId,
      sku,
      name,
      unitPrice,
      quantity,
      options,
    })
  }

  /**
   * 從 DB 重建 LineItem
   */
  static reconstitute(props: LineItemProps): LineItem {
    return new LineItem(props)
  }

  get productId(): string {
    return this.props.productId
  }

  get variantId(): string {
    return this.props.variantId
  }

  get sku(): string {
    return this.props.sku
  }

  get name(): string {
    return this.props.name
  }

  get unitPrice(): Money {
    return this.props.unitPrice
  }

  get quantity(): number {
    return this.props.quantity
  }

  get totalPrice(): Money {
    return this.props.unitPrice.multiply(this.props.quantity)
  }

  get options(): Record<string, string> | undefined {
    return this.props.options ? { ...this.props.options } : undefined
  }
}
