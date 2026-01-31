/**
 * @file packages/cosmos/src/loaders/CloudflareKVLoader.ts
 * @module @gravito/cosmos/loaders
 * @description Cloudflare Workers KV 載入器
 */

import type { TranslationMap } from '../I18nService'
import type { KVStorage } from './EdgeKVLoader'
import { EdgeKVLoader } from './EdgeKVLoader'
import type { LoaderConfig, TranslationLoader, TranslationLoaderChain } from './TranslationLoader'

/**
 * Cloudflare Workers KV 適配器
 *
 * 將 Cloudflare KV Namespace 適配到 KVStorage 介面
 *
 * @internal
 * @since 3.2.0
 */
export class CloudflareKVAdapter implements KVStorage {
  constructor(private namespace: KVNamespace) {}

  async get(key: string): Promise<string | null> {
    return this.namespace.get(key, 'text')
  }

  async put(key: string, value: string): Promise<void> {
    await this.namespace.put(key, value)
  }

  async delete(key: string): Promise<void> {
    await this.namespace.delete(key)
  }
}

/**
 * Cloudflare KV 載入器配置
 *
 * @public
 * @since 3.2.0
 */
export interface CloudflareKVLoaderConfig extends LoaderConfig {
  /**
   * Cloudflare KV Namespace
   *
   * 在 wrangler.toml 中定義的 KV binding
   *
   * @example
   * ```toml
   * # wrangler.toml
   * [[kv_namespaces]]
   * binding = "I18N_KV"
   * id = "your-namespace-id"
   * ```
   */
  namespace: KVNamespace

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
 * Cloudflare Workers KV 載入器
 *
 * 從 Cloudflare Workers KV 載入翻譯資源
 *
 * @public
 * @since 3.2.0
 *
 * @example
 * ```typescript
 * // worker.ts
 * import { OrbitCosmos, CloudflareKVLoader } from '@gravito/cosmos/edge'
 *
 * export interface Env {
 *   I18N_KV: KVNamespace
 * }
 *
 * export default {
 *   async fetch(request: Request, env: Env) {
 *     const cosmos = new OrbitCosmos({
 *       defaultLocale: 'en',
 *       supportedLocales: ['en', 'zh-TW'],
 *       loaders: [
 *         new CloudflareKVLoader({
 *           namespace: env.I18N_KV,
 *           prefix: 'translations'
 *         })
 *       ]
 *     })
 *
 *     // ... rest of your worker
 *   }
 * }
 * ```
 *
 * ## 上傳翻譯到 KV
 *
 * 使用 wrangler 命令上傳翻譯檔案:
 *
 * ```bash
 * # 上傳單個語言
 * wrangler kv:key put --binding I18N_KV "i18n:zh-TW" "$(cat lang/zh-TW.json)"
 *
 * # 批次上傳
 * for file in lang/*.json; do
 *   locale=$(basename "$file" .json)
 *   wrangler kv:key put --binding I18N_KV "i18n:$locale" "$(cat $file)"
 * done
 * ```
 *
 * ## 特點
 *
 * - **全球邊緣快取**: 翻譯資料快取在全球邊緣節點
 * - **低延遲**: 通常 <100ms 讀取時間
 * - **高可用性**: Cloudflare 的全球網路
 * - **動態更新**: 可以動態更新翻譯而無需重新部署
 */
export class CloudflareKVLoader implements TranslationLoaderChain {
  private loader: EdgeKVLoader

  /**
   * 建立 Cloudflare KV 載入器實例
   *
   * @param config - 載入器配置
   */
  constructor(config: CloudflareKVLoaderConfig) {
    const adapter = new CloudflareKVAdapter(config.namespace)
    this.loader = new EdgeKVLoader({
      storage: adapter,
      prefix: config.prefix,
      keyTemplate: config.keyTemplate,
      name: config.name || 'CloudflareKVLoader',
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
   * 儲存翻譯資源到 Cloudflare KV
   *
   * @param locale - 語言代碼
   * @param translations - 翻譯資源
   */
  async put(locale: string, translations: TranslationMap): Promise<void> {
    return this.loader.put(locale, translations)
  }

  /**
   * 從 Cloudflare KV 刪除翻譯資源
   *
   * @param locale - 語言代碼
   */
  async delete(locale: string): Promise<void> {
    return this.loader.delete(locale)
  }
}
