/**
 * Federation _entities Resolver 實作
 * 用於解析跨服務的實體引用
 */

import type { Model, ModelStatic } from '@gravito/atlas'

export interface EntityReference {
  __typename: string
  [key: string]: unknown
}

export interface EntitiesResolverConfig {
  models: Map<string, ModelStatic<Model>>
  keys?: Record<string, string> // Model name -> key field name (默認為 primaryKey)
}

/**
 * 創建 _entities resolver
 * 根據 __typename 和 key 欄位解析實體
 */
export function createEntitiesResolver(
  config: EntitiesResolverConfig
): (parent: unknown, args: { representations: EntityReference[] }) => Promise<(Model | null)[]> {
  return async (_parent: unknown, { representations }: { representations: EntityReference[] }) => {
    return Promise.all(
      representations.map(async (ref) => {
        const model = config.models.get(ref.__typename)
        if (!model) {
          // 此 subgraph 不負責此類型
          return null
        }

        // 獲取 key 欄位名稱
        const keyField = config.keys?.[ref.__typename] || model.primaryKey

        // 取得 key 值
        const keyValue = ref[keyField]
        if (keyValue === undefined || keyValue === null) {
          return null
        }

        // 查詢實體
        try {
          return await model.find(keyValue)
        } catch {
          return null
        }
      })
    )
  }
}

/**
 * 生成 _entities query 定義
 */
export function generateEntitiesQuery(): string {
  return `
    extend type Query {
      _entities(representations: [_Any!]!): [_Entity]!
    }
    
    scalar _Any
    scalar _Entity
  `.trim()
}
