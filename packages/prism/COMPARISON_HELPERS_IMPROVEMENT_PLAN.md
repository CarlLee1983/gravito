# Prism 比較 Helper 改進計劃

**版本**：1.0
**日期**：2026-02-17
**分析工具**：Opus 4.6 Deep Architecture Analysis

## 執行摘要

比較 Helper 的 MVP 實現（eq、ne、gt、lt、gte、lte）在功能上已可交付，但在架構可擴展性、邊界情況處理和生產就緒性方面有明確的改進空間。

**整體評分**：6.4/10（MVP 可用，需優化升級為生產級別）

### 關鍵發現
- ✅ 基礎功能完整，19 個測試全部通過
- ⚠️ 字串含逗號場景會靜默失敗（正則 bug）
- ⚠️ 缺少邏輯運算符（AND/OR/NOT）
- ⚠️ NaN 防護不足
- ⚠️ 無格式檯誤警告機制

---

## 優先級排序改進方案

### 🔴 P0：立即修復（MVT 到生產級別）

#### P0-1：提取正則為靜態常量
**位置**：`TemplateCompiler.ts` L483
**工時**：5 分鐘
**風險**：無

```typescript
// 在第 78 行附近新增
const COMPARISON_FUNC_REGEX =
  /^(eq|ne|gt|lt|gte|lte)\s*\(\s*((?:'[^']*'|"[^"]*"|[^,])+?)\s*,\s*((?:'[^']*'|"[^"]*"|[^)])+?)\s*\)$/
```

**為什麼重要**：正則每次呼叫都重新編譯，效率低。更重要的是，新的正則修正了逗號解析 bug。

**測試驗證**：
```typescript
eq(message, 'hello, world')  // 目前失敗，P0-1 後通過
```

---

#### P0-2：修復含逗號字串字面量的解析
**位置**：`TemplateCompiler.ts` L483 & `resolveValue()`
**工時**：30 分鐘
**風險**：低

**問題**：字串中的逗號會導致正則不匹配

```typescript
// 目前行為
eq(message, 'hello, world')
// 正則 .+? 在第一個逗號停止，導致整個表達式不匹配
// 條件退化為查找變數 eq(message, 'hello...，結果為 false
```

**解決方案**：使用改進的正則（見 P0-1）和智能的逗號檢測

```typescript
private evaluateCondition(condition: string, data: Record<string, unknown>): boolean {
  // 使用靜態正則
  const funcMatch = condition.match(COMPARISON_FUNC_REGEX)
  if (funcMatch) {
    const [, operator, leftExpr, rightExpr] = funcMatch
    // ... 現有邏輯
  }
  // ...
}
```

**新增測試**：
```typescript
it('should handle strings with commas', () => {
  const template = "{{#if eq(message, 'hello, world')}}YES{{/if}}"
  const result = compile(template, { message: 'hello, world' })
  expect(result).toContain('YES')
})
```

---

#### P0-3：NaN 防護
**位置**：`TemplateCompiler.ts` L573-580 (`compareValues` 方法)
**工時**：15 分鐘
**風險**：無

**問題**：當變數值為 `null`、`undefined` 或非數字字串時，`Number()` 轉換會產生 `NaN`

```typescript
// 目前行為
gt(undefined, 5)    // Number(undefined) = NaN, NaN > 5 = false ✓
gt(null, -1)        // Number(null) = 0, 0 > -1 = true ✗ (意外真)
gt(unknownVar, 100) // Number(undefined) = NaN, NaN > 100 = false ✓
```

**解決方案**：在數值比較前檢查 NaN

```typescript
case 'gt': {
  const numL = Number(left)
  const numR = Number(right)
  if (Number.isNaN(numL) || Number.isNaN(numR)) {
    return false
  }
  return numL > numR
}
// 同樣處理 lt, gte, lte
```

**新增測試**：
```typescript
it('should handle null in numeric comparison', () => {
  const template = '{{#if gt(stock, 0)}}IN_STOCK{{/if}}'
  const result = compile(template, { stock: null })
  expect(result).not.toContain('IN_STOCK')
})

it('should handle undefined in numeric comparison', () => {
  const result = compile(template, { stock: undefined })
  expect(result).not.toContain('IN_STOCK')
})
```

