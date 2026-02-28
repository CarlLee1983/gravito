/**
 * 廣告 DTO 介面
 *
 * 用於 API 回應和應用層通訊，所有日期以 ISO 8601 字串表示。
 */
export interface AdDTO {
  id: string
  slotSlug: string
  title: string
  imageUrl: string
  targetUrl: string
  weight: number
  status: string
  startsAt: string
  endsAt: string
  isDeliverable: boolean
  daysRemaining: number
  createdAt: string
  updatedAt: string
  metadata?: Record<string, unknown>
}
