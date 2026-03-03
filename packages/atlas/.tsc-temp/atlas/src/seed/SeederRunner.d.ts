/**
 * Seeder Runner
 * @description Runs database seeders
 */
/**
 * Seeder Runner Options
 */
export interface SeederRunnerOptions {
  /** Path to seeders directory */
  path?: string
  /** Database connection name */
  connection?: string
}
/**
 * Seeder Runner
 * Discovers and runs database seeders
 *
 * @example
 * ```typescript
 * const runner = new SeederRunner({ path: './seeders' })
 *
 * // Run all seeders
 * await runner.run()
 *
 * // Run specific seeder
 * await runner.call('UserSeeder')
 * ```
 */
export declare class SeederRunner {
  private seedersPath
  private _connectionName
  private resolvedSeeders
  constructor(options?: SeederRunnerOptions)
  /**
   * Set seeders path
   */
  setPath(path: string): this
  /**
   * Set database connection
   */
  connection(name: string): this
  /**
   * Run all seeders in the directory
   */
  run(): Promise<string[]>
  /**
   * Run a specific seeder by name
   */
  call(seederName: string): Promise<void>
  /**
   * Run multiple specific seeders
   */
  callMultiple(seederNames: string[]): Promise<void>
  /**
   * Check if a seeder exists
   */
  has(seederName: string): Promise<boolean>
  /**
   * List all available seeders
   */
  list(): Promise<string[]>
  /**
   * Get all seeder files from the seeders directory
   */
  private getSeederFiles
  /**
   * Run a single seeder
   */
  private runSeeder
  /**
   * Resolve seeder class from file
   */
  private resolveSeeder
}
