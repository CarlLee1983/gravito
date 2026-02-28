import type { Advertisement, AdvertisementProps } from '../../Domain/Entities/Advertisement'
import type { AdDTO } from './AdDTO'

/**
 * 廣告 Mapper
 *
 * 將 Advertisement Aggregate 轉換為 DTO 用於 API 回應。
 * 所有日期轉為 ISO 8601 字串，ValueObject 轉為原始值。
 */
export class AdMapper {
  /**
   * 將單個廣告轉換為 DTO
   */
  static toDTO(ad: Advertisement): AdDTO {
    const metadata = ad.metadata
    const hasMetadata = Object.keys(metadata).length > 0

    return {
      id: ad.id,
      slotSlug: ad.slotSlug.value,
      title: ad.title,
      imageUrl: ad.imageUrl,
      targetUrl: ad.targetUrl,
      weight: ad.weight.value,
      status: ad.status,
      startsAt: ad.schedule.startsAt.toISOString(),
      endsAt: ad.schedule.endsAt.toISOString(),
      isDeliverable: ad.isDeliverable(),
      daysRemaining: ad.schedule.daysRemaining(),
      createdAt: ad.createdAt.toISOString(),
      updatedAt: ad.updatedAt.toISOString(),
      metadata: hasMetadata ? metadata : undefined,
    }
  }

  /**
   * 將廣告列表轉換為 DTO 列表
   */
  static toListDTO(ads: Advertisement[]): AdDTO[] {
    return ads.map((ad) => this.toDTO(ad))
  }

  /**
   * 將廣告轉換為持久化 DTO（Repository 使用）
   */
  static toPersistenceDTO(ad: Advertisement): AdvertisementProps {
    return ad.toProps()
  }
}
