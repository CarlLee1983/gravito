/**
 * 測試數據生成器
 * 根據 80/20 法則生成測試商品數據
 */

export interface Product {
  id: string
  name: string
  price: number
  stock: number
}

export interface ProductAccessPattern {
  productId: string
  accessCount: number
  ratio: number
}

/**
 * 生成測試商品
 */
export function generateProducts(count: number): Product[] {
  const products: Product[] = []
  for (let i = 0; i < count; i++) {
    products.push({
      id: `product-${i + 1}`,
      name: `Test Product ${i + 1}`,
      price: 10 + Math.random() * 990,
      stock: Math.floor(Math.random() * 10000),
    })
  }
  return products
}

/**
 * 根據 80/20 法則生成訪問模式
 * 20% 的商品佔 80% 的訪問量
 */
export function generateAccessPattern(
  products: Product[],
  totalAccesses: number
): ProductAccessPattern[] {
  const pattern: ProductAccessPattern[] = []

  // 計算 20% 的商品
  const hotProductCount = Math.ceil(products.length * 0.2)
  const hotProducts = products.slice(0, hotProductCount)
  const coldProducts = products.slice(hotProductCount)

  // 熱商品：80% 的訪問量
  const hotAccessCount = Math.floor(totalAccesses * 0.8)
  const hotAccessPerProduct = hotAccessCount / hotProducts.length
  for (const product of hotProducts) {
    pattern.push({
      productId: product.id,
      accessCount: hotAccessPerProduct,
      ratio: 0.8,
    })
  }

  // 冷商品：20% 的訪問量
  const coldAccessCount = totalAccesses - hotAccessCount
  const coldAccessPerProduct = coldAccessCount / coldProducts.length
  for (const product of coldProducts) {
    pattern.push({
      productId: product.id,
      accessCount: coldAccessPerProduct,
      ratio: 0.2,
    })
  }

  return pattern
}

/**
 * 模擬 Zipf 分布的訪問模式（更現實的熱點分布）
 */
export function generateZipfianAccessPattern(
  products: Product[],
  totalAccesses: number,
  s = 1.5 // Zipf 參數（通常 0.5-2.5）
): ProductAccessPattern[] {
  const pattern: ProductAccessPattern[] = []

  // 計算 Zipf 分布係數
  let harmonicSum = 0
  for (let i = 1; i <= products.length; i++) {
    harmonicSum += 1 / i ** s
  }

  // 為每個商品分配訪問量
  for (let i = 0; i < products.length; i++) {
    const rank = i + 1
    const probability = 1 / rank ** s / harmonicSum
    const accessCount = Math.floor(totalAccesses * probability)

    pattern.push({
      productId: products[i].id,
      accessCount,
      ratio: probability,
    })
  }

  return pattern
}

/**
 * 根據訪問模式生成訪問序列
 */
export function generateAccessSequence(pattern: ProductAccessPattern[]): string[] {
  const sequence: string[] = []

  for (const item of pattern) {
    for (let i = 0; i < item.accessCount; i++) {
      sequence.push(item.productId)
    }
  }

  // 隨機打亂
  return shuffleArray(sequence)
}

/**
 * Fisher-Yates 洗牌算法
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * 生成庫存更新事件
 */
export interface InventoryUpdate {
  productId: string
  quantityDeducted: number
  timestamp: number
}

export function generateInventoryUpdates(
  products: Product[],
  updatesPerProduct: number
): InventoryUpdate[] {
  const updates: InventoryUpdate[] = []
  let timestamp = Date.now()

  for (const product of products) {
    for (let i = 0; i < updatesPerProduct; i++) {
      updates.push({
        productId: product.id,
        quantityDeducted: Math.floor(Math.random() * 10) + 1,
        timestamp: timestamp++,
      })
    }
  }

  return shuffleArray(updates)
}

/**
 * 生成批量失效事件
 */
export interface InvalidationEvent {
  pattern: string
  priority: 'high' | 'normal'
  timestamp: number
}

export function generateInvalidationEvents(count: number): InvalidationEvent[] {
  const events: InvalidationEvent[] = []
  const patterns = ['product:*', 'product:hot:*', 'product:new:*', 'category:electronics:*']

  for (let i = 0; i < count; i++) {
    events.push({
      pattern: patterns[i % patterns.length],
      priority: i % 10 === 0 ? 'high' : 'normal',
      timestamp: Date.now() + i * 10,
    })
  }

  return events
}
