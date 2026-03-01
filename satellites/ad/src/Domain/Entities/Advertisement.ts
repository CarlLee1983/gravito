import { AggregateRoot } from '@gravito/enterprise'
import { AdError } from '../Errors/AdError'
import type { AdSchedule } from '../ValueObjects/AdSchedule'
import type { AdWeight } from '../ValueObjects/AdWeight'
import type { SlotSlug } from '../ValueObjects/SlotSlug'

/**
 * 廣告狀態
 */
export enum AdStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
}

/**
 * Advertisement 屬性介面
 */
export interface AdvertisementProps {
  slotSlug: SlotSlug
  title: string
  imageUrl: string
  targetUrl: string
  weight: AdWeight
  status: AdStatus
  schedule: AdSchedule
  createdAt: Date
  updatedAt: Date
  metadata?: Record<string, unknown>
}

/**
 * Advertisement AggregateRoot
 *
 * 廣告聚合根，管理廣告的完整生命週期。
 * 使用私有欄位控制狀態修改，確保一致性。
 *
 * 狀態機：
 *   DRAFT --activate--> ACTIVE
 *   ACTIVE --pause--> PAUSED
 *   PAUSED --activate--> ACTIVE
 */
export class Advertisement extends AggregateRoot<string> {
  private _slotSlug: SlotSlug
  private _title: string
  private _imageUrl: string
  private _targetUrl: string
  private _weight: AdWeight
  private _status: AdStatus
  private _schedule: AdSchedule
  private _createdAt: Date
  private _updatedAt: Date
  private _metadata: Record<string, unknown>

  private constructor(id: string, props: AdvertisementProps) {
    super(id)
    this._slotSlug = props.slotSlug
    this._title = props.title
    this._imageUrl = props.imageUrl
    this._targetUrl = props.targetUrl
    this._weight = props.weight
    this._status = props.status
    this._schedule = props.schedule
    this._createdAt = props.createdAt
    this._updatedAt = props.updatedAt
    this._metadata = props.metadata ?? {}
  }

  /**
   * 建立新廣告（初始狀態為 DRAFT）
   *
   * @throws AdError 當任何參數驗證失敗時
   */
  static create(
    id: string,
    slotSlug: SlotSlug,
    title: string,
    imageUrl: string,
    targetUrl: string,
    weight: AdWeight,
    schedule: AdSchedule
  ): Advertisement {
    // 驗證字串欄位
    if (!title || title.trim().length === 0) {
      throw AdError.invalidTitle('廣告標題不能為空')
    }
    Advertisement.validateUrl(imageUrl, 'imageUrl')
    Advertisement.validateUrl(targetUrl, 'targetUrl')

    const now = new Date()
    return new Advertisement(id, {
      slotSlug,
      title: title.trim(),
      imageUrl,
      targetUrl,
      weight,
      status: AdStatus.DRAFT,
      schedule,
      createdAt: now,
      updatedAt: now,
      metadata: {},
    })
  }

  /**
   * 驗證 URL 格式
   * @private
   */
  private static validateUrl(url: string, fieldName: string): void {
    try {
      new URL(url)
    } catch {
      throw AdError.invalidUrl(`${fieldName}: ${url}`)
    }
  }

  /**
   * 從資料庫重建廣告（無驗證）
   */
  static reconstitute(id: string, props: AdvertisementProps): Advertisement {
    return new Advertisement(id, props)
  }

  // -- Getters --

  get slotSlug(): SlotSlug {
    return this._slotSlug
  }

  get title(): string {
    return this._title
  }

  get imageUrl(): string {
    return this._imageUrl
  }

  get targetUrl(): string {
    return this._targetUrl
  }

  get weight(): AdWeight {
    return this._weight
  }

  get status(): AdStatus {
    return this._status
  }

  get schedule(): AdSchedule {
    return this._schedule
  }

  get createdAt(): Date {
    return new Date(this._createdAt.getTime())
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt.getTime())
  }

  get metadata(): Record<string, unknown> {
    return { ...this._metadata }
  }

  // -- 狀態轉移 --

  /**
   * 啟用廣告（DRAFT/PAUSED -> ACTIVE）
   *
   * @throws AdError.invalidStatusTransition 當狀態轉移無效時
   * @throws AdError.adExpired 當排程已過期時
   */
  activate(): void {
    if (this._status !== AdStatus.DRAFT && this._status !== AdStatus.PAUSED) {
      throw AdError.invalidStatusTransition(this._status, AdStatus.ACTIVE)
    }
    if (this._schedule.isExpired()) {
      throw AdError.adExpired(this.id)
    }
    this._status = AdStatus.ACTIVE
    this._updatedAt = new Date()
  }

  /**
   * 暫停廣告（ACTIVE -> PAUSED）
   *
   * @throws AdError.invalidStatusTransition 當狀態轉移無效時
   */
  pause(): void {
    if (this._status !== AdStatus.ACTIVE) {
      throw AdError.invalidStatusTransition(this._status, AdStatus.PAUSED)
    }
    this._status = AdStatus.PAUSED
    this._updatedAt = new Date()
  }

  // -- 編輯方法 --

  /**
   * 批量更新廣告詳細資訊
   *
   * @throws AdError 當任何參數驗證失敗時
   */
  updateDetails(input: {
    title?: string
    imageUrl?: string
    targetUrl?: string
    weight?: AdWeight
    schedule?: AdSchedule
  }): void {
    if (input.title !== undefined) {
      if (!input.title || input.title.trim().length === 0) {
        throw AdError.invalidTitle('廣告標題不能為空')
      }
      this._title = input.title.trim()
    }

    if (input.imageUrl !== undefined) {
      Advertisement.validateUrl(input.imageUrl, 'imageUrl')
      this._imageUrl = input.imageUrl
    }

    if (input.targetUrl !== undefined) {
      Advertisement.validateUrl(input.targetUrl, 'targetUrl')
      this._targetUrl = input.targetUrl
    }

    if (input.weight !== undefined) {
      this._weight = input.weight
    }

    if (input.schedule !== undefined) {
      this._schedule = input.schedule
    }

    if (
      input.title !== undefined ||
      input.imageUrl !== undefined ||
      input.targetUrl !== undefined ||
      input.weight !== undefined ||
      input.schedule !== undefined
    ) {
      this._updatedAt = new Date()
    }
  }

  // -- 查詢方法 --

  /**
   * 判斷廣告是否可投放
   *
   * 條件：狀態為 ACTIVE 且排程在活躍期間內
   */
  isDeliverable(now?: Date): boolean {
    return this._status === AdStatus.ACTIVE && this._schedule.isActive(now)
  }

  /**
   * 轉換為 Props 供 Repository 保存
   */
  toProps(): AdvertisementProps {
    return {
      slotSlug: this._slotSlug,
      title: this._title,
      imageUrl: this._imageUrl,
      targetUrl: this._targetUrl,
      weight: this._weight,
      status: this._status,
      schedule: this._schedule,
      createdAt: new Date(this._createdAt.getTime()),
      updatedAt: new Date(this._updatedAt.getTime()),
      metadata: { ...this._metadata },
    }
  }

  /**
   * Props getter（等同 toProps）
   */
  get props(): AdvertisementProps {
    return this.toProps()
  }
}
