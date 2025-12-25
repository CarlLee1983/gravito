/**
 * @gravito/atlas
 * @description The Standard Database Orbit - Custom Query Builder & ORM for Gravito
 *
 * @example
 * ```typescript
 * import { DB } from '@gravito/atlas'
 *
 * // Configure
 * DB.addConnection('default', {
 *   driver: 'postgres',
 *   host: 'localhost',
 *   port: 5432,
 *   database: 'myapp',
 *   username: 'postgres',
 *   password: 'secret'
 * })
 *
 * // Query
 * const users = await DB.table('users')
 *   .where('status', 'active')
 *   .orderBy('created_at', 'desc')
 *   .limit(10)
 *   .get()
 *
 * // Insert
 * const newUser = await DB.table('users').insert({
 *   name: 'John Doe',
 *   email: 'john@example.com'
 * })
 *
 * // Update
 * await DB.table('users')
 *   .where('id', 1)
 *   .update({ name: 'Jane Doe' })
 *
 * // Transaction
 * await DB.transaction(async (db) => {
 *   await db.table('accounts').where('id', 1).decrement('balance', 100)
 *   await db.table('accounts').where('id', 2).increment('balance', 100)
 * })
 * ```
 */

// Connection
export { Connection } from './connection/Connection'
export { ConnectionManager } from './connection/ConnectionManager'
// Main DB Facade
export { DB } from './DB'
// Drivers
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
export type {
  Migration,
  MigrationFile,
  MigrationRecord,
  MigrationResult,
  MigratorOptions,
} from './migration'
// Migration
export { MigrationRepository, Migrator } from './migration'
export type {
  ColumnSchema as OrmColumnSchema,
  ModelAttributes,
  ModelConstructor,
  ModelStatic,
  SchemaLock,
  SchemaMode,
  SchemaRegistryOptions,
  TableSchema,
} from './orm'
// ORM
export {
  BelongsTo,
  BelongsToMany,
  ColumnNotFoundError,
  column,
  DirtyTracker,
  HasMany,
  HasOne,
  Model,
  ModelNotFoundError,
  ModelRegistry,
  MorphMany,
  MorphOne,
  MorphTo,
  NullableConstraintError,
  SchemaRegistry,
  SchemaSniffer,
  SoftDeletes,
  TypeMismatchError,
} from './orm'
export { Expression, raw } from './query/Expression'
// Query Builder
export { QueryBuilder, QueryBuilderError, RecordNotFoundError } from './query/QueryBuilder'
export type { ColumnType, ForeignKeyAction, ForeignKeyDefinition, IndexDefinition } from './schema'
// Schema
export { Blueprint, ColumnDefinition, Schema } from './schema'
export {
  MySQLSchemaGrammar,
  PostgresSchemaGrammar,
  SchemaGrammar,
  SQLiteSchemaGrammar,
} from './schema/grammars'
export type { FactoryDefinition, Seeder, SeederFile, SeederRunnerOptions } from './seed'
// Seed
export { Factory, factory, SeederRunner } from './seed'

// Types
export type {
  BooleanOperator,
  CompiledQuery,
  // Configuration
  ConnectionConfig,
  ConnectionContract,
  // Contracts
  DriverContract,
  DriverType,
  ExecuteResult,
  FieldInfo,
  GrammarContract,
  HavingClause,
  JoinClause,
  JoinType,
  MySQLConfig,
  // Query Types
  Operator,
  OrderClause,
  OrderDirection,
  PaginateResult,
  PoolConfig,
  PostgresConfig,
  QueryBuilderContract,
  // Results
  QueryResult,
  SQLiteConfig,
  SSLConfig,
  WhereClause,
} from './types'
