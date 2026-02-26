/**
 * @gravito/ether - HTML Rewriter 核心型別定義
 * 基於 Bun HTMLRewriter API 的型別系統
 */

/**
 * 元素轉換規則
 * 定義如何轉換 HTML 元素
 */
export interface TransformRule {
  /**
   * 規則名稱（用於除錯和日誌）
   */
  readonly name: string

  /**
   * CSS 選擇器
   * 例如: 'a', 'img[src]', 'div.class', '*'
   */
  readonly selector: string

  /**
   * 元素回調
   * 在匹配的元素上執行
   */
  readonly element?: (el: Element) => void | Promise<void>

  /**
   * 文字節點回調
   * 在元素內的文字節點上執行
   */
  readonly text?: (text: Text) => void | Promise<void>

  /**
   * 註解節點回調
   * 在元素內的註解節點上執行
   */
  readonly comments?: (comment: Comment) => void | Promise<void>
}

/**
 * 文檔級轉換規則
 * 定義針對整份文檔的轉換操作
 */
export interface DocumentRule {
  /**
   * 規則名稱（用於除錯和日誌）
   */
  readonly name: string

  /**
   * DOCTYPE 回調
   * 在文檔開始時執行（一次）
   */
  readonly doctype?: (doctype: Doctype) => void | Promise<void>

  /**
   * 頂層註解回調
   * 在文檔頂層的註解上執行
   */
  readonly comments?: (comment: Comment) => void | Promise<void>

  /**
   * 頂層文字節點回調
   * 在文檔頂層的文字節點上執行
   */
  readonly text?: (text: Text) => void | Promise<void>

  /**
   * 文檔結束回調
   * 在文檔末尾執行（一次）
   */
  readonly end?: (end: End) => void | Promise<void>
}

/**
 * 轉換管道配置
 * 組織多個規則並指定執行條件
 */
export interface PipelineConfig {
  /**
   * 管道名稱
   */
  readonly name: string

  /**
   * 轉換規則列表
   * 會依序執行
   */
  readonly rules: ReadonlyArray<TransformRule>

  /**
   * 文檔級規則列表（可選）
   */
  readonly documentRules?: ReadonlyArray<DocumentRule>

  /**
   * 是否啟用此管道
   * 可以是靜態布林值或動態函式
   */
  readonly enabled?: boolean | ((ctx: PipelineContext) => boolean)
}

/**
 * 管道執行上下文
 * 傳遞給管道條件判斷函式
 */
export interface PipelineContext {
  /**
   * 文檔 URL（如果有的話）
   */
  readonly url?: string

  /**
   * Content-Type（如 'text/html'）
   */
  readonly contentType?: string

  /**
   * 自訂後設資料
   */
  readonly metadata?: Readonly<Record<string, unknown>>
}

/**
 * Ether 服務配置
 * 配置 Ether 的行為和可用功能
 */
export interface EtherConfig {
  /**
   * 預設管道
   * 如果未指定 URL 特定的管道，使用此管道
   */
  readonly defaultPipeline?: PipelineConfig

  /**
   * URL 特定的管道
   * 鍵為 URL 模式（簡單字串匹配或正規表示式）
   */
  readonly pipelines?: Readonly<Record<string, PipelineConfig>>

  /**
   * 是否自動生成 CSP nonce
   * 若啟用，可在 SecurityRule 中使用 nonce
   */
  readonly cspNonce?: boolean

  /**
   * 規則工廠
   * 用於動態建立規則
   */
  readonly ruleFactories?: Readonly<Record<string, () => TransformRule>>
}

/**
 * HTMLRewriter API 元素物件
 */
export interface Element {
  getAttributeNames(): string[]
  getAttribute(name: string): string | null
  hasAttribute(name: string): boolean
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
  before(content: string, options?: { html?: boolean }): void
  after(content: string, options?: { html?: boolean }): void
  prepend(content: string, options?: { html?: boolean }): void
  append(content: string, options?: { html?: boolean }): void
  replace(content: string, options?: { html?: boolean }): void
  remove(): void
  removeAndKeepContent(): void
  setInnerContent(content: string, options?: { html?: boolean }): void
  onEndTag(handler: (tag: EndTag) => void | Promise<void>): void
}

/**
 * HTMLRewriter API 文字節點物件
 */
export interface Text {
  text: string
  lastInTextNode: boolean
  before(content: string, options?: { html?: boolean }): void
  after(content: string, options?: { html?: boolean }): void
  replace(content: string, options?: { html?: boolean }): void
  remove(): void
}

/**
 * HTMLRewriter API 註解物件
 */
export interface Comment {
  text: string
  before(content: string, options?: { html?: boolean }): void
  after(content: string, options?: { html?: boolean }): void
  replace(content: string, options?: { html?: boolean }): void
  remove(): void
}

/**
 * HTMLRewriter API DOCTYPE 物件
 */
export interface Doctype {
  name: string
  publicId: string
  systemId: string
}

/**
 * HTMLRewriter API 結束標籤物件
 */
export interface EndTag {
  name: string
  before(content: string, options?: { html?: boolean }): void
  after(content: string, options?: { html?: boolean }): void
  remove(): void
}

/**
 * HTMLRewriter API 文檔結束物件
 */
export interface End {
  append(content: string, options?: { html?: boolean }): void
}
