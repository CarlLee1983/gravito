/**
 * @fileoverview JSON file trace sink (NDJSON)
 *
 * Writes trace events to a newline-delimited JSON file.
 */

import { appendFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { FluxTraceEvent, FluxTraceSink } from '../types'

/**
 * Options for configuring the `JsonFileTraceSink`.
 *
 * @public
 * @since 3.0.0
 */
export interface JsonFileTraceSinkOptions {
  /** Absolute path where the trace file should be stored. */
  path: string
  /** Whether to reset (clear) the file on initialization. @default true */
  reset?: boolean
}

/**
 * A trace sink that writes events to a newline-delimited JSON (NDJSON) file.
 *
 * This sink is ideal for local development and debugging as it produces
 * a human-readable and easily machine-parsable log of workflow events.
 *
 * @example
 * ```typescript
 * const sink = new JsonFileTraceSink({
 *   path: './traces/workflow.jsonl',
 *   reset: true
 * });
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class JsonFileTraceSink implements FluxTraceSink {
  private path: string
  private ready: Promise<void>

  constructor(options: JsonFileTraceSinkOptions) {
    this.path = options.path
    this.ready = this.init(options.reset ?? true)
  }

  private async init(reset: boolean): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true })
    if (reset) {
      await writeFile(this.path, '', 'utf8')
    }
  }

  async emit(event: FluxTraceEvent): Promise<void> {
    await this.ready
    await appendFile(this.path, `${JSON.stringify(event)}\n`, 'utf8')
  }
}
