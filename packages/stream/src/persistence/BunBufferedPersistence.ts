import { StreamError, StreamErrorCodes } from '../errors'
import type { PersistenceAdapter, SerializedJob } from '../types'

// ──────────────────────────────────────────────────────────────────────────────
// CBOR 輕量編碼工具（不依賴外部模組，直接嵌入）
// 遵循 RFC 7049，僅實作 archive 所需的子集
// ──────────────────────────────────────────────────────────────────────────────

/**
 * 將數字長度寫入 CBOR 標頭
 */
function writeCborHeader(major: number, length: number): Uint8Array {
  const majorBits = major << 5
  if (length < 24) {
    return new Uint8Array([majorBits | length])
  }
  if (length < 0x100) {
    return new Uint8Array([majorBits | 24, length])
  }
  if (length < 0x10000) {
    return new Uint8Array([majorBits | 25, length >> 8, length & 0xff])
  }
  const bytes = new Uint8Array(5)
  bytes[0] = majorBits | 26
  bytes[1] = (length >> 24) & 0xff
  bytes[2] = (length >> 16) & 0xff
  bytes[3] = (length >> 8) & 0xff
  bytes[4] = length & 0xff
  return bytes
}

/**
 * 簡易 CBOR 編碼器
 * 支援 string / number / boolean / null / undefined / Date / Uint8Array / object / array
 */
function cborEncodeValue(value: unknown): Uint8Array {
  // null / undefined → CBOR null (0xf6)
  if (value === null || value === undefined) {
    return new Uint8Array([0xf6])
  }

  // boolean
  if (typeof value === 'boolean') {
    return new Uint8Array([value ? 0xf5 : 0xf4])
  }

  // number
  if (typeof value === 'number') {
    if (Number.isInteger(value) && value >= 0 && value <= 0xffffffff) {
      // 正整數 major type 0
      return writeCborHeader(0, value)
    }
    if (Number.isInteger(value) && value < 0 && value >= -0x100000000) {
      // 負整數 major type 1
      return writeCborHeader(1, -1 - value)
    }
    // 浮點數 → IEEE 754 double（major type 7, additional 27）
    const buf = new Uint8Array(9)
    const view = new DataView(buf.buffer)
    buf[0] = 0xfb
    view.setFloat64(1, value, false)
    return buf
  }

  // string → major type 3
  if (typeof value === 'string') {
    const encoded = new TextEncoder().encode(value)
    const header = writeCborHeader(3, encoded.length)
    const result = new Uint8Array(header.length + encoded.length)
    result.set(header)
    result.set(encoded, header.length)
    return result
  }

  // Uint8Array / ArrayBuffer → major type 2（bytes）
  if (value instanceof Uint8Array) {
    const header = writeCborHeader(2, value.length)
    const result = new Uint8Array(header.length + value.length)
    result.set(header)
    result.set(value, header.length)
    return result
  }

  if (value instanceof ArrayBuffer) {
    return cborEncodeValue(new Uint8Array(value))
  }

  // Date → 轉為時間戳（毫秒整數）
  if (value instanceof Date) {
    return cborEncodeValue(value.getTime())
  }

  // Array → major type 4
  if (Array.isArray(value)) {
    const parts: Uint8Array[] = [writeCborHeader(4, value.length)]
    for (const item of value) {
      parts.push(cborEncodeValue(item))
    }
    return concatBytes(parts)
  }

  // Object → major type 5（map）
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj)
    const parts: Uint8Array[] = [writeCborHeader(5, keys.length)]
    for (const key of keys) {
      parts.push(cborEncodeValue(key))
      parts.push(cborEncodeValue(obj[key]))
    }
    return concatBytes(parts)
  }

  // 其他（function 等）→ CBOR null
  return new Uint8Array([0xf6])
}

/**
 * 合併多個 Uint8Array
 */
function concatBytes(arrays: Uint8Array[]): Uint8Array {
  let total = 0
  for (const arr of arrays) {
    total += arr.length
  }
  const result = new Uint8Array(total)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}

