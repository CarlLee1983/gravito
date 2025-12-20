/**
 * Migration Interface
 * @description Contract for database migration classes
 */

/**
 * Migration Interface
 * All migration classes must implement this interface
 * 
 * @example
 * ```typescript
 * export default class CreateUsersTable implements Migration {
 *   async up(): Promise<void> {
 *     await Schema.create('users', (table) => {
 *       table.id()
 *       table.string('email').unique()
 *       table.timestamps()
 *     })
 *   }
 * 
 *   async down(): Promise<void> {
 *     await Schema.dropIfExists('users')
 *   }
 * }
 * ```
 */
export interface Migration {
    /**
     * Run the migration (create tables, add columns, etc.)
     */
    up(): Promise<void>

    /**
     * Reverse the migration (drop tables, remove columns, etc.)
     */
    down(): Promise<void>
}

/**
 * Migration constructor type
 */
export type MigrationConstructor = new () => Migration

/**
 * Migration record stored in the database
 */
export interface MigrationRecord {
    /** Migration ID */
    id: number
    /** Migration file name (without path) */
    migration: string
    /** Batch number when the migration was run */
    batch: number
}

/**
 * Migration file info
 */
export interface MigrationFile {
    /** Migration file name (without path) */
    name: string
    /** Full file path */
    path: string
}
