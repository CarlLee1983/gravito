import type { SerializedJob } from '../types'

/**
 * BinaryJobFrame - Gravito Job 的二進制幀格式
 *
 * 幀結構（Frame Format）：
 *   Magic(2B) + Version(1B) + Flags(1B) + MetaLen(2B Big-Endian) + Metadata(CBOR) + Payload
 *
 * - Magic：固定為 [0x47, 0x4A]（"GJ" = Gravito Job）
 * - Version：目前為 0x01
 * - Flags：位元旗標，目前定義：
 *     Bit 0 (HAS_CLASS_NAME)：是否包含 className 欄位
 *     Bit 1 (HAS_GROUP_ID)：是否包含 groupId 欄位
 *     Bit 2 (HAS_DELAY)：是否包含 delaySeconds 欄位
 *     Bit 3 (HAS_PRIORITY)：是否包含 priority 欄位
 *     Bit 4 (HAS_ERROR)：是否包含 error / failedAt 欄位
 * - MetaLen：Metadata CBOR 資料的長度（2 bytes Big-Endian，最大 65535 bytes）
 * - Metadata：以 CBOR 或 JSON 編碼的 metadata 物件（id, createdAt, attempts 等）
 * - Payload：原始 Uint8Array 資料（job.data）
 *
 * @module BinaryJobFrame
 */

// ─── 常數定義 ────────────────────────────────────────────────────────────────

/** Magic bytes，標識 Gravito Job 二進制幀 */
export const MAGIC = [0x47, 0x4a] as const // "GJ"

/** 幀格式版本號 */
export const VERSION = 0x01

/** 幀 header 的固定大小（Magic 2B + Version 1B + Flags 1B + MetaLen 2B = 6 bytes） */
export const HEADER_SIZE = 6

/** Flags 位元定義 */
export const Flags = {
  /** 包含 className 欄位 */
  HAS_CLASS_NAME: 0x01,
  /** 包含 groupId 欄位 */
  HAS_GROUP_ID: 0x02,
  /** 包含 delaySeconds 欄位 */
  HAS_DELAY: 0x04,
  /** 包含 priority 欄位 */
  HAS_PRIORITY: 0x08,
  /** 包含 error / failedAt 欄位 */
  HAS_ERROR: 0x10,
} as const

/**
 * Metadata 短鍵映射（節省序列化空間）
 * 完整鍵名 → 短鍵名
 */
export const META_KEY_MAP: Record<string, string> = {
  id: 'i',
  createdAt: 't',
  attempts: 'a',
  maxAttempts: 'm',
  className: 'c',
  groupId: 'g',
  delaySeconds: 'd',
  priority: 'p',
  retryAfterSeconds: 'r',
  retryMultiplier: 'x',
  error: 'e',
  failedAt: 'f',
}

/**
 * 短鍵反向映射（反序列化用）
 * 短鍵名 → 完整鍵名
 */
export const META_KEY_REVERSE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(META_KEY_MAP).map(([full, short]) => [short, full])
)

// ─── 型別定義 ────────────────────────────────────────────────────────────────

/**
 * 序列化後的 Metadata（使用短鍵）
 */
interface MetadataShort {
  i: string // id
  t: number // createdAt
  a?: number // attempts
  m?: number // maxAttempts
  c?: string // className
  g?: string // groupId
  d?: number // delaySeconds
  p?: string | number // priority
  r?: number // retryAfterSeconds
  x?: number // retryMultiplier
  e?: string // error
  f?: number // failedAt
}

// ─── 工具函式 ────────────────────────────────────────────────────────────────

/**
 * 將數字寫入 Big-Endian 格式的 Uint8Array
 *
 * @param value - 要寫入的數字
 * @param bytes - 位元組數（1-4）
 * @returns 包含 Big-Endian 值的 Uint8Array
 */
function writeUInt16BE(value: number): Uint8Array {
  const buf = new Uint8Array(2)
  buf[0] = (value >> 8) & 0xff
  buf[1] = value & 0xff
  return buf
}

