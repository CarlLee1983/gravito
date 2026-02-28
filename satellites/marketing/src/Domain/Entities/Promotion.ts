import { Entity } from '@gravito/enterprise'
import {
  PromotionPriority,
  PromotionStatus,
  PromotionType,
  type PromotionTypeValue,
} from '../ValueObjects'

export interface PromotionProps {
  name: string
  type: PromotionTypeValue
  description?: string
  configuration: Record<string, any>
  priority: number
  startsAt: Date
  expiresAt: Date
  status: string
  createdAt: Date
  updatedAt: Date
}

export class Promotion extends Entity<string> {
  private name: string
  private type: PromotionType
  private description: string | null
  private configuration: Record<string, any>
  private priority: PromotionPriority
  private startsAt: Date
  private expiresAt: Date
  private status: PromotionStatus
  private createdAt: Date
  private updatedAt: Date

  private constructor(
    id: string,
    name: string,
    type: PromotionType,
    configuration: Record<string, any>,
    priority: PromotionPriority,
    startsAt: Date,
    expiresAt: Date,
    status: PromotionStatus,
    createdAt: Date,
    updatedAt: Date,
    description?: string | null
  ) {
    super(id)
    this.name = name
    this.type = type
    this.description = description ?? null
    this.configuration = configuration
    this.priority = priority
    this.startsAt = startsAt
    this.expiresAt = expiresAt
    this.status = status
    this.createdAt = createdAt
    this.updatedAt = updatedAt
  }

  static create(
    name: string,
    type: PromotionTypeValue,
    configuration: Record<string, any>,
    startsAt: Date,
    expiresAt: Date,
    priority?: number,
    description?: string,
    id?: string
  ): Promotion {
    const promotionType = PromotionType.create(type)
    const promotionPriority = PromotionPriority.create(priority ?? 50)
    const status = PromotionStatus.active()
    const now = new Date()

    return new Promotion(
      id || crypto.randomUUID(),
      name,
      promotionType,
      configuration,
      promotionPriority,
      startsAt,
      expiresAt,
      status,
      now,
      now,
      description
    )
  }

  getName(): string {
    return this.name
  }

  getType(): PromotionTypeValue {
    return this.type.value
  }

  getDescription(): string | null {
    return this.description
  }

  getConfiguration(): Record<string, any> {
    return { ...this.configuration }
  }

  getPriority(): number {
    return this.priority.value
  }

  getStartsAt(): Date {
    return this.startsAt
  }

  getExpiresAt(): Date {
    return this.expiresAt
  }

  getStatus(): string {
    return this.status.value
  }

  getCreatedAt(): Date {
    return this.createdAt
  }

  getUpdatedAt(): Date {
    return this.updatedAt
  }

  /**
   * 檢查促銷是否過期
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt
  }

  /**
   * 檢查促銷是否在有效期內
   */
  isWithinValidPeriod(): boolean {
    const now = new Date()
    return now >= this.startsAt && now <= this.expiresAt
  }

  /**
   * 檢查促銷是否處於活躍狀態
   */
  isActive(): boolean {
    return this.status.isActive() && this.isWithinValidPeriod() && !this.isExpired()
  }

  /**
   * 檢查促銷是否已過期或被禁用
   */
  isInactive(): boolean {
    return !this.isActive()
  }

  /**
   * 啟用促銷（改變狀態為 ACTIVE）
   * 返回新的 Promotion 物件（immutable）
   */
  activate(): Promotion {
    return new Promotion(
      this.id,
      this.name,
      this.type,
      this.configuration,
      this.priority,
      this.startsAt,
      this.expiresAt,
      PromotionStatus.active(),
      this.createdAt,
      new Date(),
      this.description
    )
  }

  /**
   * 停用促銷（改變狀態為 INACTIVE）
   * 返回新的 Promotion 物件（immutable）
   */
  deactivate(): Promotion {
    return new Promotion(
      this.id,
      this.name,
      this.type,
      this.configuration,
      this.priority,
      this.startsAt,
      this.expiresAt,
      PromotionStatus.inactive(),
      this.createdAt,
      new Date(),
      this.description
    )
  }

  /**
   * 將促銷標記為過期
   * 返回新的 Promotion 物件（immutable）
   */
  markAsExpired(): Promotion {
    return new Promotion(
      this.id,
      this.name,
      this.type,
      this.configuration,
      this.priority,
      this.startsAt,
      this.expiresAt,
      PromotionStatus.expired(),
      this.createdAt,
      new Date(),
      this.description
    )
  }

  /**
   * 更新優先級
   * 返回新的 Promotion 物件（immutable）
   */
  withPriority(priority: number): Promotion {
    const newPriority = PromotionPriority.create(priority)

    return new Promotion(
      this.id,
      this.name,
      this.type,
      this.configuration,
      newPriority,
      this.startsAt,
      this.expiresAt,
      this.status,
      this.createdAt,
      new Date(),
      this.description
    )
  }

  /**
   * 更新配置
   * 返回新的 Promotion 物件（immutable）
   */
  withConfiguration(configuration: Record<string, any>): Promotion {
    return new Promotion(
      this.id,
      this.name,
      this.type,
      configuration,
      this.priority,
      this.startsAt,
      this.expiresAt,
      this.status,
      this.createdAt,
      new Date(),
      this.description
    )
  }

  /**
   * 序列化為 Props（用於持久化和傳輸）
   */
  unpack(): PromotionProps {
    return {
      name: this.name,
      type: this.type.value,
      description: this.description ?? undefined,
      configuration: this.configuration,
      priority: this.priority.value,
      startsAt: this.startsAt,
      expiresAt: this.expiresAt,
      status: this.status.value,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }

  /**
   * 從 Props 重新構建（用於從數據庫hydrate）
   */
  static hydrate(props: PromotionProps, id: string): Promotion {
    const type = PromotionType.create(props.type)
    const priority = PromotionPriority.create(props.priority)
    const status = PromotionStatus.create(props.status)

    return new Promotion(
      id,
      props.name,
      type,
      props.configuration,
      priority,
      props.startsAt,
      props.expiresAt,
      status,
      props.createdAt,
      props.updatedAt,
      props.description
    )
  }
}
