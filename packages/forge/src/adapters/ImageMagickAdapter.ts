/**
 * @fileoverview ImageMagick adapter for image processing
 */

import { getRuntimeAdapter } from '@gravito/core'
import type { AdapterOptions, ProcessorAdapter } from './ProcessorAdapter'

/**
 * ImageMagick adapter
 *
 * Uses the runtime adapter to execute ImageMagick (convert/magick) commands.
 */
export class ImageMagickAdapter implements ProcessorAdapter {
  private magickPath: string
  private useConvert: boolean
  private runtime = getRuntimeAdapter()

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
      const process = this.runtime.spawn([command, ...commandArgs], {
        stdout: 'pipe',
        stderr: 'pipe',
        env: options.env,
        cwd: options.cwd,
        timeout,
      })

      // ImageMagick doesn't provide detailed progress, so we simulate it
      let progressInterval: Timer | undefined
      if (onProgress) {
        onProgress({ progress: 0, message: 'Starting image processing' })
        // Simulate progress (ImageMagick is usually fast)
        progressInterval = setInterval(() => {
          onProgress({ progress: 50, message: 'Processing image' })
        }, 100)
      }

      // Handle process completion
      process.exited
        .then((code) => {
          if (progressInterval) {
            clearInterval(progressInterval)
          }
          if (onProgress) {
            onProgress({ progress: 100, message: 'Image processing complete' })
          }

          if (code === 0) {
            resolve(output)
          } else {
            reject(new Error(`ImageMagick failed with code ${code}`))
          }
        })
        .catch((error) => {
          if (progressInterval) {
            clearInterval(progressInterval)
          }
          reject(error)
        })
    })
  }

  /**
   * Probe image for metadata
   *
   * @param inputPath - Path to the image file
   * @returns Metadata object
   */
  async probe(inputPath: string): Promise<Record<string, unknown>> {
    const command = this.useConvert ? 'identify' : this.magickPath
    const commandArgs = this.useConvert ? [inputPath] : ['identify', inputPath]

    return new Promise((resolve, reject) => {
      const process = this.runtime.spawn([command, ...commandArgs], {
        stdout: 'pipe',
      })

      let stdoutBuffer = ''
      if (process.stdout) {
        const reader = process.stdout.getReader()
        const decoder = new TextDecoder()
        ;(async () => {
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) {
                break
              }
              stdoutBuffer += decoder.decode(value, { stream: true })
            }
          } catch {
            // Ignore
          }
        })()
      }

      process.exited.then((code) => {
        if (code !== 0) {
          resolve({})
          return
        }

        const metadata: Record<string, unknown> = {}
        // ImageMagick identify output normally looks like:
        // image.jpg JPEG 1920x1080 1920x1080+0+0 8-bit sRGB 1.234MB 0.000u 0:00.000
        const parts = stdoutBuffer.split(' ')
        if (parts.length >= 3) {
          metadata.format = parts[1]
          const res = parts[2].split('x')
          if (res.length === 2) {
            metadata.width = parseInt(res[0], 10)
            metadata.height = parseInt(res[1], 10)
          }
        }
        resolve(metadata)
      })

      process.exited.catch(reject)
    })
  }
}
