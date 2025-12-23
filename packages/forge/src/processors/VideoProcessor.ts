/**
 * @fileoverview Video processor using FFmpeg
 */

import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'crypto'
import { FFmpegAdapter } from '../adapters/FFmpegAdapter'
import type { FileInput, FileOutput, ProcessingProgress, ProcessOptions } from '../types'
import { BaseProcessor } from './BaseProcessor'

/**
 * Video processor options
 */
export interface VideoProcessorOptions {
  /**
   * FFmpeg binary path
   */
  ffmpegPath?: string

  /**
   * Temporary directory for processing
   */
  tempDir?: string
}

/**
 * Video processor
 *
 * Handles video processing operations: resize, rotate, transcode, etc.
 */
export class VideoProcessor extends BaseProcessor {
  private adapter: FFmpegAdapter
  private tempDir: string

  constructor(options: VideoProcessorOptions = {}) {
    super()
    this.adapter = new FFmpegAdapter(options.ffmpegPath)
    this.tempDir = options.tempDir || '/tmp/forge-video'
  }

  /**
   * Check if processor supports the given MIME type
   *
   * @param mimeType - MIME type to check
   * @returns True if supported
   */
  supports(mimeType: string): boolean {
    return mimeType.startsWith('video/')
  }

  /**
   * Process a video file
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
    const outputFilename = `${randomUUID()}.${options.format || 'mp4'}`
    const outputPath = join(this.tempDir, outputFilename)

    // Build FFmpeg arguments
    const args = this.buildFFmpegArgs(inputPath, outputPath, options)

    // Execute FFmpeg
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
      mimeType: this.getOutputMimeType(options.format || 'mp4'),
      metadata: {
        format: options.format || 'mp4',
        codec: options.codec,
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
   * Build FFmpeg arguments
   *
   * @param inputPath - Input file path
   * @param outputPath - Output file path
   * @param options - Processing options
   * @returns FFmpeg arguments
   */
  private buildFFmpegArgs(
    inputPath: string,
    outputPath: string,
    options: ProcessOptions
  ): string[] {
    const args: string[] = ['-i', inputPath]

    // Video codec
    if (options.codec) {
      args.push('-c:v', options.codec)
    } else {
      args.push('-c:v', 'libx264') // Default H.264
    }

    // Audio codec
    args.push('-c:a', 'aac') // Default AAC

    // Resize
    if (options.width || options.height) {
      const scale =
        options.width && options.height
          ? `${options.width}:${options.height}`
          : options.width
            ? `${options.width}:-1`
            : `-1:${options.height}`
      args.push('-vf', `scale=${scale}`)
    }

    // Rotate
    if (options.rotate) {
      const rotation = this.getRotationFilter(options.rotate)
      if (rotation) {
        // Combine with existing video filter if any
        const existingVf = args.findIndex((arg) => arg === '-vf')
        if (existingVf !== -1) {
          // Append to existing filter
          const currentFilter = args[existingVf + 1]
          args[existingVf + 1] = `${currentFilter},${rotation}`
        } else {
          args.push('-vf', rotation)
        }
      }
    }

    // Quality (CRF for H.264)
    if (options.quality !== undefined) {
      args.push('-crf', String(options.quality))
    }

    // Overwrite output
    args.push('-y')

    // Output file
    args.push(outputPath)

    return args
  }

  /**
   * Get rotation filter for FFmpeg
   *
   * @param angle - Rotation angle (90, 180, 270)
   * @returns FFmpeg filter string
   */
  private getRotationFilter(angle: number): string | null {
    const rotations: Record<number, string> = {
      90: 'transpose=1', // 90° clockwise
      180: 'transpose=1,transpose=1', // 180°
      270: 'transpose=2', // 90° counter-clockwise
    }
    return rotations[angle] || null
  }

  /**
   * Get output MIME type from format
   *
   * @param format - Output format
   * @returns MIME type
   */
  private getOutputMimeType(format: string): string {
    const mimeMap: Record<string, string> = {
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      mkv: 'video/x-matroska',
    }
    return mimeMap[format.toLowerCase()] || 'video/mp4'
  }
}
