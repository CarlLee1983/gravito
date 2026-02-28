import { ValueObject } from '@gravito/enterprise'
import { CatalogErrorFactory } from '../../Application/Errors/CatalogError'

/**
 * Money 值物件屬性
 */
interface MoneyProps {
  amountInCents: number
  currency: string
}

/**
 * Money 值物件
 *
 * 不可變的貨幣值物件，內部以整數（分）儲存，避免浮點數精度問題。
 */
export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props)
  }

  /**
   * 建立 Money 實例
   *
   * @param amount - 金額（十進位），如 99.99
   * @param currency - 通貨代碼，預設 'TWD'
   */
  static of(amount: number, currency = 'TWD'): Money {
    if (amount < 0) {
      throw CatalogErrorFactory.invalidPrice(amount)
    }
    const amountInCents = Math.round(amount * 100)
    return new Money({ amountInCents, currency })
  }

  /**
   * 十進位金額值（如 99.99）
   */
  get value(): number {
    return this.props.amountInCents / 100
  }

  /**
   * 整數分值（如 9999）
   */
  get amountInCents(): number {
    return this.props.amountInCents
  }

  /**
   * 通貨代碼
   */
  get currency(): string {
    return this.props.currency
  }

  /**
   * 加法，返回新的 Money 實例
   */
  add(other: Money): Money {
    this.assertSameCurrency(other)
    return new Money({
      amountInCents: this.props.amountInCents + other.props.amountInCents,
      currency: this.props.currency,
    })
  }

  /**
   * 乘法，返回新的 Money 實例
   */
  multiply(factor: number): Money {
    if (factor < 0) {
      throw CatalogErrorFactory.invalidPrice(factor)
    }
    return new Money({
      amountInCents: Math.round(this.props.amountInCents * factor),
      currency: this.props.currency,
    })
  }

  /**
   * 比較是否大於另一個 Money
   */
  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other)
    return this.props.amountInCents > other.props.amountInCents
  }

  /**
   * 驗證通貨是否匹配
   */
  private assertSameCurrency(other: Money): void {
    if (this.props.currency !== other.props.currency) {
      throw new Error(`Currency mismatch: ${this.props.currency} vs ${other.props.currency}`)
    }
  }
}
