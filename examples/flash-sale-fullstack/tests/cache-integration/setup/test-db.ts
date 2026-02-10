/**
 * 模擬數據庫
 * 用於集成測試，追蹤 DB 查詢次數和模擬延遲
 */

export interface MockDatabaseStats {
  queryCount: number
  queryTime: number
  cacheBypass: number
}

export class MockDatabase {
  private data = new Map<string, any>()
  private stats = {
    queryCount: 0,
    queryTime: 0,
    cacheBypass: 0,
  }
  private queryDelay: number // 模擬查詢延遲（毫秒）

  constructor(queryDelayMs = 10) {
    this.queryDelay = queryDelayMs
  }

  /**
   * 初始化測試數據
   */
  async init(products: any[]): Promise<void> {
    for (const product of products) {
      this.data.set(product.id, product)
    }
  }

  /**
   * 查詢商品
   */
  async getProduct(productId: string): Promise<any> {
    this.stats.queryCount++
    this.stats.cacheBypass++

    // 模擬數據庫延遲
    await this.delay(this.queryDelay)
    this.stats.queryTime += this.queryDelay

    return this.data.get(productId) || null
  }

  /**
   * 批量查詢商品
   */
  async getProducts(productIds: string[]): Promise<any[]> {
    const products = []
    for (const id of productIds) {
      const product = await this.getProduct(id)
      if (product) {
        products.push(product)
      }
    }
    return products
  }

  /**
   * 更新商品庫存
   */
  async updateInventory(productId: string, quantityDeducted: number): Promise<boolean> {
    this.stats.queryCount++

    await this.delay(this.queryDelay)
    this.stats.queryTime += this.queryDelay

    const product = this.data.get(productId)
    if (!product) {
      return false
    }

    if (product.stock < quantityDeducted) {
      return false
    }

    product.stock -= quantityDeducted
    this.data.set(productId, product)
    return true
  }

  /**
   * 獲取熱銷商品
   */
  async getTopProducts(limit: number): Promise<any[]> {
    this.stats.queryCount++

    await this.delay(this.queryDelay)
    this.stats.queryTime += this.queryDelay

    return Array.from(this.data.values())
      .sort((a, b) => b.stock - a.stock)
      .slice(0, limit)
  }

  /**
   * 重置統計信息
   */
  resetStats(): void {
    this.stats = {
      queryCount: 0,
      queryTime: 0,
      cacheBypass: 0,
    }
  }

  /**
   * 獲取統計信息
   */
  getStats(): MockDatabaseStats {
    return { ...this.stats }
  }

  /**
   * 清空數據
   */
  clear(): void {
    this.data.clear()
    this.resetStats()
  }

  /**
   * 模擬延遲
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 設置查詢延遲
   */
  setQueryDelay(ms: number): void {
    this.queryDelay = ms
  }
}

/**
 * 建立 Mock 數據庫
 */
export async function setupMockDatabase(products: any[]): Promise<MockDatabase> {
  const db = new MockDatabase()
  await db.init(products)
  return db
}
