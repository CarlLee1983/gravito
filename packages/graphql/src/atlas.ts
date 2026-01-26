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
  // biome-ignore lint/suspicious/noExplicitAny: ModelStatic is generic
  models: ModelStatic<any>[]
  /**
   * Custom resolvers to merge with the auto-generated ones.
   * Use this to override default behavior or add new fields/queries.
   */
  // biome-ignore lint/suspicious/noExplicitAny: Resolvers can be any shape
  resolvers?: any
}

/**
 * Maps Atlas database column types to their corresponding GraphQL Scalar types.
 *
 * This function determines the appropriate GraphQL type (e.g., 'Int', 'Float', 'Boolean', 'String')
 * for a given database column type defined in Atlas.
 *
 * @param type - The Atlas column type string (e.g., 'integer', 'varchar', 'boolean').
 * @returns The name of the GraphQL Scalar type as a string.
 */
function mapAtlasTypeToGraphQL(type: string): string {
  switch (type) {
    case 'integer':
    case 'smallInteger':
      return 'Int'
    case 'bigInteger':
      // GraphQL Int is 32-bit (signed). BigInts (64-bit) can overflow standard Ints.
      // We map them to String to preserve precision and prevent overflow errors on the client.
      return 'String'
    case 'decimal':
    case 'float':
      return 'Float'
    case 'boolean':
      return 'Boolean'
    case 'json':
    case 'jsonb':
      // Currently mapped to String.
      // TODO: Support a dedicated JSON Scalar for structured data.
      return 'String'
    case 'date':
    case 'dateTime':
    case 'timestamp':
      // Currently mapped to String (ISO format).
      // TODO: Support a dedicated DateTime Scalar for better validation.
      return 'String'
    default:
      // Fallback for unknown types (e.g., text, uuid, enum)
      return 'String'
  }
}