/**
 * 從 Uint8Array 讀取 Big-Endian 16-bit 無符號整數
 *
 * @param data - 資料來源
 * @param offset - 起始偏移量
 * @returns 16-bit 無符號整數
 */
function readUInt16BE(data: Uint8Array, offset: number): number {
  return ((data[offset]! << 8) | data[offset + 1]!) >>> 0
}

/**
 * 以 JSON 方式序列化 metadata（輕量備用方案）
 *
 * 在沒有 CBOR 加速器的情況下，使用 JSON + TextEncoder 序列化 metadata。
 * 大小略大於 CBOR，但確保相容性。
 *
 * @param meta - 要序列化的 metadata
 * @returns 序列化後的 Uint8Array
 */
function encodeMetaFallback(meta: MetadataShort): Uint8Array {
  const json = JSON.stringify(meta)
  return new TextEncoder().encode(json)
}

/**
 * 以 JSON 方式反序列化 metadata
 *
 * @param data - 序列化的 metadata bytes
 * @returns 反序列化的 metadata 物件
 */
function decodeMetaFallback(data: Uint8Array): MetadataShort {
  const json = new TextDecoder().decode(data)
  return JSON.parse(json) as MetadataShort
}

// ─── 主要 API ────────────────────────────────────────────────────────────────

/**
 * 判斷給定的資料是否為 Gravito Job 二進制幀
 *
 * 透過 Magic byte 嗅探識別：檢查前 2 bytes 是否為 [0x47, 0x4A]
 *
 * @param data - 要檢查的資料（Uint8Array 或 Buffer）
 * @returns 如果是 Gravito Job 幀則回傳 true
 */
export function isGravitoJobFrame(data: Uint8Array | Buffer): boolean {
  if (data.length < HEADER_SIZE) {
    return false
  }
  return data[0] === MAGIC[0] && data[1] === MAGIC[1]
}

/**
 * 將 SerializedJob 編碼為二進制幀格式
 *
 * 僅適用於 type === 'binary' 且 data 為 Uint8Array 的 Job。
 *
 * @param job - 要編碼的 SerializedJob（必須是 binary type）
 * @returns 編碼後的 Uint8Array
 * @throws {TypeError} 如果 job.data 不是 Uint8Array
 * @throws {Error} 如果 metadata 長度超過 65535 bytes
 */
export function encodeBinaryJobFrame(job: SerializedJob): Uint8Array {
  if (!(job.data instanceof Uint8Array)) {
    throw new TypeError(
      `[BinaryJobFrame] encodeBinaryJobFrame requires job.data to be Uint8Array, ` +
        `got ${typeof job.data}`
    )
  }

  // 計算 Flags
  let flags = 0x00
  if (job.className) flags |= Flags.HAS_CLASS_NAME
  if (job.groupId) flags |= Flags.HAS_GROUP_ID
  if (job.delaySeconds !== undefined) flags |= Flags.HAS_DELAY
  if (job.priority !== undefined) flags |= Flags.HAS_PRIORITY
  if (job.error || job.failedAt !== undefined) flags |= Flags.HAS_ERROR

  // 建構 metadata（使用短鍵減少大小）
  const meta: MetadataShort = {
    i: job.id,
    t: job.createdAt,
  }

  if (job.attempts !== undefined) meta.a = job.attempts
  if (job.maxAttempts !== undefined) meta.m = job.maxAttempts
  if (job.className) meta.c = job.className
  if (job.groupId) meta.g = job.groupId
  if (job.delaySeconds !== undefined) meta.d = job.delaySeconds
  if (job.priority !== undefined) meta.p = job.priority
  if (job.retryAfterSeconds !== undefined) meta.r = job.retryAfterSeconds
  if (job.retryMultiplier !== undefined) meta.x = job.retryMultiplier
  if (job.error) meta.e = job.error
  if (job.failedAt !== undefined) meta.f = job.failedAt

  // 序列化 metadata
  const metaBytes = encodeMetaFallback(meta)

  if (metaBytes.length > 0xffff) {
    throw new Error(
      `[BinaryJobFrame] Metadata size ${metaBytes.length} exceeds maximum of 65535 bytes`
    )
  }

  // 計算總大小並分配緩衝區
  const payloadBytes = job.data
  const totalSize = HEADER_SIZE + metaBytes.length + payloadBytes.length
  const frame = new Uint8Array(totalSize)

  // 寫入 header
  let offset = 0
  frame[offset++] = MAGIC[0] // 0x47 'G'
  frame[offset++] = MAGIC[1] // 0x4A 'J'
  frame[offset++] = VERSION // 0x01
  frame[offset++] = flags

  // 寫入 MetaLen（Big-Endian）
  const metaLenBytes = writeUInt16BE(metaBytes.length)
  frame[offset++] = metaLenBytes[0]!
  frame[offset++] = metaLenBytes[1]!

  // 寫入 metadata
  frame.set(metaBytes, offset)
  offset += metaBytes.length

  // 寫入 payload
  frame.set(payloadBytes, offset)

  return frame
}

