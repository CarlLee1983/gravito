/**
 * @fileoverview Processor interface for file processing
 */

import type { FileInput, FileOutput, ProcessingProgress, ProcessOptions } from '../types'

/**
 * Processor interface
 *
 * All file processors must implement this interface.
 */
export interface Processor {
  /**
   * Process a file
   *
   * @param input - File input
   * @param options - Processing options
   * @returns Processed file output
   */
  process(input: FileInput, options: ProcessOptions): Promise<FileOutput>

  /**
   * Check if processor supports the given MIME type
   *
   * @param mimeType - MIME type to check
   * @returns True if supported
   */
  supports(mimeType: string): boolean

  /**
   * Get processing progress (optional, for async processing)
   *
   * @param jobId - Job ID
   * @returns Processing progress
   */
  getProgress?(jobId: string): Promise<ProcessingProgress>
}