// ──────────────────────────────────────────────────────────────────────────────
// CBOR 解碼器（簡易版，對應上述編碼器）
// ──────────────────────────────────────────────────────────────────────────────

/**
 * 解碼器狀態
 */
interface DecoderState {
  bytes: Uint8Array
  view: DataView
  pos: number
}

function cborReadHeader(state: DecoderState): { major: number; info: number; value: number } {
  const byte = state.bytes[state.pos++]
  const major = byte >> 5
  const info = byte & 0x1f

  if (info < 24) {
    return { major, info, value: info }
  }
  if (info === 24) {
    return { major, info, value: state.bytes[state.pos++] }
  }
  if (info === 25) {
    const v = state.view.getUint16(state.pos, false)
    state.pos += 2
    return { major, info, value: v }
  }
  if (info === 26) {
    const v = state.view.getUint32(state.pos, false)
    state.pos += 4
    return { major, info, value: v }
  }
  // info === 27 → uint64（這裡只用低 32 位元，夠用於本模組場景）
  const hi = state.view.getUint32(state.pos, false)
  const lo = state.view.getUint32(state.pos + 4, false)
  state.pos += 8
  return { major, info, value: hi * 0x100000000 + lo }
}

function cborDecodeValue(state: DecoderState): unknown {
  const byte = state.bytes[state.pos]
  const major = byte >> 5
  const info = byte & 0x1f

  // major type 7：特殊值
  if (major === 7) {
    state.pos++
    if (info === 20) {
      return false // false
    }
    if (info === 21) {
      return true // true
    }
    if (info === 22) {
      return null // null
    }
    if (info === 23) {
      return undefined
    }
    if (info === 27) {
      // IEEE 754 double
      const v = state.view.getFloat64(state.pos, false)
      state.pos += 8
      return v
    }
    return null
  }

  const header = cborReadHeader(state)

  // major type 0：正整數
  if (header.major === 0) {
    return header.value
  }

  // major type 1：負整數
  if (header.major === 1) {
    return -1 - header.value
  }

  // major type 2：bytes
  if (header.major === 2) {
    const bytes = state.bytes.slice(state.pos, state.pos + header.value)
    state.pos += header.value
    return bytes
  }

  // major type 3：string
  if (header.major === 3) {
    const bytes = state.bytes.slice(state.pos, state.pos + header.value)
    state.pos += header.value
    return new TextDecoder().decode(bytes)
  }

  // major type 4：array
  if (header.major === 4) {
    const arr: unknown[] = []
    for (let i = 0; i < header.value; i++) {
      arr.push(cborDecodeValue(state))
    }
    return arr
  }

  // major type 5：map
  if (header.major === 5) {
    const obj: Record<string, unknown> = {}
    for (let i = 0; i < header.value; i++) {
      const key = cborDecodeValue(state) as string
      obj[key] = cborDecodeValue(state)
    }
    return obj
  }

  throw new StreamError(500, StreamErrorCodes.SERIALIZATION_UNSUPPORTED_CBOR, {
    message: `不支援的 CBOR major type: ${header.major}`,
    retryable: false,
  })
}

/**
 * 編碼單筆 archive 項目為 CBOR 格式
 */
function encodeArchiveEntry(queue: string, job: SerializedJob, status: string): Uint8Array {
  const entry: Record<string, unknown> = {
    queue,
    status,
    id: job.id,
    type: job.type,
    data: job.data,
    createdAt: job.createdAt,
  }
  // 選擇性欄位（只序列化有值的，減少 payload 大小）
  if (job.className !== undefined) {
    entry.className = job.className
  }
  if (job.delaySeconds !== undefined) {
    entry.delaySeconds = job.delaySeconds
  }
  if (job.attempts !== undefined) {
    entry.attempts = job.attempts
  }
  if (job.maxAttempts !== undefined) {
    entry.maxAttempts = job.maxAttempts
  }
  if (job.groupId !== undefined) {
    entry.groupId = job.groupId
  }
  if (job.retryAfterSeconds !== undefined) {
    entry.retryAfterSeconds = job.retryAfterSeconds
  }
  if (job.retryMultiplier !== undefined) {
    entry.retryMultiplier = job.retryMultiplier
  }
  if (job.error !== undefined) {
    entry.error = job.error
  }
  if (job.failedAt !== undefined) {
    entry.failedAt = job.failedAt
  }
  if (job.priority !== undefined) {
    entry.priority = job.priority
  }

  return cborEncodeValue(entry) as Uint8Array
}