/**
 * 將二進制幀解碼為 SerializedJob
 *
 * @param data - 要解碼的二進制幀（Uint8Array 或 Buffer）
 * @returns 解碼後的 SerializedJob，data 為 Uint8Array
 * @throws {Error} 如果資料格式無效
 */
export function decodeBinaryJobFrame(data: Uint8Array | Buffer): SerializedJob {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)

  // 驗證 Magic bytes
  if (bytes.length < HEADER_SIZE) {
    throw new Error(
      `[BinaryJobFrame] Frame too short: ${bytes.length} bytes, minimum is ${HEADER_SIZE}`
    )
  }

  if (bytes[0] !== MAGIC[0] || bytes[1] !== MAGIC[1]) {
    throw new Error(
      `[BinaryJobFrame] Invalid magic bytes: [${bytes[0]}, ${bytes[1]}], ` +
        `expected [${MAGIC[0]}, ${MAGIC[1]}]`
    )
  }

  // 讀取 header
  const version = bytes[2]
  if (version !== VERSION) {
    throw new Error(`[BinaryJobFrame] Unsupported version: ${version}, expected ${VERSION}`)
  }

  const flags = bytes[3]!
  const metaLen = readUInt16BE(bytes, 4)

  // 驗證資料長度
  if (bytes.length < HEADER_SIZE + metaLen) {
    throw new Error(
      `[BinaryJobFrame] Frame truncated: expected ${HEADER_SIZE + metaLen} bytes for header+meta, ` +
        `got ${bytes.length}`
    )
  }

  // 解析 metadata
  const metaBytes = bytes.slice(HEADER_SIZE, HEADER_SIZE + metaLen)
  const meta = decodeMetaFallback(metaBytes)

  // 提取 payload
  const payloadStart = HEADER_SIZE + metaLen
  const payloadBytes = bytes.slice(payloadStart)

  // 從短鍵還原完整 SerializedJob
  const job: SerializedJob = {
    id: meta.i,
    type: 'binary',
    data: payloadBytes,
    createdAt: meta.t,
  }

  // 根據 flags 和 metadata 還原可選欄位
  if (meta.a !== undefined) job.attempts = meta.a
  if (meta.m !== undefined) job.maxAttempts = meta.m

  if (flags! & Flags.HAS_CLASS_NAME && meta.c) {
    job.className = meta.c
  }
  if (flags! & Flags.HAS_GROUP_ID && meta.g) {
    job.groupId = meta.g
  }
  if (flags! & Flags.HAS_DELAY && meta.d !== undefined) {
    job.delaySeconds = meta.d
  }
  if (flags! & Flags.HAS_PRIORITY && meta.p !== undefined) {
    job.priority = meta.p
  }
  if (meta.r !== undefined) job.retryAfterSeconds = meta.r
  if (meta.x !== undefined) job.retryMultiplier = meta.x
  if (flags! & Flags.HAS_ERROR && meta.e) {
    job.error = meta.e
  }
  if (flags! & Flags.HAS_ERROR && meta.f !== undefined) {
    job.failedAt = meta.f
  }

  return job
}
