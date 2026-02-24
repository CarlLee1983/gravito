/**
 * Binary Worker Protocol - Worker 執行緒二進制傳輸協定
 *
 * 實作 JSON + TextEncoder/TextDecoder + ArrayBuffer Transfer 方案，
 * 讓 Main Thread 與 Worker Thread 之間以零拷貝方式傳遞 Job 資料。
 *
 * 設計原則：
 * - 不依賴 CBOR 或外部函式庫，使用 Bun 原生優化的 TextEncoder/TextDecoder
 * - ArrayBuffer Transfer 確保零拷貝語意（transfer 後原 buffer 失效）
 * - 呼叫端須自行保留 job 物件引用，以支援潛在的重試機制
 *
 * @module workers/BinaryWorkerProtocol
 */

import type { SerializedJob } from '../types'

// ─── 協定常數 ─────────────────────────────────────────────────────────────────

/**
 * Binary Protocol 版本號，未來可用於版本協商。
 */
export const BINARY_PROTOCOL_VERSION = 1

// ─── 型別定義 ─────────────────────────────────────────────────────────────────

/**
 * 使用 Binary Protocol 傳送給 Worker 的訊息格式。
 */
export interface BinaryWorkerMessage {
  /**
   * 訊息類型識別符，固定為 'execute-binary'。
   */
  type: 'execute-binary'

  /**
   * 以 ArrayBuffer 格式包裝的序列化 Job 資料。
   *
   * 注意：此 buffer 在 postMessage transfer 後即失效（零拷貝語意）。
   * Main Thread 應保留原始 job 物件以支援重試，而非依賴此 buffer。
   */
  buffer: ArrayBuffer
}

// ─── 編碼函式 ──────────────────────────────────────────────────────────────────

/**
 * 將 SerializedJob 編碼為可傳輸的 ArrayBuffer。
 *
 * 編碼流程：
 * 1. JSON.stringify(job) — 序列化為 JSON 字串
 * 2. TextEncoder.encode(json) — 轉換為 UTF-8 Uint8Array
 * 3. 取出底層 ArrayBuffer 並以 slice 建立獨立副本，確保 buffer 邊界正確
 *
 * @param job - 要傳輸的已序列化 Job 物件
 * @returns 包含 Job 資料的 ArrayBuffer（可作為 transfer list 傳遞給 postMessage）
 * @throws {Error} 若 job 序列化失敗
 *
 * @example
 * ```typescript
 * const buffer = encodeJobForTransfer(job)
 * worker.postMessage({ type: 'execute-binary', buffer }, [buffer])
 * // buffer 在此之後失效，請勿再使用
 * ```
 */
export function encodeJobForTransfer(job: SerializedJob): ArrayBuffer {
  // 步驟 1：JSON 序列化
  // undefined 欄位在 JSON.stringify 中會被忽略，這是預期行為
  const jsonStr = JSON.stringify(job)

  // 步驟 2：UTF-8 編碼
  const encoder = new TextEncoder()
  const encoded = encoder.encode(jsonStr)

  // 步驟 3：取出 ArrayBuffer
  // 注意：TextEncoder.encode() 可能回傳共用 buffer 的 Uint8Array，
  // 使用 slice() 確保取得獨立的 ArrayBuffer，避免 transfer 後影響其他資料
  return encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength)
}

// ─── 解碼函式 ──────────────────────────────────────────────────────────────────

/**
 * 從 ArrayBuffer 解碼 SerializedJob。
 *
 * 解碼流程：
 * 1. new Uint8Array(buffer) — 建立 buffer 的視圖
 * 2. TextDecoder.decode(view) — 從 UTF-8 還原 JSON 字串
 * 3. JSON.parse(json) — 還原為 SerializedJob 物件
 *
 * @param buffer - 由 encodeJobForTransfer 產生的 ArrayBuffer
 * @returns 還原的 SerializedJob 物件
 * @throws {Error} 若 buffer 為空、JSON 解析失敗或結果不符合 SerializedJob 結構
 *
 * @example
 * ```typescript
 * self.onmessage = async (event) => {
 *   if (event.data.type === 'execute-binary') {
 *     const job = decodeJobFromTransfer(event.data.buffer)
 *     await executeJob(job)
 *   }
 * }
 * ```
 */
export function decodeJobFromTransfer(buffer: ArrayBuffer): SerializedJob {
  // 防禦性檢查：buffer 不應為空
  if (buffer.byteLength === 0) {
    throw new Error('BinaryWorkerProtocol: 收到空的 ArrayBuffer，無法解碼 Job 資料')
  }

  // 步驟 1：建立 Uint8Array 視圖
  const view = new Uint8Array(buffer)

  // 步驟 2：UTF-8 解碼
  const decoder = new TextDecoder('utf-8')
  const jsonStr = decoder.decode(view)

  // 步驟 3：JSON 解析
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch (cause) {
    throw new Error(
      `BinaryWorkerProtocol: JSON 解析失敗 - ${cause instanceof Error ? cause.message : String(cause)}`
    )
  }

  // 步驟 4：基本結構驗證（確保必要欄位存在）
  if (!isValidSerializedJob(parsed)) {
    throw new Error(
      'BinaryWorkerProtocol: 解碼結果不符合 SerializedJob 結構（缺少必要欄位 id、type 或 data）'
    )
  }

  return parsed
}

// ─── 輔助函式 ──────────────────────────────────────────────────────────────────

/**
 * 型別守衛：驗證物件是否符合 SerializedJob 的必要欄位結構。
 *
 * 只檢查必要欄位（id、type、data、createdAt），
 * 可選欄位（className、delaySeconds 等）不做驗證。
 *
 * @param value - 待驗證的未知值
 * @returns 若符合 SerializedJob 必要結構則回傳 true
 */
function isValidSerializedJob(value: unknown): value is SerializedJob {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const obj = value as Record<string, unknown>

  // 必要欄位：id（字串）
  if (typeof obj.id !== 'string' || obj.id.length === 0) {
    return false
  }

  // 必要欄位：type（限定值）
  if (obj.type !== 'json' && obj.type !== 'class' && obj.type !== 'msgpack') {
    return false
  }

  // 必要欄位：data（字串，允許空字串）
  if (typeof obj.data !== 'string') {
    return false
  }

  // 必要欄位：createdAt（數字）
  if (typeof obj.createdAt !== 'number') {
    return false
  }

  return true
}
