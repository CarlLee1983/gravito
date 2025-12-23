/**
 * @fileoverview ImageMagick adapter for image processing
 */

import { spawn } from 'bun'
import type { ProcessingProgress } from '../types'
import type { AdapterOptions, ProcessorAdapter } from './ProcessorAdapter'

/**
 * ImageMagick adapter
 *
 * Uses Bun.spawn to execute ImageMagick (convert/magick) commands.
 */
export class ImageMagickAdapter implements ProcessorAdapter {
  private magickPath: string
  private useConvert: boolean

  constructor(magickPath = 'magick', useConvert = false) {
    this.magickPath = magickPath
    this.useConvert = useConvert
  }

  /**
   * Execute ImageMagick command
   *
   * @param args - ImageMagick arguments
   * @param options - Execution options
   * @returns Output file path
   */
  async execute(args: string[], options: AdapterOptions = {}): Promise<string> {
    const { output, onProgress, timeout = 60000 } = options // Default 1 minute

    if (!output) {
      throw new Error('Output file path is required')
    }

    const command = this.useConvert ? 'convert' : this.magickPath
    const commandArgs = this.useConvert ? args : ['convert', ...args]

    return new Promise((resolve, reject) => {
      const process = spawn([command, ...commandArgs], {
        stdout: 'pipe',
        stderr: 'pipe',
        env: options.env,
        cwd: options.cwd,
      })

      // ImageMagick doesn't provide detailed progress, so we simulate it
      if (onProgress) {
        onProgress({ progress: 0, message: 'Starting image processing' })
        // Simulate progress (ImageMagick is usually fast)
        const progressInterval = setInterval(() => {
          onProgress({ progress: 50, message: 'Processing image' })
        }, 100)
        process.exited.then(() => {
          clearInterval(progressInterval)
          onProgress({ progress: 100, message: 'Image processing complete' })
        })
      }

      // Set timeout
      const timeoutId = timeout
        ? setTimeout(() => {
            process.kill()
            reject(new Error(`ImageMagick timeout after ${timeout}ms`))
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
          reject(new Error(`ImageMagick failed with code ${code}`))
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
}
