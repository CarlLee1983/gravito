/**
 * @fileoverview Type definitions for @gravito/forge
 */

/**
 * Represents a raw file input for processing by Forge.
 * Supports file paths, Blobs, and File objects.
 * @public
 */
export interface FileInput {
  /** The source location of the file or the file data itself */
  source: string | Blob | File
  /** Original filename for preservation or reference */
  filename?: string
  /** The MIME type of the input file (e.g., 'image/jpeg') */
  mimeType?: string
  /** The size of the input file in bytes */
  size?: number
}

/**
 * Represents the final artifact produced by a Forge processing pipeline.
 * @public
 */
export interface FileOutput {
  /** Publicly accessible URL for the processed file */
  url: string
  /** Absolute local filesystem path to the processed file */
  path?: string
  /** The size of the resulting file in bytes */
  size: number
  /** The MIME type of the processed file */
  mimeType: string
  /** Any technical metadata extracted during processing (e.g., resolution, EXIF) */
  metadata?: Record<string, unknown>
}

/**
 * Configuration for the file transformation process.
 * Used for resizing images, transcoding videos, etc.
 * @public
 */
export interface ProcessOptions {
  /** Target file format/extension (e.g., 'webp', 'mp4') */
  format?: string
  /** Output quality (0-100 for images; CRF value for video) */
  quality?: number
  /** Target width in pixels for resizing */
  width?: number
  /** Target height in pixels for resizing */
  height?: number
  /** Clockwise rotation angle in degrees */
  rotate?: number
  /** Specific media codec to use for encoding (e.g., 'h264', 'av1') */
  codec?: string
  /** Additional specialized options for specific processors */
  [key: string]: unknown
}

/**
 * Real-time feedback for a long-running media processing task.
 * @public
 */
export interface ProcessingProgress {
  /** Completion percentage from 0 to 100 */
  progress: number
  /** Human-readable description of the current action */
  message?: string
  /** Internal identifier for the current processing pipeline stage */
  stage?: string
}

/**
 * The complete state record for a Forge processing job.
 * @public
 */
export interface ProcessingStatus {
  /** Unique job identifier */
  jobId: string
  /** Current state of the job in the lifecycle */
  status: 'pending' | 'processing' | 'completed' | 'failed'
  /** Current progress percentage (0-100) */
  progress: number
  /** Status message or stage description */
  message?: string
  /** The output artifact if the job reached 'completed' status */
  result?: FileOutput
  /** Error details if the job reached 'failed' status */
  error?: string
  /** Timestamp when the job was created */
  createdAt: number
  /** Timestamp when the status was last updated */
  updatedAt: number
}
