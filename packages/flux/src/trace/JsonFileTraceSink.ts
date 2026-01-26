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
 */
export class JsonFileTraceSink implements FluxTraceSink {
  private path: string
  private ready: Promise<void>

  /**
   * Creates a new JSON file trace sink.
   *
   * @param options - Configuration options for the sink.
   */
  constructor(options: JsonFileTraceSinkOptions) {
    this.path = options.path
    this.ready = this.init(options.reset ?? true)
  }

  /**
   * Ensures the target directory exists and optionally resets the file.
   *
   * @param reset - Whether to truncate the file if it already exists.
   * @throws {Error} If directory creation or file writing fails.
   */
  private async init(reset: boolean): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true })
    if (reset) {
      await writeFile(this.path, '', 'utf8')
    }
  }

  /**
   * Appends a trace event to the file in NDJSON format.
   *
   * Waits for initialization to complete before writing.
   *
   * @param event - The trace event to record.
   * @throws {Error} If writing to the file fails.
   *
   * @example
   * ```typescript
   * await sink.emit({
   *   type: 'step_start',
   *   workflowId: 'wf-1',
   *   timestamp: Date.now(),
   *   data: { step: 'validate' }
   * });
   * ```
   */
  async emit(event: FluxTraceEvent): Promise<void> {
    await this.ready
    await appendFile(this.path, `${JSON.stringify(event)}\n`, 'utf8')
  }
}
