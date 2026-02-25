/**
 * @fileoverview JSON file trace sink (NDJSON)
 *
 * Writes trace events to a newline-delimited JSON file with buffering support.
 * Uses RuntimeAdapter's FileSink for efficient batch writes instead of individual syscalls.
 */

import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { RuntimeFileSink } from '@gravito/core'
import { getDefaultRuntimeAdapter } from '@gravito/core'
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
  /** Buffer size for batch writes. Events are flushed when buffer reaches this size. @default 50 */
  bufferSize?: number
}

/**
 * A trace sink that writes events to a newline-delimited JSON (NDJSON) file.
 *
 * This sink is ideal for local development and debugging as it produces
 * a human-readable and easily machine-parsable log of workflow events.
 *
 * Optimizations:
 * - Uses RuntimeAdapter's FileSink for buffered writes (reduces syscalls)
 * - Automatic flush on buffer overflow
 * - Batch write support for better I/O efficiency
 *
 * @example
 * ```typescript
 * const sink = new JsonFileTraceSink({
 *   path: './traces/workflow.jsonl',
 *   reset: true,
 *   bufferSize: 100  // Flush every 100 events
 * });
 * ```
 *
 * @public
 */
export class JsonFileTraceSink implements FluxTraceSink {
  private path: string
  private ready: Promise<void>
  private fileSink: RuntimeFileSink | null = null
  private buffer: string[] = []
  private bufferSize: number
  private adapter = getDefaultRuntimeAdapter()

  /**
   * Creates a new JSON file trace sink with buffering support.
   *
   * @param options - Configuration options for the sink.
   */
  constructor(options: JsonFileTraceSinkOptions) {
    this.path = options.path
    this.bufferSize = options.bufferSize ?? 50
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

    // Create FileSink for buffered writes
    if (this.adapter.createFileSink) {
      this.fileSink = await this.adapter.createFileSink?.(this.path)
    }

    // If FileSink not available, reset file to empty
    if (reset && !this.fileSink) {
      if (this.adapter.writeFile) {
        await this.adapter.writeFile(this.path, '')
      }
    } else if (reset && this.fileSink) {
      this.fileSink.write('')
    }
  }

  /**
   * Appends a trace event to the file in NDJSON format.
   *
   * Events are buffered and written in batches using FileSink
   * for improved I/O efficiency. Waits for initialization to complete before writing.
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

    const eventLine = `${JSON.stringify(event)}\n`

    if (this.fileSink) {
      // Use buffered FileSink for better performance
      this.buffer.push(eventLine)

      if (this.buffer.length >= this.bufferSize) {
        await this.flushBuffer()
      }
    } else {
      // Fallback: write directly via appendFile if FileSink unavailable
      if (this.adapter.appendFile) {
        await this.adapter.appendFile(this.path, eventLine)
      }
    }
  }

  /**
   * Flushes buffered events to disk.
   *
   * This is called automatically when the buffer reaches the configured size.
   * Can also be called manually to ensure all events are written.
   *
   * @throws {Error} If flushing fails.
   */
  async flushBuffer(): Promise<void> {
    if (!this.fileSink || this.buffer.length === 0) {
      return
    }

    const content = this.buffer.join('')
    this.fileSink.write(content)
    this.buffer = []
    await this.fileSink.flush()
  }

  /**
   * Closes the sink and flushes any remaining buffered events.
   *
   * Should be called before process exit to ensure all events are persisted.
   *
   * @throws {Error} If closing or flushing fails.
   */
  async close(): Promise<void> {
    await this.flushBuffer()
    if (this.fileSink) {
      await this.fileSink.end()
    }
  }
}
