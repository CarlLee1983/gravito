/**
 * @fileoverview Image processing pipeline
 */

import { ImageProcessor } from '../processors/ImageProcessor'
import type { Processor } from '../processors/Processor'
import type { ProcessOptions } from '../types'
import { BasePipeline } from './BasePipeline'

/**
 * Image processing pipeline
 *
 * Provides fluent API for chaining image processing operations.
 */
export class ImagePipeline extends BasePipeline {
  private imageProcessor: ImageProcessor

  constructor(imageProcessor?: ImageProcessor) {
    super()
    this.imageProcessor = imageProcessor || new ImageProcessor()
  }

  /**
   * Add resize operation
   *
   * @param width - Target width
   * @param height - Target height
   * @returns Pipeline instance
   */
  resize(width?: number, height?: number): this {
    return this.add(this.imageProcessor, { width, height }) as this
  }

  /**
   * Add rotate operation
   *
   * @param angle - Rotation angle (0-360)
   * @returns Pipeline instance
   */
  rotate(angle: number): this {
    return this.add(this.imageProcessor, { rotate: angle }) as this
  }

  /**
   * Add format conversion
   *
   * @param format - Output format (jpg, png, webp, avif)
   * @param quality - Quality (0-100)
   * @returns Pipeline instance
   */
  format(format: string, quality?: number): this {
    return this.add(this.imageProcessor, {
      format,
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
