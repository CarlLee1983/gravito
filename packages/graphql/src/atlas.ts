import { getRelationships, type Model, type ModelStatic, SchemaRegistry } from '@gravito/atlas'
import type { GraphQLSchema } from 'graphql'
import { createSchema } from 'graphql-yoga'
import { applyFilter, applyLogicalOperators } from './filters'
import { AtlasMutationFactory } from './mutations/atlas-mutations'
import { SCALAR_RESOLVERS, SCALAR_TYPE_DEFS } from './scalars'
import { createSubscriptionResolver, SUBSCRIPTION_TYPE_DEFS } from './subscriptions'
import { extractAppendFields, extractModelMetadata } from './utils/model-metadata'

/**
 * Configuration options for the Atlas to GraphQL integration.
 */
export interface AtlasGraphQLOptions {
  /**
   * The Atlas models to include in the generated GraphQL schema.
   * These models will be scanned to generate types and resolvers automatically.
   */
  models: ModelStatic<Model>[]
  /**
   * Custom resolvers to merge with the auto-generated ones.
   * Use this to override default behavior or add new fields/queries.
   */
  // biome-ignore lint/suspicious/noExplicitAny: Resolvers can be any shape
  resolvers?: any
}

/**
 * Maps Atlas data types to GraphQL scalar types.
 *
 * Facilitates the translation of database column types to their GraphQL counterparts,
 * ensuring correct serialization and validation in the API layer.
 *
 * @param type - The Atlas schema type string
 * @returns The corresponding GraphQL scalar name
 *
 * @internal
 */
function mapAtlasTypeToGraphQL(type: string): string {
  switch (type) {
    case 'integer':
    case 'smallInteger':
      return 'Int'

    case 'bigInteger':
      return 'BigInt'

    case 'decimal':
    case 'float':
      return 'Float'

    case 'boolean':
      return 'Boolean'

    case 'json':
    case 'jsonb':
      return 'JSON'

    case 'date':
    case 'dateTime':
    case 'timestamp':
      return 'DateTime'

    case 'uuid':
      return 'UUID'

    default:
      return 'String'
  }
}

/**
 * Determines the appropriate input filter type for a given GraphQL scalar.
 *
 * @param gqlType - The GraphQL scalar type name
 * @returns The name of the generated input filter type
 *
 * @internal
 */
function getFilterType(gqlType: string): string {
  switch (gqlType) {
    case 'Int':
      return 'IntFilter'
    case 'Float':
      return 'FloatFilter'
    case 'Boolean':
      return 'BooleanFilter'
    case 'ID':
      return 'IDFilter'
    case 'BigInt':
      return 'BigIntFilter'
    case 'DateTime':
      return 'DateTimeFilter'
    case 'JSON':
      return 'JSONFilter'
    case 'UUID':
      return 'UUIDFilter'
    case 'Email':
      return 'StringFilter'
    case 'URL':
      return 'StringFilter'
    default:
      return 'StringFilter'
  }
}

/**
 * Shared type definitions for common GraphQL inputs like filters and sort orders.
 */
const BASE_TYPE_DEFS = `
  input IntFilter {
    eq: Int
    gt: Int
    lt: Int
    gte: Int
    lte: Int
    in: [Int]
    between: IntRange
  }
  input IntRange {
    from: Int!
    to: Int!
  }
  input FloatFilter {
    eq: Float
    gt: Float
    lt: Float
    gte: Float
    lte: Float
    in: [Float]
    between: FloatRange
  }
  input FloatRange {
    from: Float!
    to: Float!
  }
  input StringFilter {
    eq: String
    like: String
    in: [String]
    contains: String
    startsWith: String
    endsWith: String
    match: String
  }
  input BooleanFilter {
    eq: Boolean
  }
  input IDFilter {
    eq: ID
    in: [ID]
  }
  input UUIDFilter {
    eq: UUID
    in: [UUID]
  }
  input BigIntFilter {
    eq: BigInt
    gt: BigInt
    lt: BigInt
    gte: BigInt
    lte: BigInt
    in: [BigInt]
    between: BigIntRange
  }
  input BigIntRange {
    from: BigInt!
    to: BigInt!
  }
  input DateTimeFilter {
    eq: DateTime
    gt: DateTime
    lt: DateTime
    gte: DateTime
    lte: DateTime
    in: [DateTime]
    between: DateTimeRange
  }
  input DateTimeRange {
    from: DateTime!
    to: DateTime!
  }
  input JSONFilter {
    eq: JSON
  }
  enum SortOrder {
    ASC
    DESC
  }
`

