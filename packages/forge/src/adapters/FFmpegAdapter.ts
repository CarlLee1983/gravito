/**
 * @fileoverview FFmpeg adapter for video processing
 */

import { spawn } from 'bun'
import type { ProcessingProgress } from '../types'
import type { AdapterOptions, ProcessorAdapter } from './ProcessorAdapter'

/**
 * FFmpeg adapter
 *
 * Uses Bun.spawn to execute FFmpeg commands.
 */
export class FFmpegAdapter implements ProcessorAdapter {
  private ffmpegPath: string

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
      throw new Error('Output file path is required')
    }

    return new Promise((resolve, reject) => {
      const process = spawn([this.ffmpegPath, ...args], {
        stdout: 'pipe',
        stderr: 'pipe',
        env: options.env,
        cwd: options.cwd,
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
              if (done) break

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
          } catch (error) {
            // Ignore read errors
          }
        })()
      }

      // Set timeout
      const timeoutId = timeout
        ? setTimeout(() => {
            process.kill()
            reject(new Error(`FFmpeg timeout after ${timeout}ms`))
          }, timeout)
        : null

      // Handle process completion
      process.exited.then((code) => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }

        if (code === 0) {
          resolve(output)
        } else {
          reject(new Error(`FFmpeg failed with code ${code}: ${stderrBuffer.slice(-500)}`))
        }
      })

      process.exited.catch((error) => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        reject(error)
      })
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
        parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseFloat(timeMatch[3])
      const totalTime =
        parseInt(durationMatch[1]) * 3600 +
        parseInt(durationMatch[2]) * 60 +
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
