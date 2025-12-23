/**
 * @fileoverview Base pipeline implementation
 */

import type { Processor } from '../processors/Processor'
import type { FileInput, FileOutput, ProcessOptions } from '../types'
import type { Pipeline, PipelineStep } from './Pipeline'

/**
 * Base pipeline implementation
 *
 * Provides chained processing functionality.
 */
export class BasePipeline implements Pipeline {
  protected steps: PipelineStep[] = []

  /**
   * Add a processor to the pipeline
   *
   * @param processor - Processor to add
   * @param options - Processing options for this processor
   * @returns Pipeline instance for chaining
   */
  add(processor: Processor, options: ProcessOptions = {}): Pipeline {
    this.steps.push({ processor, options })
    return this
  }

  /**
   * Execute the pipeline
   *
   * @param input - File input
   * @returns Array of processed file outputs
   */
  async execute(input: FileInput): Promise<FileOutput[]> {
    const results: FileOutput[] = []
    let currentInput = input

    for (const step of this.steps) {
      // Check if processor supports the current file type
      const mimeType = this.getMimeType(currentInput)
      if (!step.processor.supports(mimeType)) {
        throw new Error(`Processor does not support MIME type: ${mimeType}`)
      }

      // Process the file
      const output = await step.processor.process(currentInput, step.options)
      results.push(output)

      // Use output as input for next step
      currentInput = {
        source: output.path || output.url,
        filename: currentInput.filename,
        mimeType: output.mimeType,
        size: output.size,
      }
    }

    return results
  }

  /**
   * Clear all processors from the pipeline
   *
   * @returns Pipeline instance
   */
  clear(): Pipeline {
    this.steps = []
    return this
  }

  /**
   * Get MIME type from file input
   *
   * @param input - File input
   * @returns MIME type
   */
  protected getMimeType(input: FileInput): string {
    if (input.mimeType) {
      return input.mimeType
    }

    if (input.filename) {
      const ext = input.filename.split('.').pop()?.toLowerCase()
      const mimeMap: Record<string, string> = {
        mp4: 'video/mp4',
        webm: 'video/webm',
        mov: 'video/quicktime',
        avi: 'video/x-msvideo',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        gif: 'image/gif',
      }
      return mimeMap[ext || ''] || 'application/octet-stream'
    }

    return 'application/octet-stream'
  }
}
