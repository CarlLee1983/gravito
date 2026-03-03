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
export { defineConfig, fromEnv, loadConfig, loadConfigFile } from './config'
export { Connection } from './connection/Connection'
export { ConnectionManager } from './connection/ConnectionManager'
export { ReplicaConnectionPool } from './connection/ReplicaConnectionPool'
export { DB } from './DB'
export declare const autoConfigure: any
export type { BackupOptions, BackupResult, RestoreOptions } from './backup/DatabaseBackupService'
export { DatabaseBackupService } from './backup/DatabaseBackupService'
export { BunSQLDriver } from './drivers/BunSQLDriver'
export { PostgresDriver } from './drivers/PostgresDriver'
export { SQLiteDriver } from './drivers/SQLiteDriver'
export {
  ConnectionError,
  ConstraintViolationError,
  DatabaseError,
  ForeignKeyConstraintError,
  NotNullConstraintError,
  TableNotFoundError,
  UniqueConstraintError,
} from './errors'
export { Grammar } from './grammar/Grammar'
export { PostgresGrammar } from './grammar/PostgresGrammar'
export type {
  Migration,
  MigrationFile,
  MigrationRecord,
  MigrationResult,
  MigratorOptions,
} from './migration'
export { MigrationRepository, Migrator } from './migration'
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
export { Expression, raw } from './query/Expression'
export { QueryBuilder, QueryBuilderError, RecordNotFoundError } from './query/QueryBuilder'
export { identifier, SafeIdentifier, SafeQueryBuilder } from './query/SafeQueryBuilder'
export type { ColumnType, ForeignKeyAction, ForeignKeyDefinition, IndexDefinition } from './schema'
export { Blueprint, ColumnDefinition, Schema } from './schema'
export {
  MySQLSchemaGrammar,
  PostgresSchemaGrammar,
  SchemaGrammar,
  SQLiteSchemaGrammar,
} from './schema/grammars'
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
export { Factory, factory, SeederRunner } from './seed'
export { type ShardingConfig, ShardingManager } from './sharding/ShardingManager'
export type {
  AtlasConnectionEntry,
  BatchExecuteResult,
  BatchInsertResult,
  BooleanOperator,
  CompiledQuery,
  ConnectionConfig,
  ConnectionContract,
  CursorPaginateResult,
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
  Operator,
  OrderClause,
  OrderDirection,
  PaginateResult,
  PoolConfig,
  PostgresConfig,
  QueryBuilderContract,
  QueryResult,
  ReadWriteConnectionConfig,
  SafeQueryBuilderContract,
  SQLiteConfig,
  SSLConfig,
  WhereClause,
} from './types'
export type { CursorPayload } from './utils/CursorEncoding'
export { buildCursorWhereClause, decodeCursor, encodeCursor } from './utils/CursorEncoding'
