import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import type { AdapterOptions, ProcessorAdapter } from './ProcessorAdapter'
import { ForgeError } from '../errors/ForgeError'
import { ForgeErrorCodes } from '../errors/codes'

/**
 * FFmpeg WASM adapter
 *
 * Implements a video processing adapter using FFmpeg compiled to WebAssembly.
 * This allows video processing in environments without native FFmpeg binaries,
 * such as browsers or restricted serverless functions.
 *
 * @example
 * ```typescript
 * const adapter = new FFmpegWasmAdapter();
 * await adapter.execute(['-i', 'input.mp4', 'output.mp4'], {
 *   input: 'input.mp4',
 *   output: 'output.mp4'
 * });
 * ```
 */
export class FFmpegWasmAdapter implements ProcessorAdapter {
  private ffmpeg: FFmpeg | null = null
  private loaded = false

  /**
   * Initializes and loads the FFmpeg WASM core
   *
   * Fetches the necessary WASM and JS files from a CDN to boot the FFmpeg instance.
   *
   * @returns The loaded FFmpeg instance
   * @throws {Error} If loading the WASM core fails
   */
  private async load(): Promise<FFmpeg> {
    if (this.ffmpeg && this.loaded) {
      return this.ffmpeg
    }

    this.ffmpeg = new FFmpeg()

    await this.ffmpeg.load({
      coreURL: await toBlobURL(
        `https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js`,
        'text/javascript'
      ),
      wasmURL: await toBlobURL(
        `https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm`,
        'application/wasm'
      ),
    })

    this.loaded = true
    return this.ffmpeg
  }

  /**
   * Executes an FFmpeg command within the WASM environment
   *
   * Orchestrates the process of writing the input file to the virtual filesystem,
   * running the command, and reading the resulting output back to the host filesystem.
   *
   * @param args - Command line arguments passed to FFmpeg
   * @param options - Execution context including input/output paths and progress hooks
   * @returns The path to the processed output file
   * @throws {Error} If input/output paths are missing or if FFmpeg execution fails
   */
  async execute(args: string[], options: AdapterOptions = {}): Promise<string> {
    const { input, output, onProgress } = options

    if (!input) {
      throw new ForgeError(400, ForgeErrorCodes.MISSING_INPUT_PATH, {
        message: 'Input file path is required for FFmpegWasmAdapter',
      })
    }
    if (!output) {
      throw new ForgeError(400, ForgeErrorCodes.MISSING_OUTPUT_PATH, {
        message: 'Output file path is required',
      })
    }

    const ffmpeg = await this.load()

    if (onProgress) {
      ffmpeg.on('progress', ({ progress, time }: { progress: number; time: number }) => {
        onProgress({
          progress: Math.round(progress * 100),
          message: `Processing: ${Math.round(time / 1000000)}s`,
          stage: 'transcoding',
        })
      })
    }

    const inputFileName = `input_${input.split('/').pop()}`
    const outputFileName = `output_${output.split('/').pop()}`

    await ffmpeg.writeFile(inputFileName, await fetchFile(input))

    const wasmArgs = [...args]

    const inputIdx = wasmArgs.indexOf(input)
    if (inputIdx !== -1) {
      wasmArgs[inputIdx] = inputFileName
    }

    const outputIdx = wasmArgs.indexOf(output)
    if (outputIdx !== -1) {
      wasmArgs[outputIdx] = outputFileName
    } else if (wasmArgs[wasmArgs.length - 1] === output) {
      wasmArgs[wasmArgs.length - 1] = outputFileName
    }

    await ffmpeg.exec(wasmArgs)

    const data = await ffmpeg.readFile(outputFileName)

    if (typeof data === 'string') {
      throw new ForgeError(500, ForgeErrorCodes.UNEXPECTED_OUTPUT_TYPE, {
        message: 'FFmpeg output is a string, expected Uint8Array',
      })
    }

    await Bun.write(output, data)

    await ffmpeg.deleteFile(inputFileName)
    await ffmpeg.deleteFile(outputFileName)

    return output
  }

  /**
   * Probe file for metadata
   *
   * @param inputPath - Path to the file
   * @returns Metadata object
   */
  async probe(inputPath: string): Promise<Record<string, unknown>> {
    const ffmpeg = await this.load()
    const inputFileName = `probe_${inputPath.split('/').pop()}`

    await ffmpeg.writeFile(inputFileName, await fetchFile(inputPath))

    // Capture logs to parse metadata
    const logs: string[] = []
    const logHandler = ({ message }: { message: string }) => {
      logs.push(message)
    }
    ffmpeg.on('log', logHandler)

    try {
      await ffmpeg.exec(['-i', inputFileName])
    } catch (_error) {
      // FFmpeg returns non-zero when just showing info
    } finally {
      ffmpeg.off('log', logHandler)
      await ffmpeg.deleteFile(inputFileName)
    }

    const stderrBuffer = logs.join('\n')
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

    return metadata
  }
}
