/**
 * Money ValueObject
 *
 * 表示貨幣金額的值物件，避免浮點運算誤差。
 * 內部以「分」為單位存儲整數，確保精確性。
 *
 * @example
 * ```typescript
 * // 建立 100 元
 * const money = new Money(10000, 'TWD')
 * console.log(money.dollars)  // 100
 * console.log(money.cents)    // 10000
 *
 * // 使用工廠方法
 * const money2 = Money.fromDollars(50.99, 'TWD')
 *
 * // 運算操作
 * const sum = money.add(money2)
 * const diff = money.subtract(money2)
 * ```
 *
 * @since 1.0.0
 */
export class Money {
  private readonly _cents: number
  private readonly _currency: string

  /**
   * 構造函數
   *
   * @param cents - 金額（以分為單位，必須為非負整數）
   * @param currency - 貨幣代碼，預設為 'TWD'
   * @throws Error 當金額為負數或貨幣代碼不合法
   */
  constructor(cents: number, currency = 'TWD') {
    if (cents < 0) {
      throw new Error('金額不能為負數')
    }
    if (!currency || typeof currency !== 'string') {
      throw new Error('貨幣代碼不合法')
    }
    this._cents = Math.round(cents)
    this._currency = currency
  }

  /**
   * 從元為單位的金額建立 Money 對象
   *
   * @param dollars - 元為單位的金額
   * @param currency - 貨幣代碼，預設為 'TWD'
   * @returns 新的 Money 對象
   *
   * @example
   * ```typescript
   * const money = Money.fromDollars(100.50, 'TWD')
   * // 等同於 new Money(10050, 'TWD')
   * ```
   */
  static fromDollars(dollars: number, currency = 'TWD'): Money {
    return new Money(Math.round(dollars * 100), currency)
  }

  /**
   * 取得分為單位的金額
   */
  get cents(): number {
    return this._cents
  }

  /**
   * 取得元為單位的金額
   */
  get dollars(): number {
    return this._cents / 100
  }

  /**
   * 取得貨幣代碼
   */
  get currency(): string {
    return this._currency
  }

  /**
   * 加法操作
   *
   * @param other - 另一個 Money 對象
   * @returns 新的 Money 對象，代表相加結果
   * @throws Error 當貨幣不相同時
   */
  add(other: Money): Money {
    this.assertSameCurrency(other)
    return new Money(this._cents + other._cents, this._currency)
  }

  /**
   * 減法操作
   *
   * @param other - 另一個 Money 對象
   * @returns 新的 Money 對象，代表相減結果
   * @throws Error 當貨幣不相同或餘額不足時
   */
  subtract(other: Money): Money {
    this.assertSameCurrency(other)
    const result = this._cents - other._cents
    if (result < 0) {
      throw new Error('餘額不足')
    }
    return new Money(result, this._currency)
  }

  /**
   * 檢查是否相等
   *
   * @param other - 另一個 Money 對象
   * @returns true 若金額和貨幣代碼都相同
   */
  equals(other: Money): boolean {
    return this._cents === other._cents && this._currency === other._currency
  }

  /**
   * 檢查是否大於
   *
   * @param other - 另一個 Money 對象
   * @returns true 若此金額大於另一個
   * @throws Error 當貨幣不相同時
   */
  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other)
    return this._cents > other._cents
  }

  /**
   * 檢查是否小於
   *
   * @param other - 另一個 Money 對象
   * @returns true 若此金額小於另一個
   * @throws Error 當貨幣不相同時
   */
  isLessThan(other: Money): boolean {
    this.assertSameCurrency(other)
    return this._cents < other._cents
  }

  /**
   * 驗證貨幣一致性
   *
   * @internal
   * @throws Error 當貨幣代碼不同時
   */
  private assertSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new Error(`貨幣不符：${this._currency} 不能與 ${other._currency} 混合操作`)
    }
  }

  /**
   * 序列化為 JSON
   *
   * @returns 包含分、元、貨幣代碼的物件
   */
  toJSON(): { cents: number; currency: string; dollars: number } {
    return {
      cents: this._cents,
      currency: this._currency,
      dollars: this.dollars,
    }
  }

  /**
   * 轉換為可讀字符串格式
   *
   * @returns 格式為 "TWD 100.00" 的字符串
   */
  toString(): string {
    return `${this._currency} ${this.dollars.toFixed(2)}`
  }
}