/**
 * 確保 Uint8Array 有標準的 .buffer 屬性可供 DataView 使用
 * Bun 某些 API 回傳的 Uint8Array 可能沒有標準 ArrayBuffer
 */
function ensureBuffer(bytes: Uint8Array): { buf: ArrayBuffer; offset: number } {
  if (bytes.buffer && bytes.buffer instanceof ArrayBuffer) {
    return { buf: bytes.buffer, offset: bytes.byteOffset }
  }
  // 複製到新的 ArrayBuffer
  const copy = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) {
    copy[i] = bytes[i]
  }
  return { buf: copy.buffer, offset: 0 }
}

/**
 * 解碼 CBOR bytes 為 archive 項目
 */
function decodeArchiveEntry(bytes: Uint8Array): {
  queue: string
  job: SerializedJob
  status: string
} {
  const { buf, offset } = ensureBuffer(bytes)
  const state: DecoderState = {
    bytes,
    view: new DataView(buf, offset, bytes.byteLength),
    pos: 0,
  }
  const obj = cborDecodeValue(state) as Record<string, unknown>

  return {
    queue: obj.queue as string,
    status: obj.status as string,
    job: {
      id: obj.id as string,
      type: obj.type as SerializedJob['type'],
      data: obj.data as string | Uint8Array,
      createdAt: obj.createdAt as number,
      ...(obj.className !== undefined ? { className: obj.className as string } : {}),
      ...(obj.delaySeconds !== undefined ? { delaySeconds: obj.delaySeconds as number } : {}),
      ...(obj.attempts !== undefined ? { attempts: obj.attempts as number } : {}),
      ...(obj.maxAttempts !== undefined ? { maxAttempts: obj.maxAttempts as number } : {}),
      ...(obj.groupId !== undefined ? { groupId: obj.groupId as string } : {}),
      ...(obj.retryAfterSeconds !== undefined
        ? { retryAfterSeconds: obj.retryAfterSeconds as number }
        : {}),
      ...(obj.retryMultiplier !== undefined
        ? { retryMultiplier: obj.retryMultiplier as number }
        : {}),
      ...(obj.error !== undefined ? { error: obj.error as string } : {}),
      ...(obj.failedAt !== undefined ? { failedAt: obj.failedAt as number } : {}),
      ...(obj.priority !== undefined ? { priority: obj.priority as string | number } : {}),
    },
  }
}

/**
 * 編碼單筆 log 項目為 CBOR 格式
 */
function encodeLogEntry(log: {
  level: string
  message: string
  workerId: string
  queue?: string
  timestamp: Date
}): Uint8Array {
  const entry: Record<string, unknown> = {
    level: log.level,
    message: log.message,
    workerId: log.workerId,
    timestamp: log.timestamp.getTime(),
  }
  if (log.queue !== undefined) {
    entry.queue = log.queue
  }
  return cborEncodeValue(entry) as Uint8Array
}

/**
 * 解碼 CBOR bytes 為 log 項目
 */
