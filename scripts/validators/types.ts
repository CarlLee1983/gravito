/**
 * 文檔驗證系統 - 型別定義
 *
 * 定義所有驗證器共用的介面和型別
 */

// ============================================================================
// 驗證結果型別
// ============================================================================

/**
 * 驗證錯誤
 */
export interface ValidationError {
  /** 錯誤類型 */
  type: 'syntax' | 'link' | 'mermaid' | 'structure' | 'template'
  /** 錯誤所在行號（可選） */
  line?: number
  /** 錯誤訊息 */
  message: string
  /** 嚴重程度 */
  severity: 'error' | 'warning'
}

/**
 * 單一文檔的驗證結果
 */
export interface ValidationResult {
  /** 文檔檔案路徑 */
  file: string
  /** 是否通過驗證（無 error 級別的問題） */
  passed: boolean
  /** 所有驗證錯誤和警告 */
  errors: ValidationError[]
}

// ============================================================================
// 驗證器選項
// ============================================================================

/**
 * 驗證器選項
 */
export interface ValidatorOptions {
  /** 文檔層級（影響驗證嚴格程度） */
  tier?: 'A' | 'B' | 'C'
  /** 是否啟用嚴格模式 */
  strict?: boolean
}

// ============================================================================
// 文檔結構型別
// ============================================================================

/**
 * 文檔 YAML Frontmatter
 */
export interface DocumentFrontmatter {
  /** 文檔標題 */
  title: string
  /** 版本號 */
  version: string
  /** 狀態 */
  status: 'Stable' | 'Beta' | 'Experimental'
  /** 層級 */
  tier: 'A' | 'B' | 'C'
  /** 最後更新日期 */
  last_updated: string
  /** 依賴關係（可選） */
  dependencies?: Record<string, string>
  /** 其他自定義欄位 */
  [key: string]: unknown
}

/**
 * 程式碼區塊
 */
export interface CodeBlock {
  /** 程式語言 */
  language: string
  /** 程式碼內容 */
  code: string
  /** 起始行號 */
  startLine: number
  /** 結束行號 */
  endLine: number
}

/**
 * Mermaid 圖表區塊
 */
export interface MermaidBlock {
  /** 圖表內容 */
  content: string
  /** 起始行號 */
  startLine: number
  /** 結束行號 */
  endLine: number
}

/**
 * Markdown 標題
 */
export interface Heading {
  /** 標題層級（1-6） */
  level: number
  /** 標題文字 */
  text: string
  /** 所在行號 */
  line: number
}

/**
 * Markdown 連結
 */
export interface Link {
  /** 連結目標 */
  href: string
  /** 連結文字 */
  text: string
  /** 所在行號 */
  line: number
}
