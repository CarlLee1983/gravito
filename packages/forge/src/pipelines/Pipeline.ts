/**
 * @fileoverview Pipeline interface for chained file processing
 */

import type { Processor } from '../processors/Processor'
import type { FileInput, FileOutput, ProcessOptions } from '../types'

/**
 * Pipeline interface
 *
 * Allows chaining multiple processors together.
 */
export interface Pipeline {
  /**
   * Add a processor to the pipeline
   *
   * @param processor - Processor to add
   * @param options - Processing options for this processor
   * @returns Pipeline instance for chaining
   */
  add(processor: Processor, options?: ProcessOptions): Pipeline

  /**
   * Execute the pipeline
   *
   * @param input - File input
   * @returns Array of processed file outputs
   */
  execute(input: FileInput): Promise<FileOutput[]>

  /**
   * Clear all processors from the pipeline
   *
   * @returns Pipeline instance
   */
  clear(): Pipeline
}

/**
 * Pipeline step
 */
export interface PipelineStep {
  /**
   * Processor instance
   */
  processor: Processor

  /**
   * Processing options
   */
  options: ProcessOptions
}
