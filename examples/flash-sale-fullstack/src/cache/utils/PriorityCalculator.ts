/**
 * 預熱優先級計算器
 * 根據多個因素（熱度、價格、評分、利潤率）計算商品的預熱優先級
 */

export interface PriorityWeights {
  heat: number
  price: number
  rating: number
  profit?: number
}

export interface ProductMetrics {
  heat: number
  price: number
  rating: number
  profit?: number
}

export class PriorityCalculator {
  private weights: PriorityWeights

  constructor(weights?: Partial<PriorityWeights>) {
    // 默認權重
    this.weights = {
      heat: weights?.heat ?? 0.5,
      price: weights?.price ?? 0.3,
      rating: weights?.rating ?? 0.2,
      profit: weights?.profit ?? 0,
    }
  }

  /**
   * 計算商品優先級分數
   * @param metrics 商品指標
   * @returns 優先級分數（0-1）
   */
  calculateScore(metrics: ProductMetrics): number {
    // 正規化各個指標到 0-1 範圍
    const normalizedHeat = Math.min(metrics.heat / 1000, 1)
    const normalizedPrice = Math.min(metrics.price / 10000, 1)
    const normalizedRating = metrics.rating / 5
    const normalizedProfit = metrics.profit ? Math.min(metrics.profit / 100, 1) : 0

    // 加權求和
    let score =
      normalizedHeat * this.weights.heat +
      normalizedPrice * this.weights.price +
      normalizedRating * this.weights.rating

    if (this.weights.profit && metrics.profit !== undefined) {
      score += normalizedProfit * this.weights.profit
    }

    return Math.min(Math.max(score, 0), 1)
  }

  /**
   * 更新權重配置
   * @param weights 新的權重配置
   */
  updateWeights(weights: Partial<PriorityWeights>): void {
    this.weights = { ...this.weights, ...weights }
  }

  /**
   * 批量計算並排序
   * @param products 商品列表
   * @returns 按優先級排序的結果
   */
  sortByPriority(
    products: Array<{ id: string; metrics: ProductMetrics }>
  ): Array<{ id: string; score: number }> {
    return products
      .map((p) => ({ id: p.id, score: this.calculateScore(p.metrics) }))
      .sort((a, b) => b.score - a.score)
  }

  /**
   * 獲取加權詳情
   * @returns 當前權重配置
   */
  getWeights(): PriorityWeights {
    return { ...this.weights }
  }

  /**
   * 計算權重和（應該接近 1.0）
   * @returns 權重和
   */
  getWeightSum(): number {
    let sum = this.weights.heat + this.weights.price + this.weights.rating
    if (this.weights.profit) {
      sum += this.weights.profit
    }
    return sum
  }
}
