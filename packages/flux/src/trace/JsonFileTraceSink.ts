/**
 * @fileoverview JSON file trace sink (NDJSON)
 *
 * Writes trace events to a newline-delimited JSON file.
 */

import { appendFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { FluxTraceEvent, FluxTraceSink } from '../types'

export interface JsonFileTraceSinkOptions {
  path: string
  reset?: boolean
}

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