function decodeLogEntry(bytes: Uint8Array): {
  level: string
  message: string
  workerId: string
  queue?: string
  timestamp: Date
} {
  const { buf, offset } = ensureBuffer(bytes)
  const state: DecoderState = {
    bytes,
    view: new DataView(buf, offset, bytes.byteLength),
    pos: 0,
  }
  const obj = cborDecodeValue(state) as Record<string, unknown>

  return {
    level: obj.level as string,
    message: obj.message as string,
    workerId: obj.workerId as string,
    timestamp: new Date(obj.timestamp as number),
    ...(obj.queue !== undefined ? { queue: obj.queue as string } : {}),
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 長度前綴序列化：每個記錄前附加 4 byte（大端序）長度，方便批次解碼
// ──────────────────────────────────────────────────────────────────────────────

/**
 * 將 Uint8Array 封裝為「長度前綴 frame」
 * [4 bytes length][N bytes payload]
 */
function framePack(payload: Uint8Array): Uint8Array {
  const frame = new Uint8Array(4 + payload.length)
  const view = new DataView(frame.buffer)
  view.setUint32(0, payload.length, false)
  frame.set(payload, 4)
  return frame
}

/**
 * 將一段含多個長度前綴 frame 的 Uint8Array 拆解為各個 payload
 *
 * 使用逐 byte 讀取而非 DataView 建立，避免 Bun ArrayBufferSink.end()
 * 回傳的 Uint8Array 可能沒有標準 .buffer 屬性的問題。
 */
function frameUnpackAll(data: Uint8Array): Uint8Array[] {
  const results: Uint8Array[] = []
  let pos = 0

  while (pos < data.length) {
    if (pos + 4 > data.length) {
      break
    }

    // 手動讀取 4 bytes 大端序長度（避免 DataView 相容性問題）
    const len = (data[pos] << 24) | (data[pos + 1] << 16) | (data[pos + 2] << 8) | data[pos + 3]
    pos += 4

    // 防衛：確保長度合理（正整數且不超出邊界）
    if (len < 0 || pos + len > data.length) {
      break
    }

    // 複製 payload bytes（確保獨立的 Uint8Array）
    const payload = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      payload[i] = data[pos + i]
    }
    results.push(payload)
    pos += len
  }

  return results
}

// ──────────────────────────────────────────────────────────────────────────────
// 型別定義
// ──────────────────────────────────────────────────────────────────────────────

/**
 * BunBufferedPersistence 設定選項
 */
export interface BunBufferedPersistenceOptions {
  /**
   * 觸發自動 flush 的緩衝筆數上限（預設 50）
   */
  maxBufferSize?: number

  /**
   * 定時 flush 的間隔（毫秒，預設 5000）
   */
  flushInterval?: number

  /**
   * ArrayBufferSink 的初始容量（bytes，預設 65536）
   */
  sinkCapacity?: number
}

// ──────────────────────────────────────────────────────────────────────────────
// Bun.ArrayBufferSink 型別宣告（bun-types 未必完整匯出，手動補齊）
// ──────────────────────────────────────────────────────────────────────────────

interface BunArrayBufferSink {
  start(options?: { highWaterMark?: number; stream?: boolean; asUint8Array?: boolean }): void
  write(chunk: string | ArrayBufferView | ArrayBuffer): number
  /** flush() 在非 stream 模式下只回傳已寫入 byte 數（number），不回傳資料 */
  flush(): number
  /** end() 關閉 sink 並回傳所有緩衝資料，之後可再次呼叫 start() 重用 */
  end(): Uint8Array | ArrayBuffer
}

/**
 * 偵測目前是否在 Bun 環境執行
 */
function isBunRuntime(): boolean {
  return (
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as Record<string, unknown>).Bun !== 'undefined'
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// BunBufferedPersistence
// ──────────────────────────────────────────────────────────────────────────────

/**
 * 使用 Bun ArrayBufferSink 的高效緩衝持久化裝飾器
 *
 * 在 Bun 環境下，使用 Bun 原生的 ArrayBufferSink 作為記憶體緩衝區，
 * 以 CBOR 格式直接寫入二進制資料（零字串轉換開銷），
 * 並透過背壓控制避免無限增長。
 *
 * 在非 Bun 環境（Node.js 等）則回退到簡單的陣列緩衝機制，
 * 與原始 BufferedPersistence 行為等效。
 *
 * @public
 * @example
 * ```typescript
 * const mysqlAdapter = new MySQLPersistence(db)
 * const buffered = new BunBufferedPersistence(mysqlAdapter, {
 *   maxBufferSize: 100,
 *   flushInterval: 1000,
 * })
 * await buffered.archive('email', job, 'completed')
 * await buffered.flush()
 * ```
 */
export class BunBufferedPersistence implements PersistenceAdapter {
  // ── Bun 模式（ArrayBufferSink）────────────────────────────────────────────
  private jobSink: BunArrayBufferSink | null = null
  private logSink: BunArrayBufferSink | null = null

  // ── 共用計數器 ──────────────────────────────────────────────────────────────
  private jobPendingCount = 0
  private logPendingCount = 0

  // ── 背壓控制：確保同時只有一個 flush 在執行 ─────────────────────────────────
  private flushing = false
  private flushPromise: Promise<void> | null = null

  // ── Node.js 回退：使用簡單陣列 ──────────────────────────────────────────────
  private jobBuffer: Array<{ queue: string; job: SerializedJob; status: string }> = []
  private logBuffer: Array<{
    level: string
    message: string
    workerId: string
    queue?: string
    timestamp: Date
  }> = []

  // ── 定時 flush ──────────────────────────────────────────────────────────────
  private flushTimer: ReturnType<typeof setTimeout> | null = null

  // ── 設定 ───────────────────────────────────────────────────────────────────
  private readonly maxBufferSize: number
  private readonly flushInterval: number
  private readonly useBun: boolean
  private readonly sinkCapacity: number

  constructor(
    private readonly adapter: PersistenceAdapter,
    options: BunBufferedPersistenceOptions = {}
  ) {
    this.maxBufferSize = options.maxBufferSize ?? 50
    this.flushInterval = options.flushInterval ?? 5000
    this.sinkCapacity = options.sinkCapacity ?? 65536
    this.useBun = isBunRuntime()

    if (this.useBun) {
      this.initSinks()
    }
  }

  /**
   * 初始化 Bun ArrayBufferSink（Bun 模式專用）
   * 可重複呼叫（flush 後重建 sink）
   */
  private initSinks(): void {
    const BunGlobal = (globalThis as Record<string, unknown>).Bun as {
      ArrayBufferSink: new () => BunArrayBufferSink
    }

    this.jobSink = new BunGlobal.ArrayBufferSink()
    this.jobSink.start({ highWaterMark: this.sinkCapacity, asUint8Array: true })

    this.logSink = new BunGlobal.ArrayBufferSink()
    this.logSink.start({ highWaterMark: this.sinkCapacity, asUint8Array: true })
  }

  /**
   * 緩衝一筆 job archive 請求
   *
   * @param queue - 隊列名稱
   * @param job - 序列化的 job 資料
   * @param status - job 最終狀態
   */
  async archive(
    queue: string,
    job: SerializedJob,
    status: 'completed' | 'failed' | 'waiting' | string
  ): Promise<void> {
    // 背壓：如果正在 flush 就等待完成
    if (this.flushing && this.flushPromise) {
      await this.flushPromise
    }

    if (this.useBun && this.jobSink) {
      // Bun 模式：CBOR 編碼後寫入 sink（帶長度前綴方便批次解碼）
      const encoded = encodeArchiveEntry(queue, job, status)
      const frame = framePack(encoded)
      this.jobSink.write(frame)
    } else {
      // Node.js 回退：寫入陣列
      this.jobBuffer.push({ queue, job, status })
    }

    this.jobPendingCount++

    if (this.jobPendingCount >= this.maxBufferSize) {
      // 達到上限，立即 flush（catch 錯誤避免 unhandled rejection）
      this.flush().catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        process.stderr.write(`[BunBufferedPersistence] Auto-flush 失敗 (jobs): ${msg}\n`)
      })
    } else {
      this.ensureFlushTimer()
    }
  }

  /**
   * 緩衝一筆 log archive 請求
   */
  async archiveLog(log: {
    level: string
    message: string
    workerId: string
    queue?: string
    timestamp: Date
  }): Promise<void> {
    if (this.flushing && this.flushPromise) {
      await this.flushPromise
    }

    if (this.useBun && this.logSink) {
      const encoded = encodeLogEntry(log)
      const frame = framePack(encoded)
      this.logSink.write(frame)
    } else {
      this.logBuffer.push(log)
    }

    this.logPendingCount++

    if (this.logPendingCount >= this.maxBufferSize) {
      this.flush().catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        process.stderr.write(`[BunBufferedPersistence] Auto-flush 失敗 (logs): ${msg}\n`)
      })
    } else {
      this.ensureFlushTimer()
    }
  }

  /**
   * 批次 archive 多個 job（直接委派，不走緩衝）
   */
  async archiveMany(
    jobs: Array<{
      queue: string
      job: SerializedJob
      status: 'completed' | 'failed' | 'waiting' | string
    }>
  ): Promise<void> {
    if (this.adapter.archiveMany) {
      return this.adapter.archiveMany(jobs)
    }
    for (const item of jobs) {
      await this.adapter.archive(item.queue, item.job, item.status)
    }
  }

  /**
   * 批次 archive 多個 log（直接委派，不走緩衝）
   */
  async archiveLogMany(
    logs: Array<{
      level: string
      message: string
      workerId: string
      queue?: string
      timestamp: Date
    }>
  ): Promise<void> {
    if (this.adapter.archiveLogMany) {
      return this.adapter.archiveLogMany(logs)
    }
    for (const log of logs) {
      await this.adapter.archiveLog(log)
    }
  }

  /**
   * 將緩衝區的所有資料批次寫入底層 adapter
   *
   * 具備互斥鎖語意：同時只有一個 flush 在執行。
   * 背壓控制：archive() 和 archiveLog() 在 flush 進行中時會等待。
   */
  async flush(): Promise<void> {
    // 雙重檢查：若已在 flush 中，等待完成即可
    if (this.flushing) {
      return this.flushPromise ?? Promise.resolve()
    }

    this.flushing = true
    this.flushPromise = this._doFlush().finally(() => {
      this.flushing = false
      this.flushPromise = null
    })

    return this.flushPromise
  }

  /**
   * 實際執行 flush 的內部方法
   */
  private async _doFlush(): Promise<void> {
    // 清除定時器
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    const jobCount = this.jobPendingCount
    const logCount = this.logPendingCount

    // 重置計數器（先重置，讓後續 archive 可以繼續寫入）
    this.jobPendingCount = 0
    this.logPendingCount = 0

    const promises: Promise<void>[] = []

    // ── Bun 模式：用 end() 取出所有資料，然後重建 sink ──────────────────────────
    // 說明：Bun.ArrayBufferSink.flush() 在非 stream 模式只回傳 byte 數（number），
    //        必須使用 end() 才能取得實際二進制資料。end() 後可再次 start() 重用。
    let rawJobs: Uint8Array | null = null
    let rawLogs: Uint8Array | null = null

    if (this.useBun) {
      if (jobCount > 0 && this.jobSink) {
        rawJobs = this.jobSink.end() as Uint8Array
      }
      if (logCount > 0 && this.logSink) {
        rawLogs = this.logSink.end() as Uint8Array
      }
      // 重建 sink，讓 flush 後的 archive 可以繼續寫入
      this.initSinks()
    }

    // ── 處理 job 緩衝 ─────────────────────────────────────────────────────────
    if (jobCount > 0) {
      let jobs: Array<{ queue: string; job: SerializedJob; status: string }>

      if (this.useBun && rawJobs) {
        // Bun 模式：從 sink end() 取出二進制資料後解碼
        const frames = frameUnpackAll(rawJobs)
        jobs = frames.map((frame) => decodeArchiveEntry(frame))
      } else {
        // Node.js 回退：取出陣列並清空
        jobs = this.jobBuffer
        this.jobBuffer = []
      }

      if (jobs.length > 0) {
        if (this.adapter.archiveMany) {
          promises.push(this.adapter.archiveMany(jobs))
        } else {
          promises.push(
            (async () => {
              for (const item of jobs) {
                await this.adapter.archive(item.queue, item.job, item.status)
              }
            })()
          )
        }
      }
    }

    // ── 處理 log 緩衝 ─────────────────────────────────────────────────────────
    if (logCount > 0) {
      let logs: Array<{
        level: string
        message: string
        workerId: string
        queue?: string
        timestamp: Date
      }>

      if (this.useBun && rawLogs) {
        const frames = frameUnpackAll(rawLogs)
        logs = frames.map((frame) => decodeLogEntry(frame))
      } else {
        logs = this.logBuffer
        this.logBuffer = []
      }

      if (logs.length > 0) {
        if (this.adapter.archiveLogMany) {
          promises.push(this.adapter.archiveLogMany(logs))
        } else {
          promises.push(
            (async () => {
              for (const log of logs) {
                await this.adapter.archiveLog(log)
              }
            })()
          )
        }
      }
    }

    await Promise.all(promises)
  }

  // ── 讀取操作：直接委派底層 adapter ──────────────────────────────────────────

  async find(queue: string, id: string): Promise<SerializedJob | null> {
    return this.adapter.find(queue, id)
  }

  async list(
    queue: string,
    options?: {
      limit?: number
      offset?: number
      status?: 'completed' | 'failed' | 'waiting' | string
      jobId?: string
      startTime?: Date
      endTime?: Date
    }
  ): Promise<SerializedJob[]> {
    return this.adapter.list(queue, options)
  }

  async count(
    queue: string,
    options?: {
      status?: 'completed' | 'failed' | 'waiting' | string
      jobId?: string
      startTime?: Date
      endTime?: Date
    }
  ): Promise<number> {
    return this.adapter.count(queue, options)
  }

  async cleanup(days: number): Promise<number> {
    return this.adapter.cleanup(days)
  }

  async listLogs(options?: {
    limit?: number
    offset?: number
    level?: string
    workerId?: string
    queue?: string
    search?: string
    startTime?: Date
    endTime?: Date
  }): Promise<Record<string, unknown>[]> {
    return this.adapter.listLogs(options)
  }

  async countLogs(options?: {
    level?: string
    workerId?: string
    queue?: string
    search?: string
    startTime?: Date
    endTime?: Date
  }): Promise<number> {
    return this.adapter.countLogs(options)
  }

  // ── 內部工具 ──────────────────────────────────────────────────────────────

  /**
   * 確保定時 flush 計時器正在執行
   */
  private ensureFlushTimer(): void {
    if (this.flushTimer) {
      return
    }

    this.flushTimer = setTimeout(() => {
      this.flush().catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        process.stderr.write(`[BunBufferedPersistence] 定時 flush 失敗: ${msg}\n`)
      })
    }, this.flushInterval)
  }

  /**
   * 取得目前緩衝中的 job 筆數（供測試與監控使用）
   */
  get pendingJobCount(): number {
    return this.jobPendingCount
  }

  /**
   * 取得目前緩衝中的 log 筆數（供測試與監控使用）
   */
  get pendingLogCount(): number {
    return this.logPendingCount
  }

  /**
   * 目前是否正在執行 flush
   */
  get isFlushing(): boolean {
    return this.flushing
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 工廠函數：自動選擇最佳實作
// ──────────────────────────────────────────────────────────────────────────────

/**
 * 建立最佳的 BufferedPersistence 實例
 *
 * 在 Bun 環境自動使用 BunBufferedPersistence（ArrayBufferSink 加速），
 * 在 Node.js 環境回退到一般陣列緩衝行為。
 *
 * 兩者皆實作相同的 `PersistenceAdapter` 介面，可互換使用。
 *
 * @example
 * ```typescript
 * const adapter = createBufferedPersistence(mysqlAdapter, { maxBufferSize: 100 })
 * ```
 */
export function createBufferedPersistence(
  adapter: PersistenceAdapter,
  options?: BunBufferedPersistenceOptions
): BunBufferedPersistence {
  return new BunBufferedPersistence(adapter, options)
}
