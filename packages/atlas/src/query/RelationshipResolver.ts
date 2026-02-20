import type { QueryBuilderContract } from '../types'

/**
 * Relationship Metadata interface for QueryBuilder
 */
export interface RelationshipMeta {
  type: string
  related: () => any
  foreignKey?: string
  localKey?: string
  pivotTable?: string
  relatedKey?: string
  pivotColumns?: string[]
  morphName?: string
  morphTypeField?: string
  morphIdField?: string
}

/**
 * Relationship Resolver interface to decouple QueryBuilder from Model relationships
 */
export interface RelationshipResolver {
  getRelationships(model: any): Map<string, RelationshipMeta>
  eagerLoadMany(
    parents: any[],
    relations:
      | string[]
      | Record<string, any>
      | Map<string, (query: QueryBuilderContract<any>) => void>
  ): Promise<void>
}
