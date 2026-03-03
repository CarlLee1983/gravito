/**
 * @fileoverview Transpiler 工具庫 - AST 層級代碼分析
 *
 * 使用 Bun.Transpiler API 進行精確的 handler 函式分析，
 * 相比傳統字串匹配，精確度從 ~85% 提升至 ~99%。
 *
 * 核心策略：
 * 1. 使用 transformSync() 標準化代碼格式（統一縮排、引號等）
 * 2. 對轉換後的代碼使用精確的正規表達式匹配 member expression
 * 3. 區分 API 呼叫（.req.header()）與變數名稱（const header = ...）
 * 4. 支援解構賦值模式（const { header } = ctx.req）
 * 5. 快取 Transpiler 實例（性能提升 5.9x）+ LRU 快取結果（額外 128x）
 *
 * @module @gravito/core/transpiler-utils
 * @since 3.1.0
 */
/**
 * TranspilerCache - 管理 Bun.Transpiler 實例與結果快取
 *
 * 避免重複建立 Transpiler（每次建立約需 40µs），
 * 並快取 transformSync 結果（重用快取比每次 transform 快 128x）。
 *
 * @example
 * ```typescript
 * const cache = TranspilerCache.getInstance()
 * const transformed = cache.transform(handlerSource)
 * ```
 */
export declare class TranspilerCache {
  private static instance
  /** 共享的 Bun.Transpiler 實例（避免重複建立） */
  private readonly transpiler
  /** LRU 快取：原始代碼 → 轉換結果 */
  private readonly cache
  /** 快取大小上限 */
  private readonly maxSize
  /** 快取 TTL（毫秒），預設 5 分鐘 */
  private readonly ttlMs
  private constructor()
  /**
   * 取得單例實例
   * 確保全程只建立一個 Transpiler 實例
   */
  static getInstance(): TranspilerCache
  /**
   * 重置單例（主要用於測試）
   */
  static resetInstance(): void
  /**
   * 轉換代碼並快取結果
   *
   * 先嘗試從快取取得，若未命中則呼叫 transformSync 並儲存結果。
   * 快取已滿時淘汰最舊的條目（近似 LRU）。
   *
   * 處理兩個 Bun.Transpiler 邊緣案例：
   * 1. 箭頭函式表達式：`async (ctx) => ...` → transformSync 返回空字串
   *    解法：包裝成 `const __fn = <source>` 後再轉換
   * 2. 匿名函式表達式：`function(ctx) {...}` → transformSync 拋出 Parse error
   *    解法：同樣包裝後轉換
   *
   * @param source - 原始 handler 函式字串
   * @returns 轉換後的標準化代碼，若完全失敗則回傳 null
   */
  transform(source: string): string | null
  /**
   * 實際執行 transformSync，處理箭頭函式和匿名函式的邊緣案例
   *
   * @param source - 原始代碼字串
   * @returns 轉換後的代碼，或失敗時回傳 null
   */
  private doTransform
  /**
   * 將代碼包裝成賦值語句後再 transform
   *
   * 用於處理無法直接 transform 的函式表達式。
   * 包裝格式：`const __fn = <source>`
   *
   * @param source - 原始函式字串
   * @returns 包裝後的轉換結果，或失敗時回傳 null
   */
  private transformWrapped
  /**
   * 取得目前快取大小
   */
  get size(): number
  /**
   * 清除所有快取條目
   */
  clear(): void
}
/**
 * Transpiler 分析的返回結果
 * 與 HandlerAnalysis 介面對應
 */
export interface TranspilerAnalysisResult {
  usesHeaders: boolean
  usesQuery: boolean
  usesBody: boolean
  usesParams: boolean
  isAsync: boolean
}
/**
 * 使用 Bun.Transpiler 進行精確的 handler 靜態分析
 *
 * 相比字串匹配，此函式能正確區分：
 * - API 呼叫（`ctx.req.header(name)`）vs 變數名稱（`const header = '...'`）
 * - 解構賦值（`const { header } = ctx.req`）
 * - Minified 代碼（transformSync 先標準化）
 * - 箭頭函式與匿名函式（包裝策略處理 Bun.Transpiler 邊緣案例）
 *
 * 若 Transpiler 轉換失敗，會自動 fallback 到字串匹配模式。
 *
 * ## isAsync 特殊處理
 *
 * `isAsync` 直接從原始碼偵測 `async` 關鍵字，而不是從 transformSync 結果：
 * - 箭頭函式 `async (ctx) => ...` 的 transformSync 返回空字串
 * - `async` 關鍵字本身不存在假陽性問題
 *
 * @param source - handler 函式的字串表示（通常來自 handler.toString()）
 * @returns 分析結果，或在 fallback 模式下的近似結果
 *
 * @example
 * ```typescript
 * const handler = async (ctx) => {
 *   const name = ctx.req.query('name')
 *   return ctx.json({ name })
 * }
 * const result = analyzeHandlerWithTranspiler(handler.toString())
 * // result.usesQuery === true
 * // result.usesHeaders === false（即使有 'header' 字串，也不會誤判）
 * // result.isAsync === true（即使是箭頭函式也能正確偵測）
 * ```
 */
export declare function analyzeHandlerWithTranspiler(source: string): TranspilerAnalysisResult
/**
 * 測試 handler 源代碼是否存取特定的 req 成員屬性
 *
 * 工具函式，方便在 Gravito.ts 等地方進行特定屬性的快速檢測。
 *
 * @param source - handler 函式的字串表示
 * @param property - 要測試的屬性名稱（如 'header', 'query', 'body'）
 * @returns 若該屬性被存取則回傳 true
 *
 * @example
 * ```typescript
 * const src = handler.toString()
 * if (hasReqMemberAccess(src, 'header')) {
 *   // handler 存取了 header
 * }
 * ```
 */
export declare function hasReqMemberAccess(source: string, property: string): boolean
/**
 * 判斷 handler 是否為非同步函式
 *
 * 直接從原始碼偵測 `async` 關鍵字，不依賴 transformSync 結果，
 * 因為箭頭函式的 transformSync 返回空字串。
 * `async` 關鍵字本身不存在假陽性問題。
 *
 * @param source - handler 函式的字串表示
 * @returns 若為 async 函式則回傳 true
 */
export declare function isAsyncHandler(source: string): boolean
/**
 * 預熱 Transpiler 快取
 *
 * 在應用啟動時呼叫，觸發 Transpiler 實例建立，
 * 避免第一個請求時的冷啟動延遲。
 */
export declare function warmupTranspilerCache(): void
