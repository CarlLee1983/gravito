/**
 * Seeder Interface
 * @description Contract for database seeder classes
 */

/**
 * Seeder Interface
 * All seeder classes must implement this interface
 *
 * @example
 * ```typescript
 * export default class UserSeeder implements Seeder {
 *   async run(): Promise<void> {
 *     await DB.table('users').insert([
 *       { name: 'Admin', email: 'admin@example.com' },
 *       { name: 'User', email: 'user@example.com' },
 *     ])
 *   }
 * }
 * ```
 */
export interface Seeder {
  /**
   * Run the seeder
   */
  run(): Promise<void>
}

/**
 * Seeder constructor type
 */
export type SeederConstructor = new () => Seeder

/**
 * Seeder file info
 */
export interface SeederFile {
  /** Seeder class name */
  name: string
  /** Full file path */
  path: string
}
