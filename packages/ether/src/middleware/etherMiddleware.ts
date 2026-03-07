/**
 * @gravito/ether - Ether Middleware for Photon
 *
 * 提供 HTML 轉換中介軟體，可直接用於 Photon 應用
 * 支援規則和管道的靈活組合
 */

import type { EtherPipeline } from '../core/EtherPipeline'
import { EtherRewriter } from '../core/EtherRewriter'
import type { DocumentRule, PipelineContext, TransformRule } from '../core/types'

/**
 * Ether Middleware 配置選項
 */
export interface EtherMiddlewareOptions {
  /**
   * 轉換規則列表
   * 會依序套用到 Response 中
   */
  readonly rules?: TransformRule[]

  /**
   * 文檔級規則列表
   */
  readonly documentRules?: DocumentRule[]

  /**
   * 命名管道列表
   * 可以根據條件選擇性啟用
   */
  readonly pipelines?: EtherPipeline[]

  /**
   * Content-Type 篩選
   * 只有符合這些 Content-Type 的回應才會被轉換
   * 預設: ['text/html', 'application/xhtml+xml']
   */
  readonly contentTypes?: string[]

  /**
   * 調試模式
   * 啟用時會輸出轉換日誌
   */
  readonly debug?: boolean
}

/**
 * 建立 Ether Middleware
 *
 * 提供一個 Photon 中介軟體工廠函式，用於 HTML 轉換。
 * 該中介軟體會在下游處理完成後檢查 Content-Type，
 * 然後套用指定的規則和管道進行轉換。
 *
 * @param options - 中介軟體配置選項
 * @returns Photon 中介軟體處理函式
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { etherMiddleware, createSecurityRule } from '@gravito/ether'
 *
 * const app = new Photon()
 *
 * // 全域中介軟體
 * app.use('*', etherMiddleware({
 *   rules: [createSecurityRule({ cspNonce: true })]
 * }))
 *
 * // 路由特定中介軟體
 * app.use('/api/secure/*', etherMiddleware({
 *   rules: [createSecurityRule({ secureLinkAttrs: true })]
 * }))
 * ```
 */
export function etherMiddleware(options: EtherMiddlewareOptions = {}) {
  // 準備配置
  const contentTypes = options.contentTypes ?? ['text/html', 'application/xhtml+xml']
  const allowedTypes = new Set(contentTypes)
  const rewriter = new EtherRewriter(options.rules ?? [], options.documentRules ?? [])
  const pipelines = options.pipelines ?? []
  const debug = options.debug ?? false

  // 回傳中介軟體處理函式
  return async (c: any, next: any) => {
    // 執行下游中介軟體和路由處理器
    await next()

    // 檢查 Content-Type 是否需要轉換
    const contentType = c.res.headers.get('Content-Type') ?? ''
    const shouldTransform = [...allowedTypes].some((t) => contentType.includes(t))

    // 如果不是可轉換的 Content-Type，直接回傳
    if (!shouldTransform) {
      if (debug) {
        console.log(`[EtherMiddleware] Skipped (Content-Type: ${contentType})`)
      }
      return
    }

    // 建立管道執行上下文
    const ctx: PipelineContext = {
      url: c.req.url,
      contentType,
      metadata: {
        method: c.req.method,
        path: c.req.path,
        timestamp: Date.now(),
      },
    }

    // 開始轉換
    let response = c.res

    // 1. 先套用直接規則（如果有）
    if (
      (options.rules && options.rules.length > 0) ||
      (options.documentRules && options.documentRules.length > 0)
    ) {
      response = rewriter.transform(response)

      if (debug) {
        console.log(
          `[EtherMiddleware] Applied rules (Transform: ${options.rules?.length ?? 0}, Document: ${options.documentRules?.length ?? 0})`
        )
      }
    }

    // 2. 再套用管道（如果有）
    if (pipelines.length > 0) {
      for (const pipeline of pipelines) {
        // 檢查管道是否應該啟用
        if (pipeline.shouldApply(ctx)) {
          response = pipeline.transform(response)

          if (debug) {
            console.log(`[EtherMiddleware] Applied pipeline: ${pipeline.name}`)
          }
        } else if (debug) {
          console.log(`[EtherMiddleware] Skipped pipeline: ${pipeline.name} (condition failed)`)
        }
      }
    }

    // 更新回應物件
    c.res = response

    if (debug) {
      console.log(`[EtherMiddleware] Transformation complete`)
    }
  }
}
