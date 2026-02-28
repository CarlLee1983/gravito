import { ValueObject } from '@gravito/enterprise'
import { CatalogErrorFactory } from '../../Application/Errors/CatalogError'

/**
 * Slug 值物件屬性
 */
interface SlugProps {
  value: string
}

/**
 * Slug 值物件
 *
 * URL 友善的 slug，只允許小寫字母、數字和連字號。
 */
export class Slug extends ValueObject<SlugProps> {
  private constructor(props: SlugProps) {
    super(props)
  }

  /**
   * 建立 Slug 實例
   *
   * @param value - Slug 值（小寫英文、數字、連字號）
   */
  static of(value: string): Slug {
    if (!Slug.isValid(value)) {
      throw CatalogErrorFactory.invalidSlug(value)
    }
    return new Slug({ value })
  }

  /**
   * 驗證 slug 格式
   * - 由小寫字母、數字和連字號組成
   * - 不能以連字號開頭或結尾
   */
  private static isValid(value: string): boolean {
    if (typeof value !== 'string' || value.length === 0) {
      return false
    }
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  }

  /**
   * Slug 值
   */
  get value(): string {
    return this.props.value
  }
}
