import { UseCase } from '@gravito/enterprise'
import type { IAdRepository } from '../../Domain/Contracts/IAdRepository'
import type { AdStatus } from '../../Domain/Entities/Advertisement'
import type { AdDTO } from '../DTOs/AdDTO'
import { AdMapper } from '../DTOs/AdMapper'

/** 預設每頁數量 */
const DEFAULT_LIMIT = 20
/** 最大每頁數量 */
const MAX_LIMIT = 100

/**
 * ListAdsUseCase 輸入
 */
export interface ListAdsInput {
  status?: 'draft' | 'active' | 'paused'
  slotSlug?: string
  limit?: number
  offset?: number
}

/**
 * ListAdsUseCase 輸出
 */
export interface ListAdsOutput {
  items: AdDTO[]
  total: number
  limit: number
  offset: number
}

/**
 * ListAdsUseCase
 *
 * 查詢廣告列表，支援狀態和版位篩選以及分頁。
 * 直接使用 Repository 的 findAll，不需 DCI Context。
 */
export class ListAdsUseCase extends UseCase<ListAdsInput, ListAdsOutput> {
  constructor(private readonly adRepository: IAdRepository) {
    super()
  }

  async execute(input: ListAdsInput): Promise<ListAdsOutput> {
    const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT)
    const offset = Math.max(input.offset ?? 0, 0)

    const { items, total } = await this.adRepository.findAll({
      status: input.status as AdStatus | undefined,
      slotSlug: input.slotSlug,
      limit,
      offset,
    })

    return {
      items: AdMapper.toListDTO(items),
      total,
      limit,
      offset,
    }
  }
}
