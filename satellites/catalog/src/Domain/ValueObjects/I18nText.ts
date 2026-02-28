import { ValueObject } from '@gravito/enterprise'

/**
 * I18nText 值物件屬性
 */
interface I18nTextProps {
  translations: Record<string, string>
}

/**
 * I18nText 值物件
 *
 * 多語言文本值物件，至少需要一個語言的翻譯。
 */
export class I18nText extends ValueObject<I18nTextProps> {
  private constructor(props: I18nTextProps) {
    super(props)
  }

  /**
   * 建立 I18nText 實例
   *
   * @param translations - 語言 -> 文本的映射，至少需要一個
   */
  static of(translations: Record<string, string>): I18nText {
    if (!translations || Object.keys(translations).length === 0) {
      throw new Error('I18nText must have at least one translation')
    }
    return new I18nText({ translations: { ...translations } })
  }

  /**
   * 所有翻譯（唯讀複本）
   */
  get translations(): Record<string, string> {
    return { ...this.props.translations }
  }

  /**
   * 取得特定語言的文本
   *
   * @param locale - 語言代碼（如 'en', 'zh-TW'）
   * @param fallback - 備用文本（當語言不存在時使用）
   */
  getText(locale: string, fallback?: string): string {
    return this.props.translations[locale] ?? fallback ?? ''
  }

  /**
   * 檢查是否包含特定語言
   */
  hasLocale(locale: string): boolean {
    return locale in this.props.translations
  }

  /**
   * 取得可用的語言清單
   */
  getAvailableLocales(): string[] {
    return Object.keys(this.props.translations)
  }
}
