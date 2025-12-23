/**
 * @fileoverview Processor adapter interface
 */

import type { ProcessingProgress } from '../types'

/**
 * Processor adapter interface
 *
 * Adapters wrap external tools (FFmpeg, ImageMagick, etc.)
 * and provide a unified interface for processors.
 */
export interface ProcessorAdapter {
  /**
   * Execute the adapter with given arguments
   *
   * @param args - Command arguments
   * @param options - Execution options
   * @returns Output file path
   */
  execute(args: string[], options?: AdapterOptions): Promise<string>

  /**
   * Get processing progress (if supported)
   *
   * @param processId - Process ID
   * @returns Processing progress
   */
  getProgress?(processId: string): Promise<ProcessingProgress>
}

/**
 * Adapter execution options
 */
export interface AdapterOptions {
  /**
   * Input file path
   */
  input?: string

  /**
   * Output file path
   */
  output?: string

  /**
   * Working directory
   */
  cwd?: string

  /**
   * Environment variables
   */
  env?: Record<string, string>

  /**
   * Progress callback
   */
  onProgress?: (progress: ProcessingProgress) => void

  /**
   * Timeout in milliseconds
   */
  timeout?: number
}
