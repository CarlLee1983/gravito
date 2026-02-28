/**
 * Product DTO 與 Mapper
 *
 * 負責 Product Entity <-> ProductDTO 的雙向轉換。
 * ProductDTO 用於 API 回傳，將 Money/Stock 值物件轉換為基本型別。
 */

import { Product } from '../../Domain/Entities/Product'
import type { ProductStatus } from '../../Domain/Models'
import { Money } from '../../Domain/ValueObjects/Money'
import { Stock } from '../../Domain/ValueObjects/Stock'

/**
 * ProductStockDTO - 商品庫存 API 回傳格式
 */
export interface ProductStockDTO {
  quantity: number
  isAvailable: boolean
}

/**
 * ProductDTO - 商品 API 回傳格式
 */
export interface ProductDTO {
  id: string
  name: string
  sku: string
  description: string
  /** 售價（十進位） */
  price: number
  /** 成本（十進位） */
  cost: number
  stock: ProductStockDTO
  status: ProductStatus
  images: string[]
  createdAt: Date
}

/**
 * CreateProductDTO - 建立商品的輸入格式
 */
export interface CreateProductDTO {
  id: string
  name: string
  sku: string
  description: string
  /** 售價（十進位） */
  price: number
  /** 成本（十進位） */
  cost: number
  stock: number
  images: string[]
}

/**
 * ProductMapper
 *
 * 統一的 Product 轉換邏輯
 */
export class ProductMapper {
  /**
   * 將 CreateProductDTO 轉換為 Product Entity
   *
   * @param dto - API 輸入的建立商品資料
   * @returns Product Entity
   */
  static toDomain(dto: CreateProductDTO): Product {
    return Product.create(
      dto.id,
      dto.name,
      dto.sku,
      dto.description,
      Money.of(dto.price),
      Money.of(dto.cost),
      Stock.of(dto.stock),
      dto.images
    )
  }

  /**
   * 將 Product Entity 轉換為 ProductDTO
   *
   * @param product - Product Entity
   * @returns ProductDTO（Money/Stock 轉為基本型別）
   */
  static toDTO(product: Product): ProductDTO {
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      description: product.description,
      price: product.price.value,
      cost: product.cost.value,
      stock: {
        quantity: product.stock.quantity,
        isAvailable: product.stock.isAvailable,
      },
      status: product.status,
      images: [...product.images],
      createdAt: product.createdAt,
    }
  }

  /**
   * 將 Product Entity 陣列轉換為 ProductDTO 陣列
   *
   * @param products - Product Entity 陣列
   * @returns ProductDTO 陣列
   */
  static toDTOList(products: Product[]): ProductDTO[] {
    return products.map((product) => ProductMapper.toDTO(product))
  }
}