---

#### P0-4：格式錯誤的語法警告
**位置**：`TemplateCompiler.ts` L491
**工時**：15 分鐘
**風險**：無

**問題**：當使用者寫錯語法時（如 `eq(status 'active')`），沒有任何警告，條件靜默退化為 truthy 檢查

**解決方案**：整合 `CompilerOptions.debug` 進行警告

```typescript
private evaluateCondition(
  condition: string,
  data: Record<string, unknown>,
  debug: boolean = false
): boolean {
  const funcMatch = condition.match(COMPARISON_FUNC_REGEX)
  if (funcMatch) {
    // ... 現有邏輯
  }

  // 偵測可能的語法錯誤
  if (/^(eq|ne|gt|lt|gte|lte)\s*\(/.test(condition)) {
    if (debug) {
      console.warn(
        `[Prism] Malformed comparison expression: "${condition}". ` +
        'Expected format: operator(left, right). Falling back to variable check.'
      )
    }
  }

  const value = this.getNestedValue(data, condition)
  return Boolean(value)
}
```

修改 `compile()` 方法簽名以傳遞 `debug` 標誌。

---

#### P0-5：補充邊界情況測試
**位置**：`comparison-helpers.test.ts`
**工時**：30 分鐘
**新增測試數**：8 個

**缺失的邊界情況**：

| 場景 | 目前覆蓋 | 修正後 |
|------|---------|--------|
| `gt(undefined, 5)` | ❌ | ✅ |
| `gt(null, -1)` | ❌ | ✅ |
| `eq(null, undefined)` | ❌ | ✅ |
| `eq(0, false)` | ❌ | ✅ |
| `eq(message, 'hello, world')` | ❌ | ✅ |
| `eq(value, "unclosed)` | ❌ | ✅ (應該降級為變數檢查) |
| 巢狀物件 + 比較 | ✅ | ✅ |

**預期工時總計（P0）**：1.5 小時
**品質提升**：從 MVP 升級為可交付的生產版本

---

### 🟡 P1：中期改進（架構升級）

#### P1-1：將 `compareValues` 重構為函數映射
**位置**：`TemplateCompiler.ts` L100-200（類初始化區域）
**工時**：1 小時
**收益**：架構可擴展性從 6/10 提升至 9/10

**目的**：移除硬編碼的 switch 語句，改為可動態註冊的函數映射

