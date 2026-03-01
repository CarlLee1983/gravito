import { ValueObject } from '@gravito/enterprise'
import { InvalidTaxError } from '../Errors/InvoiceError'

export interface InvoiceTaxProps {
  amount: number
  rate: number
}

/**
 * 發票稅額 ValueObject
 * 管理稅金金額和稅率
 */
export class InvoiceTax extends ValueObject<InvoiceTaxProps> {
  private constructor(amount: number, rate: number) {
    super({ amount, rate })
    this.validate(amount, rate)
  }

  get value(): number {
    return this.props.amount
  }

  get amount(): number {
    return this.props.amount
  }

  get rate(): number {
    return this.props.rate
  }

  private validate(amount: number, rate: number): void {
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new InvalidTaxError(amount)
    }
    if (rate < 0 || rate > 1) {
      throw new InvalidTaxError(rate)
    }
  }

  /**
   * 建立稅額
   */
  static create(amount: number, rate: number): InvoiceTax {
    return new InvoiceTax(amount, rate)
  }

  /**
   * 根據金額和稅率計算稅金
   */
  static calculate(baseAmount: number, rate: number): InvoiceTax {
    if (rate < 0 || rate > 1) {
      throw new InvalidTaxError(rate)
    }
    const taxAmount = baseAmount * rate
    return new InvoiceTax(taxAmount, rate)
  }

  /**
   * 計算稅後金額
   */
  calculateGrossAmount(netAmount: number): number {
    return netAmount + this.amount
  }

  /**
   * 比較是否相同
   */
  override equals(other: InvoiceTax): boolean {
    return this.amount === other.amount && this.rate === other.rate
  }
}
