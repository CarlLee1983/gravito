/**
 * CQRSQueryModuleGenerator - CQRS 查詢側模組生成器
 *
 * 為查詢側（讀端）生成完整的 CQRS 架構：
 * - Read Model（讀模型，查詢優化的數據結構）
 * - Event Projector（事件投影器，將事件轉化為讀模型）
 * - Query Service（查詢服務，提供查詢接口）
 * - Event Subscriber（事件訂閱器，監聽並投影事件）
 * - HTTP Controllers（查詢端點）
 *
 * 與 Phase 2a AdvancedModuleGenerator 配合使用：
 * - Phase 2a: 寫側（事件溯源）
 * - Phase 2b: 讀側（CQRS 投影） ← 本生成器
 *
 * 使用場景：
 * ```bash
 * bun run scaffold WalletBalance --type cqrs-query
 * # 生成完整的查詢模組，訂閱來自 PSC 模組的事件
 *
 * bun run scaffold MemberStats --type cqrs-query
 * # 生成會員統計查詢模組，訂閱來自 MOC 模組的事件
 * ```
 */

import type { DirectoryNode } from '../../types'
import type { GeneratorContext } from '../BaseGenerator'

export interface CQRSQueryConfig {
  // 模組基本信息
  moduleName: string // 'Wallet', 'Member', etc.
  modulePrefix?: string // 'WBC', 'MOC', etc.
  description?: string

  // 讀模型配置
  readModel: {
    fields: FieldDefinition[]
    primaryKey: string
    indexes?: string[]
  }

  // 事件訂閱配置
  events: {
    subscribedEvents: EventMapping[]
  }

  // 查詢配置
  queries?: {
    methods: QueryMethodDefinition[]
  }

  // 快取配置
  cache?: {
    enabled: boolean
    ttl?: number
  }
}

export interface FieldDefinition {
  name: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'decimal'
  description?: string
  indexed?: boolean
}

export interface EventMapping {
  eventType: string // 'DepositSettledEvent'
  eventClass: string // 類名
  handlerMethod: string // handleDepositSettled
  updates: FieldUpdate[]
}

export interface FieldUpdate {
  fieldName: string
  operation: 'set' | 'add' | 'increment'
}

export interface QueryMethodDefinition {
  name: string
  parameters: QueryParameter[]
  returnType: string
  description?: string
}

export interface QueryParameter {
  name: string
  type: string
  required?: boolean
}

/**
 * CQRS 查詢側模組生成器
 * 生成完整的查詢端（讀側）模組架構
 */
