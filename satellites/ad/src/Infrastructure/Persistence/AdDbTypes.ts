import type { AdStatus } from '../../Domain/Entities/Advertisement'
import { Advertisement } from '../../Domain/Entities/Advertisement'
import { AdSchedule } from '../../Domain/ValueObjects/AdSchedule'
import { AdWeight } from '../../Domain/ValueObjects/AdWeight'
import { SlotSlug } from '../../Domain/ValueObjects/SlotSlug'

/**
 * 資料庫行型別定義
 *
 * 對應 advertisements 資料表的欄位結構。
 * 時間欄位支援 string（ISO 8601）和 Date 兩種格式。
 */
export interface AdvertisementRow {
  id: string
  slot_slug: string
  title: string
  image_url: string
  target_url: string
  weight: number
  status: string
  starts_at: string | Date
  ends_at: string | Date
  metadata: string | null
  created_at: string | Date
  updated_at: string | Date
}

/**
 * 有效的廣告狀態值
 */
const VALID_STATUSES = new Set<string>(['draft', 'active', 'paused'])

/**
 * 檢查字串是否為有效的 AdStatus 值
 */
function isValidAdStatus(value: string): value is AdStatus {
  return VALID_STATUSES.has(value)
}

/**
 * 型別守衛：判斷 unknown 值是否為有效的 AdvertisementRow
 *
 * 檢查所有必要欄位是否存在且型別正確。
 */
export function isAdvertisementRow(row: unknown): row is AdvertisementRow {
  if (row === null || row === undefined || typeof row !== 'object') {
    return false
  }

  const r = row as Record<string, unknown>

  // 檢查字串欄位
  if (typeof r.id !== 'string') return false
  if (typeof r.slot_slug !== 'string') return false
  if (typeof r.title !== 'string') return false
  if (typeof r.image_url !== 'string') return false
  if (typeof r.target_url !== 'string') return false
  if (typeof r.status !== 'string') return false
  // 驗證 status 是有效的枚舉值
  if (!isValidAdStatus(r.status)) return false

  // 檢查數字欄位
  if (typeof r.weight !== 'number') return false

  // 檢查時間欄位（string 或 Date）
  if (typeof r.starts_at !== 'string' && !(r.starts_at instanceof Date)) return false
  if (typeof r.ends_at !== 'string' && !(r.ends_at instanceof Date)) return false
  if (typeof r.created_at !== 'string' && !(r.created_at instanceof Date)) return false
  if (typeof r.updated_at !== 'string' && !(r.updated_at instanceof Date)) return false

  // metadata 可以是 null 或 string
  if (r.metadata !== null && typeof r.metadata !== 'string') return false

  return true
}

/**
 * 將時間欄位轉換為 Date 物件
 *
 * 支援 string（ISO 8601）和 Date 兩種格式。
 */
function toDate(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(value.getTime())
  }
  return new Date(value)
}

/**
 * 將 JSON 字串解析為 metadata 物件
 *
 * null 回傳空物件，無效 JSON 也回傳空物件。
 */
function parseMetadata(value: string | null): Record<string, unknown> {
  if (value === null) {
    return {}
  }
  try {
    const parsed: unknown = JSON.parse(value)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    return {}
  } catch {
    return {}
  }
}

/**
 * 從資料庫行重建 Advertisement 實體
 *
 * 使用 reconstitute 方法跳過驗證，直接從已持久化的資料重建。
 * 所有 ValueObject 也使用 reconstitute 方法建立。
 */
export function reconstituteAdvertisement(row: AdvertisementRow): Advertisement {
  const slotSlug = SlotSlug.reconstitute(row.slot_slug)
  const weight = AdWeight.reconstitute(row.weight)
  const schedule = AdSchedule.reconstitute(toDate(row.starts_at), toDate(row.ends_at))

  // Status has already been validated by isAdvertisementRow type guard
  const status = row.status as AdStatus

  return Advertisement.reconstitute(row.id, {
    slotSlug,
    title: row.title,
    imageUrl: row.image_url,
    targetUrl: row.target_url,
    weight,
    status,
    schedule,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
    metadata: parseMetadata(row.metadata),
  })
}
