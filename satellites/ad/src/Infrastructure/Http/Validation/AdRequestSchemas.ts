import { z } from 'zod'

/**
 * ISO 8601 日期字串驗證
 */
const isoDateString = z
  .string()
  .refine((val) => !Number.isNaN(Date.parse(val)), { message: '必須是有效的 ISO 8601 日期字串' })

/**
 * 建立廣告請求 Schema
 *
 * 驗證 POST /api/admin/v1/ads 的請求內容。
 */
export const CreateAdSchema = z.object({
  slotSlug: z.string().min(1),
  title: z.string().min(1),
  imageUrl: z.string().url(),
  targetUrl: z.string().url(),
  weight: z.number().int().min(1).max(10),
  startsAt: isoDateString,
  endsAt: isoDateString,
  activateImmediately: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

/**
 * 更新廣告請求 Schema
 *
 * 驗證 PUT /api/admin/v1/ads/:id 的請求內容。
 * 所有欄位皆為可選（部分更新）。
 */
export const UpdateAdSchema = z.object({
  title: z.string().min(1).optional(),
  imageUrl: z.string().url().optional(),
  targetUrl: z.string().url().optional(),
  weight: z.number().int().min(1).max(10).optional(),
  startsAt: isoDateString.optional(),
  endsAt: isoDateString.optional(),
})

/**
 * 切換廣告狀態請求 Schema
 *
 * 驗證 PATCH /api/admin/v1/ads/:id/status 的請求內容。
 */
export const ToggleStatusSchema = z.object({
  action: z.enum(['activate', 'pause']),
})

/**
 * 廣告投放請求 Schema
 *
 * 驗證 POST /api/v1/ads/delivery 的請求內容。
 */
export const DeliverAdSchema = z.object({
  slotSlug: z.string().min(1),
  count: z.number().int().min(1).max(10).optional(),
})

/**
 * 廣告列表查詢參數 Schema
 *
 * 驗證 GET /api/admin/v1/ads 的 query 參數。
 * limit/offset 從字串轉換為數字（query string 傳遞的值為字串）。
 */
export const ListAdsQuerySchema = z.object({
  status: z.enum(['draft', 'active', 'paused']).optional(),
  slotSlug: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

/**
 * Schema 型別匯出
 */
export type CreateAdInput = z.infer<typeof CreateAdSchema>
export type UpdateAdInput = z.infer<typeof UpdateAdSchema>
export type ToggleStatusInput = z.infer<typeof ToggleStatusSchema>
export type DeliverAdInput = z.infer<typeof DeliverAdSchema>
export type ListAdsQuery = z.infer<typeof ListAdsQuerySchema>
