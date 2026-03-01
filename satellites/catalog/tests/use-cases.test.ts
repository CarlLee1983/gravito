import { describe, expect, it } from 'bun:test'
import { CatalogError } from '../src/Application/Errors/CatalogError'
import { AdminListProducts } from '../src/Application/UseCases/AdminListProducts'
import { CreateProduct } from '../src/Application/UseCases/CreateProduct'
import { DeleteCategory } from '../src/Application/UseCases/DeleteCategory'
import type {
  ICategoryRepository,
  IProductRepository,
} from '../src/Domain/Contracts/ICatalogRepository'
import { Category } from '../src/Domain/Entities/Category'
import { Product, Variant } from '../src/Domain/Entities/Product'

/**
 * InMemoryProductRepository - Mock 實作
 */
class InMemoryProductRepository implements IProductRepository {
  private products: Map<string, Product> = new Map()

  async save(product: Product): Promise<void> {
    this.products.set(product.id, product)
  }

  async findById(id: string): Promise<Product | null> {
    return this.products.get(id) ?? null
  }

  async findAll(filters?: any): Promise<Product[]> {
    const products = Array.from(this.products.values())
    // Support categoryId filter
    if (filters?.categoryId) {
      return products.filter((p) => p.categoryIds?.includes(filters.categoryId))
    }
    return products
  }

  async delete(id: string): Promise<void> {
    this.products.delete(id)
  }
}

/**
 * InMemoryCategoryRepository - Mock 實作
 */
class InMemoryCategoryRepository implements ICategoryRepository {
  private categories: Map<string, Category> = new Map()

  async save(category: Category): Promise<void> {
    this.categories.set(category.id, category)
  }

  async findById(id: string): Promise<Category | null> {
    return this.categories.get(id) ?? null
  }

  async findAll(): Promise<Category[]> {
    return Array.from(this.categories.values())
  }

  async findBySlug(slug: string): Promise<Category | null> {
    for (const cat of this.categories.values()) {
      if (cat.slug.value === slug) {
        return cat
      }
    }
    return null
  }

  async findByPathPrefix(prefix: string): Promise<Category[]> {
    return Array.from(this.categories.values()).filter((cat) => cat.path?.startsWith(prefix))
  }

  async delete(id: string): Promise<void> {
    this.categories.delete(id)
  }
}

/**
 * MockPlanetCore - 模擬 Hook 系統
 */
class MockPlanetCore {
  private hookCalls: Array<{ action: string; payload: any }> = []

  get hooks() {
    return {
      doAction: async (action: string, payload: any) => {
        this.hookCalls.push({ action, payload })
      },
    }
  }

  getHookCalls() {
    return this.hookCalls
  }
}

