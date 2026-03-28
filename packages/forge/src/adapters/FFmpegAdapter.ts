/**
 * @fileoverview FFmpeg adapter for video processing
 */

import { getRuntimeAdapter } from '@gravito/core'
import type { ProcessingProgress } from '../types'
import type { AdapterOptions, ProcessorAdapter } from './ProcessorAdapter'
import { ForgeError } from '../errors/ForgeError'
import { ForgeErrorCodes } from '../errors/codes'

/**
 * FFmpeg adapter
 *
 * Uses the runtime adapter to execute FFmpeg commands.
 */
export class FFmpegAdapter implements ProcessorAdapter {
  private ffmpegPath: string
  private runtime = getRuntimeAdapter()

  constructor(ffmpegPath = 'ffmpeg') {
    this.ffmpegPath = ffmpegPath
  }

  /**
   * Execute FFmpeg command
   *
   * @param args - FFmpeg arguments
   * @param options - Execution options
   * @returns Output file path
   */
  async execute(args: string[], options: AdapterOptions = {}): Promise<string> {
    const { output, onProgress, timeout = 300000 } = options // Default 5 minutes

    if (!output) {
      throw new ForgeError(400, ForgeErrorCodes.MISSING_OUTPUT_PATH, {
        message: 'Output file path is required',
      })
    }

    return new Promise((resolve, reject) => {
      const process = this.runtime.spawn([this.ffmpegPath, ...args], {
        stdout: 'pipe',
        stderr: 'pipe',
        env: options.env,
        cwd: options.cwd,
        timeout,
      })

      let stderrBuffer = ''

      // Handle stderr (FFmpeg outputs progress to stderr)
      if (process.stderr) {
        const reader = process.stderr.getReader()
        const decoder = new TextDecoder()

        // Read stderr asynchronously
        ;(async () => {
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) {
                break
              }

              const text = decoder.decode(value, { stream: true })
              stderrBuffer += text

              // Parse progress from FFmpeg output
              if (onProgress) {
                const progress = this.parseProgress(stderrBuffer)
                if (progress) {
                  onProgress(progress)
                }
              }
            }
          } catch (_error) {
            // Ignore read errors
          }
        })()
      }

      // Handle process completion
      process.exited
        .then((code) => {
          if (code === 0) {
            resolve(output)
          } else {
            reject(new Error(`FFmpeg failed with code ${code}: ${stderrBuffer.slice(-500)}`))
          }
        })
        .catch((error) => {
          reject(error)
        })
    })
  }

  /**
   * Probe file for metadata
   *
   * @param inputPath - Path to the file
   * @returns Metadata object
   */
  async probe(inputPath: string): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      // ffmpeg -i path returns metadata in stderr and exits with code 1 (usually)
      const process = this.runtime.spawn([this.ffmpegPath, '-i', inputPath], {
        stderr: 'pipe',
      })

      let stderrBuffer = ''
      if (process.stderr) {
        const reader = process.stderr.getReader()
        const decoder = new TextDecoder()
        ;(async () => {
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) {
                break
              }
              stderrBuffer += decoder.decode(value, { stream: true })
            }
          } catch {
            // Ignore
          }
        })()
      }

      process.exited.then(() => {
        const metadata: Record<string, unknown> = {}

        // Parse duration
        const durationMatch = stderrBuffer.match(/Duration: (\d+):(\d+):(\d+\.\d+)/)
        if (durationMatch) {
          metadata.duration =
            parseInt(durationMatch[1], 10) * 3600 +
            parseInt(durationMatch[2], 10) * 60 +
            parseFloat(durationMatch[3])
        }

        // Parse resolution
        const resolutionMatch = stderrBuffer.match(/, (\d{2,})x(\d{2,})/)
        if (resolutionMatch) {
          metadata.width = parseInt(resolutionMatch[1], 10)
          metadata.height = parseInt(resolutionMatch[2], 10)
        }

        // Parse codec
        const codecMatch = stderrBuffer.match(/Video: ([^, \n]+)/)
        if (codecMatch) {
          metadata.codec = codecMatch[1]
        }

        resolve(metadata)
      })

      process.exited.catch(reject)
    })
  }

  /**
   * Parse progress from FFmpeg stderr output
   *
   * @param stderr - FFmpeg stderr output
   * @returns Processing progress or null
   */
  private parseProgress(stderr: string): ProcessingProgress | null {
    // FFmpeg outputs progress like: frame=  123 fps= 25 q=28.0 size=    1024kB time=00:00:05.00 bitrate=1677.7kbits/s
    const timeMatch = stderr.match(/time=(\d+):(\d+):(\d+\.\d+)/)
    const durationMatch = stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/)

    if (
      timeMatch &&
      durationMatch &&
      timeMatch[1] &&
      timeMatch[2] &&
      timeMatch[3] &&
      durationMatch[1] &&
      durationMatch[2] &&
      durationMatch[3]
    ) {
      const currentTime =
        parseInt(timeMatch[1], 10) * 3600 +
        parseInt(timeMatch[2], 10) * 60 +
        parseFloat(timeMatch[3])
      const totalTime =
        parseInt(durationMatch[1], 10) * 3600 +
        parseInt(durationMatch[2], 10) * 60 +
        parseFloat(durationMatch[3])

      if (totalTime > 0) {
        const progress = Math.min(100, Math.round((currentTime / totalTime) * 100))
        return {
          progress,
          message: `Processing: ${Math.round(currentTime)}s / ${Math.round(totalTime)}s`,
          stage: 'transcoding',
        }
      }
    }

    return null
  }
}
