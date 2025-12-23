/**
 * @fileoverview Type definitions for @gravito/forge
 */

/**
 * File input for processing
 */
export interface FileInput {
  /**
   * File path or Blob/File object
   */
  source: string | Blob | File

  /**
   * Original filename
   */
  filename?: string

  /**
   * MIME type
   */
  mimeType?: string

  /**
   * File size in bytes
   */
  size?: number
}

/**
 * File output after processing
 */
export interface FileOutput {
  /**
   * Output file path or URL
   */
  url: string

  /**
   * Output file path (local)
   */
  path?: string

  /**
   * File size in bytes
   */
  size: number

  /**
   * MIME type
   */
  mimeType: string

  /**
   * Processing metadata
   */
  metadata?: Record<string, unknown>
}

/**
 * Processing options
 */
export interface ProcessOptions {
  /**
   * Output format
   */
  format?: string

  /**
   * Quality (0-100 for images, crf for video)
   */
  quality?: number

  /**
   * Width for resize
   */
  width?: number

  /**
   * Height for resize
   */
  height?: number

  /**
   * Rotation angle (90, 180, 270)
   */
  rotate?: number

  /**
   * Video codec
   */
  codec?: string

  /**
   * Additional processor-specific options
   */
  [key: string]: unknown
}

/**
 * Processing progress
 */
export interface ProcessingProgress {
  /**
   * Progress percentage (0-100)
   */
  progress: number

  /**
   * Status message
   */
  message?: string

  /**
   * Current processing stage
   */
  stage?: string
}

/**
 * Processing status
 */
export interface ProcessingStatus {
  /**
   * Job ID
   */
  jobId: string

  /**
   * Processing status
   */
  status: 'pending' | 'processing' | 'completed' | 'failed'

  /**
   * Progress percentage (0-100)
   */
  progress: number

  /**
   * Status message
   */
  message?: string

  /**
   * Processing result
   */
  result?: FileOutput

  /**
   * Error message (if failed)
   */
  error?: string

  /**
   * Created timestamp
   */
  createdAt: number

  /**
   * Updated timestamp
   */
  updatedAt: number
}