export class CQRSQueryModuleGenerator {
  /**
   * 生成 CQRS 查詢側模組結構
   *
   * 生成檔案：
   * - Domain/ReadModels/{Name}ReadModel.ts
   * - Domain/Projectors/{Name}EventProjector.ts
   * - Application/Services/Query{Name}Service.ts
   * - Application/DTOs/{Name}ReadDTO.ts
   * - Infrastructure/Subscribers/{Name}ProjectionSubscriber.ts
   * - Infrastructure/Cache/{Name}ReadModelCache.ts
   * - Presentation/Controllers/{Name}QueryController.ts
   * - index.ts
   *
   * @param moduleName - 模組名稱（例：'Wallet'）
   * @param _context - 生成器上下文（當前未使用，預留供未來擴展）
   * @returns 模組目錄結構
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
            // Read Models
            {
              type: 'directory',
              name: 'ReadModels',
              children: [
                {
                  type: 'file',
                  name: `${moduleName}ReadModel.ts`,
                  content: this.generateReadModel(moduleName),
                },
              ],
            },
            // Projectors
            {
              type: 'directory',
              name: 'Projectors',
              children: [
                {
                  type: 'file',
                  name: `${moduleName}EventProjector.ts`,
                  content: this.generateProjector(moduleName),
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
                  name: `I${moduleName}ReadModelRepository.ts`,
                  content: this.generateRepositoryInterface(moduleName),
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
                  name: `Query${moduleName}Service.ts`,
                  content: this.generateQueryService(moduleName),
                },
              ],
            },
            {
              type: 'directory',
              name: 'DTOs',
              children: [
                {
                  type: 'file',
                  name: `${moduleName}ReadDTO.ts`,
                  content: this.generateQueryDTO(moduleName),
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
              name: 'Repositories',
              children: [
                {
                  type: 'file',
                  name: `${moduleName}ReadModelRepository.ts`,
                  content: this.generateRepositoryImplementation(moduleName),
                },
              ],
            },
            {
              type: 'directory',
              name: 'Subscribers',
              children: [
                {
                  type: 'file',
                  name: `${moduleName}ProjectionSubscriber.ts`,
                  content: this.generateSubscriber(moduleName),
                },
              ],
            },
            {
              type: 'directory',
              name: 'Cache',
              children: [
                {
                  type: 'file',
                  name: `${moduleName}ReadModelCache.ts`,
                  content: this.generateCache(moduleName),
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
                  name: `${moduleName}QueryController.ts`,
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

        // Module index
        {
          type: 'file',
          name: 'index.ts',
          content: this.generateIndex(moduleName),
        },
      ],
    }
  }

  /**
   * 生成讀模型檔案
   */
  private generateReadModel(moduleName: string): string {
    return `/**
 * ${moduleName}ReadModel - 查詢優化的讀模型
 *
 * 讀模型是從事件投影而來的非規範化數據結構，
 * 針對特定查詢場景進行優化。
 *
 * 與 Aggregate Root 不同：
 * - Aggregate Root：規範化，單一來源（事件），強一致性
 * - ReadModel：反規範化，供查詢使用，最終一致性
 *
 * 設計原則：
 * 1. 不可變性：讀模型字段通過投影器唯讀修改
 * 2. 清晰性：字段名稱直觀反映查詢需求
 * 3. 性能：包含預計算字段（如總額、計數）
 * 4. 版本控制：支持投影器版本遷移
 */

import type { DomainEvent } from '@/Shared/Domain/DomainEvent'

/**
 * ${moduleName} 讀模型介面
 * 代表優化用於查詢的數據結構
 */
export interface ${moduleName}ReadModel {
  // TODO: 根據查詢需求添加字段
  // 示例：
  // id: string
  // customerId: string
  // totalAmount: string (decimal as string for precision)
  // transactionCount: number
  // lastUpdated: Date
  // status: string

  // 投影元數據
  /** 最後處理的事件 ID（用於冪等性） */
  lastProcessedEventId?: string
  /** 投影器版本 */
  projectionVersion: number
}

/**
 * 工廠方法：創建新的讀模型
 */
export function create${moduleName}ReadModel(data: Partial<${moduleName}ReadModel>): ${moduleName}ReadModel {
  return {
    ...data,
    projectionVersion: 1,
  } as ${moduleName}ReadModel
}

/**
 * 驗證讀模型數據完整性
 */
export function validate${moduleName}ReadModel(data: any): boolean {
  // TODO: 添加驗證邏輯
  // - 必填字段檢查
  // - 類型驗證
  // - 業務規則驗證
  return typeof data === 'object' && data !== null
}

/**
 * 從讀模型提取查詢信息
 * 用於 DTO 轉換和序列化
 */
export function extract${moduleName}Data(model: ${moduleName}ReadModel): Record<string, any> {
  return {
    // TODO: 提取相關字段用於 DTO 轉換
    projectionVersion: model.projectionVersion,
  }
}
`
  }

