import type { ModelStatic } from '@gravito/atlas'
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
 * Utility to generate a GraphQL Schema from Atlas Models.
 *
 * @remarks
 * This is a foundational implementation for Phase 3 of the GraphQL RFC.
 * Currently, it provides a way to register models and generate basic types.
 *
 * @param options - Configuration options including models and custom resolvers.
 * @returns A GraphQLSchema instance compatible with Yoga.
 */
export function createAtlasSchema(options: AtlasGraphQLOptions): GraphQLSchema {
  // This is a placeholder for the full auto-generation logic.
  // In a real implementation, we would iterate over models and generate types.

  const typeDefs: string[] = []
  // biome-ignore lint/suspicious/noExplicitAny: Resolvers accumulator
  const resolvers: any = { Query: {}, Mutation: {} }

  for (const model of options.models) {
    const modelName = model.name

    // Generate basic Type
    typeDefs.push(`
      type ${modelName} {
        id: ID!
        # Additional fields would be discovered via Model.schema
      }
    `)

    // Generate basic Query
    typeDefs.push(`
      extend type Query {
        get${modelName}(id: ID!): ${modelName}
        list${modelName}s: [${modelName}]
      }
    `)

    // biome-ignore lint/suspicious/noExplicitAny: Generic resolver args
    resolvers.Query[`get${modelName}`] = async (_: any, { id }: { id: any }) => {
      return model.find(id)
    }

    resolvers.Query[`list${modelName}s`] = async () => {
      return model.all()
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
