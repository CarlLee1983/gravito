import { expect } from 'bun:test'
import { DB } from '@gravito/atlas'
import { PlanetCore, setApp } from '@gravito/core'
import { CategoryMapper } from '../src/Application/DTOs/CategoryDTO'
import type { CreateProduct } from '../src/Application/UseCases/CreateProduct'
import type { UpdateCategory } from '../src/Application/UseCases/UpdateCategory'
import { CatalogServiceProvider } from '../src/index'

/**
 * 🛰️ Gravito Catalog "Grand Review"
 */
async function grandReview() {
  console.log('\n🚀 [Grand Review] 啟動 Catalog 全系統校閱流程...')

  // 1. 初始化核心
  const core = await PlanetCore.boot({
    config: {
      APP_NAME: 'Catalog Review',
      'database.default': 'sqlite',
      'database.connections.sqlite': {
        driver: 'sqlite',
        database: ':memory:',
      },
    },
  })

  setApp(core)

  // 2. 初始化 Atlas 與 資料表
  DB.addConnection('default', { driver: 'sqlite', database: ':memory:' })

  console.log('📦 [Database] 正在建立資料表...')
  const migration = await import(
    '../src/Infrastructure/Persistence/Migrations/20250101_create_catalog_tables'
  )
  await migration.default.up()

  // 3. 註冊與啟動插件
  await core.use(new CatalogServiceProvider())
  await core.bootstrap()

  const categoryRepo = core.container.make<any>('catalog.repo.category')
  const createProduct = core.container.make<CreateProduct>('catalog.create-product')
  const updateCategory = core.container.make<UpdateCategory>('catalog.update-category')

  // --- 測試案例 A: 建立分類樹 ---
  console.log('\n🧪 [Test A] 建立階層式分類...')
  const { Category } = await import('../src/Domain/Entities/Category')

  const men = Category.create('c1', { zh: '男裝' }, 'men')
  men.updatePath(null)
  await categoryRepo.save(men)

  const tops = Category.create('c2', { zh: '上衣' }, 'tops', men.id)
  tops.updatePath(men.path)
  await categoryRepo.save(tops)

  console.log(`✅ 分類已建立: ${tops.path}`) // 預期 men/tops

  // --- 測試案例 B: 建立商品與多個 SKU ---
  console.log('\n🧪 [Test B] 原子化建立商品與 SKU...')
  const product = await createProduct.execute({
    name: { zh: '經典棉質 T-Shirt' },
    slug: 'classic-cotton-tshirt',
    brand: 'Gravito Wear',
    categoryIds: [tops.id],
    variants: [
      {
        sku: 'TS-WHT-M',
        name: '白色 / M',
        price: 590,
        stock: 100,
        options: { color: 'White', size: 'M' },
      },
      {
        sku: 'TS-BLK-L',
        name: '黑色 / L',
        price: 650,
        stock: 50,
        options: { color: 'Black', size: 'L' },
      },
    ],
  })

  console.log(`✅ 商品已建立: ${product.name.zh}, SKU 數量: ${product.variants.length}`)
  console.log(`💰 SKU 1 價格: ${product.variants[0].price}, 庫存: ${product.variants[0].stock}`)

  // --- 測試案例 C: 分類移動與路徑同步 (最難的部分) ---
  console.log('\n🧪 [Test C] 測試分類移動與子孫路徑同步...')
  // 建立一個新根分類 "特價"
  const sale = Category.create('c4', { zh: '特價區' }, 'sale')
  sale.updatePath(null)
  await categoryRepo.save(sale)

  // 將 "男裝" (men) 移動到 "特價區" (sale) 下面
  await updateCategory.execute({
    id: men.id,
    parentId: sale.id,
  })

  // 驗證 "上衣" (tops) 的路徑是否自動更新為 sale/men/tops
  const updatedTops = await categoryRepo.findById(tops.id)
  console.log(`🔄 移動後 "上衣" 的新路徑: \x1b[32m${updatedTops.path}\x1b[0m`)

  if (updatedTops.path === 'sale/men/tops') {
    console.log('✅ [Pass] 路徑自動同步成功！')
  } else {
    throw new Error(`[Fail] 路徑同步失敗，收到: ${updatedTops.path}`)
  }

  // --- 測試案例 D: 樹狀結構輸出 ---
  console.log('\n🧪 [Test D] 驗證樹狀結構輸出...')
  const allFlat = await categoryRepo.findAll()
  const tree = CategoryMapper.buildTree(allFlat.map((c: any) => CategoryMapper.toDTO(c)))
  console.log(
    '🌲 分類樹頂層節點:',
    tree.map((t) => t.slug)
  )
  expect(tree[0].slug).toBe('sale')
  expect(tree[0].children?.[0].slug).toBe('men')

  console.log('\n🏁 [Grand Review] Catalog 校閱完成！')
  process.exit(0)
}

grandReview().catch((err) => {
  console.error('💥 校閱失敗:', err)
  process.exit(1)
})
