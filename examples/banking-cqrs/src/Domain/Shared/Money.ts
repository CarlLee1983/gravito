/**
 * Money ValueObject
 * 表示貨幣金額，避免浮點誤差
 * 內部以分為單位存儲
 */
export class Money {
  private readonly _cents: number
  private readonly _currency: string

  constructor(cents: number, currency = 'TWD') {
    if (cents < 0) throw new Error('金額不能為負數')
    if (!currency || typeof currency !== 'string') {
      throw new Error('貨幣代碼不合法')
    }
    this._cents = Math.round(cents)
    this._currency = currency
  }

  static fromDollars(dollars: number, currency = 'TWD'): Money {
    return new Money(Math.round(dollars * 100), currency)
  }

  get cents(): number {
    return this._cents
  }

  get dollars(): number {
    return this._cents / 100
  }

  get currency(): string {
    return this._currency
  }

  add(other: Money): Money {
    this.assertSameCurrency(other)
    return new Money(this._cents + other._cents, this._currency)
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other)
    const result = this._cents - other._cents
    if (result < 0) throw new Error('餘額不足')
    return new Money(result, this._currency)
  }

  equals(other: Money): boolean {
    return this._cents === other._cents && this._currency === other._currency
  }

  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other)
    return this._cents > other._cents
  }

  isLessThan(other: Money): boolean {
    this.assertSameCurrency(other)
    return this._cents < other._cents
  }

  private assertSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new Error(`貨幣不符：${this._currency} 不能與 ${other._currency} 混合操作`)
    }
  }

  toJSON(): { cents: number; currency: string; dollars: number } {
    return {
      cents: this._cents,
      currency: this._currency,
      dollars: this.dollars,
    }
  }

  toString(): string {
    return `${this._currency} ${this.dollars.toFixed(2)}`
  }
}
