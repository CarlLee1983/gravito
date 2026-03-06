/**
 * @gravito/atlas
 * @description The Standard Database Orbit - Custom Query Builder & ORM for Gravito
 *
 * @example
 * ```typescript
 * import { DB, identifier } from '@gravito/atlas'
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
 * // Query with QueryBuilder
 * const users = await DB.table('users')
 *   .where('status', 'active')
 *   .orderBy('created_at', 'desc')
 *   .limit(10)
 *   .get()
 *
 * // Safe Query with Tagged Template Literal (SQL Injection Protected)
 * const userId = 123
 * const user = await DB.sql`SELECT * FROM users WHERE id = ${userId}`.first()
 *
 * // Safe Query with Dynamic Table Names
 * const tableName = identifier('users')
 * const allUsers = await DB.sql`SELECT * FROM ${tableName}`.all()
 *
 * // Insert
 * const newUser = await DB.table('users').insert({
 *   name: 'John Doe',
 *   email: 'john@example.com'
 * })
 *
 * // Transaction
 * await DB.transaction(async (db) => {
 *   await db.table('accounts').where('id', 1).decrement('balance', 100)
 *   await db.table('accounts').where('id', 2).increment('balance', 100)
 * })
 * ```
 */

export type { AtlasConfig } from './config'
// Configuration
export { defineConfig, fromEnv, loadConfig, loadConfigFile } from './config'
// Connection
export { Connection } from './connection/Connection'
export { ConnectionManager } from './connection/ConnectionManager'
export { ReplicaConnectionPool } from './connection/ReplicaConnectionPool'
// Main DB Facade
export { DB } from './DB'

// Standalone autoConfigure (proxies to DB.autoConfigure)
import { DB } from './DB'
export const autoConfigure = DB.autoConfigure.bind(DB)
export type {
  BackupOptions,
  BackupResult,
  RestoreOptions,
} from './backup/DatabaseBackupService'
// Backup & Restore (Archive API Integration)
export { DatabaseBackupService } from './backup/DatabaseBackupService'
export { BunSQLDriver } from './drivers/BunSQLDriver'
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
// Orbit
export { OrbitAtlas } from './OrbitAtlas'
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
// ORM
export {
  BelongsTo,
  BelongsToMany,
  ColumnNotFoundError,
  column,
  DirtyTracker,
  deferred,
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
  sharded,
  TypeMismatchError,
  version,
} from './orm'
// Partitioning
export { MonthlyPartitionStrategy } from './partitioning/PartitionStrategy'
export { Expression, raw } from './query/Expression'
// Query Builder
export { QueryBuilder, QueryBuilderError, RecordNotFoundError } from './query/QueryBuilder'
// Safe Query Builder (SQL Injection Protection via Tagged Templates)
export {
  identifier,
  SafeIdentifier,
  SafeQueryBuilder,
} from './query/SafeQueryBuilder'
export type { ColumnType, ForeignKeyAction, ForeignKeyDefinition, IndexDefinition } from './schema'
// Schema
export { Blueprint, ColumnDefinition, Schema } from './schema'
export {
  MySQLSchemaGrammar,
  PostgresSchemaGrammar,
  SchemaGrammar,
  SQLiteSchemaGrammar,
} from './schema/grammars'
// Schema Tools (Phase 2)
export { MigrationGenerator } from './schema/MigrationGenerator'
export type {
  ColumnDefinition as SchemaColumnDefinition,
  SchemaDiffResult,
} from './schema/SchemaDiff'
export { SchemaDiff } from './schema/SchemaDiff'
export type { ModelTypeMap, TypeGeneratorOptions } from './schema/TypeGenerator'
export { TypeGenerator } from './schema/TypeGenerator'
export { TypeWriter } from './schema/TypeWriter'
export type { FactoryDefinition, Seeder, SeederFile, SeederRunnerOptions } from './seed'
// Seed
export { Factory, factory, SeederRunner } from './seed'
// Sharding
export { type ShardingConfig, ShardingManager } from './sharding/ShardingManager'
// Types
export type {
  AtlasConnectionEntry,
  BatchExecuteResult,
  BatchInsertResult,
  BooleanOperator,
  CompiledQuery,
  // Configuration
  ConnectionConfig,
  ConnectionContract,
  CursorPaginateResult,
  // Contracts
  DriverContract,
  DriverType,
  ExecuteResult,
  FieldInfo,
  GrammarContract,
  HavingClause,
  isReadWriteConfig,
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
  ReadWriteConnectionConfig,
  SafeQueryBuilderContract,
  SQLiteConfig,
  SSLConfig,
  WhereClause,
} from './types'
export type { CursorPayload } from './utils/CursorEncoding'
// Cursor Utilities (Phase 1-B)
export {
  buildCursorWhereClause,
  decodeCursor,
  encodeCursor,
} from './utils/CursorEncoding'
