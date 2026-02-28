import { ValueObject } from '@gravito/enterprise'
import { AdError } from '../Errors/AdError'

/**
 * 預定義廣告版位
 */
export enum AdSlot {
  HOME_HERO = 'HOME_HERO',
  HOME_BANNER = 'HOME_BANNER',
  PRODUCT_SIDEBAR = 'PRODUCT_SIDEBAR',
  CATEGORY_TOP = 'CATEGORY_TOP',
  CHECKOUT_BOTTOM = 'CHECKOUT_BOTTOM',
}

/** 合法 slug 格式：大寫字母 + 底線，至少一個字母 */
const SLUG_PATTERN = /^[A-Z]+(?:_[A-Z]+)*$/

/** 預定義版位值集合 */
const PREDEFINED_SLOTS = new Set<string>(Object.values(AdSlot))

/**
 * 廣告版位值物件
 *
 * 驗證並管理廣告版位 slug。
 * slug 必須為大寫字母 + 底線格式（如 HOME_HERO、CUSTOM_SIDEBAR）。
 */
export class SlotSlug extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value })
  }

  /**
   * 建立 SlotSlug 實例
   *
   * @param slug - 版位標識（必須為大寫字母 + 底線格式）
   * @throws AdError.invalidSlot 當格式不符時
   */
  static of(slug: string): SlotSlug {
    if (!SLUG_PATTERN.test(slug)) {
      throw AdError.invalidSlot(slug)
    }
    return new SlotSlug(slug)
  }

  /**
   * 從資料庫重建 SlotSlug（無驗證）
   *
   * @param slug - 版位標識
   */
  static reconstitute(slug: string): SlotSlug {
    return new SlotSlug(slug)
  }

  /**
   * 版位標識值
   */
  get value(): string {
    return this.props.value
  }

  /**
   * 是否為預定義版位
   */
  isPredefined(): boolean {
    return PREDEFINED_SLOTS.has(this.props.value)
  }
}
