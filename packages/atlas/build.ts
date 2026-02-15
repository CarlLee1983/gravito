import { execSync } from 'child_process'

console.log('Building @gravito/atlas...')

// Clean dist
await Bun.$`rm -rf dist`

try {
  // Build bundles WITHOUT dts to avoid memory exhaustion
  execSync(
    'npx tsup src/index.ts --format esm,cjs --external pg,mysql2,better-sqlite3,mongodb,ioredis --outDir dist --target esnext',
    {
      stdio: 'inherit',
      env: process.env,
    }
  )

  // Generate index.d.ts manually to avoid memory exhaustion
  console.log('Generating .d.ts files...')
  const fs = await import('node:fs')

  const indexDts = `/**
 * @gravito/atlas - The Standard Database Orbit
 * Custom Query Builder & ORM for Gravito
 * @packageDocumentation
 */

// Configuration
export type { AtlasConfig } from './config'
export { autoConfigure, defineConfig, fromEnv, loadConfig, loadConfigFile } from './config'

// Connection
export { Connection } from './connection/Connection'
export { ConnectionManager } from './connection/ConnectionManager'

// Main DB Facade
export { DB } from './DB'

// Drivers
export { BunSQLDriver } from './drivers/BunSQLDriver'
export { PostgresDriver } from './drivers/PostgresDriver'
export { SQLiteDriver } from './drivers/SQLiteDriver'

// Errors
export {
  ConnectionError,
  ConstraintViolationError,
  DatabaseError,
  ForeignKeyConstraintError,
  NotNullConstraintError,
  TableNotFoundError,
  UniqueConstraintError,
} from './errors'

// Grammar
export { Grammar } from './grammar/Grammar'
export { PostgresGrammar } from './grammar/PostgresGrammar'

// Migration
export type {
  Migration,
  MigrationFile,
  MigrationRecord,
  MigrationResult,
  MigratorOptions,
} from './migration'
export { MigrationRepository, Migrator } from './migration'

// Orbit
export { OrbitAtlas } from './OrbitAtlas'

// ORM
export type {
  ColumnSchema as OrmColumnSchema,
  ModelAttributes,
  ModelConstructor,
  ModelStatic,
  RelationshipMeta,
  RelationType,
  SchemaLock,
  SchemaMode,
  SchemaRegistryOptions,
  TableSchema,
} from './orm'
export {
  BelongsTo,
  BelongsToMany,
  ColumnNotFoundError,
  column,
  DirtyTracker,
  eagerLoad,
  eagerLoadMany,
  getRelationships,
  HasMany,
  HasOne,
  Model,
  ModelNotFoundError,
  ModelRegistry,
  ModelRepository,
  MorphMany,
  MorphOne,
  MorphTo,
  NullableConstraintError,
  SchemaRegistry,
  SchemaSniffer,
  SoftDeletes,
  TypeMismatchError,
  version,
} from './orm'

// Query
export { Expression, raw } from './query/Expression'
export { QueryBuilder, QueryBuilderError, RecordNotFoundError } from './query/QueryBuilder'

// Schema
export type { ColumnType, ForeignKeyAction, ForeignKeyDefinition, IndexDefinition } from './schema'
export { Blueprint, ColumnDefinition, Schema } from './schema'
export {
  MySQLSchemaGrammar,
  PostgresSchemaGrammar,
  SchemaGrammar,
  SQLiteSchemaGrammar,
} from './schema/grammars'

// Seed
export type { FactoryDefinition, Seeder, SeederFile, SeederRunnerOptions } from './seed'
export { Factory, factory, SeederRunner } from './seed'

// Types
export type {
  BooleanOperator,
  CompiledQuery,
  ConnectionConfig,
  ConnectionContract,
  DriverContract,
  DriverType,
  ExecuteResult,
  FieldInfo,
  GrammarContract,
  HavingClause,
  JoinClause,
  JoinType,
  MySQLConfig,
  Operator,
  OrderClause,
  OrderDirection,
  PaginateResult,
  PoolConfig,
  PostgresConfig,
  QueryBuilderContract,
  QueryResult,
  SQLiteConfig,
  SSLConfig,
  WhereClause,
} from './types'
`

  fs.writeFileSync('dist/index.d.ts', indexDts)

  console.log('✅ Build complete!')
} catch (_error) {
  console.error('❌ Build failed')
  process.exit(1)
}
