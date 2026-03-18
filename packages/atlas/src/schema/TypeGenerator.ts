/**
 * @gravito/atlas - Schema Type Generator
 * @description Reads @Column decorator metadata from Model classes and builds a
 * type map for generating TypeScript declaration files.
 *
 * Eliminates "Type Drift" by deriving types 100% from decorator metadata.
 */

import { readdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'

// ============================================================================
// Column metadata keys (must match decorators.ts)
// ============================================================================

export const COLUMN_METADATA_KEY = 'atlas:columns'

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

type ReflectWithMetadata = typeof Reflect & {
  getMetadata?: (metadataKey: string, target: object) => unknown
}

type AtlasModelExport = {
  prototype: object
  table?: string
  getTable?: () => string
}

function readColumnMetadata(target: object): Record<string, ColumnMeta> | undefined {
  const reflectApi = Reflect as ReflectWithMetadata
  if (typeof reflectApi.getMetadata !== 'function') {
    return undefined
  }

  const metadata = reflectApi.getMetadata(COLUMN_METADATA_KEY, target)
  return metadata && typeof metadata === 'object'
    ? (metadata as Record<string, ColumnMeta>)
    : undefined
}

// ============================================================================
// Column type mapping
// ============================================================================

/**
 * Maps Atlas column types to TypeScript types.
 */
function atlasTypeToTs(atlasType: string, nullable = false): string {
  const typeMap: Record<string, string> = {
    // Numeric
    integer: 'number',
    int: 'number',
    bigint: 'number | bigint',
    float: 'number',
    double: 'number',
    decimal: 'number',
    // String
    string: 'string',
    varchar: 'string',
    text: 'string',
    char: 'string',
    uuid: 'string',
    // Boolean
    boolean: 'boolean',
    bool: 'boolean',
    // Date/Time
    date: 'Date | string',
    datetime: 'Date | string',
    timestamp: 'Date | string',
    time: 'string',
    // JSON
    json: 'Record<string, unknown>',
    jsonb: 'Record<string, unknown>',
    // Binary
    binary: 'Buffer',
    blob: 'Buffer',
    // Misc
    enum: 'string',
    set: 'string[]',
  }

  const tsType = typeMap[atlasType.toLowerCase()] ?? 'unknown'
  return nullable ? `${tsType} | null` : tsType
}

// ============================================================================
// File scanner
// ============================================================================

/**
 * Recursively collects all .ts (non-test, non-.d.ts) files in a directory.
 */
async function collectTsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir)
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const info = await stat(fullPath)

    if (info.isDirectory()) {
      if (entry === 'node_modules' || entry.startsWith('.')) {
        continue
      }
      const subFiles = await collectTsFiles(fullPath)
      files.push(...subFiles)
    } else if (
      entry.endsWith('.ts') &&
      !entry.endsWith('.d.ts') &&
      !entry.endsWith('.test.ts') &&
      !entry.endsWith('.spec.ts')
    ) {
      files.push(fullPath)
    }
  }

  return files
}

// ============================================================================
// Decorator metadata reader
// ============================================================================

/**
 * Dynamically loads a compiled module and reads Atlas column metadata
 * from any Model classes exported from it.
 *
 * Uses Reflect.getMetadata when available (requires reflect-metadata).
 */
async function extractColumnsFromFile(filePath: string): Promise<ModelTypeMap[]> {
  const maps: ModelTypeMap[] = []

  try {
    const mod = (await import(filePath)) as Record<string, unknown>

    for (const [exportName, exported] of Object.entries(mod)) {
      if (typeof exported !== 'function') {
        continue
      }

      // Check for Atlas column metadata
      const modelExport = exported as AtlasModelExport
      const columns = readColumnMetadata(modelExport.prototype)

      if (!columns || Object.keys(columns).length === 0) {
        continue
      }

      const tableName: string =
        modelExport.table ?? modelExport.getTable?.() ?? `${exportName.toLowerCase()}s`

      const columnMap: Record<string, string> = {}
      for (const [colName, meta] of Object.entries(columns)) {
        columnMap[colName] = atlasTypeToTs(meta.type, meta.nullable)
      }

      maps.push({ modelName: exportName, tableName, columns: columnMap })
    }
  } catch {
    // Silently skip files that can't be loaded (e.g., require DB at module scope)
  }

  return maps
}

// ============================================================================
// TypeGenerator - Main entry point
// ============================================================================

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
export class TypeGenerator {
  private readonly modelsDir: string
  private readonly verbose: boolean

  constructor(options: TypeGeneratorOptions) {
    this.modelsDir = resolve(options.modelsDir)
    this.verbose = options.verbose ?? false
  }

  /**
   * Scan models directory and extract type maps from all Model files.
   */
  async generate(): Promise<ModelTypeMap[]> {
    const files = await collectTsFiles(this.modelsDir)
    const allMaps: ModelTypeMap[] = []

    for (const file of files) {
      const maps = await extractColumnsFromFile(file)
      if (maps.length > 0) {
        allMaps.push(...maps)
        if (this.verbose) {
          for (const m of maps) {
            console.log(`  ✓ Detected model: ${m.modelName} (table: ${m.tableName})`)
          }
        }
      }
    }

    return allMaps
  }
}
