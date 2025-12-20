/**
 * @gravito/orbit-database
 * @description The Standard Database Orbit - Custom Query Builder & ORM for Gravito
 * 
 * @example
 * ```typescript
 * import { DB } from '@gravito/orbit-database'
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

// Main DB Facade
export { DB } from './DB'

// Connection
export { Connection } from './connection/Connection'
export { ConnectionManager } from './connection/ConnectionManager'

// Query Builder
export { QueryBuilder, QueryBuilderError, RecordNotFoundError } from './query/QueryBuilder'
export { Expression, raw } from './query/Expression'

// Grammar
export { Grammar } from './grammar/Grammar'
export { PostgresGrammar } from './grammar/PostgresGrammar'

// Schema
export { Schema, Blueprint, ColumnDefinition } from './schema'
export { SchemaGrammar, PostgresSchemaGrammar, MySQLSchemaGrammar } from './schema/grammars'
export type { ColumnType, ForeignKeyAction, ForeignKeyDefinition, IndexDefinition } from './schema'

// Migration
export { Migrator, MigrationRepository } from './migration'
export type { Migration, MigratorOptions, MigrationResult, MigrationRecord, MigrationFile } from './migration'

// Seed
export { SeederRunner, Factory, factory } from './seed'
export type { Seeder, SeederRunnerOptions, FactoryDefinition, SeederFile } from './seed'

// Drivers
export { PostgresDriver } from './drivers/PostgresDriver'

// Types
export type {
    // Configuration
    ConnectionConfig,
    PostgresConfig,
    MySQLConfig,
    SQLiteConfig,
    PoolConfig,
    SSLConfig,
    DriverType,

    // Query Types
    Operator,
    BooleanOperator,
    OrderDirection,
    JoinType,
    WhereClause,
    OrderClause,
    JoinClause,
    HavingClause,

    // Results
    QueryResult,
    ExecuteResult,
    FieldInfo,
    PaginateResult,

    // Contracts
    DriverContract,
    ConnectionContract,
    QueryBuilderContract,
    GrammarContract,
    CompiledQuery,
} from './types'
