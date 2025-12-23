/**
 * @fileoverview Image processor using ImageMagick
 */

import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'crypto'
import { ImageMagickAdapter } from '../adapters/ImageMagickAdapter'
import type { FileInput, FileOutput, ProcessingProgress, ProcessOptions } from '../types'
import { BaseProcessor } from './BaseProcessor'

/**
 * Image processor options
 */
export interface ImageProcessorOptions {
  /**
   * ImageMagick binary path
   */
  imagemagickPath?: string

  /**
   * Temporary directory for processing
   */
  tempDir?: string
}

/**
 * Image processor
 *
 * Handles image processing operations: resize, rotate, format conversion, etc.
 * Note: This is backend processing logic, different from Prism's frontend image optimization.
 */
export class ImageProcessor extends BaseProcessor {
  private adapter: ImageMagickAdapter
  private tempDir: string

  constructor(options: ImageProcessorOptions = {}) {
    super()
    this.adapter = new ImageMagickAdapter(options.imagemagickPath)
    this.tempDir = options.tempDir || '/tmp/forge-image'
  }

  /**
   * Check if processor supports the given MIME type
   *
   * @param mimeType - MIME type to check
   * @returns True if supported
   */
  supports(mimeType: string): boolean {
    return mimeType.startsWith('image/')
  }

  /**
   * Process an image file
   *
   * @param input - File input
   * @param options - Processing options (may include onProgress callback)
   * @returns Processed file output
   */
  async process(
    input: FileInput,
    options: ProcessOptions & { onProgress?: (progress: ProcessingProgress) => void }
  ): Promise<FileOutput> {
    // Ensure temp directory exists
    await mkdir(this.tempDir, { recursive: true })

    // Get input file path
    const inputPath = await this.getInputPath(input)

    // Generate output path
    const format = options.format || this.getFormatFromMimeType(input.mimeType) || 'jpg'
    const outputFilename = `${randomUUID()}.${format}`
    const outputPath = join(this.tempDir, outputFilename)

    // Build ImageMagick arguments
    const args = this.buildImageMagickArgs(inputPath, outputPath, options)

    // Execute ImageMagick
    await this.adapter.execute(args, {
      output: outputPath,
      onProgress: options.onProgress,
    })

    // Get output file info
    const outputFile = Bun.file(outputPath)
    const stats = await outputFile.stat()

    return {
      url: outputPath, // Will be replaced by storage URL after upload
      path: outputPath,
      size: stats.size,
      mimeType: this.getOutputMimeType(format),
      metadata: {
        format,
        quality: options.quality,
        width: options.width,
        height: options.height,
      },
    }
  }

  /**
   * Get input file path
   *
   * @param input - File input
   * @returns Input file path
   */
  private async getInputPath(input: FileInput): Promise<string> {
    if (typeof input.source === 'string') {
      return input.source
    }

    // Write Blob/File to temp directory
    const inputFilename = input.filename || `${randomUUID()}.tmp`
    const inputPath = join(this.tempDir, inputFilename)
    await Bun.write(inputPath, input.source)
    return inputPath
  }

  /**
   * Build ImageMagick arguments
   *
   * @param inputPath - Input file path
   * @param outputPath - Output file path
   * @param options - Processing options
   * @returns ImageMagick arguments
   */
  private buildImageMagickArgs(
    inputPath: string,
    outputPath: string,
    options: ProcessOptions
  ): string[] {
    const args: string[] = [inputPath]

    // Resize
    if (options.width || options.height) {
      const resize =
        options.width && options.height
          ? `${options.width}x${options.height}`
          : options.width
            ? `${options.width}x`
            : `x${options.height}`
      args.push('-resize', resize)
    }

    // Rotate
    if (options.rotate) {
      args.push('-rotate', String(options.rotate))
    }

    // Quality (for JPEG/WebP)
    if (options.quality !== undefined) {
      args.push('-quality', String(options.quality))
    }

    // Format conversion is handled by output file extension
    // ImageMagick auto-detects format from extension

    // Output file
    args.push(outputPath)

    return args
  }

  /**
   * Get format from MIME type
   *
   * @param mimeType - MIME type
   * @returns Format string or null
   */
  private getFormatFromMimeType(mimeType?: string): string | null {
    if (!mimeType) {
      return null
    }

    const formatMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/avif': 'avif',
    }

    return formatMap[mimeType] || null
  }

  /**
   * Get output MIME type from format
   *
   * @param format - Output format
   * @returns MIME type
   */
  private getOutputMimeType(format: string): string {
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      avif: 'image/avif',
    }
    return mimeMap[format.toLowerCase()] || 'image/jpeg'
  }
}
