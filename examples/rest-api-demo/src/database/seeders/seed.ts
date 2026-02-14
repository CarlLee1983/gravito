/**
 * Database Seeder
 *
 * 生成並插入種子資料用於開發和測試
 *
 * 用法：
 *   bun run src/database/seeders/seed.ts
 */

interface SeedConfig {
  users: number // 用戶數量
  categories: number // 分類數量
  productPerCategory: number // 每個分類的商品數量
  orders: number // 訂單數量
}

const config: SeedConfig = {
  users: 10,
  categories: 5,
  productPerCategory: 10,
  orders: 20,
}

// 簡單的日期生成函數
function _getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

// 生成 UUID（簡單版本）
function generateId(): string {
  return crypto.randomUUID()
}

// 生成隨機電子郵件
function generateEmail(index: number): string {
  return `user${index + 1}@example.com`
}

// 生成隨機電話
function generatePhone(): string {
  const area = Math.floor(Math.random() * 900) + 100
  const prefix = Math.floor(Math.random() * 900) + 100
  const line = Math.floor(Math.random() * 9000) + 1000
  return `+1${area}${prefix}${line}`
}

// 生成隨機商品 SKU
function generateSku(categoryIndex: number, productIndex: number): string {
  const categoryCode = String.fromCharCode(65 + categoryIndex) // A, B, C, D, E
  const productCode = String(productIndex + 1).padStart(3, '0')
  return `${categoryCode}-PROD-${productCode}`
}

// 生成隨機訂單編號
function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `ORD-${timestamp}-${random}`
}

/**
 * 顯示進度條
 */
function showProgress(current: number, total: number, label: string): void {
  const percentage = Math.round((current / total) * 100)
  const barLength = 40
  const filledLength = Math.round((barLength * current) / total)
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength)
  console.log(`[${bar}] ${percentage}% - ${label}`)
}

/**
 * 主 Seeder 類別
 */
class DatabaseSeeder {
  private userIds: string[] = []
  private categoryIds: string[] = []
  private productIds: string[] = []

  async run(): Promise<void> {
    console.log('\n🌱 開始生成種子資料...\n')

    console.log('📝 生成資料內容（不實際插入）...\n')

    // 生成用戶
    console.log('👥 用戶資料:')
    for (let i = 0; i < config.users; i++) {
      const userId = generateId()
      this.userIds.push(userId)
      generateEmail(i)
      generatePhone()
      showProgress(i + 1, config.users, `生成用戶 ${i + 1}/${config.users}`)
    }
    console.log(`✅ 已生成 ${config.users} 個用戶\n`)

    // 生成分類
    console.log('📂 分類資料:')
    const categoryNames = ['Electronics', 'Books', 'Clothing', 'Home & Garden', 'Sports']
    for (let i = 0; i < config.categories; i++) {
      const categoryId = generateId()
      this.categoryIds.push(categoryId)
      void (categoryNames[i] || `Category ${i + 1}`)
      showProgress(i + 1, config.categories, `生成分類 ${i + 1}/${config.categories}`)
    }
    console.log(`✅ 已生成 ${config.categories} 個分類\n`)

    // 生成商品
    console.log('🛍️  商品資料:')
    const totalProducts = config.categories * config.productPerCategory
    let productCount = 0
    for (let catIdx = 0; catIdx < config.categories; catIdx++) {
      for (let prodIdx = 0; prodIdx < config.productPerCategory; prodIdx++) {
        const productId = generateId()
        this.productIds.push(productId)
        generateSku(catIdx, prodIdx)
        void (Math.floor(Math.random() * 50000) + 1000) // $10 - $500
        productCount++
        showProgress(productCount, totalProducts, `生成商品 ${productCount}/${totalProducts}`)
      }
    }
    console.log(`✅ 已生成 ${totalProducts} 個商品\n`)

    // 生成訂單
    console.log('📦 訂單資料:')
    for (let i = 0; i < config.orders; i++) {
      generateId()
      void this.userIds[Math.floor(Math.random() * this.userIds.length)]
      generateOrderNumber()
      void (Math.floor(Math.random() * 5) + 1) // 1-5 個商品
      showProgress(i + 1, config.orders, `生成訂單 ${i + 1}/${config.orders}`)
    }
    console.log(`✅ 已生成 ${config.orders} 個訂單\n`)

    // 顯示摘要
    console.log('\n📊 種子資料摘要:')
    console.log(`────────────────────────────────────────`)
    console.log(`👥 用戶數量:        ${config.users}`)
    console.log(`📂 分類數量:        ${config.categories}`)
    console.log(`🛍️  商品數量:        ${totalProducts}`)
    console.log(`📦 訂單數量:        ${config.orders}`)
    console.log(`────────────────────────────────────────`)

    console.log('\n✨ 種子資料生成完成！\n')
    console.log('💡 提示：在實際環境中，請連接真實資料庫執行 SQL 遷移')
    console.log('   SQL 遷移檔案位置: src/database/migrations/\n')
  }
}

/**
 * 執行 Seeder
 */
async function main(): Promise<void> {
  try {
    const seeder = new DatabaseSeeder()
    await seeder.run()
  } catch (error) {
    console.error('❌ Seeder 執行出錯:', error)
    process.exit(1)
  }
}

main()
