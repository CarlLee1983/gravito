import { type ModelStatic, SchemaRegistry } from '@gravito/atlas'
import type { GraphQLSchema } from 'graphql'
import { createSchema } from 'graphql-yoga'

/**
 * Options for Atlas to GraphQL integration.
 */
export interface AtlasGraphQLOptions {
  /** Atlas models to include in the schema */
  // biome-ignore lint/suspicious/noExplicitAny: ModelStatic is generic
  models: ModelStatic<any>[]
  /** Custom resolvers to merge with auto-generated ones */
  // biome-ignore lint/suspicious/noExplicitAny: Resolvers can be any shape
  resolvers?: any
}

/**
 * Maps Atlas column types to GraphQL Scalar types.
 */
function mapAtlasTypeToGraphQL(type: string): string {
  switch (type) {
    case 'integer':
    case 'smallInteger':
      return 'Int'
    case 'bigInteger':
      // GraphQL Int is 32-bit. BigInts are safer as Strings to prevent overflow.
      return 'String'
    case 'decimal':
    case 'float':
      return 'Float'
    case 'boolean':
      return 'Boolean'
    case 'json':
    case 'jsonb':
      return 'String' // TODO: Support JSON Scalar
    case 'date':
    case 'dateTime':
    case 'timestamp':
      return 'String' // TODO: Support DateTime Scalar
    default:
      return 'String'
  }
}

/**
 * Utility to generate a GraphQL Schema from Atlas Models.
 *
 * @remarks
 * Phase 3 Implementation:
 * - Auto-discovers table schema via SchemaRegistry
 * - Maps SQL types to GraphQL types
 * - Generates basic CRUD resolvers
 *
 * @param options - Configuration options including models and custom resolvers.
 * @returns A GraphQLSchema instance compatible with Yoga.
 */
export async function createAtlasSchema(options: AtlasGraphQLOptions): Promise<GraphQLSchema> {
  const typeDefs: string[] = []
  // biome-ignore lint/suspicious/noExplicitAny: Resolvers accumulator
  const resolvers: any = { Query: {}, Mutation: {} }
  const registry = SchemaRegistry.getInstance()

  // Ensure registry is ready (if JIT mode)
  // In AOT mode, it should be pre-loaded, but accessing .get() handles it.

  for (const model of options.models) {
    const modelName = model.name
    const table = model.table

    try {
      // 1. Discover Schema
      // We pass connection if defined, otherwise default
      const schema = await registry.get(table, model.connection)

      const fields: string[] = []

      for (const [colName, colDef] of schema.columns) {
        // Skip hidden fields (needs Model metadata, for now strict schema mapping)
        // TODO: Check Model.hidden

        let gqlType: string

        // Check overrides from Model casts first
        // biome-ignore lint/suspicious/noExplicitAny: Missing types in ModelStatic
        const castType = (model as any).casts?.[colName]
        if (castType) {
          gqlType = mapAtlasTypeToGraphQL(castType)
        } else if (colName === model.primaryKey) {
          gqlType = 'ID'
        } else {
          gqlType = mapAtlasTypeToGraphQL(colDef.type)
        }

        const outputRequired = colDef.nullable ? '' : '!'

        fields.push(`${colName}: ${gqlType}${outputRequired}`)
      }

      // 2. Generate Type Definition
      typeDefs.push(`
        type ${modelName} {
          ${fields.join('\n          ')}
        }
      `)

      // 3. Generate Operations
      typeDefs.push(`
        extend type Query {
          ${modelName.toLowerCase()}(id: ID!): ${modelName}
          ${modelName.toLowerCase()}s: [${modelName}]
        }
      `)

      // 4. Generate Resolvers
      // biome-ignore lint/suspicious/noExplicitAny: Generic resolver args
      resolvers.Query[`${modelName.toLowerCase()}`] = async (_: any, { id }: { id: any }) => {
        // biome-ignore lint/suspicious/noExplicitAny: Missing types in ModelStatic
        return (model as any).find(id)
      }

      resolvers.Query[`${modelName.toLowerCase()}s`] = async () => {
        // biome-ignore lint/suspicious/noExplicitAny: Missing types in ModelStatic
        return (model as any).all()
      }
    } catch (error) {
      console.warn(`[OrbitGraphQL] Failed to generate schema for model ${modelName}:`, error)
      // Continue to next model or throw? Warning is safer for now.
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