  /**
   * 生成事件投影器檔案
   */
  private generateProjector(moduleName: string): string {
    return `/**
 * ${moduleName}EventProjector - 事件投影器
 *
 * 投影器是純函數，負責將領域事件轉化為讀模型。
 * 設計為冪等操作：同一事件投影多次結果相同。
 *
 * 核心職責：
 * 1. 監聽特定的領域事件
 * 2. 根據事件內容更新讀模型
 * 3. 確保操作冪等（防止重複處理）
 * 4. 記錄投影審計信息
 *
 * 優勢：
 * - 純函數邏輯易於測試
 * - 支持事件重放和投影重建
 * - 解耦事件來源和投影目標
 * - 易於新增新的讀模型而無需修改聚合根
 */

import type { DomainEvent } from '@/Shared/Domain/DomainEvent'
import type { I${moduleName}ReadModelRepository } from '../Repositories/I${moduleName}ReadModelRepository'
import type { ${moduleName}ReadModel } from '../ReadModels/${moduleName}ReadModel'

/**
 * ${moduleName} 事件投影器
 *
 * 負責訂閱領域事件並投影到讀模型
 */
export class ${moduleName}EventProjector {
  constructor(private repository: I${moduleName}ReadModelRepository) {}

  /**
   * 投影事件到讀模型
   *
   * 工作流程：
   * 1. 根據事件類型分派到對應的 handler
   * 2. 查詢或創建讀模型
   * 3. 應用投影規則更新讀模型
   * 4. 檢查冪等性（是否已處理過）
   * 5. 保存更新結果
   *
   * @param event - 要投影的領域事件
   * @throws 如果事件處理失敗
   */
  async projectEvent(event: DomainEvent): Promise<void> {
    try {
      // TODO: 根據事件類型分派
      // switch (event.constructor.name) {
      //   case 'SomeEvent':
      //     await this.handleSomeEvent(event as SomeEvent)
      //     break
      //   default:
      //     console.warn(\`Unknown event type: \${event.constructor.name}\`)
      // }
    } catch (error) {
      console.error(
        \`Failed to project \${event.constructor.name} in ${moduleName}Projector:\`,
        error
      )
      throw error
    }
  }

  /**
   * TODO: 為每個要訂閱的事件添加 handler 方法
   *
   * 示例：
   * private async handleSomeEvent(event: SomeEvent): Promise<void> {
   *   // 1. 查詢現有讀模型或創建新的
   *   let model = await this.repository.findById(event.aggregateId)
   *   if (!model) {
   *     model = createReadModel({ id: event.aggregateId })
   *   }
   *
   *   // 2. 檢查冪等性
   *   if (model.lastProcessedEventId === event.eventId) {
   *     return // 已處理過此事件
   *   }
   *
   *   // 3. 應用投影規則更新字段
   *   model = {
   *     ...model,
   *     field1: event.data.newValue,
   *     lastProcessedEventId: event.eventId,
   *     projectionVersion: model.projectionVersion + 1,
   *   }
   *
   *   // 4. 保存更新
   *   await this.repository.save(model)
   * }
   */

  /**
   * 獲取此投影器訂閱的所有事件類型
   *
   * 用於自動事件訂閱註冊
   */
  getSubscribedEventTypes(): string[] {
    // TODO: 返回此投影器訂閱的所有事件類型名稱
    return [
      // 'SomeEvent',
      // 'AnotherEvent',
    ]
  }

  /**
   * 判斷投影器是否支援某個事件
   */
  supportsEvent(eventType: string): boolean {
    return this.getSubscribedEventTypes().includes(eventType)
  }
}
`
  }

  /**
   * 生成查詢服務檔案
   */
  private generateQueryService(moduleName: string): string {
    return `/**
 * Query${moduleName}Service - 查詢服務
 *
 * 應用層服務，提供查詢接口。
 * 通過倉庫訪問讀模型，支持多種查詢方法。
 *
 * 設計特點：
 * 1. 無副作用：只讀操作，不修改狀態
 * 2. 高效：直接查詢優化的讀模型
 * 3. 一致性：支持緩存控制
 * 4. 錯誤處理：適當的異常處理和日誌
 */

import type { I${moduleName}ReadModelRepository } from '../../Infrastructure/Repositories/I${moduleName}ReadModelRepository'
import { ${moduleName}ReadDTO } from '../DTOs/${moduleName}ReadDTO'

/**
 * 查詢過濾條件
 */
export interface QueryFilters {
  [key: string]: any
  // TODO: 根據查詢需求定義過濾字段
}

/**
 * ${moduleName} 查詢服務
 * 提供讀模型的各種查詢方法
 */
export class Query${moduleName}Service {
  constructor(private repository: I${moduleName}ReadModelRepository) {}

  /**
   * 根據 ID 查詢單個讀模型
   * @param id - 讀模型 ID
   * @returns 讀模型 DTO，如果不存在返回 null
   */
  async findById(id: string): Promise<${moduleName}ReadDTO | null> {
    try {
      const model = await this.repository.findById(id)
      return model ? ${moduleName}ReadDTO.fromReadModel(model) : null
    } catch (error) {
      console.error(\`Error finding ${moduleName} by ID \${id}:\`, error)
      throw error
    }
  }

  /**
   * 查詢所有讀模型
   * @param filters - 查詢過濾條件（可選）
   * @returns 讀模型 DTO 列表
   */
  async findAll(filters?: QueryFilters): Promise<${moduleName}ReadDTO[]> {
    try {
      const models = await this.repository.findAll(filters)
      return models.map(model => ${moduleName}ReadDTO.fromReadModel(model))
    } catch (error) {
      console.error('Error finding all ${moduleName}:', error)
      throw error
    }
  }

  /**
   * 基於條件搜索
   * @param criteria - 搜索條件
   * @returns 匹配的讀模型 DTO 列表
   */
  async search(criteria: QueryFilters): Promise<${moduleName}ReadDTO[]> {
    try {
      // TODO: 實現自定義搜索邏輯
      return this.findAll(criteria)
    } catch (error) {
      console.error('Error searching ${moduleName}:', error)
      throw error
    }
  }

  /**
   * 獲取統計信息
   * @returns 統計數據
   */
  async getStatistics(): Promise<Record<string, any>> {
    try {
      // TODO: 實現統計邏輯
      // - 總數量
      // - 聚合字段（總額、平均值等）
      // - 分組統計

      return {
        totalCount: 0,
        // 更多統計字段...
      }
    } catch (error) {
      console.error('Error getting ${moduleName} statistics:', error)
      throw error
    }
  }
}
`
  }

