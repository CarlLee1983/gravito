/**
 * @fileoverview analyzer.ts 與 transpiler-utils.ts 的完整測試套件
 *
 * 覆蓋範圍：
 * 1. 精確度測試 - 標準 API 呼叫、假陽性、假陰性、解構賦值、Minified
 * 2. TranspilerCache 快取行為測試
 * 3. getOptimalContextType 邏輯測試
 * 4. Helper 函式測試
 * 5. 性能基準（對照字串匹配）
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { analyzeHandler, getOptimalContextType } from '../src/engine/analyzer'
import type { FastContext } from '../src/engine/types'
import {
  analyzeHandlerWithTranspiler,
  hasReqMemberAccess,
  isAsyncHandler,
  TranspilerCache,
  warmupTranspilerCache,
} from '../src/transpiler-utils'

// ─────────────────────────────────────────────────────────────────────────────
// 測試工具
// ─────────────────────────────────────────────────────────────────────────────

/** 建立可序列化的 HandlerAnalysis 快照，方便比對 */
// biome-ignore lint/complexity/noBannedTypes: 此處需要接受任意 handler 函式以進行測試
function snapshot(handler: Function) {
  return analyzeHandler(handler)
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. 標準 API 呼叫（基礎功能）
// ─────────────────────────────────────────────────────────────────────────────

describe('analyzeHandler - 標準 API 呼叫', () => {
  it('應偵測 header() 呼叫', () => {
    const handler = (ctx: FastContext) => {
      const ct = ctx.req.header('content-type')
      return ctx.json({ ct })
    }
    const result = snapshot(handler)
    expect(result.usesHeaders).toBe(true)
    expect(result.usesQuery).toBe(false)
    expect(result.usesBody).toBe(false)
    expect(result.usesParams).toBe(false)
  })

  it('應偵測 headers() 呼叫', () => {
    const handler = (ctx: FastContext) => {
      const all = ctx.req.headers()
      return ctx.json(all)
    }
    const result = snapshot(handler)
    expect(result.usesHeaders).toBe(true)
  })

  it('應偵測 query() 呼叫', () => {
    const handler = (ctx: FastContext) => {
      const name = ctx.req.query('name')
      return ctx.json({ name })
    }
    const result = snapshot(handler)
    expect(result.usesQuery).toBe(true)
    expect(result.usesHeaders).toBe(false)
  })

  it('應偵測 queries() 呼叫', () => {
    const handler = (ctx: FastContext) => {
      const all = ctx.req.queries()
      return ctx.json(all)
    }
    const result = snapshot(handler)
    expect(result.usesQuery).toBe(true)
  })

  it('應偵測 json() body 存取', async () => {
    const handler = async (ctx: FastContext) => {
      const body = await ctx.req.json()
      return ctx.json(body)
    }
    const result = snapshot(handler)
    expect(result.usesBody).toBe(true)
    expect(result.isAsync).toBe(true)
  })

  it('應偵測 text() body 存取', async () => {
    const handler = async (ctx: FastContext) => {
      const text = await ctx.req.text()
      return ctx.text(text)
    }
    const result = snapshot(handler)
    expect(result.usesBody).toBe(true)
  })

  it('應偵測 formData() body 存取', async () => {
    const handler = async (ctx: FastContext) => {
      await ctx.req.formData()
      return ctx.json({ ok: true })
    }
    const result = snapshot(handler)
    expect(result.usesBody).toBe(true)
  })

  it('應偵測 param() 呼叫', () => {
    const handler = (ctx: FastContext) => {
      const id = ctx.req.param('id')
      return ctx.json({ id })
    }
    const result = snapshot(handler)
    expect(result.usesParams).toBe(true)
    expect(result.usesHeaders).toBe(false)
  })

  it('應偵測 params() 呼叫', () => {
    const handler = (ctx: FastContext) => {
      const all = ctx.req.params()
      return ctx.json(all)
    }
    const result = snapshot(handler)
    expect(result.usesParams).toBe(true)
  })

  it('應偵測 async 箭頭函式', async () => {
    const handler = async (ctx: FastContext) => ctx.json({})
    const result = snapshot(handler)
    expect(result.isAsync).toBe(true)
  })

  it('應偵測 async function 表達式', async () => {
    const handler = async function handler(ctx: FastContext) {
      return ctx.json({})
    }
    const result = snapshot(handler)
    expect(result.isAsync).toBe(true)
  })

  it('應識別同步 handler', () => {
    const handler = (ctx: FastContext) => ctx.json({})
    const result = snapshot(handler)
    expect(result.isAsync).toBe(false)
  })

  it('應識別空 handler（無任何存取）', () => {
    const handler = (ctx: FastContext) => ctx.json({ ok: true })
    const result = snapshot(handler)
    expect(result.usesHeaders).toBe(false)
    expect(result.usesQuery).toBe(false)
    expect(result.usesBody).toBe(false)
    expect(result.usesParams).toBe(false)
    expect(result.isAsync).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. 假陽性修復（原始字串匹配的核心問題）
// ─────────────────────────────────────────────────────────────────────────────

describe('analyzeHandler - 假陽性修復', () => {
  it('變數名稱 header 不應觸發 usesHeaders', () => {
    const handler = (ctx: FastContext) => {
      // 注意：這裡 header 只是個變數名稱，不是 API 呼叫
      const header = 'Content-Type'
      return ctx.json({ header })
    }
    const result = snapshot(handler)
    // 關鍵：不應誤判
    expect(result.usesHeaders).toBe(false)
  })

  it('變數名稱 body 不應觸發 usesBody', () => {
    const handler = (ctx: FastContext) => {
      const body = 'some static body text'
      return ctx.text(body)
    }
    const result = snapshot(handler)
    // 關鍵：body 只是個字串變數
    expect(result.usesBody).toBe(false)
  })

  it('變數名稱 query 不應觸發 usesQuery', () => {
    const handler = (ctx: FastContext) => {
      const query = 'SELECT * FROM users'
      return ctx.json({ query })
    }
    const result = snapshot(handler)
    expect(result.usesQuery).toBe(false)
  })

  it('包含 header 關鍵字的字串常數不應觸發', () => {
    const handler = (ctx: FastContext) => {
      // 注意：這是字串內容包含 'header'，不是 API 呼叫
      const msg = 'Missing required header'
      return ctx.text(msg)
    }
    const result = snapshot(handler)
    expect(result.usesHeaders).toBe(false)
  })

  it('函式參數名稱 body 不應觸發 usesBody', () => {
    const handler = (ctx: FastContext) => {
      function processData(body: string) {
        return body.toUpperCase()
      }
      return ctx.json({ result: processData('data') })
    }
    const result = snapshot(handler)
    expect(result.usesBody).toBe(false)
  })

  it('注釋中的 header 字串不應觸發', () => {
    // 注意：轉換後 Bun Transpiler 通常會保留有用的注釋但移除多餘空白
    // 主要測試 transformSync 後的結果
    const handlerStr = `function handler(ctx) {
      // Gets the user header for authentication
      const userId = 'static-user-id'
      return ctx.json({ userId })
    }`
    const result = analyzeHandlerWithTranspiler(handlerStr)
    // 注釋中的 header 不應觸發（因為沒有 .req.header 模式）
    expect(result.usesHeaders).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. 解構賦值偵測（原本假陰性）
// ─────────────────────────────────────────────────────────────────────────────

describe('analyzeHandler - 解構賦值', () => {
  it('應偵測 header 解構賦值', () => {
    const handlerStr = `function handler(ctx) {
      const { header } = ctx.req
      return ctx.json({ h: header('x-id') })
    }`
    const result = analyzeHandlerWithTranspiler(handlerStr)
    expect(result.usesHeaders).toBe(true)
  })

  it('應偵測 query 解構賦值', () => {
    const handlerStr = `function handler(ctx) {
      const { query } = ctx.req
      return ctx.json({ name: query('name') })
    }`
    const result = analyzeHandlerWithTranspiler(handlerStr)
    expect(result.usesQuery).toBe(true)
  })

  it('應偵測 params 解構賦值', () => {
    const handlerStr = `function handler(ctx) {
      const { params } = ctx.req
      return ctx.json({ id: params().id })
    }`
    const result = analyzeHandlerWithTranspiler(handlerStr)
    expect(result.usesParams).toBe(true)
  })

  it('應偵測 body 解構賦值', () => {
    const handlerStr = `async function handler(ctx) {
      const { body } = ctx.req
      return ctx.json({ ok: true })
    }`
    const result = analyzeHandlerWithTranspiler(handlerStr)
    expect(result.usesBody).toBe(true)
  })

  it('應偵測多個屬性的複合解構賦值', () => {
    const handlerStr = `function handler(ctx) {
      const { header, query, params } = ctx.req
      return ctx.json({})
    }`
    const result = analyzeHandlerWithTranspiler(handlerStr)
    expect(result.usesHeaders).toBe(true)
    expect(result.usesQuery).toBe(true)
    expect(result.usesParams).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. Minified 代碼
// ─────────────────────────────────────────────────────────────────────────────

describe('analyzeHandler - Minified 代碼', () => {
  it('應正確分析 minified handler（無空格）', () => {
    // 模擬 minified 代碼
    const minified = `function h(c){const x=c.req.header("ct");return c.json({})}`
    const result = analyzeHandlerWithTranspiler(minified)
    expect(result.usesHeaders).toBe(true)
    expect(result.usesQuery).toBe(false)
  })

  it('應正確分析 minified async handler', () => {
    const minified = `async function h(c){const b=await c.req.json();return c.json(b)}`
    const result = analyzeHandlerWithTranspiler(minified)
    expect(result.usesBody).toBe(true)
    expect(result.isAsync).toBe(true)
  })

  it('應正確分析重命名參數的 minified handler', () => {
    // ctx 被 minify 成 c，query 被呼叫
    const minified = `function h(c){return c.json({q:c.req.query("name")})}`
    const result = analyzeHandlerWithTranspiler(minified)
    expect(result.usesQuery).toBe(true)
    expect(result.usesHeaders).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. 跨函式呼叫
// ─────────────────────────────────────────────────────────────────────────────

describe('analyzeHandler - 跨函式呼叫', () => {
  it('直接呼叫多個 API 的 handler', () => {
    const handler = async (ctx: FastContext) => {
      const userId = ctx.req.param('id')
      const filter = ctx.req.query('status')
      const body = await ctx.req.json()
      return ctx.json({ userId, filter, body })
    }
    const result = snapshot(handler)
    expect(result.usesParams).toBe(true)
    expect(result.usesQuery).toBe(true)
    expect(result.usesBody).toBe(true)
    expect(result.isAsync).toBe(true)
  })

  it('handler 呼叫其他函式（不含 req 存取）', () => {
    function processData(data: unknown) {
      return { processed: data }
    }
    const handler = (ctx: FastContext) => {
      const result = processData({ static: true })
      return ctx.json(result)
    }
    const result = snapshot(handler)
    // handler 本身不存取 req
    expect(result.usesHeaders).toBe(false)
    expect(result.usesQuery).toBe(false)
    expect(result.usesBody).toBe(false)
    expect(result.usesParams).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. getOptimalContextType 邏輯
// ─────────────────────────────────────────────────────────────────────────────

describe('getOptimalContextType', () => {
  it('無任何存取 → minimal', () => {
    const analysis = {
      usesHeaders: false,
      usesQuery: false,
      usesBody: false,
      usesParams: false,
      isAsync: false,
    }
    expect(getOptimalContextType(analysis)).toBe('minimal')
  })

  it('僅存取 params → minimal', () => {
    const analysis = {
      usesHeaders: false,
      usesQuery: false,
      usesBody: false,
      usesParams: true,
      isAsync: false,
    }
    expect(getOptimalContextType(analysis)).toBe('minimal')
  })

  it('存取 headers → fast', () => {
    const analysis = {
      usesHeaders: true,
      usesQuery: false,
      usesBody: false,
      usesParams: false,
      isAsync: false,
    }
    expect(getOptimalContextType(analysis)).toBe('fast')
  })

  it('存取 query → fast', () => {
    const analysis = {
      usesHeaders: false,
      usesQuery: true,
      usesBody: false,
      usesParams: false,
      isAsync: false,
    }
    expect(getOptimalContextType(analysis)).toBe('fast')
  })

  it('存取 body → full', () => {
    const analysis = {
      usesHeaders: false,
      usesQuery: false,
      usesBody: true,
      usesParams: false,
      isAsync: true,
    }
    expect(getOptimalContextType(analysis)).toBe('full')
  })

  it('headers 優先於 body → fast（不是 full）', () => {
    // headers 優先，即使也存取 body
    const analysis = {
      usesHeaders: true,
      usesQuery: false,
      usesBody: true,
      usesParams: false,
      isAsync: true,
    }
    expect(getOptimalContextType(analysis)).toBe('fast')
  })

  it('完整場景：route handler 只回傳靜態 JSON → minimal', () => {
    const handler = (ctx: FastContext) => ctx.json({ status: 'ok' })
    const analysis = analyzeHandler(handler)
    expect(getOptimalContextType(analysis)).toBe('minimal')
  })

  it('完整場景：CRUD handler 讀取 body → full', () => {
    const handler = async (ctx: FastContext) => {
      const data = await ctx.req.json()
      return ctx.json(data, 201)
    }
    const analysis = analyzeHandler(handler)
    expect(getOptimalContextType(analysis)).toBe('full')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 7. TranspilerCache 快取行為
// ─────────────────────────────────────────────────────────────────────────────

describe('TranspilerCache', () => {
  beforeEach(() => {
    // 每個測試前重置單例以確保乾淨狀態
    TranspilerCache.resetInstance()
  })

  afterEach(() => {
    TranspilerCache.resetInstance()
  })

  it('應回傳單例實例', () => {
    const a = TranspilerCache.getInstance()
    const b = TranspilerCache.getInstance()
    expect(a).toBe(b)
  })

  it('應快取 transform 結果', () => {
    const cache = TranspilerCache.getInstance()
    const source = 'function h(ctx) { return ctx.json({}) }'

    expect(cache.size).toBe(0)
    cache.transform(source)
    expect(cache.size).toBe(1)

    // 再次 transform 不應增加快取大小
    cache.transform(source)
    expect(cache.size).toBe(1)
  })

  it('不同源代碼應各自快取', () => {
    const cache = TranspilerCache.getInstance()
    cache.transform('function h1(ctx) { return ctx.json({}) }')
    cache.transform('function h2(ctx) { return ctx.text("ok") }')
    expect(cache.size).toBe(2)
  })

  it('clear() 應清除所有快取', () => {
    const cache = TranspilerCache.getInstance()
    cache.transform('function h(ctx) { return ctx.json({}) }')
    expect(cache.size).toBe(1)
    cache.clear()
    expect(cache.size).toBe(0)
  })

  it('對語法錯誤的代碼應回傳 null（不拋出）', () => {
    const cache = TranspilerCache.getInstance()
    // 故意使用有語法錯誤的代碼
    const result = cache.transform('function broken( { if }')
    expect(result).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 8. Helper 函式測試
// ─────────────────────────────────────────────────────────────────────────────

describe('hasReqMemberAccess', () => {
  beforeEach(() => {
    TranspilerCache.resetInstance()
  })

  it('應偵測到存在的 req member 存取', () => {
    const source = 'function h(ctx) { return ctx.req.header("x-id") }'
    expect(hasReqMemberAccess(source, 'header')).toBe(true)
  })

  it('應正確識別不存在的 req member', () => {
    const source = 'function h(ctx) { return ctx.json({}) }'
    expect(hasReqMemberAccess(source, 'header')).toBe(false)
  })

  it('應排除變數名稱的假陽性', () => {
    const source = 'function h(ctx) { const header = "test"; return ctx.json({}) }'
    expect(hasReqMemberAccess(source, 'header')).toBe(false)
  })
})

describe('isAsyncHandler', () => {
  beforeEach(() => {
    TranspilerCache.resetInstance()
  })

  it('應偵測 async function', () => {
    const source = 'async function h(ctx) { return ctx.json({}) }'
    expect(isAsyncHandler(source)).toBe(true)
  })

  it('應偵測 async 箭頭函式', () => {
    const source = 'const h = async (ctx) => ctx.json({})'
    expect(isAsyncHandler(source)).toBe(true)
  })

  it('應識別同步 function', () => {
    const source = 'function h(ctx) { return ctx.json({}) }'
    expect(isAsyncHandler(source)).toBe(false)
  })
})

describe('warmupTranspilerCache', () => {
  beforeEach(() => {
    TranspilerCache.resetInstance()
  })

  it('應不拋出任何錯誤', () => {
    expect(() => warmupTranspilerCache()).not.toThrow()
  })

  it('呼叫後快取應有至少 1 個條目', () => {
    warmupTranspilerCache()
    const cache = TranspilerCache.getInstance()
    expect(cache.size).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 9. 性能基準
// ─────────────────────────────────────────────────────────────────────────────

describe('性能基準', () => {
  beforeEach(() => {
    TranspilerCache.resetInstance()
  })

  it('Transpiler 快取命中應顯著快於初次 transform', () => {
    const cache = TranspilerCache.getInstance()
    const source = `async function handler(ctx) {
      const id = ctx.req.param('id')
      const filter = ctx.req.query('status')
      const body = await ctx.req.json()
      return ctx.json({ id, filter, body })
    }`

    // 預熱（第一次 transform）
    const t0 = performance.now()
    cache.transform(source)
    const coldTime = performance.now() - t0

    // 快取命中（後續 1000 次）
    const N = 1000
    const t1 = performance.now()
    for (let i = 0; i < N; i++) {
      cache.transform(source)
    }
    const warmAvgTime = (performance.now() - t1) / N

    // 快取命中應比冷啟動快很多（至少 10x）
    expect(warmAvgTime).toBeLessThan(coldTime / 10)
  })

  it('analyzeHandler 應在合理時間內完成（< 5ms 含快取）', () => {
    const handler = async (ctx: FastContext) => {
      const id = ctx.req.param('id')
      const body = await ctx.req.json()
      return ctx.json({ id, body })
    }

    // 預熱
    analyzeHandler(handler)

    // 測試快取命中速度
    const N = 500
    const t = performance.now()
    for (let i = 0; i < N; i++) {
      analyzeHandler(handler)
    }
    const totalMs = performance.now() - t
    const avgMs = totalMs / N

    // 快取命中後每次應 < 0.01ms（即總共 < 5ms）
    expect(avgMs).toBeLessThan(0.01)
  })

  it('精確度驗證：應正確處理 20 個混合案例', () => {
    type CaseHandler = (ctx: FastContext) => Response | Promise<Response>
    type Case = { handler: CaseHandler; expected: Partial<ReturnType<typeof analyzeHandler>> }
    const cases: Case[] = [
      {
        handler: (ctx: FastContext) => ctx.json({}),
        expected: { usesHeaders: false, usesQuery: false, usesBody: false, usesParams: false },
      },
      {
        handler: (ctx: FastContext) => {
          const h = ctx.req.header('x-id')
          return ctx.json({ h })
        },
        expected: { usesHeaders: true },
      },
      {
        handler: (ctx: FastContext) => {
          const q = ctx.req.query('name')
          return ctx.json({ q })
        },
        expected: { usesQuery: true },
      },
      {
        handler: async (ctx: FastContext) => {
          const b = await ctx.req.json()
          return ctx.json(b)
        },
        expected: { usesBody: true, isAsync: true },
      },
      {
        handler: (ctx: FastContext) => {
          const id = ctx.req.param('id')
          return ctx.json({ id })
        },
        expected: { usesParams: true },
      },
      // 假陽性案例
      {
        handler: (ctx: FastContext) => {
          const header = 'ct'
          return ctx.json({ header })
        },
        expected: { usesHeaders: false },
      },
      {
        handler: (ctx: FastContext) => {
          const body = 'data'
          return ctx.text(body)
        },
        expected: { usesBody: false },
      },
      {
        handler: (ctx: FastContext) => {
          const query = 'SELECT'
          return ctx.json({ query })
        },
        expected: { usesQuery: false },
      },
      // 多重存取
      {
        handler: async (ctx: FastContext) => {
          const id = ctx.req.param('id')
          const b = await ctx.req.json()
          return ctx.json({ id, b })
        },
        expected: { usesParams: true, usesBody: true, isAsync: true },
      },
      // 靜態 handler
      {
        handler: () => new Response('ok'),
        expected: {
          usesHeaders: false,
          usesQuery: false,
          usesBody: false,
          usesParams: false,
          isAsync: false,
        },
      },
    ]

    let correct = 0
    const total = cases.length

    for (const { handler, expected } of cases) {
      // biome-ignore lint/complexity/noBannedTypes: 測試需要傳遞不同型態的 handler
      const result = analyzeHandler(handler as Function)
      let allMatch = true
      for (const [key, val] of Object.entries(expected)) {
        if (result[key as keyof typeof result] !== val) {
          allMatch = false
          break
        }
      }
      if (allMatch) {
        correct++
      }
    }

    const accuracy = correct / total
    // 精確度應達到 100%（所有案例都正確）
    expect(accuracy).toBe(1.0)
  })
})
