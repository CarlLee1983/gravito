import { ValueObject } from '@gravito/enterprise'
import { InvalidInvoiceNumberError } from '../Errors/InvoiceError'

export interface InvoiceNumberProps {
  value: string
}

/**
 * 發票號碼 ValueObject
 * 格式：GX-XXXXXXXX (GX前綴 + 8位數字)
 */
export class InvoiceNumber extends ValueObject<InvoiceNumberProps> {
  private constructor(value: string) {
    super({ value })
    this.validate(value)
  }

  get value(): string {
    return this.props.value
  }

  private validate(value: string): void {
    if (!value || !/^GX-\d{8}$/.test(value)) {
      throw new InvalidInvoiceNumberError(value)
    }
  }

  /**
   * 生成新發票號碼
   */
  static generate(): InvoiceNumber {
    const timestamp = Date.now().toString().slice(-8)
    return new InvoiceNumber(`GX-${timestamp}`)
  }

  /**
   * 建立發票號碼
   */
  static create(value: string): InvoiceNumber {
    return new InvoiceNumber(value)
  }

  /**
   * 比較是否相同
   */
  override equals(other: InvoiceNumber): boolean {
    return this.value === other.value
  }
}