  /**
   * 生成查詢 DTO 檔案
   */
  private generateQueryDTO(moduleName: string): string {
    return `/**
 * ${moduleName}ReadDTO - 查詢結果 DTO
 *
 * 數據傳輸對象，用於展示層與應用層之間的通信。
 * 基於讀模型但可以包含額外的計算字段。
 */

import { BaseDTO } from '@/Shared/Application/BaseDTO'
import type { ${moduleName}ReadModel } from '../../Domain/ReadModels/${moduleName}ReadModel'

/**
 * ${moduleName} 讀模型 DTO
 */
export class ${moduleName}ReadDTO extends BaseDTO {
  // TODO: 根據查詢需求添加字段
  // 示例：
  // id: string
  // customerId: string
  // totalAmount: string
  // transactionCount: number
  // lastUpdated: Date

  /**
   * 從讀模型轉換為 DTO
   */
  static fromReadModel(model: ${moduleName}ReadModel): ${moduleName}ReadDTO {
    const dto = new ${moduleName}ReadDTO()
    // TODO: 映射讀模型字段到 DTO
    // dto.id = model.id
    // dto.customerId = model.customerId
    // ...
    return dto
  }

  /**
   * 序列化為 JSON
   */
  toJSON(): Record<string, any> {
    return {
      // TODO: 返回 DTO 的 JSON 表示
      // id: this.id,
      // customerId: this.customerId,
      // ...
    }
  }
}
`
  }

  /**
   * 生成倉庫介面
   */
  private generateRepositoryInterface(moduleName: string): string {
    return `/**
 * I${moduleName}ReadModelRepository - 讀模型倉庫介面
 *
 * 定義讀模型存儲和查詢的接口。
 * 實現類負責與數據庫或快取的交互。
 */

import type { ${moduleName}ReadModel } from '../ReadModels/${moduleName}ReadModel'

/**
 * ${moduleName} 讀模型倉庫介面
 */
export interface I${moduleName}ReadModelRepository {
  /**
   * 根據 ID 查詢讀模型
   */
  findById(id: string): Promise<${moduleName}ReadModel | null>

  /**
   * 查詢所有讀模型
   */
  findAll(filters?: Record<string, any>): Promise<${moduleName}ReadModel[]>

  /**
   * 保存讀模型（新增或更新）
   */
  save(model: ${moduleName}ReadModel): Promise<void>

  /**
   * 刪除讀模型
   */
  delete(id: string): Promise<void>

  /**
   * 根據自定義條件查詢
   */
  query(condition: Record<string, any>): Promise<${moduleName}ReadModel[]>

  /**
   * 計數
   */
  count(condition?: Record<string, any>): Promise<number>
}
`
  }

