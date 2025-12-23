/**
 * @fileoverview Video processing pipeline
 */

import type { Processor } from '../processors/Processor'
import { VideoProcessor } from '../processors/VideoProcessor'
import type { ProcessOptions } from '../types'
import { BasePipeline } from './BasePipeline'

/**
 * Video processing pipeline
 *
 * Provides fluent API for chaining video processing operations.
 */
export class VideoPipeline extends BasePipeline {
  private videoProcessor: VideoProcessor

  constructor(videoProcessor?: VideoProcessor) {
    super()
    this.videoProcessor = videoProcessor || new VideoProcessor()
  }

  /**
   * Add resize operation
   *
   * @param width - Target width
   * @param height - Target height
   * @returns Pipeline instance
   */
  resize(width?: number, height?: number): this {
    return this.add(this.videoProcessor, { width, height }) as this
  }

  /**
   * Add rotate operation
   *
   * @param angle - Rotation angle (90, 180, 270)
   * @returns Pipeline instance
   */
  rotate(angle: number): this {
    return this.add(this.videoProcessor, { rotate: angle }) as this
  }

  /**
   * Add transcode operation
   *
   * @param format - Output format (mp4, webm, etc.)
   * @param codec - Video codec (h264, vp9, etc.)
   * @param quality - Quality (CRF value, 0-51)
   * @returns Pipeline instance
   */
  transcode(format: string, codec?: string, quality?: number): this {
    return this.add(this.videoProcessor, {
      format,
      codec,
      quality,
    }) as this
  }

  /**
   * Add processor with custom options
   *
   * @param processor - Processor instance
   * @param options - Processing options
   * @returns Pipeline instance
   */
  override add(processor: Processor, options: ProcessOptions = {}): this {
    return super.add(processor, options) as this
  }
}
