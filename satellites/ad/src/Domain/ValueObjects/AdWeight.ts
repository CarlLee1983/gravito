import { ValueObject } from '@gravito/enterprise'
import { AdError } from '../Errors/AdError'

/** 權重最小值 */
const MIN_WEIGHT = 1
/** 權重最大值 */
const MAX_WEIGHT = 10

/**
 * 廣告權重值物件
 *
 * 驗證並管理廣告權重（1-10）。
 * 提供正規化方法，將權重轉換為 0-1 之間的值，供概率計算使用。
 */
export class AdWeight extends ValueObject<{ value: number }> {
  private constructor(value: number) {
    super({ value })
  }

  /**
   * 建立 AdWeight 實例
   *
   * @param value - 權重值（必須為 1-10 的整數）
   * @throws AdError.invalidWeight 當值不在有效範圍內或非整數時
   */
  static of(value: number): AdWeight {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw AdError.invalidWeight(value)
    }
    if (value < MIN_WEIGHT || value > MAX_WEIGHT) {
      throw AdError.invalidWeight(value)
    }
    return new AdWeight(value)
  }

  /**
   * 從資料庫重建 AdWeight（無驗證）
   *
   * @param value - 權重值
   */
  static reconstitute(value: number): AdWeight {
    return new AdWeight(value)
  }

  /**
   * 權重數值
   */
  get value(): number {
    return this.props.value
  }

  /**
   * 正規化值（0-1）
   *
   * 公式：(value - MIN) / (MAX - MIN)
   * 權重 1 -> 0，權重 10 -> 1
   */
  get normalized(): number {
    return (this.props.value - MIN_WEIGHT) / (MAX_WEIGHT - MIN_WEIGHT)
  }
}