  /**
   * 生成倉庫實現
   */
  private generateRepositoryImplementation(moduleName: string): string {
    return `/**
 * ${moduleName}ReadModelRepository - 讀模型倉庫實現
 *
 * 實現讀模型的持久化和查詢。
 * 使用 Atlas ORM 與數據庫交互。
 */

import type { I${moduleName}ReadModelRepository } from '../Repositories/I${moduleName}ReadModelRepository'
import type { ${moduleName}ReadModel } from '../../Domain/ReadModels/${moduleName}ReadModel'

/**
 * ${moduleName} 讀模型倉庫實現
 * 使用 Atlas ORM 與數據庫交互
 */
export class ${moduleName}ReadModelRepository implements I${moduleName}ReadModelRepository {
  private readonly tableName = '${this.toSnakeCase(moduleName)}_read_models'

  /**
   * 根據 ID 查詢讀模型
   */
  async findById(id: string): Promise<${moduleName}ReadModel | null> {
    try {
      // TODO: 使用 Atlas ORM 查詢
      // const db = getDatabase() // 從 DI 容器獲取
      // return await db.table(this.tableName).where('id', id).first()
      return null
    } catch (error) {
      console.error(\`Error finding ${moduleName} by ID \${id}:\`, error)
      throw error
    }
  }

  /**
   * 查詢所有讀模型
   */
  async findAll(filters?: Record<string, any>): Promise<${moduleName}ReadModel[]> {
    try {
      // TODO: 使用 Atlas ORM 查詢
      // const db = getDatabase()
      // let query = db.table(this.tableName)
      //
      // if (filters) {
      //   for (const [key, value] of Object.entries(filters)) {
      //     query = query.where(key, value)
      //   }
      // }
      //
      // return await query.get()
      return []
    } catch (error) {
      console.error('Error finding all ${moduleName}:', error)
      throw error
    }
  }

  /**
   * 保存讀模型
   */
  async save(model: ${moduleName}ReadModel): Promise<void> {
    try {
      // TODO: 使用 Atlas ORM 保存
      // const db = getDatabase()
      // await db.table(this.tableName).updateOrInsert(
      //   { id: model.id },
      //   model
      // )
    } catch (error) {
      console.error('Error saving ${moduleName}:', error)
      throw error
    }
  }

  /**
   * 刪除讀模型
   */
  async delete(id: string): Promise<void> {
    try {
      // TODO: 使用 Atlas ORM 刪除
      // const db = getDatabase()
      // await db.table(this.tableName).where('id', id).delete()
    } catch (error) {
      console.error(\`Error deleting ${moduleName} ID \${id}:\`, error)
      throw error
    }
  }

  /**
   * 根據自定義條件查詢
   */
  async query(condition: Record<string, any>): Promise<${moduleName}ReadModel[]> {
    return this.findAll(condition)
  }

  /**
   * 計數
   */
  async count(condition?: Record<string, any>): Promise<number> {
    try {
      // TODO: 使用 Atlas ORM 計數
      // const db = getDatabase()
      // let query = db.table(this.tableName)
      //
      // if (condition) {
      //   for (const [key, value] of Object.entries(condition)) {
      //     query = query.where(key, value)
      //   }
      // }
      //
      // return await query.count()
      return 0
    } catch (error) {
      console.error('Error counting ${moduleName}:', error)
      throw error
    }
  }
}
`
  }

  /**
   * 生成事件訂閱器
   */
  private generateSubscriber(moduleName: string): string {
    return `/**
 * ${moduleName}ProjectionSubscriber - 投影事件訂閱器
 *
 * 訂閱領域事件並調用投影器更新讀模型。
 * 充當事件源與查詢側的橋梁。
 *
 * 工作流程：
 * 1. 應用啟動時註冊到事件匯流排
 * 2. 接收相關領域事件
 * 3. 調用投影器處理事件
 * 4. 更新讀模型
 */

import type { DomainEvent } from '@/Shared/Domain/DomainEvent'
import { ${moduleName}EventProjector } from '../../Domain/Projectors/${moduleName}EventProjector'

/**
 * ${moduleName} 投影事件訂閱器
 * 監聽事件並驅動讀模型投影
 */
export class ${moduleName}ProjectionSubscriber {
  constructor(private projector: ${moduleName}EventProjector) {}

  /**
   * 處理事件
   * @param event - 接收到的領域事件
   */
  async handle(event: DomainEvent): Promise<void> {
    try {
      // 檢查此訂閱器是否應處理該事件
      if (this.projector.supportsEvent(event.constructor.name)) {
        await this.projector.projectEvent(event)
      }
    } catch (error) {
      console.error(
        \`${moduleName}ProjectionSubscriber failed to handle \${event.constructor.name}:\`,
        error
      )
      throw error
    }
  }

  /**
   * 獲取訂閱的事件類型列表
   * 用於事件匯流排註冊
   */
  getSubscribedEventTypes(): string[] {
    return this.projector.getSubscribedEventTypes()
  }
}
`
  }

