/**
 * Money 值物件
 * 金額以「分」(cents) 儲存，避免浮點數精度問題
 */
export class Money {
  private constructor(private readonly _cents: number) {
    if (_cents < 0) {
      throw new Error(`金額不可為負數: ${_cents}`)
    }
  }

  static of(cents: number): Money {
    return new Money(cents)
  }

  static zero(): Money {
    return new Money(0)
  }

  get cents(): number {
    return this._cents
  }

  add(money: Money): Money {
    return new Money(this._cents + money._cents)
  }

  subtract(money: Money): Money {
    if (money._cents > this._cents) {
      throw new Error(`餘額不足: 現有 ${this._cents} 分，需要 ${money._cents} 分`)
    }
    return new Money(this._cents - money._cents)
  }

  isGreaterThanOrEqual(money: Money): boolean {
    return this._cents >= money._cents
  }

  equals(money: Money): boolean {
    return this._cents === money._cents
  }

  toString(): string {
    return `${(this._cents / 100).toFixed(2)}`
  }
}
