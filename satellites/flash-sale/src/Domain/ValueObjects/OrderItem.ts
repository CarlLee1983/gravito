import { ValueObject } from '@gravito/enterprise'
import { FlashSaleError, FlashSaleErrorCode } from '../../Application/Errors/FlashSaleError'
import type { Money } from './Money'

/**
 * OrderItem 值物件屬性
 */
interface OrderItemProps {
  productId: string
  productName: string
  quantity: number
  unitPriceInCents: number
  unitPriceCurrency: string
  totalPriceInCents: number
}

/**
 * OrderItem 值物件
 *
 * 不可變的訂單項目，自動計算 totalPrice。
 */
export class OrderItem extends ValueObject<OrderItemProps> {
  private readonly _unitPrice: Money
  private readonly _totalPrice: Money

  private constructor(props: OrderItemProps, unitPrice: Money, totalPrice: Money) {
    super(props)
    this._unitPrice = unitPrice
    this._totalPrice = totalPrice
  }

  /**
   * 建立 OrderItem 實例
   *
   * @param productId - 商品 ID
   * @param productName - 商品名稱
   * @param quantity - 數量（正整數）
   * @param unitPrice - 單價
   */
  static create(
    productId: string,
    productName: string,
    quantity: number,
    unitPrice: Money
  ): OrderItem {
    if (!productId || productId.trim() === '') {
      throw new FlashSaleError('Product ID is required', FlashSaleErrorCode.INVALID_QUANTITY, 400)
    }
    if (!productName || productName.trim() === '') {
      throw new FlashSaleError('Product name is required', FlashSaleErrorCode.INVALID_QUANTITY, 400)
    }
    if (quantity <= 0) {
      throw FlashSaleError.invalidQuantity(quantity)
    }

    const totalPrice = unitPrice.multiply(quantity)

    return new OrderItem(
      {
        productId,
        productName,
        quantity,
        unitPriceInCents: unitPrice.amountInCents,
        unitPriceCurrency: unitPrice.currency,
        totalPriceInCents: totalPrice.amountInCents,
      },
      unitPrice,
      totalPrice
    )
  }

  get productId(): string {
    return this.props.productId
  }

  get productName(): string {
    return this.props.productName
  }

  get quantity(): number {
    return this.props.quantity
  }

  get unitPrice(): Money {
    return this._unitPrice
  }

  get totalPrice(): Money {
    return this._totalPrice
  }
}
