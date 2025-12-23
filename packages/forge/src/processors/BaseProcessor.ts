/**
 * @fileoverview Base processor implementation
 */

import type { FileInput, FileOutput, ProcessingProgress, ProcessOptions } from '../types'
import type { Processor } from './Processor'

/**
 * Base processor implementation
 *
 * Provides common functionality for all processors.
 */
export abstract class BaseProcessor implements Processor {
  /**
   * Process a file
   *
   * @param input - File input
   * @param options - Processing options
   * @returns Processed file output
   */
  abstract process(input: FileInput, options: ProcessOptions): Promise<FileOutput>

  /**
   * Check if processor supports the given MIME type
   *
   * @param mimeType - MIME type to check
   * @returns True if supported
   */
  abstract supports(mimeType: string): boolean

  /**
   * Get processing progress (optional, for async processing)
   *
   * @param jobId - Job ID
   * @returns Processing progress
   */
  getProgress?(jobId: string): Promise<ProcessingProgress>

  /**
   * Normalize file input to a file path or Blob
   *
   * @param input - File input
   * @returns Normalized source
   */
  protected normalizeInput(input: FileInput): string | Blob {
    if (typeof input.source === 'string') {
      return input.source
    }
    return input.source
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
      // Simple MIME type detection from extension
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