/**
 * Automatically generates a complete GraphQL schema from Atlas models.
 *
 * Scans provided models for columns, relationships, and metadata to produce
 * a CRUD-capable schema including advanced filtering, pagination, and sorting.
 *
 * @param options - Configuration including models and optional custom resolvers
 * @returns A promise resolving to the generated GraphQLSchema
 * @throws {Error} If schema generation fails for critical components
 *
 * @example
 * ```typescript
 * const schema = await createAtlasSchema({
 *   models: [User, Post]
 * });
 * ```
 */
export async function createAtlasSchema(options: AtlasGraphQLOptions): Promise<GraphQLSchema> {
  const typeDefs: string[] = [BASE_TYPE_DEFS, SUBSCRIPTION_TYPE_DEFS]
  // biome-ignore lint/suspicious/noExplicitAny: Resolvers accumulator
  const resolvers: any = { Query: {}, Mutation: {}, Subscription: {} }
  const registry = SchemaRegistry.getInstance()

  for (const model of options.models) {
    const modelName = model.name
    const table = model.table

    try {
      const schema = await registry.get(table, model.connection)

      // Extract model metadata (hidden, appends)
      const metadata = extractModelMetadata(model)
      const hiddenSet = new Set(metadata.hidden)
      const appendFields = extractAppendFields(model)

      const outputFields: string[] = []
      const inputFields: string[] = []
      const updateFields: string[] = []
      const whereFields: string[] = []
      const orderByFields: string[] = []

      for (const [colName, colDef] of schema.columns) {
        // Skip hidden fields
        if (hiddenSet.has(colName)) {
          continue
        }

        let gqlType: string

        // biome-ignore lint/suspicious/noExplicitAny: Property access on static
        const castType = (model as any).casts?.[colName]
        if (castType) {
          gqlType = mapAtlasTypeToGraphQL(castType)
        } else if (colName === model.primaryKey) {
          gqlType = 'ID'
        } else {
          gqlType = mapAtlasTypeToGraphQL(colDef.type)

          if (gqlType === 'String') {
            if (colName.toLowerCase().includes('email')) {
              gqlType = 'Email'
            } else if (
              colName.toLowerCase().includes('url') ||
              colName.toLowerCase().includes('website')
            ) {
              gqlType = 'URL'
            } else if (colName.toLowerCase().includes('uuid')) {
              gqlType = 'UUID'
            }
          }
        }

        const isAutoManaged =
          colName === model.primaryKey || colName === 'created_at' || colName === 'updated_at'

        const outputRequired = colDef.nullable ? '' : '!'
        const inputRequired = colDef.nullable ? '' : '!'

        outputFields.push(`${colName}: ${gqlType}${outputRequired}`)

        // Where & OrderBy inputs
        whereFields.push(`${colName}: ${getFilterType(gqlType)}`)
        orderByFields.push(`${colName}: SortOrder`)

        // Input fields should not contain auto-managed fields
        if (!isAutoManaged) {
          inputFields.push(`${colName}: ${gqlType}${inputRequired}`)
          updateFields.push(`${colName}: ${gqlType}`)
        }
      }

      // Handle appends fields - add to output type
      for (const appendField of appendFields) {
        if (appendField.hasAccessor) {
          outputFields.push(`${appendField.name}: ${appendField.graphqlType}`)
        }
      }

      // Relationships
      const getRelations =
        ((globalThis as unknown as Record<string, unknown>).__G_TEST_RELATIONS_FUNC__ as
          | typeof getRelationships
          | undefined) || getRelationships
      const relations = getRelations(model as unknown as typeof Model)
      for (const [relName, meta] of relations) {
        const RelatedClass = meta.related?.()
        if (!RelatedClass) continue

        const relatedName = RelatedClass.name
        const isExposed = options.models.some((m) => m.name === relatedName)
        if (!isExposed) continue

        if (meta.type === 'hasMany' || meta.type === 'belongsToMany' || meta.type === 'morphMany') {
          outputFields.push(`${relName}: [${relatedName}]`)
          whereFields.push(`${relName}: ${relatedName}WhereInput`)
        } else {
          outputFields.push(`${relName}: ${relatedName}`)
          whereFields.push(`${relName}: ${relatedName}WhereInput`)
        }

        resolvers[modelName] = resolvers[modelName] || {}
        resolvers[modelName][relName] = async (
          parent: Record<string, unknown>,
          _args: unknown,
          context: import('./index').GraphQLContext
        ) => {
          const loaderKey = `${modelName}.${relName}`
          if (context.loaders?.[loaderKey]) {
            // biome-ignore lint/suspicious/noExplicitAny: DataLoader is generic
            return (context.loaders[loaderKey] as any).load(parent)
          }
          return await (parent as unknown as Model)[relName as keyof Model]
        }
      }

      resolvers.Subscription = {
        ...resolvers.Subscription,
        ...createSubscriptionResolver(modelName),
      }

      // Add resolvers for appends fields
      for (const appendField of appendFields) {
        if (appendField.hasAccessor) {
          resolvers[modelName] = resolvers[modelName] || {}
          // biome-ignore lint/suspicious/noExplicitAny: Parent is model instance
          resolvers[modelName][appendField.name] = (parent: any) => {
            // Call accessor method: get{PropertyName}Attribute
            const accessorName = `get${appendField.name
              .split('_')
              .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
              .join('')}Attribute`
            if (typeof parent[accessorName] === 'function') {
              return parent[accessorName]()
            }
            // Direct attribute access as fallback
            return parent[appendField.name]
          }
        }
      }

      // Generate Types
      typeDefs.push(`
        type ${modelName} {
          ${outputFields.join('\n          ')}
        }
        input Create${modelName}Input {
          ${inputFields.join('\n          ')}
        }
        input Update${modelName}Input {
          ${updateFields.join('\n          ')}
        }
        input ${modelName}WhereInput {
          _and: [${modelName}WhereInput]
          _or: [${modelName}WhereInput]
          _not: ${modelName}WhereInput
          ${whereFields.join('\n          ')}
        }
        input ${modelName}OrderByInput {
          ${orderByFields.join('\n          ')}
        }
      `)

      // Generate Operations
      typeDefs.push(`
        extend type Query {
          ${modelName.toLowerCase()}(id: ID!): ${modelName}
          ${modelName.toLowerCase()}s(
            limit: Int
            offset: Int
            where: ${modelName}WhereInput
            orderBy: ${modelName}OrderByInput
          ): [${modelName}]
        }
      `)

      typeDefs.push(`
        extend type Mutation {
          create${modelName}(input: Create${modelName}Input!): ${modelName}
          create${modelName}Batch(input: [Create${modelName}Input!]!): [${modelName}]
          update${modelName}(id: ID!, input: Update${modelName}Input!): ${modelName}
          delete${modelName}(id: ID!): Boolean
        }
      `)

      typeDefs.push(`
        extend type Subscription {
          ${modelName.toLowerCase()}Created: ${modelName}
        }
      `)

      // Resolvers

      // Find
      // biome-ignore lint/suspicious/noExplicitAny: GraphQL Resolver
      resolvers.Query[`${modelName.toLowerCase()}`] = async (
        _: unknown,
        { id }: { id: unknown }
      ) => {
        return model.find(id)
      }

      // List with Filters
      // biome-ignore lint/suspicious/noExplicitAny: GraphQL Resolver
      resolvers.Query[`${modelName.toLowerCase()}s`] = async (_: unknown, args: any) => {
        const query = model.query()

        if (args.limit) {
          query.limit(args.limit)
        }
        if (args.offset) {
          query.offset(args.offset)
        }

        if (args.where) {
          const schemaColumns = schema.columns
          const applyFieldFilter = (q: unknown, col: string, filters: unknown) => {
            const colDef = schemaColumns.get(col)
            if (colDef) {
              let colType: 'string' | 'number' | 'date' = 'string'
              const castType = (model as unknown as { casts?: Record<string, string> }).casts?.[col]
              const type = castType || colDef.type

              if (['integer', 'smallInteger', 'bigInteger', 'decimal', 'float'].includes(type)) {
                colType = 'number'
              } else if (['date', 'dateTime', 'timestamp'].includes(type)) {
                colType = 'date'
              }

              // biome-ignore lint/suspicious/noExplicitAny: Recursive apply
              applyFilter(q as any, col, filters as any, colType)
            } else {
              const relation = relations.get(col)
              if (relation) {
                const RelatedClass = relation.related?.()
                if (RelatedClass) {
                  const { applyRelationFilter } = require('./filters/relation-filters')

                  const relationConfig = {
                    modelTable: model.table,
                    modelPrimaryKey: model.primaryKey,
                    relationTable: RelatedClass.table,
                    relationForeignKey: relation.foreignKey,
                    relationType: relation.type,
                    localKey: (relation as unknown as { localKey?: string }).localKey,
                    pivotTable: (relation as unknown as { pivotTable?: string }).pivotTable,
                    pivotForeignKey: (relation as unknown as { pivotForeignKey?: string })
                      .pivotForeignKey,
                    pivotRelatedKey: (relation as unknown as { pivotRelatedKey?: string })
                      .pivotRelatedKey,
                  }

                  // biome-ignore lint/suspicious/noExplicitAny: Recursive apply
                  applyRelationFilter(q, relationConfig, filters as any)
                }
              }
            }
          }

          // biome-ignore lint/suspicious/noExplicitAny: Recursive apply
          applyLogicalOperators(query as any, args.where, applyFieldFilter)
        }

        if (args.orderBy) {
          // biome-ignore lint/suspicious/noExplicitAny: Sorting
          for (const [col, dir] of Object.entries(args.orderBy) as [string, any][]) {
            query.orderBy(col, dir.toLowerCase())
          }
        }

        return query.get()
      }

      resolvers.Mutation[`create${modelName}`] = async (
        _: unknown,
        { input }: { input: Record<string, unknown> }
      ) => {
        return AtlasMutationFactory.create(model, input)
      }

      resolvers.Mutation[`create${modelName}Batch`] = async (
        _: unknown,
        { input }: { input: Record<string, unknown>[] }
      ) => {
        return AtlasMutationFactory.createBatch(model, input)
      }

      resolvers.Mutation[`update${modelName}`] = async (
        _: unknown,
        { id, input }: { id: string | number; input: Record<string, unknown> }
      ) => {
        return AtlasMutationFactory.update(model, id, input)
      }

      resolvers.Mutation[`delete${modelName}`] = async (
        _: unknown,
        { id }: { id: string | number }
      ) => {
        return AtlasMutationFactory.delete(model, id)
      }
    } catch (error) {
      console.warn(`[OrbitGraphQL] Failed to generate schema for model ${modelName}:`, error)
    }
  }

  return createSchema({
    typeDefs: [
      'type Query { _empty: String }',
      'type Mutation { _empty: String }',
      SCALAR_TYPE_DEFS,
      ...typeDefs,
    ],
    resolvers: {
      ...SCALAR_RESOLVERS,
      ...resolvers,
      ...options.resolvers,
    },
  })
}