  /**
   * 生成快取層
   */
  private generateCache(moduleName: string): string {
    return `/**
 * ${moduleName}ReadModelCache - 讀模型快取層
 *
 * 可選的快取層，用於提高查詢性能。
 * 支持雙層快取：進程內快取 + Redis 快取
 */

import type { ${moduleName}ReadModel } from '../../Domain/ReadModels/${moduleName}ReadModel'

/**
 * ${moduleName} 讀模型快取
 */
export class ${moduleName}ReadModelCache {
  private memoryCache: Map<string, ${moduleName}ReadModel> = new Map()
  private readonly cacheTTL = 3600 // 1 小時

  /**
   * 從快取獲取讀模型
   */
  async get(key: string): Promise<${moduleName}ReadModel | null> {
    // 先嘗試進程記憶體快取
    const cached = this.memoryCache.get(key)
    if (cached) {
      return cached
    }

    // TODO: 嘗試 Redis 快取
    // const redis = getRedisClient()
    // const cached = await redis.get(\`${moduleName}:\${key}\`)
    // if (cached) {
    //   return JSON.parse(cached)
    // }

    return null
  }

  /**
   * 設置快取
   */
  async set(key: string, value: ${moduleName}ReadModel, ttl?: number): Promise<void> {
    // 設置進程記憶體快取
    this.memoryCache.set(key, value)

    // TODO: 設置 Redis 快取
    // const redis = getRedisClient()
    // await redis.setex(
    //   \`${moduleName}:\${key}\`,
    //   ttl || this.cacheTTL,
    //   JSON.stringify(value)
    // )
  }

  /**
   * 失效快取
   */
  async invalidate(key: string): Promise<void> {
    // 清除進程快取
    this.memoryCache.delete(key)

    // TODO: 清除 Redis 快取
    // const redis = getRedisClient()
    // await redis.del(\`${moduleName}:\${key}\`)
  }

  /**
   * 清空所有快取
   */
  async clear(): Promise<void> {
    this.memoryCache.clear()

    // TODO: 清空 Redis 快取
    // const redis = getRedisClient()
    // await redis.del(\`${moduleName}:*\`)
  }
}
`
  }

  /**
   * 生成 HTTP 控制器
   */
  private generateController(moduleName: string): string {
    const kebabName = this.toKebabCase(moduleName)
    return `/**
 * ${moduleName}QueryController - 查詢端點控制器
 *
 * HTTP 端點，為客戶端提供讀模型查詢接口。
 * 調用查詢服務並格式化響應。
 */

import type { IHttpContext } from '@/Shared/Http/IHttpContext'
import { Query${moduleName}Service } from '../../Application/Services/Query${moduleName}Service'

/**
 * ${moduleName} 查詢控制器
 */
export class ${moduleName}QueryController {
  constructor(private queryService: Query${moduleName}Service) {}

  /**
   * GET /${kebabName}/:id
   * 根據 ID 查詢單個 ${moduleName}
   */
  async findById(ctx: IHttpContext): Promise<void> {
    try {
      const { id } = ctx.request.params as { id: string }

      if (!id) {
        ctx.response.status = 400
        ctx.response.json({ error: 'ID is required' })
        return
      }

      const dto = await this.queryService.findById(id)

      if (!dto) {
        ctx.response.status = 404
        ctx.response.json({ error: '${moduleName} not found' })
        return
      }

      ctx.response.status = 200
      ctx.response.json({ data: dto })
    } catch (error) {
      this.handleError(ctx, error)
    }
  }

  /**
   * GET /${kebabName}
   * 查詢所有 ${moduleName}
   */
  async findAll(ctx: IHttpContext): Promise<void> {
    try {
      const filters = ctx.request.query as Record<string, any> | undefined
      const dtos = await this.queryService.findAll(filters)

      ctx.response.status = 200
      ctx.response.json({
        data: dtos,
        meta: { count: dtos.length },
      })
    } catch (error) {
      this.handleError(ctx, error)
    }
  }

  /**
   * GET /${kebabName}/search
   * 搜索 ${moduleName}
   */
  async search(ctx: IHttpContext): Promise<void> {
    try {
      const criteria = ctx.request.query as Record<string, any> | undefined

      if (!criteria) {
        ctx.response.status = 400
        ctx.response.json({ error: 'Search criteria required' })
        return
      }

      const dtos = await this.queryService.search(criteria)

      ctx.response.status = 200
      ctx.response.json({
        data: dtos,
        meta: { count: dtos.length },
      })
    } catch (error) {
      this.handleError(ctx, error)
    }
  }

  /**
   * GET /${kebabName}/statistics
   * 獲取統計信息
   */
  async getStatistics(ctx: IHttpContext): Promise<void> {
    try {
      const stats = await this.queryService.getStatistics()

      ctx.response.status = 200
      ctx.response.json({ data: stats })
    } catch (error) {
      this.handleError(ctx, error)
    }
  }

  /**
   * 統一錯誤處理
   */
  private handleError(ctx: IHttpContext, error: unknown): void {
    console.error('${moduleName}QueryController error:', error)

    ctx.response.status = 500
    ctx.response.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
`
  }

