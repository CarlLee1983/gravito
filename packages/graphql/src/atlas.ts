import { getRelationships, type Model, type ModelStatic, SchemaRegistry } from '@gravito/atlas'
import type { GraphQLSchema } from 'graphql'
import { createSchema } from 'graphql-yoga'

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

function mapAtlasTypeToGraphQL(type: string): string {
  switch (type) {
    case 'integer':
    case 'smallInteger':
      return 'Int'
    case 'bigInteger':
      return 'String'
    case 'decimal':
    case 'float':
      return 'Float'
    case 'boolean':
      return 'Boolean'
    case 'json':
    case 'jsonb':
      return 'String'
    case 'date':
    case 'dateTime':
    case 'timestamp':
      return 'String'
    default:
      return 'String'
  }
}

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
    default:
      return 'StringFilter'
  }
}

const BASE_TYPE_DEFS = `
  input IntFilter {
    eq: Int
    gt: Int
    lt: Int
    gte: Int
    lte: Int
    in: [Int]
  }
  input FloatFilter {
    eq: Float
    gt: Float
    lt: Float
    gte: Float
    lte: Float
    in: [Float]
  }
  input StringFilter {
    eq: String
    like: String
    in: [String]
  }
  input BooleanFilter {
    eq: Boolean
  }
  input IDFilter {
    eq: ID
    in: [ID]
  }
  enum SortOrder {
    ASC
    DESC
  }
`

export async function createAtlasSchema(options: AtlasGraphQLOptions): Promise<GraphQLSchema> {
  const typeDefs: string[] = [BASE_TYPE_DEFS]
  // biome-ignore lint/suspicious/noExplicitAny: Resolvers accumulator
  const resolvers: any = { Query: {}, Mutation: {} }
  const registry = SchemaRegistry.getInstance()

  for (const model of options.models) {
    const modelName = model.name
    const table = model.table

    try {
      const schema = await registry.get(table, model.connection)

      const outputFields: string[] = []
      const inputFields: string[] = []
      const updateFields: string[] = []
      const whereFields: string[] = []
      const orderByFields: string[] = []

      for (const [colName, colDef] of schema.columns) {
        let gqlType: string

        // biome-ignore lint/suspicious/noExplicitAny: Property access on static
        const castType = (model as any).casts?.[colName]
        if (castType) {
          gqlType = mapAtlasTypeToGraphQL(castType)
        } else if (colName === model.primaryKey) {
          gqlType = 'ID'
        } else {
          gqlType = mapAtlasTypeToGraphQL(colDef.type)
        }

        const isAutoManaged =
          colName === model.primaryKey || colName === 'created_at' || colName === 'updated_at'

        const outputRequired = colDef.nullable ? '' : '!'
        const inputRequired = colDef.nullable ? '' : '!'

        outputFields.push(`${colName}: ${gqlType}${outputRequired}`)

        // Where & OrderBy inputs
        whereFields.push(`${colName}: ${getFilterType(gqlType)}`)
        orderByFields.push(`${colName}: SortOrder`)

        if (!isAutoManaged) {
          inputFields.push(`${colName}: ${gqlType}${inputRequired}`)
          updateFields.push(`${colName}: ${gqlType}`)
        }
      }

      // Relationships
      const relations = getRelationships(model as unknown as typeof Model)
      for (const [relName, meta] of relations) {
        const RelatedClass = meta.related?.()
        if (!RelatedClass) continue

        const relatedName = RelatedClass.name
        const isExposed = options.models.some((m) => m.name === relatedName)
        if (!isExposed) continue

        if (meta.type === 'hasMany' || meta.type === 'belongsToMany' || meta.type === 'morphMany') {
          outputFields.push(`${relName}: [${relatedName}]`)
        } else {
          outputFields.push(`${relName}: ${relatedName}`)
        }

        // biome-ignore lint/suspicious/noExplicitAny: Parent is model instance
        resolvers[modelName] = resolvers[modelName] || {}
        // biome-ignore lint/suspicious/noExplicitAny: Parent is model instance
        resolvers[modelName][relName] = async (parent: any) => {
          return await parent[relName]
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
          update${modelName}(id: ID!, input: Update${modelName}Input!): ${modelName}
          delete${modelName}(id: ID!): Boolean
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
          // biome-ignore lint/suspicious/noExplicitAny: Filters
          for (const [col, filters] of Object.entries(args.where) as [string, any][]) {
            if (!filters) continue

            for (const [op, val] of Object.entries(filters)) {
              if (val === undefined || val === null) continue

              switch (op) {
                case 'eq':
                  query.where(col, val)
                  break
                case 'gt':
                  query.where(col, '>', val)
                  break
                case 'gte':
                  query.where(col, '>=', val)
                  break
                case 'lt':
                  query.where(col, '<', val)
                  break
                case 'lte':
                  query.where(col, '<=', val)
                  break
                case 'like':
                  query.where(col, 'like', val)
                  break
                case 'in':
                  query.whereIn(col, val as unknown[])
                  break
              }
            }
          }
        }

        if (args.orderBy) {
          // biome-ignore lint/suspicious/noExplicitAny: Sorting
          for (const [col, dir] of Object.entries(args.orderBy) as [string, any][]) {
            query.orderBy(col, dir.toLowerCase())
          }
        }

        return query.get()
      }

      // Create
      // biome-ignore lint/suspicious/noExplicitAny: GraphQL Resolver
      resolvers.Mutation[`create${modelName}`] = async (
        _: unknown,
        { input }: { input: unknown }
      ) => {
        // biome-ignore lint/suspicious/noExplicitAny: Cast input
        return model.create(input as any)
      }

      // Update
      resolvers.Mutation[`update${modelName}`] = async (
        _: unknown,
        { id, input }: { id: unknown; input: Record<string, unknown> }
      ) => {
        const instance = await model.find(id)
        if (!instance) {
          throw new Error(`${modelName} with ID ${id} not found`)
        }
        if (typeof instance.fill === 'function') {
          // biome-ignore lint/suspicious/noExplicitAny: Cast input
          instance.fill(input as any)
        } else {
          // Fallback if fill is missing
          for (const [key, value] of Object.entries(input)) {
            // biome-ignore lint/suspicious/noExplicitAny: Dynamic property access
            ;(instance as any)[key] = value
          }
        }
        await instance.save()
        return instance
      }

      // Delete
      // biome-ignore lint/suspicious/noExplicitAny: GraphQL Resolver
      resolvers.Mutation[`delete${modelName}`] = async (_: unknown, { id }: { id: unknown }) => {
        const instance = await model.find(id)
        if (!instance) {
          return false
        }
        await instance.delete()
        return true
      }
    } catch (error) {
      console.warn(`[OrbitGraphQL] Failed to generate schema for model ${modelName}:`, error)
    }
  }

  return createSchema({
    typeDefs: ['type Query { _empty: String }', 'type Mutation { _empty: String }', ...typeDefs],
    resolvers: {
      ...resolvers,
      ...options.resolvers,
    },
  })
}
