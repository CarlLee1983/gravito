import { ValueObject } from '@gravito/enterprise'
import { InvalidAmountError } from '../Errors/InvoiceError'

export interface InvoiceAmountProps {
  value: number
  currency: string
}

/**
 * 發票金額 ValueObject
 * 支持多幣種、四則運算
 */
export class InvoiceAmount extends ValueObject<InvoiceAmountProps> {
  private constructor(value: number, currency: string) {
    super({ value, currency })
    this.validate(value)
  }

  get value(): number {
    return this.props.value
  }

  get currency(): string {
    return this.props.currency
  }

  private validate(value: number): void {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new InvalidAmountError(value)
    }
  }

  /**
   * 建立金額
   */
  static create(value: number, currency: string): InvoiceAmount {
    return new InvoiceAmount(value, currency)
  }

  /**
   * 加法
   */
  add(other: InvoiceAmount): InvoiceAmount {
    if (this.currency !== other.currency) {
      throw new InvalidAmountError(other.value)
    }
    return new InvoiceAmount(this.value + other.value, this.currency)
  }

  /**
   * 減法
   */
  subtract(other: InvoiceAmount): InvoiceAmount {
    if (this.currency !== other.currency) {
      throw new InvalidAmountError(other.value)
    }
    return new InvoiceAmount(this.value - other.value, this.currency)
  }

  /**
   * 比較是否相同
   */
  override equals(other: InvoiceAmount): boolean {
    return this.value === other.value && this.currency === other.currency
  }

  /**
   * 是否大於
   */
  greaterThan(other: InvoiceAmount): boolean {
    if (this.currency !== other.currency) {
      throw new InvalidAmountError(other.value)
    }
    return this.value > other.value
  }

  /**
   * 是否小於
   */
  lessThan(other: InvoiceAmount): boolean {
    if (this.currency !== other.currency) {
      throw new InvalidAmountError(other.value)
    }
    return this.value < other.value
  }
}
