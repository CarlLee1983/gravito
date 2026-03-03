/**
 * @gravito/atlas - Type Writer
 * @description Writes TypeScript declaration files from generated Model type maps.
 *
 * Outputs interface declarations that can be merged into Model classes via
 * Declaration Merging for zero type-drift DX.
 */
import type { ModelTypeMap } from './TypeGenerator'
export interface TypeWriterOptions {
  /** Output file path (e.g., '.orbit/generated.d.ts') */
  outputPath: string
  /** Optional banner comment */
  banner?: string
}
/**
 * TypeWriter
 *
 * Converts a list of ModelTypeMap objects into a `.d.ts` declaration file.
 *
 * @example
 * ```typescript
 * const writer = new TypeWriter({ outputPath: '.orbit/generated.d.ts' })
 * await writer.write(typeMaps)
 * // Emits:
 * //   export interface GeneratedUser { id: number; name: string; ... }
 * ```
 */
export declare class TypeWriter {
  private readonly outputPath
  private readonly banner
  constructor(options: TypeWriterOptions)
  /**
   * Write the declaration file to disk.
   *
   * @param typeMaps - Array of model type maps from TypeGenerator
   */
  write(typeMaps: ModelTypeMap[]): Promise<void>
  /**
   * Build the .d.ts file content string.
   */
  buildContent(typeMaps: ModelTypeMap[]): string
}
