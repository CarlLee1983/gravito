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
/**
 * Base Seeder Class
 * @description All database seeders should extend this class
 */
export declare abstract class Seeder {
  /**
   * Run the seeder logic
   */
  abstract run(): Promise<void>
  /**
   * Run other seeders from within this seeder
   * @example await this.call([UserSeeder, PostSeeder])
   */
  call(seeders: SeederConstructor | SeederConstructor[]): Promise<void>
}