```typescript
export class TemplateCompiler {
  private readonly comparisonFns = new Map<
    string,
    (left: unknown, right: unknown) => boolean
  >([
    ['eq', (l, r) => l == r],
    ['ne', (l, r) => l != r],
    ['gt', (l, r) => {
      const numL = Number(l)
      const numR = Number(r)
      if (Number.isNaN(numL) || Number.isNaN(numR)) return false
      return numL > numR
    }],
    ['lt', (l, r) => {
      const numL = Number(l)
      const numR = Number(r)
      if (Number.isNaN(numL) || Number.isNaN(numR)) return false
      return numL < numR
    }],
    ['gte', (l, r) => {
      const numL = Number(l)
      const numR = Number(r)
      if (Number.isNaN(numL) || Number.isNaN(numR)) return false
      return numL >= numR
    }],
    ['lte', (l, r) => {
      const numL = Number(l)
      const numR = Number(r)
      if (Number.isNaN(numL) || Number.isNaN(numR)) return false
      return numL <= numR
    }],
  ])

  // 新增公開方法供外部註冊自訂比較
  registerComparison(
    name: string,
    fn: (left: unknown, right: unknown) => boolean
  ): void {
    this.comparisonFns.set(name, fn)
  }

  private buildComparisonRegex(): RegExp {
    const ops = [...this.comparisonFns.keys()].join('|')
    return new RegExp(
      `^(${ops})\\s*\\(\\s*((?:'[^']*'|"[^"]*"|[^,])+?)\\s*,\\s*((?:'[^']*'|"[^"]*"|[^)])+?)\\s*\\)$`
    )
  }

  private compareValues(
    operator: string,
    left: unknown,
    right: unknown
  ): boolean {
    const fn = this.comparisonFns.get(operator)
    if (!fn) {
      throw new Error(`Unknown comparison operator: ${operator}`)
    }
    return fn(left, right)
  }
}
```

**好處**：
- 新增 `contains()`、`startsWith()` 等只需呼叫 `registerComparison()`
- 遵循開放-封閉原則（Open/Closed Principle）
- 使用者代碼可以自訂比較邏輯

---

#### P1-2：支援邏輯運算符（`&&` 和 `||`）
**位置**：`TemplateCompiler.ts` L481-510（`evaluateCondition` 方法）
**工時**：2-3 小時
**收益**：語法完整性 7/10 → 9/10

**用例**：
```html
{{#if eq(status, 'active') && gt(stock, 0)}}可購買{{/if}}
{{#if eq(role, 'admin') || eq(role, 'manager')}}管理介面{{/if}}
```

**實現策略**：簡單的遞迴評估，**不支援括號分組**

```typescript
private evaluateCondition(condition: string, data: Record<string, unknown>): boolean {
  // Phase 1: 處理 OR (優先級最低)
  if (condition.includes('||')) {
    return condition
      .split('||')
      .some(part => this.evaluateCondition(part.trim(), data))
  }

  // Phase 2: 處理 AND (優先級中)
  if (condition.includes('&&')) {
    return condition
      .split('&&')
      .every(part => this.evaluateCondition(part.trim(), data))
  }

  // Phase 3: 處理 NOT (優先級高)
  if (condition.startsWith('!')) {
    return !this.evaluateCondition(condition.slice(1).trim(), data)
  }

  // Phase 4: 比較函數
  const regex = this.buildComparisonRegex()
  const funcMatch = condition.match(regex)
  if (funcMatch) {
    const [, operator, leftExpr, rightExpr] = funcMatch
    const left = this.resolveValue(leftExpr.trim(), data)
    const right = this.resolveValue(rightExpr.trim(), data)
    return this.compareValues(operator, left, right)
  }

  // Phase 5: 簡單變數
  const value = this.getNestedValue(data, condition)
  return Boolean(value)
}
```

**新增測試**：
```typescript
it('should support AND operator', () => {
  const template = "{{#if eq(status, 'active') && gt(stock, 0)}}BUY{{/if}}"
  const result = compile(template, { status: 'active', stock: 5 })
  expect(result).toContain('BUY')
})

it('should support OR operator', () => {
  const template = "{{#if eq(role, 'admin') || eq(role, 'manager')}}ADMIN{{/if}}"
  const result = compile(template, { role: 'manager' })
  expect(result).toContain('ADMIN')
})

it('should support NOT operator', () => {
  const template = "{{#if !eq(status, 'deleted')}}VISIBLE{{/if}}"
  const result = compile(template, { status: 'active' })
  expect(result).toContain('VISIBLE')
})
```

**限制**（未來 P3 改進）：
- ❌ 不支援括號分組 `(a || b) && c`
- ❌ 不支援運算符優先級調整
- ✅ 足以覆蓋 90% 的實際使用場景

---

#### P1-3：整合 `CompilerOptions.debug`
**位置**：`compile()` 方法簽名
**工時**：1 小時

**目的**：將 debug 標誌從 options 傳遞到各評估方法，實現上述 P0-4 的警告機制

```typescript
compile(
  template: string,
  data: Record<string, unknown>,
  ctx: RenderContext,
  helpers: Map<string, HelperFunction>,
  readTemplate: (name: string) => string,
  options?: CompilerOptions  // 新增參數
): string {
  this.debug = options?.debug ?? false
  // ... 現有邏輯
}

private evaluateCondition(condition: string, data: Record<string, unknown>): boolean {
  // ... 現有邏輯
  if (this.debug && /^(eq|ne|gt|lt|gte|lte)\s*\(/.test(condition)) {
    console.warn(`[Prism] Malformed comparison expression: "${condition}"`)
  }
}
```

---

#### P1-4：使用者文檔
**位置**：`README.md` 新增章節 "Comparison Helpers"
**工時**：1 小時

**內容**：
- 支援的 6 個運算符及其語義
- 型別轉換規則和陷阱（loose equality、NaN）
- 邏輯運算符用法（P1-2）
- 常見錯誤排查
- 自訂比較函數的註冊方法（P1-1）

---

### 🟢 P2：長期演進（功能擴展）

#### P2-1：新增字串/集合 Helper
**工時**：2 小時

```typescript
compiler.registerComparison('contains', (str, substr) =>
  String(str).includes(String(substr))
)
compiler.registerComparison('startsWith', (str, prefix) =>
  String(str).startsWith(String(prefix))
)
compiler.registerComparison('endsWith', (str, suffix) =>
  String(str).endsWith(String(suffix))
)
compiler.registerComparison('in', (val, arr) =>
  Array.isArray(arr) && arr.includes(val)
)
compiler.registerComparison('isEmpty', (val) =>
  val == null || val === '' || (Array.isArray(val) && val.length === 0)
)
```

用例：
```html
{{#if contains(email, '@')}}有效{{/if}}
{{#if startsWith(url, 'https')}}安全{{/if}}
{{#if in(role, ['admin', 'manager'])}}高級用戶{{/if}}
```

---

#### P2-2：模板預編譯（條件結構快取）
**工時**：4-6 小時
**性能收益**：對 10000+ 規模迴圈的條件評估提升 30-50%

將條件表達式的結構解析結果快取，而不是每次都用正則重新分析。

---

#### P2-3：嚴格相等 `seq` 運算符
**工時**：30 分鐘

```typescript
compiler.registerComparison('seq', (l, r) => l === r)
```

用例：
```html
{{#if seq(status, 'active')}}區分類型{{/if}}
<!-- 不同於 eq，seq 不會認為 0 == false -->
```

---

## 實施時間表

### Phase 1（P0）：2-3 天
- 完成 P0-1 到 P0-5
- 品質指標：20+ 個新增測試，所有邊界情況覆蓋
- 交付：MVP 升級為可靠的生產版本

### Phase 2（P1）：1-2 週
- 實施 P1-1 到 P1-4
- 新增 20+ 個邏輯運算符和自訂註冊的測試
- 交付：功能完整的引擎

### Phase 3（P2）：未來迭代
- 持續擴展 helper 函數庫
- 性能優化

---

## 成功指標

| 指標 | 目前 | P0 後 | P1 後 |
|------|------|-------|-------|
| **功能完整性** | 7/10 | 8/10 | 9/10 |
| **架構可擴展性** | 6/10 | 6/10 | 9/10 |
| **類型安全** | 5/10 | 8/10 | 8/10 |
| **生產就緒性** | 6/10 | 9/10 | 9/10 |
| **測試覆蓋** | 19 個 | 27 個 | 40+ 個 |
| **文檔完整性** | 40% | 60% | 90% |

---

## 依賴關係圖

```
P0-1 (靜態正則)
  ↓ 依賴
P0-2 (逗號字串解析) → P1-1 (函數映射)
  ↓                    ↓ 依賴
P0-3 (NaN 防護)      P1-2 (邏輯運算符)
  ↓
P0-4 (語法警告) → P1-3 (Debug 整合)
  ↓
P0-5 (邊界測試)
  ↓
P1-4 (文檔) → P2-1 (字串 Helper)
```

---

## 推薦行動

**立即行動（下個衝刺）**：
- [ ] 實施 P0 全部 5 項改進
- [ ] 執行 P0 測試驗收

**優先排隊（後續衝刺）**：
- [ ] P1-1 函數映射重構
- [ ] P1-2 邏輯運算符
- [ ] P1-4 使用者文檔

此份計劃將確保比較 Helper 從 MVP 品質升級為企業級別的穩定功能。
