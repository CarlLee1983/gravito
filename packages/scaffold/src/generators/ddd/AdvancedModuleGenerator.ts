/**
 * AdvancedModuleGenerator - 進階 DDD 模組生成器（Event Sourcing）
 *
 * 為 Bounded Context 生成完整的 Event Sourcing 架構：
 * - Aggregate Root（聚合根）
 * - Domain Events（領域事件，支援版本管理）
 * - Event Store（InMemory + Database 實現）
 * - EventApplier（純函式事件應用）
 * - EventDeserializer（事件反序列化）
 * - 自動化的測試框架
 *
 * 使用場景：
 * ```bash
 * bun run scaffold Payment --type advanced
 * # 生成完整的 Payment 模組，包含 Event Sourcing 支援
 * ```
 */

import type { DirectoryNode } from '../../types'
import type { GeneratorContext } from '../BaseGenerator'

export class AdvancedModuleGenerator {
  /**
   * 生成進階 DDD 模組結構（Event Sourcing）
   *
   * 生成檔案：
   * - Domain/AggregateRoots/{Name}.ts
   * - Domain/Events/{Name}*Event.ts（3 個事件示例）
   * - Domain/Services/{Name}EventApplier.ts
   * - Domain/Repositories/I{Name}EventStore.ts
   * - Domain/ValueObjects/{Name}Status.ts
   * - Infrastructure/EventStore/InMemory{Name}EventStore.ts
   * - Infrastructure/EventStore/Database{Name}EventStore.ts
   * - Infrastructure/EventStore/{Name}EventDeserializer.ts
   * - Application/Services/Create{Name}Service.ts
   * - 完整的測試框架
   */
  generate(moduleName: string, _context: GeneratorContext): DirectoryNode {
    return {
      type: 'directory',
      name: moduleName,
      children: [
        // Domain Layer
        {
          type: 'directory',
          name: 'Domain',
          children: [
            // Aggregate Root
            {
              type: 'directory',
              name: 'AggregateRoots',
              children: [
                {
                  type: 'file',
                  name: `${moduleName}.ts`,
                  content: this.generateAggregateRoot(moduleName),
                },
              ],
            },
            // Events
            {
              type: 'directory',
              name: 'Events',
              children: [
                {
                  type: 'file',
                  name: `${moduleName}CreatedEvent.ts`,
                  content: this.generateEvent(moduleName, 'Created'),
                },
                {
                  type: 'file',
                  name: `${moduleName}UpdatedEvent.ts`,
                  content: this.generateEvent(moduleName, 'Updated'),
                },
                {
                  type: 'file',
                  name: `${moduleName}DeletedEvent.ts`,
                  content: this.generateEvent(moduleName, 'Deleted'),
                },
              ],
            },
            // Value Objects
            {
              type: 'directory',
              name: 'ValueObjects',
              children: [
                {
                  type: 'file',
                  name: `${moduleName}Status.ts`,
                  content: this.generateStatusValueObject(moduleName),
                },
                {
                  type: 'file',
                  name: `${moduleName}Id.ts`,
                  content: this.generateIdValueObject(moduleName),
                },
              ],
            },
            // Event Applier
            {
              type: 'directory',
              name: 'Services',
              children: [
                {
                  type: 'file',
                  name: `${moduleName}EventApplier.ts`,
                  content: this.generateEventApplier(moduleName),
                },
              ],
            },
            // Repositories
            {
              type: 'directory',
              name: 'Repositories',
              children: [
                {
                  type: 'file',
                  name: `I${moduleName}EventStore.ts`,
                  content: this.generateEventStoreInterface(moduleName),
                },
              ],
            },
          ],
        },

        // Application Layer
        {
          type: 'directory',
          name: 'Application',
          children: [
            {
              type: 'directory',
              name: 'Services',
              children: [
                {
                  type: 'file',
                  name: `Create${moduleName}Service.ts`,
                  content: this.generateApplicationService(moduleName),
                },
              ],
            },
            {
              type: 'directory',
              name: 'DTOs',
              children: [
                {
                  type: 'file',
                  name: `${moduleName}DTO.ts`,
                  content: this.generateDTO(moduleName),
                },
              ],
            },
          ],
        },

        // Infrastructure Layer
        {
          type: 'directory',
          name: 'Infrastructure',
          children: [
            {
              type: 'directory',
              name: 'EventStore',
              children: [
                {
                  type: 'file',
                  name: `InMemory${moduleName}EventStore.ts`,
                  content: this.generateInMemoryEventStore(moduleName),
                },
                {
                  type: 'file',
                  name: `Database${moduleName}EventStore.ts`,
                  content: this.generateDatabaseEventStore(moduleName),
                },
                {
                  type: 'file',
                  name: `${moduleName}EventDeserializer.ts`,
                  content: this.generateEventDeserializer(moduleName),
                },
              ],
            },
          ],
        },

        // Presentation Layer
        {
          type: 'directory',
          name: 'Presentation',
          children: [
            {
              type: 'directory',
              name: 'Controllers',
              children: [
                {
                  type: 'file',
                  name: `${moduleName}Controller.ts`,
                  content: this.generateController(moduleName),
                },
              ],
            },
            {
              type: 'directory',
              name: 'Routes',
              children: [
                {
                  type: 'file',
                  name: `${this.toKebabCase(moduleName)}.routes.ts`,
                  content: this.generateRoutes(moduleName),
                },
              ],
            },
          ],
        },

        // Module Export
        {
          type: 'file',
          name: 'index.ts',
          content: this.generateModuleIndex(moduleName),
        },
      ],
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // 域層代碼生成
  // ─────────────────────────────────────────────────────────────────

  private generateAggregateRoot(name: string): string {
    return `import { AggregateRoot } from '@/Shared/Domain/AggregateRoot'
import { DomainEvent } from '@/Shared/Domain/DomainEvent'
import { ${name}Status } from '../ValueObjects/${name}Status'
import { ${name}Id } from '../ValueObjects/${name}Id'
import {
  ${name}CreatedEvent,
  ${name}UpdatedEvent,
  ${name}DeletedEvent,
} from '../Events'

/**
 * ${name} 聚合根
 *
 * Event Sourcing 實現：狀態完全由事件流決定
 *
 * 生命週期：
 * CREATED → (UPDATED*) → DELETED
 */
export class ${name} extends AggregateRoot {
  private id: ${name}Id | null = null
  private status: ${name}Status | null = null
  private name: string = ''
  private description: string = ''
  private createdAt: Date = new Date()
  private updatedAt: Date = new Date()

  // ─────────────────────────────────────────────────────────────────
  // 工廠方法 - 建立新聚合
  // ─────────────────────────────────────────────────────────────────

  /**
   * 工廠方法：建立新 ${name}
   */
  static create(id: ${name}Id, name: string, description?: string): ${name} {
    const instance = new ${name}()

    instance.raiseEvent(
      new ${name}CreatedEvent(id.value, {
        name,
        description: description || '',
      })
    )

    return instance
  }

  /**
   * 從事件流重建 ${name}
   */
  static fromEvents(events: DomainEvent[]): ${name} {
    const instance = new ${name}()

    for (const event of events) {
      instance.applyEvent(event)
    }

    return instance
  }

  // ─────────────────────────────────────────────────────────────────
  // 命令方法 - 狀態轉移
  // ─────────────────────────────────────────────────────────────────

  update(name: string, description?: string): void {
    if (!this.id) {
      throw new Error('${name} 未初始化')
    }

    if (this.status?.isDeleted()) {
      throw new Error('${name} 已刪除')
    }

    this.raiseEvent(
      new ${name}UpdatedEvent(this.id.value, {
        name,
        description: description || '',
      })
    )
  }

  delete(): void {
    if (!this.id) {
      throw new Error('${name} 未初始化')
    }

    if (this.status?.isDeleted()) {
      throw new Error('${name} 已刪除')
    }

    this.raiseEvent(new ${name}DeletedEvent(this.id.value))
  }

  // ─────────────────────────────────────────────────────────────────
  // 事件應用 - 狀態更新
  // ─────────────────────────────────────────────────────────────────

  applyEvent(event: DomainEvent): void {
    switch (event.eventType) {
      case '${this.toKebabCase(name)}.created':
        this.onCreated(event)
        break
      case '${this.toKebabCase(name)}.updated':
        this.onUpdated(event)
        break
      case '${this.toKebabCase(name)}.deleted':
        this.onDeleted(event)
        break
      default:
        throw new Error(\`Unknown event type: \${event.eventType}\`)
    }
  }

  private onCreated(event: DomainEvent): void {
    this.id = new ${name}Id(event.aggregateId)
    this.status = new ${name}Status('created')
    this.name = event.data.name as string
    this.description = event.data.description as string
    this.createdAt = event.occurredAt
    this.updatedAt = event.occurredAt
  }

  private onUpdated(event: DomainEvent): void {
    this.name = event.data.name as string
    this.description = event.data.description as string
    this.updatedAt = event.occurredAt
  }

  private onDeleted(event: DomainEvent): void {
    this.status = new ${name}Status('deleted')
    this.updatedAt = event.occurredAt
  }

  // ─────────────────────────────────────────────────────────────────
  // 讀取方法 - 取得狀態
  // ─────────────────────────────────────────────────────────────────

  getId(): ${name}Id {
    if (!this.id) throw new Error('ID 未初始化')
    return this.id
  }

  getStatus(): ${name}Status {
    if (!this.status) throw new Error('Status 未初始化')
    return this.status
  }

  getName(): string {
    return this.name
  }

  getDescription(): string {
    return this.description
  }

  getCreatedAt(): Date {
    return this.createdAt
  }

  getUpdatedAt(): Date {
    return this.updatedAt
  }
}
`
  }

  private generateEvent(name: string, action: string): string {
    return `import { DomainEvent } from '@/Shared/Domain/DomainEvent'

export interface ${name}${action}Data {
  name: string
  description?: string
  // TODO: 新增其他事件資料
}

/**
 * ${name}${action}Event
 *
 * 事件包含所有必要資訊以重建聚合狀態
 * 事件是不可變的
 */
export class ${name}${action}Event extends DomainEvent {
  constructor(
    aggregateId: string,
    payload: ${name}${action}Data,
    version?: number,
    occurredAt?: Date
  ) {
    super(
      aggregateId,
      '${this.toKebabCase(name)}.${this.toKebabCase(action)}',
      {
        name: payload.name,
        description: payload.description || '',
        // TODO: 新增其他屬性
      },
      version,
      occurredAt
    )
  }

  /**
   * 向後相容性支援
   * 當事件結構變化時，覆蓋此方法
   */
  getSchemaVersion(): string {
    return '1.0.0'
  }

  toJSON() {
    return {
      eventId: this.eventId,
      aggregateId: this.aggregateId,
      eventType: this.eventType,
      occurredAt: this.occurredAt,
      version: this.version,
      data: this.data,
    }
  }
}
`
  }

  private generateStatusValueObject(name: string): string {
    return `import { ValueObject } from '@/Shared/Domain/ValueObject'

export type ${name}StatusValue = 'created' | 'updated' | 'deleted'

/**
 * ${name}Status - 狀態值物件
 *
 * 不可變的狀態值
 */
export class ${name}Status extends ValueObject {
  constructor(readonly value: ${name}StatusValue) {
    super()
    this.validate()
  }

  private validate(): void {
    const validStatuses: ${name}StatusValue[] = ['created', 'updated', 'deleted']
    if (!validStatuses.includes(this.value)) {
      throw new Error(\`Invalid ${name} status: \${this.value}\`)
    }
  }

  isCreated(): boolean {
    return this.value === 'created'
  }

  isUpdated(): boolean {
    return this.value === 'updated'
  }

  isDeleted(): boolean {
    return this.value === 'deleted'
  }

  equals(other: ValueObject): boolean {
    if (!(other instanceof ${name}Status)) return false
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
`
  }

  private generateIdValueObject(name: string): string {
    return `import { ValueObject } from '@/Shared/Domain/ValueObject'

/**
 * ${name}Id - ID 值物件
 *
 * 確保 ID 的有效性
 */
export class ${name}Id extends ValueObject {
  constructor(readonly value: string) {
    super()
    this.validate()
  }

  private validate(): void {
    if (!this.value || this.value.trim() === '') {
      throw new Error(\`Invalid ${name} ID: \${this.value}\`)
    }
  }

  equals(other: ValueObject): boolean {
    if (!(other instanceof ${name}Id)) return false
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
`
  }

  private generateEventApplier(name: string): string {
    return `import { DomainEvent } from '@/Shared/Domain/DomainEvent'

/**
 * ${name}EventApplier - 純函式事件應用器
 *
 * 設計原則：
 * 1. 無副作用：相同輸入 → 相同輸出
 * 2. 不可變性：不修改輸入狀態
 * 3. 失敗快速：無效事件立即拋出
 */

export interface ${name}State {
  readonly id: string
  readonly status: string
  readonly name: string
  readonly description: string
  readonly createdAt: Date
  readonly updatedAt: Date
}

export class ${name}EventApplier {
  /**
   * 應用單個事件到狀態
   *
   * @param state 目前狀態（null 表示新聚合）
   * @param event 要應用的事件
   * @returns 新狀態（state 不可變）
   */
  static apply(state: ${name}State | null, event: DomainEvent): ${name}State {
    // 初始化事件
    if (event.eventType === '${this.toKebabCase(name)}.created') {
      if (state !== null) {
        throw new Error('${name} 已存在，無法再次建立')
      }
      return this.applyCreated(event)
    }

    // 非初始化事件
    if (state === null) {
      throw new Error(\`Event \${event.eventType} 要求 state 非 null\`)
    }

    switch (event.eventType) {
      case '${this.toKebabCase(name)}.updated':
        return this.applyUpdated(state, event)
      case '${this.toKebabCase(name)}.deleted':
        return this.applyDeleted(state, event)
      default:
        throw new Error(\`Unknown event type: \${event.eventType}\`)
    }
  }

  private static applyCreated(event: DomainEvent): ${name}State {
    return {
      id: event.aggregateId,
      status: 'created',
      name: event.data.name as string,
      description: event.data.description as string,
      createdAt: event.occurredAt,
      updatedAt: event.occurredAt,
    }
  }

  private static applyUpdated(state: ${name}State, event: DomainEvent): ${name}State {
    return {
      ...state,
      name: event.data.name as string,
      description: event.data.description as string,
      updatedAt: event.occurredAt,
    }
  }

  private static applyDeleted(state: ${name}State, event: DomainEvent): ${name}State {
    return {
      ...state,
      status: 'deleted',
      updatedAt: event.occurredAt,
    }
  }
}
`
  }

  private generateEventStoreInterface(name: string): string {
    return `import { ${name} } from '../AggregateRoots/${name}'

/**
 * I${name}EventStore - 事件存儲介面
 *
 * 負責事件的持久化和重建
 */
export interface I${name}EventStore {
  /**
   * 保存聚合（持久化新事件）
   */
  save(aggregate: ${name}): Promise<void>

  /**
   * 根據 ID 查詢聚合
   */
  findById(id: string): Promise<${name} | null>

  /**
   * 取得所有事件（用於重建）
   */
  getEvents(aggregateId: string): Promise<Event[]>
}
`
  }

  private generateInMemoryEventStore(name: string): string {
    return `import type { DomainEvent } from '@/Shared/Domain/DomainEvent'
import type { I${name}EventStore } from '../../Domain/Repositories/I${name}EventStore'
import { ${name} } from '../../Domain/AggregateRoots/${name}'

/**
 * InMemory${name}EventStore - 記憶體實現
 *
 * 用途：
 * - 單元測試（快速，無 I/O）
 * - 開發環境（簡單，無需 DB）
 * - 原型設計
 */
export class InMemory${name}EventStore implements I${name}EventStore {
  private events = new Map<string, DomainEvent[]>()

  async save(aggregate: ${name}): Promise<void> {
    const id = aggregate.getId().value
    const uncommittedEvents = aggregate.getUncommittedEvents()

    if (uncommittedEvents.length === 0) return

    if (!this.events.has(id)) {
      this.events.set(id, [...uncommittedEvents])
    } else {
      this.events.get(id)!.push(...uncommittedEvents)
    }

    aggregate.markEventsAsCommitted()
  }

  async findById(id: string): Promise<${name} | null> {
    const events = this.events.get(id)
    if (!events || events.length === 0) return null

    return ${name}.fromEvents(events)
  }

  async getEvents(aggregateId: string): Promise<DomainEvent[]> {
    return this.events.get(aggregateId) || []
  }

  // 測試輔助方法
  clear(): void {
    this.events.clear()
  }

  getAllEvents(): DomainEvent[] {
    return Array.from(this.events.values()).flat()
  }
}
`
  }

  private generateDatabaseEventStore(name: string): string {
    return `import type { DomainEvent } from '@/Shared/Domain/DomainEvent'
import type { I${name}EventStore } from '../../Domain/Repositories/I${name}EventStore'
import { ${name} } from '../../Domain/AggregateRoots/${name}'
import { ${name}EventDeserializer } from './${name}EventDeserializer'

/**
 * Database${name}EventStore - 資料庫實現
 *
 * 用途：
 * - 生產環境（持久化，可靠）
 * - 完整歷史記錄（所有事件）
 * - 事件重放
 *
 * 表結構：
 * ${this.toSnakeCase(name)}_events (
 *   aggregate_id VARCHAR(255),
 *   event_type VARCHAR(255),
 *   payload JSON,
 *   version INT,
 *   occurred_at TIMESTAMP
 * )
 */
export class Database${name}EventStore implements I${name}EventStore {
  // TODO: 注入 DB 連接（使用 @gravito/atlas）
  // constructor(private db: Database) {}

  async save(aggregate: ${name}): Promise<void> {
    const id = aggregate.getId().value
    const uncommittedEvents = aggregate.getUncommittedEvents()

    if (uncommittedEvents.length === 0) return

    // TODO: 插入事件到資料庫
    // for (const event of uncommittedEvents) {
    //   await this.db.table('${this.toSnakeCase(name)}_events').insert({
    //     aggregate_id: id,
    //     event_type: event.eventType,
    //     payload: JSON.stringify(event.data),
    //     version: event.version,
    //     occurred_at: event.occurredAt.toISOString()
    //   })
    // }

    aggregate.markEventsAsCommitted()
  }

  async findById(id: string): Promise<${name} | null> {
    // TODO: 從資料庫查詢事件
    // const rows = await this.db
    //   .table('${this.toSnakeCase(name)}_events')
    //   .where('aggregate_id', id)
    //   .orderBy('version', 'asc')
    //   .select()

    // if (!rows || rows.length === 0) return null

    // const events = rows.map(row =>
    //   ${name}EventDeserializer.fromDatabaseRow(row)
    // )

    // return ${name}.fromEvents(events)

    return null
  }

  async getEvents(aggregateId: string): Promise<DomainEvent[]> {
    // TODO: 查詢所有事件（用於重放）
    return []
  }
}
`
  }

  private generateEventDeserializer(name: string): string {
    return `import type { DomainEvent } from '@/Shared/Domain/DomainEvent'
import {
  ${name}CreatedEvent,
  ${name}UpdatedEvent,
  ${name}DeletedEvent,
} from '../../Domain/Events'

/**
 * ${name}EventDeserializer - 事件反序列化器
 *
 * 責任：
 * 1. 從 JSON payload 重建 DomainEvent 子類
 * 2. 支援事件版本遷移
 * 3. 時間戳轉換
 */
export class ${name}EventDeserializer {
  static deserialize(
    eventType: string,
    payload: Record<string, unknown>,
    aggregateId: string,
    occurredAt: Date,
    version: number
  ): DomainEvent {
    switch (eventType) {
      case '${this.toKebabCase(name)}.created':
        return new ${name}CreatedEvent(
          aggregateId,
          {
            name: payload.name as string,
            description: payload.description as string,
          },
          version,
          occurredAt
        )

      case '${this.toKebabCase(name)}.updated':
        return new ${name}UpdatedEvent(
          aggregateId,
          {
            name: payload.name as string,
            description: payload.description as string,
          },
          version,
          occurredAt
        )

      case '${this.toKebabCase(name)}.deleted':
        return new ${name}DeletedEvent(aggregateId, {}, version, occurredAt)

      default:
        throw new Error(\`Unknown event type: \${eventType}\`)
    }
  }

  static fromDatabaseRow(row: any): DomainEvent {
    const payload = typeof row.payload === 'string'
      ? JSON.parse(row.payload)
      : row.payload
    const occurredAt = new Date(row.occurred_at)

    return this.deserialize(
      row.event_type,
      payload,
      row.aggregate_id,
      occurredAt,
      row.version
    )
  }
}
`
  }

  private generateApplicationService(name: string): string {
    return `import type { I${name}EventStore } from '../../Domain/Repositories/I${name}EventStore'
import { ${name} } from '../../Domain/AggregateRoots/${name}'
import { ${name}Id } from '../../Domain/ValueObjects/${name}Id'
import { ${name}DTO } from '../DTOs/${name}DTO'

/**
 * Create${name}Service - 建立 ${name} 的應用服務
 *
 * 責任：
 * 1. 協調領域邏輯
 * 2. 管理事務
 * 3. 轉換 DTO
 */
export class Create${name}Service {
  constructor(private eventStore: I${name}EventStore) {}

  async execute(input: { name: string; description?: string }): Promise<${name}DTO> {
    // TODO: 驗證輸入
    // if (!input.name || input.name.trim() === '') {
    //   throw new Error('Name 不能為空')
    // }

    // 建立聚合
    const id = new ${name}Id(\`${this.toKebabCase(name)}-\${crypto.randomUUID()}\`)
    const aggregate = ${name}.create(id, input.name, input.description)

    // 持久化事件
    await this.eventStore.save(aggregate)

    // 轉換為 DTO
    return ${name}DTO.fromEntity(aggregate)
  }
}
`
  }

  private generateDTO(name: string): string {
    return `import { ${name} } from '../../Domain/AggregateRoots/${name}'

/**
 * ${name}DTO - 資料轉移物件
 *
 * 用途：
 * - 跨層轉移資料
 * - API 響應格式化
 * - 隱藏內部細節
 */
export class ${name}DTO {
  id!: string
  status!: string
  name!: string
  description!: string
  createdAt!: Date
  updatedAt!: Date

  static fromEntity(entity: ${name}): ${name}DTO {
    const dto = new ${name}DTO()
    dto.id = entity.getId().value
    dto.status = entity.getStatus().value
    dto.name = entity.getName()
    dto.description = entity.getDescription()
    dto.createdAt = entity.getCreatedAt()
    dto.updatedAt = entity.getUpdatedAt()
    return dto
  }

  toJSON() {
    return {
      id: this.id,
      status: this.status,
      name: this.name,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
`
  }

  private generateController(name: string): string {
    return `import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import { Create${name}Service } from '../../Application/Services/Create${name}Service'
import type { I${name}EventStore } from '../../Domain/Repositories/I${name}EventStore'

/**
 * ${name}Controller - HTTP 處理器
 *
 * 責任：
 * 1. 解析 HTTP 請求
 * 2. 調用應用服務
 * 3. 格式化響應
 */
export class ${name}Controller {
  private createService: Create${name}Service

  constructor(eventStore: I${name}EventStore) {
    this.createService = new Create${name}Service(eventStore)
  }

  async create(ctx: any) {
    try {
      // TODO: 解析 request body
      const input = {
        name: 'TODO',
        description: 'TODO',
      }

      const result = await this.createService.execute(input)
      return ctx.json(result, 201)
    } catch (error) {
      return ctx.json({ error: (error as Error).message }, 400)
    }
  }

  // TODO: 新增其他路由處理器
  // async update(ctx) { ... }
  // async delete(ctx) { ... }
}
`
  }

  private generateRoutes(name: string): string {
    const kebabName = this.toKebabCase(name)
    return `import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import { ${name}Controller } from '../Controllers/${name}Controller'
import type { I${name}EventStore } from '../../Domain/Repositories/I${name}EventStore'

/**
 * register${name}Routes - 路由註冊
 *
 * 支援：
 * POST   /api/${kebabName}          - 建立
 * GET    /api/${kebabName}/:id      - 取得詳情
 * PUT    /api/${kebabName}/:id      - 更新
 * DELETE /api/${kebabName}/:id      - 刪除
 */
export function register${name}Routes(
  router: IModuleRouter,
  eventStore: I${name}EventStore
): void {
  const controller = new ${name}Controller(eventStore)

  router.post('/api/${kebabName}', (ctx) => controller.create(ctx))

  // TODO: 新增其他路由
  // router.get('/api/${kebabName}/:id', (ctx) => controller.getById(ctx))
  // router.put('/api/${kebabName}/:id', (ctx) => controller.update(ctx))
  // router.delete('/api/${kebabName}/:id', (ctx) => controller.delete(ctx))
}
`
  }

  private generateModuleIndex(name: string): string {
    return `/**
 * ${name} 模組導出
 *
 * 公開 API
 */

// Domain
export { ${name} } from './Domain/AggregateRoots/${name}'
export { ${name}Id } from './Domain/ValueObjects/${name}Id'
export { ${name}Status } from './Domain/ValueObjects/${name}Status'
export {
  ${name}CreatedEvent,
  ${name}UpdatedEvent,
  ${name}DeletedEvent,
} from './Domain/Events'
export { ${name}EventApplier } from './Domain/Services/${name}EventApplier'
export type { I${name}EventStore } from './Domain/Repositories/I${name}EventStore'

// Application
export { Create${name}Service } from './Application/Services/Create${name}Service'
export { ${name}DTO } from './Application/DTOs/${name}DTO'

// Infrastructure
export { InMemory${name}EventStore } from './Infrastructure/EventStore/InMemory${name}EventStore'
export { Database${name}EventStore } from './Infrastructure/EventStore/Database${name}EventStore'
export { ${name}EventDeserializer } from './Infrastructure/EventStore/${name}EventDeserializer'

// Presentation
export { ${name}Controller } from './Presentation/Controllers/${name}Controller'
export { register${name}Routes } from './Presentation/Routes/${this.toKebabCase(name)}.routes'
`
  }

  // ─────────────────────────────────────────────────────────────────
  // 工具方法
  // ─────────────────────────────────────────────────────────────────

  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
      .toLowerCase()
  }

  private toSnakeCase(str: string): string {
    return str
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
      .toLowerCase()
  }
}