describe('Catalog UseCases', () => {
  describe('CreateProduct', () => {
    it('應該能成功建立新商品', async () => {
      const repository = new InMemoryProductRepository()
      const core = new MockPlanetCore()

      const useCase = new CreateProduct(repository, core as any)
      const result = await useCase.execute({
        name: { zh: 'T-Shirt', en: 'T-Shirt' },
        slug: 'tshirt-minimal',
        brand: 'Minimal',
        categoryIds: ['c1'],
        variants: [
          {
            sku: 'TSHIRT-RED-M',
            name: '紅色 M 號',
            price: 500,
            stock: 10,
            options: { color: 'Red', size: 'M' },
          },
        ],
      })

      expect(result.id).toBeDefined()
      expect(result.slug).toBe('tshirt-minimal')
      expect(result.brand).toBe('Minimal')
      expect(result.variants.length).toBe(1)
      expect(result.categoryIds).toContain('c1')
    })

    it('應該觸發 catalog:product-created hook', async () => {
      const repository = new InMemoryProductRepository()
      const core = new MockPlanetCore()

      const useCase = new CreateProduct(repository, core as any)
      await useCase.execute({
        name: { zh: 'T-Shirt' },
        slug: 'test',
        variants: [{ sku: 'SKU1', price: 100, stock: 5, options: {} }],
      })

      const hooks = core.getHookCalls()
      expect(hooks.length).toBe(1)
      expect(hooks[0].action).toBe('catalog:product-created')
      expect(hooks[0].payload.productId).toBeDefined()
      expect(hooks[0].payload.skuCount).toBe(1)
    })

    it('應該正確設定初始狀態和時間戳', async () => {
      const repository = new InMemoryProductRepository()
      const core = new MockPlanetCore()

      const useCase = new CreateProduct(repository, core as any)
      const result = await useCase.execute({
        name: { zh: 'Product' },
        slug: 'prod-1',
        variants: [{ sku: 'SKU1', price: 100, stock: 5, options: {} }],
      })

      expect(result.createdAt).toBeDefined()
      expect(typeof result.createdAt).toBe('string')
    })
  })

  describe('AdminListProducts', () => {
    it('應該回傳空列表', async () => {
      const repository = new InMemoryProductRepository()
      const useCase = new AdminListProducts(repository)

      const result = await useCase.execute()
      expect(result.length).toBe(0)
    })

    it('應該回傳所有已儲存的商品', async () => {
      const repository = new InMemoryProductRepository()

      // 預先儲存商品
      const product1 = Product.create('p1', { zh: 'Prod1' }, 'prod1')
      const product2 = Product.create('p2', { zh: 'Prod2' }, 'prod2')
      await repository.save(product1)
      await repository.save(product2)

      const useCase = new AdminListProducts(repository)
      const result = await useCase.execute()

      expect(result.length).toBe(2)
      expect(result.some((p) => p.id === 'p1')).toBe(true)
      expect(result.some((p) => p.id === 'p2')).toBe(true)
    })
  })

  describe('Product Domain Logic', () => {
    it('應該能設定 brand', () => {
      const product = Product.create('p1', { zh: 'Product' }, 'prod')
      expect(product.brand).toBeUndefined()

      product.setBrand('MyBrand')
      expect(product.brand).toBe('MyBrand')
    })

    it('應該能存取所有 getter', () => {
      const now = new Date()
      const product = Product.reconstitute('p1', {
        name: { zh: 'Product' },
        slug: 'prod',
        status: 'active',
        variants: [],
        categoryIds: [],
        createdAt: now,
        updatedAt: now,
        brand: 'TestBrand',
        description: 'Test description',
      })

      expect(product.name).toEqual({ zh: 'Product' })
      expect(product.slug).toBe('prod')
      expect(product.status).toBe('active')
      expect(product.brand).toBe('TestBrand')
      expect(product.description).toBe('Test description')
      expect(product.createdAt).toBe(now)
      expect(product.updatedAt).toBe(now)
    })
  })

  describe('DeleteCategory', () => {
    it('分類下無商品時應該成功刪除', async () => {
      const categoryRepo = new InMemoryCategoryRepository()
      const productRepo = new InMemoryProductRepository()
      const core = new MockPlanetCore()

      // 建立並儲存分類
      const category = Category.create('c1', { zh: '電子產品' }, 'electronics')
      await categoryRepo.save(category)

      const useCase = new DeleteCategory(categoryRepo, productRepo, core as any)
      await useCase.execute({ id: 'c1' })

      // 驗證分類已被刪除
      const found = await categoryRepo.findById('c1')
      expect(found).toBeNull()
    })

    it('分類下有商品時應該丟出 CATEGORY_HAS_PRODUCTS 錯誤', async () => {
      const categoryRepo = new InMemoryCategoryRepository()
      const productRepo = new InMemoryProductRepository()
      const core = new MockPlanetCore()

      // 建立並儲存分類
      const category = Category.create('c1', { zh: '電子產品' }, 'electronics')
      await categoryRepo.save(category)

      // 建立並儲存帶有該分類的商品
      const product = Product.create('p1', { zh: 'Laptop' }, 'laptop')
      product.setCategoryIds(['c1'])
      await productRepo.save(product)

      const useCase = new DeleteCategory(categoryRepo, productRepo, core as any)

      try {
        await useCase.execute({ id: 'c1' })
        expect.unreachable('Should have thrown CatalogError')
      } catch (error) {
        expect(error).toBeInstanceOf(CatalogError)
        expect((error as CatalogError).code).toBe('CATEGORY_HAS_PRODUCTS')
        expect((error as CatalogError).statusCode).toBe(400)
      }
    })

    it('分類不存在時應該丟出 CATEGORY_NOT_FOUND 錯誤', async () => {
      const categoryRepo = new InMemoryCategoryRepository()
      const productRepo = new InMemoryProductRepository()
      const core = new MockPlanetCore()

      const useCase = new DeleteCategory(categoryRepo, productRepo, core as any)

      try {
        await useCase.execute({ id: 'non-existent' })
        expect.unreachable('Should have thrown CatalogError')
      } catch (error) {
        expect(error).toBeInstanceOf(CatalogError)
        expect((error as CatalogError).code).toBe('CATEGORY_NOT_FOUND')
        expect((error as CatalogError).statusCode).toBe(404)
      }
    })
  })

  describe('Variant Domain Logic', () => {
    it('變體應該能存取所有 getter', () => {
      const now = new Date()
      const variant = new Variant('v1', {
        productId: 'p1',
        sku: 'SKU-001',
        name: '紅色款',
        price: 500,
        compareAtPrice: 600,
        stock: 10,
        options: { color: 'Red' },
        createdAt: now,
        updatedAt: now,
      })

      expect(variant.sku).toBe('SKU-001')
      expect(variant.name).toBe('紅色款')
      expect(variant.price).toBe(500)
      expect(variant.compareAtPrice).toBe(600)
      expect(variant.stock).toBe(10)
      expect(variant.createdAt).toBe(now)
      expect(variant.updatedAt).toBe(now)
    })

    it('變體應該處理 null name', () => {
      const variant = new Variant('v1', {
        productId: 'p1',
        sku: 'SKU-001',
        name: null,
        price: 500,
        compareAtPrice: null,
        stock: 10,
        options: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      expect(variant.name).toBeNull()
      expect(variant.compareAtPrice).toBeNull()
    })
  })
})
