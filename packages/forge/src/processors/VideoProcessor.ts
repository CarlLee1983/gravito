import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { getRuntimeAdapter } from '@gravito/core'
import { FFmpegAdapter } from '../adapters/FFmpegAdapter'
import { FFmpegWasmAdapter } from '../adapters/FFmpegWasmAdapter'
import type { FileInput, FileOutput, ProcessingProgress, ProcessOptions } from '../types'
import { BaseProcessor } from './BaseProcessor'

/**
 * Options for configuring the VideoProcessor
 */
export interface VideoProcessorOptions {
  /**
   * Path to the FFmpeg binary (ignored in WASM mode)
   */
  ffmpegPath?: string

  /**
   * Directory used for storing temporary files during processing
   */
  tempDir?: string

  /**
   * Whether to use FFmpeg WASM instead of the system binary
   */
  wasmMode?: boolean
}

/**
 * Video processor implementation using FFmpeg
 *
 * Handles video transformation tasks such as resizing, rotation, and transcoding.
 * Can operate in native mode (using system binary) or WASM mode.
 *
 * @example
 * ```typescript
 * const processor = new VideoProcessor({ wasmMode: true });
 * const output = await processor.process(input, { format: 'mp4', width: 1280 });
 * ```
 */
export class VideoProcessor extends BaseProcessor {
  private adapter: FFmpegAdapter | FFmpegWasmAdapter
  private tempDir: string
  private runtime = getRuntimeAdapter()

  /**
   * Creates a new VideoProcessor instance
   *
   * @param options - Configuration options for the processor
   */
  constructor(options: VideoProcessorOptions = {}) {
    super()
    this.adapter = options.wasmMode
      ? new FFmpegWasmAdapter()
      : new FFmpegAdapter(options.ffmpegPath)
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
   * @throws {Error} If processing fails or if output path cannot be determined
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
      input: inputPath,
      output: outputPath,
      onProgress: options.onProgress,
    })

    // Get output file info
    const stats = await this.runtime.stat(outputPath)

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
    await this.runtime.writeFile(inputPath, input.source)
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
        const existingVf = args.indexOf('-vf')
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
