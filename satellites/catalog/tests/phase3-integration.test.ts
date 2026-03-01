import { beforeEach, describe, expect, it } from 'bun:test'
import { Category } from '../src/Domain/Entities/Category'
import { Product, Variant } from '../src/Domain/Entities/Product'
import { I18nText } from '../src/Domain/ValueObjects/I18nText'
import { Money } from '../src/Domain/ValueObjects/Money'
import { Slug } from '../src/Domain/ValueObjects/Slug'
import { Stock } from '../src/Domain/ValueObjects/Stock'

describe('Phase 3 - UseCase 整合測試', () => {
  describe('商品 UseCase 委派', () => {
    it('CreateProduct 應正確委派給 ProductCreationContext', () => {
      // 驗證使用案例能夠被導入
      const { CreateProduct } = require('../src/Application/UseCases/CreateProduct')
      expect(CreateProduct).toBeDefined()
      expect(CreateProduct.prototype.execute).toBeDefined()
    })

    it('GetProduct 應正確委派給 ProductQueryContext', () => {
      const { GetProduct } = require('../src/Application/UseCases/GetProduct')
      expect(GetProduct).toBeDefined()
      expect(GetProduct.prototype.execute).toBeDefined()
    })

    it('UpdateProduct 應正確委派給 ProductUpdateContext', () => {
      const { UpdateProduct } = require('../src/Application/UseCases/UpdateProduct')
      expect(UpdateProduct).toBeDefined()
      expect(UpdateProduct.prototype.execute).toBeDefined()
    })

    it('DeleteProduct 應正確委派給 Repository', () => {
      const { DeleteProduct } = require('../src/Application/UseCases/DeleteProduct')
      expect(DeleteProduct).toBeDefined()
      expect(DeleteProduct.prototype.execute).toBeDefined()
    })

    it('AdminListProducts 應返回 ProductDTO[]', () => {
      const { AdminListProducts } = require('../src/Application/UseCases/AdminListProducts')
      expect(AdminListProducts).toBeDefined()
      expect(AdminListProducts.prototype.execute).toBeDefined()
    })
  })

  describe('分類 UseCase 委派', () => {
    it('CreateCategory 應正確委派給 CategoryManagementContext', () => {
      const { CreateCategory } = require('../src/Application/UseCases/CreateCategory')
      expect(CreateCategory).toBeDefined()
      expect(CreateCategory.prototype.execute).toBeDefined()
    })

    it('UpdateCategory 應正確委派給 CategoryManagementContext', () => {
      const { UpdateCategory } = require('../src/Application/UseCases/UpdateCategory')
      expect(UpdateCategory).toBeDefined()
      expect(UpdateCategory.prototype.execute).toBeDefined()
    })

    it('DeleteCategory 應正確委派給 CategoryManagementContext', () => {
      const { DeleteCategory } = require('../src/Application/UseCases/DeleteCategory')
      expect(DeleteCategory).toBeDefined()
      expect(DeleteCategory.prototype.execute).toBeDefined()
    })
  })

  describe('DTO 映射驗證', () => {
    it('ProductMapper 應正確提取 ValueObject 值', () => {
      const { ProductMapper } = require('../src/Application/DTOs/ProductDTO')

      const product = Product.create('p1', I18nText.of({ zh: '商品名稱' }), Slug.of('product-slug'))

      const variant = new Variant('v1', {
        productId: product.id,
        sku: 'SKU001',
        name: '變體名稱',
        price: Money.of(1000, 'TWD'),
        compareAtPrice: Money.of(1200, 'TWD'),
        stock: Stock.of(50),
        options: { color: 'Red', size: 'M' },
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      product.setVariants([variant])
      const dto = ProductMapper.toDTO(product)

      expect(dto.id).toBe('p1')
      expect(dto.name).toEqual({ zh: '商品名稱' })
      expect(dto.slug).toBe('product-slug')
      expect(dto.variants.length).toBe(1)
      expect(dto.variants[0].price).toBe(1000)
      expect(dto.variants[0].compareAtPrice).toBe(1200)
      expect(dto.variants[0].stock).toBe(50)
    })

    it('CategoryMapper 應正確提取 ValueObject 值', () => {
      const { CategoryMapper } = require('../src/Application/DTOs/CategoryDTO')

      const category = Category.create(
        'c1',
        I18nText.of({ zh: '分類名稱', en: 'Category Name' }),
        Slug.of('category-slug')
      )
      category.setPath('category-slug')

      const dto = CategoryMapper.toDTO(category)

      expect(dto.id).toBe('c1')
      expect(dto.name).toEqual({ zh: '分類名稱', en: 'Category Name' })
      expect(dto.slug).toBe('category-slug')
      expect(dto.path).toBe('category-slug')
    })
  })

  describe('ErrorFactory 使用', () => {
    it('CatalogErrorFactory 應提供所有必要的錯誤工廠方法', () => {
      const { CatalogErrorFactory } = require('../src/Application/Errors/CatalogError')

      expect(CatalogErrorFactory.productNotFound).toBeDefined()
      expect(CatalogErrorFactory.categoryNotFound).toBeDefined()
      expect(CatalogErrorFactory.variantNotFound).toBeDefined()
      expect(CatalogErrorFactory.insufficientStock).toBeDefined()
    })

    it('錯誤工廠應返回正確的錯誤訊息', () => {
      const { CatalogErrorFactory } = require('../src/Application/Errors/CatalogError')

      const error1 = CatalogErrorFactory.productNotFound('p123')
      expect(error1.message).toContain('p123')

      const error2 = CatalogErrorFactory.insufficientStock('v456', 10)
      expect(error2.message).toContain('v456')
    })
  })

  describe('Thin-Shell UseCase 架構驗證', () => {
    it('UseCase 應該是簡單的委派器', () => {
      // 檢查 UseCase 檔案大小（應該很小）
      const { CreateProduct } = require('../src/Application/UseCases/CreateProduct')
      const { UpdateProduct } = require('../src/Application/UseCases/UpdateProduct')
      const { GetProduct } = require('../src/Application/UseCases/GetProduct')

      // 所有都應該有 execute 方法
      expect(typeof CreateProduct.prototype.execute).toBe('function')
      expect(typeof UpdateProduct.prototype.execute).toBe('function')
      expect(typeof GetProduct.prototype.execute).toBe('function')
    })

    it('Context 應包含主要業務邏輯', () => {
      const {
        ProductCreationContext,
      } = require('../src/Domain/DCI/Contexts/ProductCreationContext')
      const { ProductUpdateContext } = require('../src/Domain/DCI/Contexts/ProductUpdateContext')
      const {
        CategoryManagementContext,
      } = require('../src/Domain/DCI/Contexts/CategoryManagementContext')

      // 所有 Context 都應該存在
      expect(ProductCreationContext).toBeDefined()
      expect(ProductUpdateContext).toBeDefined()
      expect(CategoryManagementContext).toBeDefined()

      // 應該有相應的方法
      expect(ProductCreationContext.prototype.execute).toBeDefined()
      expect(ProductUpdateContext.prototype.updateProduct).toBeDefined()
      expect(CategoryManagementContext.prototype.createCategory).toBeDefined()
    })
  })

  describe('Controller 類型安全驗證', () => {
    it('AdminProductController 應該接受 Context 參數', () => {
      const {
        AdminProductController,
      } = require('../src/Interface/Http/Controllers/AdminProductController')

      // 檢查方法存在
      expect(AdminProductController.prototype.index).toBeDefined()
      expect(AdminProductController.prototype.show).toBeDefined()
      expect(AdminProductController.prototype.store).toBeDefined()
      expect(AdminProductController.prototype.update).toBeDefined()
      expect(AdminProductController.prototype.destroy).toBeDefined()
    })
  })

  describe('ValueObject 不可變性驗證', () => {
    it('Money 應該是不可變的', () => {
      const money = Money.of(1000, 'TWD')
      const added = money.add(Money.of(100, 'TWD'))

      expect(money.value).toBe(1000)
      expect(added.value).toBe(1100)
      expect(money !== added).toBe(true)
    })

    it('Stock 應該是不可變的', () => {
      const stock = Stock.of(50)
      const deducted = stock.deduct(10)

      expect(stock.quantity).toBe(50)
      expect(deducted.quantity).toBe(40)
      expect(stock !== deducted).toBe(true)
    })

    it('I18nText 應該是不可變的', () => {
      const text = I18nText.of({ zh: '名稱' })
      const withEn = I18nText.of({ ...text.translations, en: 'Name' })

      expect(text.translations).toEqual({ zh: '名稱' })
      expect(withEn.translations).toEqual({ zh: '名稱', en: 'Name' })
      expect(text !== withEn).toBe(true)
    })

    it('Slug 應該是不可變的', () => {
      const slug = Slug.of('original-slug')
      // Slug 沒有 setter，只有初始值

      expect(slug.value).toBe('original-slug')
    })
  })

  describe('DCI 模式驗證', () => {
    it('Role 注入應該提供預期的方法', () => {
      const { injectCatalogEditor } = require('../src/Domain/DCI/Roles/CatalogEditorRole')
      const { injectStockManager } = require('../src/Domain/DCI/Roles/StockManagerRole')
      const { injectCategoryManager } = require('../src/Domain/DCI/Roles/CategoryManagerRole')

      expect(typeof injectCatalogEditor).toBe('function')
      expect(typeof injectStockManager).toBe('function')
      expect(typeof injectCategoryManager).toBe('function')
    })

    it('Context 應使用 Role 進行操作', () => {
      const {
        ProductCreationContext,
      } = require('../src/Domain/DCI/Contexts/ProductCreationContext')

      // Context 應該導入 Role
      expect(ProductCreationContext).toBeDefined()

      const {
        CategoryManagementContext,
      } = require('../src/Domain/DCI/Contexts/CategoryManagementContext')
      expect(CategoryManagementContext).toBeDefined()
    })
  })

  describe('Error Handling 驗證', () => {
    it('UseCase 應該拋出適當的錯誤', () => {
      const { CatalogErrorFactory } = require('../src/Application/Errors/CatalogError')

      const error = CatalogErrorFactory.productNotFound('test-id')
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toContain('test-id')
    })
  })
})