  /**
   * 生成路由檔案
   */
  private generateRoutes(moduleName: string): string {
    const kebabName = this.toKebabCase(moduleName)
    const functionName = `register${moduleName}QueryRoutes`

    return `/**
 * ${kebabName}.routes.ts - ${moduleName} 查詢路由
 *
 * 註冊 ${moduleName} 查詢端點的路由
 */

import type { PlanetCore } from '@gravito/core'
import { ${moduleName}QueryController } from '../Controllers/${moduleName}QueryController'

/**
 * 註冊 ${moduleName} 查詢路由
 *
 * 端點：
 * - GET /${kebabName}/:id - 獲取單個 ${moduleName}
 * - GET /${kebabName} - 列表查詢
 * - GET /${kebabName}/search - 搜索
 * - GET /${kebabName}/statistics - 統計信息
 */
export function ${functionName}(core: PlanetCore): void {
  // TODO: 從 DI 容器獲取依賴並創建控制器
  // const queryService = core.container.make('query-${kebabName}-service')
  // const controller = new ${moduleName}QueryController(queryService)

  // TODO: 註冊路由
  // core.router.get('/${kebabName}/:id', (ctx) => controller.findById(ctx))
  // core.router.get('/${kebabName}', (ctx) => controller.findAll(ctx))
  // core.router.get('/${kebabName}/search', (ctx) => controller.search(ctx))
  // core.router.get('/${kebabName}/statistics', (ctx) => controller.getStatistics(ctx))

  console.log(\`✓ ${moduleName} query routes registered\`)
}
`
  }

  /**
   * 生成模組索引檔案
   */
  private generateIndex(moduleName: string): string {
    return `/**
 * ${moduleName} Query Module
 *
 * CQRS 查詢側模組，提供讀模型和查詢服務。
 * 訂閱來自寫側（Event Sourcing）模組的事件。
 */

// Domain exports
export type { ${moduleName}ReadModel } from './Domain/ReadModels/${moduleName}ReadModel'
export { create${moduleName}ReadModel, validate${moduleName}ReadModel } from './Domain/ReadModels/${moduleName}ReadModel'
export { ${moduleName}EventProjector } from './Domain/Projectors/${moduleName}EventProjector'
export type { I${moduleName}ReadModelRepository } from './Domain/Repositories/I${moduleName}ReadModelRepository'

// Application exports
export { Query${moduleName}Service } from './Application/Services/Query${moduleName}Service'
export { ${moduleName}ReadDTO } from './Application/DTOs/${moduleName}ReadDTO'

// Infrastructure exports
export { ${moduleName}ReadModelRepository } from './Infrastructure/Repositories/${moduleName}ReadModelRepository'
export { ${moduleName}ProjectionSubscriber } from './Infrastructure/Subscribers/${moduleName}ProjectionSubscriber'
export { ${moduleName}ReadModelCache } from './Infrastructure/Cache/${moduleName}ReadModelCache'

// Presentation exports
export { ${moduleName}QueryController } from './Presentation/Controllers/${moduleName}QueryController'
export { register${moduleName}QueryRoutes } from './Presentation/Routes/${this.toKebabCase(moduleName)}.routes'
`
  }

  /**
   * 將字符串轉換為 kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
      .toLowerCase()
  }

  /**
   * 將字符串轉換為 snake_case
   */
  private toSnakeCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
      .toLowerCase()
  }
}
