import { ValueObject } from '@gravito/enterprise'
import { FlashSaleError, FlashSaleErrorCode } from '../../Application/Errors/FlashSaleError'

/**
 * Stock 值物件屬性
 */
interface StockProps {
  quantity: number
}

/**
 * Stock 值物件
 *
 * 不可變的庫存值物件，保證數量為非負整數。
 */
export class Stock extends ValueObject<StockProps> {
  private constructor(props: StockProps) {
    super(props)
  }

  /**
   * 建立 Stock 實例
   *
   * @param quantity - 庫存數量（非負整數）
   */
  static of(quantity: number): Stock {
    if (quantity < 0) {
      throw FlashSaleError.invalidQuantity(quantity)
    }
    if (!Number.isInteger(quantity)) {
      throw FlashSaleError.invalidQuantity(quantity)
    }
    return new Stock({ quantity })
  }

  /**
   * 當前庫存數量
   */
  get quantity(): number {
    return this.props.quantity
  }

  /**
   * 庫存是否可用（大於零）
   */
  get isAvailable(): boolean {
    return this.props.quantity > 0
  }

  /**
   * 庫存是否足夠滿足需求數量
   */
  isEnoughFor(n: number): boolean {
    return this.props.quantity >= n
  }

  /**
   * 扣減庫存，返回新的 Stock 實例
   *
   * @param n - 扣減數量（正整數）
   * @throws FlashSaleError 若數量不足或 n 無效
   */
  deduct(n: number): Stock {
    if (n <= 0) {
      throw new FlashSaleError(
        `Invalid deduct quantity: ${n}`,
        FlashSaleErrorCode.INVALID_QUANTITY,
        400
      )
    }
    if (!this.isEnoughFor(n)) {
      throw FlashSaleError.insufficientStock(this.props.quantity, n)
    }
    return new Stock({ quantity: this.props.quantity - n })
  }

  /**
   * 補充庫存，返回新的 Stock 實例
   *
   * @param n - 補充數量（正整數）
   * @throws FlashSaleError 若 n 無效
   */
  add(n: number): Stock {
    if (n <= 0) {
      throw new FlashSaleError(
        `Invalid add quantity: ${n}`,
        FlashSaleErrorCode.INVALID_QUANTITY,
        400
      )
    }
    return new Stock({ quantity: this.props.quantity + n })
  }
}
