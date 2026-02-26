import { app } from '@gravito/core'
import type { Product, Variant } from '../../Domain/Entities/Product'

export interface VariantDTO {
  id: string
  sku: string
  name: string | null
  price: number
  compareAtPrice: number | null
  stock: number
  options: Record<string, string>
}

export interface ProductDTO {
  id: string
  name: Record<string, string>
  slug: string
  description?: string
  brand?: string
  status: string
  thumbnailUrl?: string
  variants: VariantDTO[]
  categoryIds: string[]
  createdAt: string
}

export class ProductMapper {
  static toDTO(product: Product): ProductDTO {
    let thumbnailUrl: string | undefined

    if (product.thumbnail) {
      try {
        const storage = app().container.make('storage') as any
        if (storage) {
          thumbnailUrl = storage.getUrl(product.thumbnail)
        }
      } catch (_e) {
        // Fallback to key if storage not available or core not booted
        thumbnailUrl = `/storage/${product.thumbnail}`
      }
    }

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      brand: product.brand,
      status: product.status,
      thumbnailUrl,
      variants: product.variants.map((v) => this.variantToDTO(v)),
      categoryIds: product.categoryIds,
      createdAt: product.createdAt.toISOString(),
    }
  }

  private static variantToDTO(variant: Variant): VariantDTO {
    return {
      id: variant.id,
      sku: variant.sku,
      name: variant.name,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice,
      stock: variant.stock,
      options: variant.options,
    }
  }
}
