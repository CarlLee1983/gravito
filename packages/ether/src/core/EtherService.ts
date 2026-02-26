/**
 * EtherService - 高階服務
 *
 * EtherService 是 OrbitEther 的核心服務，管理命名管道和條件檢查。
 * 提供統一的管道註冊和轉換介面。
 */

import { EtherPipeline } from './EtherPipeline'
import type { EtherConfig, PipelineContext } from './types'

/**
 * EtherService - Ether 核心服務
 *
 * 管理命名管道集合，支援動態註冊和條件選擇。
 * 用於 OrbitEther 容器整合。
 *
 * @example
 * ```typescript
 * const config: EtherConfig = {
 *   defaultPipeline: {
 *     name: 'default',
 *     rules: [createSecurityRule()]
 *   },
 *   pipelines: {
 *     'seo': {
 *       name: 'seo',
 *       rules: [createLinkRule({ external: { target: '_blank' } })],
 *       enabled: (ctx) => !ctx.url?.startsWith('/api/')
 *     }
 *   }
 * }
 *
 * const service = new EtherService(config)
 *
 * // 取得管道
 * const seoPipeline = service.getPipeline('seo')
 *
 * // 轉換
 * const ctx: PipelineContext = { url: '/page', contentType: 'text/html' }
 * const transformed = service.transform(response, 'seo', ctx)
 * ```
 */
export class EtherService {
  private readonly pipelines: Map<string, EtherPipeline>
  private readonly defaultPipeline?: EtherPipeline

  /**
   * 建立 EtherService 實例
   *
   * @param config - 服務配置
   */
  constructor(config: EtherConfig = {}) {
    const { defaultPipeline, pipelines } = config

    this.pipelines = new Map()

    // 建立預設管道（如果已配置）
    if (defaultPipeline) {
      const pipeline = EtherPipeline.create(defaultPipeline.name)
      const rulesArray = Array.from(defaultPipeline.rules)
      const pipelineWithRules = pipeline.addRule(rulesArray)

      const finalPipeline =
        defaultPipeline.enabled instanceof Function
          ? pipelineWithRules.enableWhen(defaultPipeline.enabled)
          : defaultPipeline.enabled === false
            ? pipelineWithRules.enableWhen(() => false)
            : pipelineWithRules

      this.defaultPipeline = finalPipeline
    }

    // 建立命名管道（如果已配置）
    if (pipelines) {
      for (const [name, pipelineConfig] of Object.entries(pipelines)) {
        const pipeline = EtherPipeline.create(name)
        const rulesArray = Array.from(pipelineConfig.rules)
        const pipelineWithRules = pipeline.addRule(rulesArray)

        const finalPipeline =
          pipelineConfig.enabled instanceof Function
            ? pipelineWithRules.enableWhen(pipelineConfig.enabled)
            : pipelineConfig.enabled === false
              ? pipelineWithRules.enableWhen(() => false)
              : pipelineWithRules

        this.pipelines.set(name, finalPipeline)
      }
    }
  }

  /**
   * 取得命名管道
   *
   * @param name - 管道名稱
   * @returns 管道實例或 undefined
   */
  getPipeline(name: string): EtherPipeline | undefined {
    return this.pipelines.get(name)
  }

  /**
   * 取得所有管道
   *
   * 回傳新 Map 副本（唯讀）。
   *
   * @returns 所有管道的唯讀 Map
   */
  getAllPipelines(): ReadonlyMap<string, EtherPipeline> {
    return new Map(this.pipelines)
  }

  /**
   * 轉換 Response
   *
   * 支援三種使用方式：
   * 1. 指定管道名稱：使用該管道轉換
   * 2. 不指定名稱：使用預設管道（如果已配置）
   * 3. 都不指定：回傳原 Response
   *
   * 如果提供 ctx，會檢查管道是否應該啟用。
   *
   * @param response - 待轉換的 Response
   * @param pipelineName - 可選的管道名稱
   * @param ctx - 可選的管道執行上下文
   * @returns 轉換後的 Response 或原 Response
   */
  transform(response: Response, pipelineName?: string, ctx?: PipelineContext): Response {
    let pipeline: EtherPipeline | undefined

    if (pipelineName) {
      // 使用指定的命名管道
      pipeline = this.pipelines.get(pipelineName)
    } else {
      // 使用預設管道
      pipeline = this.defaultPipeline
    }

    if (!pipeline) {
      // 無可用管道，回傳原 Response
      return response
    }

    // 檢查管道是否應該啟用
    const shouldApply = ctx ? pipeline.shouldApply(ctx) : true

    if (!shouldApply) {
      return response
    }

    // 執行轉換
    return pipeline.transform(response)
  }

  /**
   * 註冊新管道（用於動態註冊）
   *
   * @param pipeline - 要註冊的管道實例
   */
  registerPipeline(pipeline: EtherPipeline): void {
    this.pipelines.set(pipeline.name, pipeline)
  }
}
