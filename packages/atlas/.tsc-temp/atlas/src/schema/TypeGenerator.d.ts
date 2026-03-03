/**
 * @gravito/atlas - Schema Type Generator
 * @description Reads @Column decorator metadata from Model classes and builds a
 * type map for generating TypeScript declaration files.
 *
 * Eliminates "Type Drift" by deriving types 100% from decorator metadata.
 */
export declare const COLUMN_METADATA_KEY = 'atlas:columns'
/**
 * Column metadata stored by @Column decorator
 */
export interface ColumnMeta {
  name: string
  type: string
  nullable?: boolean
  primary?: boolean
  unique?: boolean
  default?: unknown
}
/**
 * Generated type map for a single Model class
 */
export interface ModelTypeMap {
  /** Model class name (e.g. 'User') */
  modelName: string
  /** Table name the model maps to */
  tableName: string
  /** Column-to-TypeScript type mapping */
  columns: Record<string, string>
}
export interface TypeGeneratorOptions {
  /** Root directory to scan for Model files */
  modelsDir: string
  /** Whether to log progress */
  verbose?: boolean
}
/**
 * TypeGenerator
 *
 * Scans a directory for Atlas Model files and extracts @Column decorator
 * metadata to produce a complete type map.
 *
 * @example
 * ```typescript
 * const gen = new TypeGenerator({ modelsDir: './src/models' })
 * const result = await gen.generate()
 * ```
 */
export declare class TypeGenerator {
  private readonly modelsDir
  private readonly verbose
  constructor(options: TypeGeneratorOptions)
  /**
   * Scan models directory and extract type maps from all Model files.
   */
  generate(): Promise<ModelTypeMap[]>
}
