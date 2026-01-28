/**
 * 文檔驗證系統 - 語法驗證器
 *
 * 使用 TypeScript Compiler API 驗證程式碼區塊的語法正確性
 */

import ts from 'typescript'
import type { ValidationError } from './types'
import { extractCodeBlocks } from './utils'

// ============================================================================
// 設定
// ============================================================================

/**
 * 支援語法驗證的程式語言
 */
const SUPPORTED_LANGUAGES = new Set(['typescript', 'ts', 'javascript', 'js', 'jsx', 'tsx'])

/**
 * TypeScript 編譯選項
 */
const COMPILER_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  jsx: ts.JsxEmit.React,
  noEmit: true,
  strict: false, // 文檔範例不需要嚴格型別檢查
  skipLibCheck: true,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
}

// ============================================================================
// 驗證函數
// ============================================================================

/**
 * 驗證文檔中的 TypeScript/JavaScript 程式碼語法
 *
 * @param file 文檔檔案路徑
 * @param content Markdown 內容
 * @returns 驗證錯誤陣列
 */
export async function validateSyntax(_file: string, content: string): Promise<ValidationError[]> {
  const errors: ValidationError[] = []
  const codeBlocks = extractCodeBlocks(content)

  for (const block of codeBlocks) {
    // 只驗證支援的程式語言
    if (!SUPPORTED_LANGUAGES.has(block.language.toLowerCase())) {
      continue
    }

    // 使用 TypeScript Compiler API 驗證語法
    const result = ts.transpileModule(block.code, {
      compilerOptions: COMPILER_OPTIONS,
      reportDiagnostics: true,
    })

    // 處理診斷訊息
    if (result.diagnostics && result.diagnostics.length > 0) {
      const sourceFile = ts.createSourceFile('temp.ts', block.code, ts.ScriptTarget.ESNext, true)

      for (const diagnostic of result.diagnostics) {
        // 計算錯誤在原始文檔中的行號
        const lineInBlock =
          diagnostic.start !== undefined
            ? ts.getLineAndCharacterOfPosition(sourceFile, diagnostic.start).line
            : 0
        const lineInDoc = block.startLine + lineInBlock + 1 // +1 因為程式碼區塊開始標記

        // 提取錯誤訊息
        const message =
          typeof diagnostic.messageText === 'string'
            ? diagnostic.messageText
            : ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')

        // 判斷嚴重程度
        const severity = diagnostic.category === ts.DiagnosticCategory.Error ? 'error' : 'warning'

        errors.push({
          type: 'syntax',
          line: lineInDoc,
          message: `語法錯誤: ${message}`,
          severity,
        })
      }
    }
  }

  return errors
}

/**
 * 檢查程式碼是否包含常見的問題模式
 *
 * @param code 程式碼內容
 * @param startLine 起始行號
 * @returns 驗證錯誤陣列
 */
export function checkCodePatterns(code: string, startLine: number): ValidationError[] {
  const errors: ValidationError[] = []
  const lines = code.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNumber = startLine + i + 1

    // 檢查未完成的程式碼（常見於文檔範例）
    if (line.trim().endsWith('...') && !line.includes('//')) {
      errors.push({
        type: 'syntax',
        line: lineNumber,
        message: '程式碼看起來不完整（以 ... 結尾）',
        severity: 'warning',
      })
    }

    // 檢查常見的 TODO 或 FIXME 註解
    if (line.includes('TODO') || line.includes('FIXME')) {
      errors.push({
        type: 'syntax',
        line: lineNumber,
        message: '程式碼包含 TODO/FIXME 註解',
        severity: 'warning',
      })
    }
  }

  return errors
}