/**
 * Generates a fully functional GraphQL Schema from a set of Atlas Models.
 *
 * This utility automates the creation of a GraphQL API by:
 * 1.  Discovering the database schema for each provided model using `SchemaRegistry`.
 * 2.  Mapping SQL column types to GraphQL types.
 * 3.  Generating a GraphQL Object Type for each model.
 * 4.  Creating basic `Query` operations (`get<Model>` and `list<Model>s`) with resolvers.
 * 5.  Creating `Mutation` operations (`create`, `update`, `delete`) with input types and resolvers.
 *
 * @remarks
 * This is the implementation of Phase 3 (Atlas Integration) of the GraphQL RFC.
 * It currently supports schema discovery, type mapping, basic read operations, and CRUD mutations.
 *
 * @param options - Configuration options containing the models to expose and optional custom resolvers.
 * @returns A promise resolving to a `GraphQLSchema` instance compatible with GraphQL Yoga.
 *
 * @example
 * ```typescript
 * import { User, Post } from './models';
 * import { createAtlasSchema } from '@gravito/graphql';
 *
 * const schema = await createAtlasSchema({
 *   models: [User, Post],
 *   resolvers: {
 *     Query: {
 *       // Custom resolver override or addition
 *       me: () => { ... }
 *     }
 *   }
 * });
 * ```
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

      const outputFields: string[] = []
      const inputFields: string[] = []
      const updateFields: string[] = []

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

        const isAutoManaged =
          colName === model.primaryKey || colName === 'created_at' || colName === 'updated_at'

        const outputRequired = colDef.nullable ? '' : '!'
        const inputRequired = colDef.nullable ? '' : '!'

        outputFields.push(`${colName}: ${gqlType}${outputRequired}`)

        if (!isAutoManaged) {
          // Create Input: Respect database nullability
          inputFields.push(`${colName}: ${gqlType}${inputRequired}`)
          // Update Input: All fields optional
          updateFields.push(`${colName}: ${gqlType}`)
        }
      }

      // Relationships
      const relations = getRelationships(model as unknown as typeof Model)
      for (const [relName, meta] of relations) {
        const RelatedClass = meta.related?.()
        if (!RelatedClass) continue

        const relatedName = RelatedClass.name
        // Check if related model is exposed in the schema
        const isExposed = options.models.some((m) => m.name === relatedName)
        if (!isExposed) continue

        if (meta.type === 'hasMany' || meta.type === 'belongsToMany' || meta.type === 'morphMany') {
          outputFields.push(`${relName}: [${relatedName}]`)
        } else {
          outputFields.push(`${relName}: ${relatedName}`)
        }

        // Add resolver to prevent default resolver from calling the relationship function
        // biome-ignore lint/suspicious/noExplicitAny: Generic resolver
        resolvers[modelName] = resolvers[modelName] || {}
        // biome-ignore lint/suspicious/noExplicitAny: Generic resolver
        resolvers[modelName][relName] = async (parent: any) => {
          return await parent[relName]
        }
      }

      // 2. Generate Type Definitions
      typeDefs.push(`
        type ${modelName} {
          ${outputFields.join('\n          ')}
        }
      `)

      typeDefs.push(`
        input Create${modelName}Input {
          ${inputFields.join('\n          ')}
        }
      `)

      typeDefs.push(`
        input Update${modelName}Input {
          ${updateFields.join('\n          ')}
        }
      `)

      // 3. Generate Operations
      typeDefs.push(`
        extend type Query {
          ${modelName.toLowerCase()}(id: ID!): ${modelName}
          ${modelName.toLowerCase()}s: [${modelName}]
        }
      `)

      typeDefs.push(`
        extend type Mutation {
          create${modelName}(input: Create${modelName}Input!): ${modelName}
          update${modelName}(id: ID!, input: Update${modelName}Input!): ${modelName}
          delete${modelName}(id: ID!): Boolean
        }
      `)

      // 4. Generate Resolvers

      // Query: Find
      // biome-ignore lint/suspicious/noExplicitAny: Generic resolver args
      resolvers.Query[`${modelName.toLowerCase()}`] = async (_: any, { id }: { id: any }) => {
        // biome-ignore lint/suspicious/noExplicitAny: Missing types in ModelStatic
        return (model as any).find(id)
      }

      // Query: List
      resolvers.Query[`${modelName.toLowerCase()}s`] = async () => {
        // biome-ignore lint/suspicious/noExplicitAny: Missing types in ModelStatic
        return (model as any).all()
      }

      // Mutation: Create
      // biome-ignore lint/suspicious/noExplicitAny: Generic resolver args
      resolvers.Mutation[`create${modelName}`] = async (_: any, { input }: { input: any }) => {
        // biome-ignore lint/suspicious/noExplicitAny: Missing types in ModelStatic
        return (model as any).create(input)
      }

      // Mutation: Update
      resolvers.Mutation[`update${modelName}`] = async (
        // biome-ignore lint/suspicious/noExplicitAny: Generic resolver args
        _: any,
        // biome-ignore lint/suspicious/noExplicitAny: Generic input
        { id, input }: { id: any; input: any }
      ) => {
        // biome-ignore lint/suspicious/noExplicitAny: Missing types in ModelStatic
        const instance = await (model as any).find(id)
        if (!instance) {
          throw new Error(`${modelName} with ID ${id} not found`)
        }
        // biome-ignore lint/suspicious/noExplicitAny: Missing types in Model instance
        if (typeof instance.fill === 'function') {
          instance.fill(input)
        } else {
          for (const [key, value] of Object.entries(input)) {
            instance[key] = value
          }
        }
        await instance.save()
        return instance
      }

      // Mutation: Delete
      // biome-ignore lint/suspicious/noExplicitAny: Generic resolver args
      resolvers.Mutation[`delete${modelName}`] = async (_: any, { id }: { id: any }) => {
        // biome-ignore lint/suspicious/noExplicitAny: Missing types in ModelStatic
        const instance = await (model as any).find(id)
        if (!instance) {
          return false
        }
        await instance.delete()
        return true
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
