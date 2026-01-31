/**
 * @file packages/cosmos/src/loaders/VercelKVLoader.ts
 * @module @gravito/cosmos/loaders
 * @description Vercel KV 載入器
 */

import type { TranslationMap } from '../I18nService'
import type { KVStorage } from './EdgeKVLoader'
import { EdgeKVLoader } from './EdgeKVLoader'
import type { LoaderConfig, TranslationLoader, TranslationLoaderChain } from './TranslationLoader'

/**
 * Vercel KV 適配器
 *
 * 將 @vercel/kv 適配到 KVStorage 介面
 *
 * @internal
 * @since 3.2.0
 */
export class VercelKVAdapter implements KVStorage {
  constructor(private kv: any) {} // @vercel/kv 型別

  async get(key: string): Promise<string | null> {
    return this.kv.get(key)
  }

  async put(key: string, value: string): Promise<void> {
    await this.kv.set(key, value)
  }

  async delete(key: string): Promise<void> {
    await this.kv.del(key)
  }
}

/**
 * Vercel KV 載入器配置
 *
 * @public
 * @since 3.2.0
 */
export interface VercelKVLoaderConfig extends LoaderConfig {
  /**
   * Vercel KV 實例
   *
   * 從 @vercel/kv 導入
   *
   * @example
   * ```typescript
   * import { kv } from '@vercel/kv'
   *
   * const loader = new VercelKVLoader({ kv })
   * ```
   */
  kv: any // @vercel/kv

  /**
   * Key 前綴
   *
   * @default 'i18n'
   */
  prefix?: string

  /**
   * Key 模板
   *
   * @default ':prefix::locale'
   */
  keyTemplate?: string
}

/**
 * Vercel KV 載入器
 *
 * 從 Vercel KV (基於 Redis) 載入翻譯資源
 *
 * @public
 * @since 3.2.0
 *
 * @example
 * ```typescript
 * // app/api/route.ts (Vercel Edge Function)
 * import { OrbitCosmos, VercelKVLoader } from '@gravito/cosmos/edge'
 * import { kv } from '@vercel/kv'
 *
 * const cosmos = new OrbitCosmos({
 *   defaultLocale: 'en',
 *   supportedLocales: ['en', 'zh-TW'],
 *   loaders: [
 *     new VercelKVLoader({
 *       kv,
 *       prefix: 'i18n'
 *     })
 *   ]
 * })
 *
 * export async function GET() {
 *   const i18n = cosmos.clone('zh-TW')
 *   await i18n.ensureLocale('zh-TW')
 *   return new Response(i18n.t('welcome'))
 * }
 * ```
 *
 * ## 上傳翻譯到 Vercel KV
 *
 * 使用 Vercel CLI 或 API 上傳翻譯:
 *
 * ```typescript
 * // scripts/upload-translations.ts
 * import { kv } from '@vercel/kv'
 * import { readFileSync } from 'fs'
 *
 * const locales = ['en', 'zh-TW', 'ja']
 *
 * for (const locale of locales) {
 *   const translations = JSON.parse(
 *     readFileSync(`./lang/${locale}.json`, 'utf-8')
 *   )
 *   await kv.set(`i18n:${locale}`, JSON.stringify(translations))
 *   console.log(`Uploaded ${locale}`)
 * }
 * ```
 *
 * ## 特點
 *
 * - **基於 Redis**: 高效能的記憶體資料庫
 * - **全球複製**: 資料複製到多個區域
 * - **低延遲**: Edge 環境快速存取
 * - **動態更新**: 即時更新翻譯
 * - **TTL 支援**: 可設定過期時間
 *
 * ## 環境變數
 *
 * 需要在 Vercel 專案中設定:
 *
 * ```env
 * KV_URL=your-kv-url
 * KV_REST_API_URL=your-api-url
 * KV_REST_API_TOKEN=your-api-token
 * KV_REST_API_READ_ONLY_TOKEN=your-read-only-token
 * ```
 */
export class VercelKVLoader implements TranslationLoaderChain {
  private loader: EdgeKVLoader

  /**
   * 建立 Vercel KV 載入器實例
   *
   * @param config - 載入器配置
   */
  constructor(config: VercelKVLoaderConfig) {
    const adapter = new VercelKVAdapter(config.kv)
    this.loader = new EdgeKVLoader({
      storage: adapter,
      prefix: config.prefix,
      keyTemplate: config.keyTemplate,
      name: config.name || 'VercelKVLoader',
    })
  }

  get name(): string {
    return this.loader.name
  }

  async load(locale: string): Promise<TranslationMap | null> {
    return this.loader.load(locale)
  }

  fallback(loader: TranslationLoader): TranslationLoaderChain {
    this.loader.fallback(loader)
    return this
  }

  /**
   * 儲存翻譯資源到 Vercel KV
   *
   * @param locale - 語言代碼
   * @param translations - 翻譯資源
   */
  async put(locale: string, translations: TranslationMap): Promise<void> {
    return this.loader.put(locale, translations)
  }

  /**
   * 從 Vercel KV 刪除翻譯資源
   *
   * @param locale - 語言代碼
   */
  async delete(locale: string): Promise<void> {
    return this.loader.delete(locale)
  }
}
