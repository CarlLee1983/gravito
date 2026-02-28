/**
 * 商品目錄系統特定的業務錯誤
 */
export class CatalogError extends Error {
  constructor(
    public code: CatalogErrorCode,
    message: string,
    public statusCode = 400
  ) {
    super(message)
    this.name = 'CatalogError'
  }
}

export type CatalogErrorCode =
  | 'PRODUCT_NOT_FOUND'
  | 'CATEGORY_NOT_FOUND'
  | 'VARIANT_NOT_FOUND'
  | 'INSUFFICIENT_STOCK'
  | 'INVALID_QUANTITY'
  | 'INVALID_PRICE'
  | 'DUPLICATE_SKU'
  | 'DUPLICATE_SLUG'
  | 'INVALID_SLUG'
  | 'INVALID_STATUS_TRANSITION'
  | 'CATEGORY_CIRCULAR_REFERENCE'
  | 'CATEGORY_HAS_PRODUCTS'

/**
 * 靜態工廠方法集
 */
export const CatalogErrorFactory = {
  productNotFound: (id: string): CatalogError =>
    new CatalogError('PRODUCT_NOT_FOUND', `Product not found: ${id}`, 404),

  categoryNotFound: (id: string): CatalogError =>
    new CatalogError('CATEGORY_NOT_FOUND', `Category not found: ${id}`, 404),

  variantNotFound: (id: string): CatalogError =>
    new CatalogError('VARIANT_NOT_FOUND', `Variant not found: ${id}`, 404),

  insufficientStock: (available: number, requested: number): CatalogError =>
    new CatalogError(
      'INSUFFICIENT_STOCK',
      `Insufficient stock: ${available} available, ${requested} requested`,
      400
    ),

  invalidQuantity: (quantity: number): CatalogError =>
    new CatalogError(
      'INVALID_QUANTITY',
      `Invalid quantity: ${quantity}. Must be a positive integer`,
      400
    ),

  invalidPrice: (price: number): CatalogError =>
    new CatalogError('INVALID_PRICE', `Invalid price: ${price}. Must be non-negative`, 400),

  duplicateSku: (sku: string): CatalogError =>
    new CatalogError('DUPLICATE_SKU', `Duplicate SKU: ${sku} already exists`, 409),

  duplicateSlug: (slug: string): CatalogError =>
    new CatalogError('DUPLICATE_SLUG', `Duplicate slug: ${slug} already exists`, 409),

  invalidSlug: (slug: string): CatalogError =>
    new CatalogError(
      'INVALID_SLUG',
      `Invalid slug format: ${slug}. Must contain only lowercase letters, numbers, and hyphens`,
      400
    ),

  invalidStatusTransition: (from: string, to: string): CatalogError =>
    new CatalogError(
      'INVALID_STATUS_TRANSITION',
      `Invalid status transition from ${from} to ${to}`,
      400
    ),

  categoryCircularReference: (categoryId: string): CatalogError =>
    new CatalogError(
      'CATEGORY_CIRCULAR_REFERENCE',
      `Cannot move category ${categoryId}: would create circular reference`,
      400
    ),

  categoryHasProducts: (categoryId: string): CatalogError =>
    new CatalogError(
      'CATEGORY_HAS_PRODUCTS',
      `Cannot delete category ${categoryId}: it contains products`,
      400
    ),
}
