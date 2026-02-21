# @gravito/core 深度架構分析與優化執行計劃

> **日期**: 2026-02-21  
> **範圍**: `packages/core/src/engine` (`MinimalContext`, `AOTRouter`, `Application`)  
> **目的**: 進行程式碼審查 (Code Review)，揭示潛在風險，並進一步完善現有的效能優化執行計劃。

## 1. 模組概覽

`@gravito/core` 是整個 Gravito 框架的心臟，負責處理 HTTP 請求的生命週期、路由分發以及依賴注入 (IoC Container) 管理。架構上採用了**雙執行路徑設計**：
1. **Gravito Engine (原生高效能引擎)**：包含 `MinimalContext`, `FastContext`, `AOTRouter`，專為 Bun 運行環境進行了極致的記憶體與效能最佳化。
2. **PhotonAdapter (Hono/Photon 相容層)**：透過 Proxy 實現對 Hono 生態系的兼容。

本次深潛分析聚焦於原生引擎層的核心執行元件，特別是 `MinimalContext` 與路由層面。

## 2. 技術規格與資料流向

### 2.1 請求處理流向 (Request Flow)
1. **接收請求**: Bun 原生伺服器接收到 `Request` 物件。
2. **路由匹配**: `AOTRouter` 首先進行 `O(1)` 的 Map 查找（針對靜態路由），若未命中則降級至 `RadixRouter`（針對動態路由）。
3. **上下文綁定**: 初始化 `MinimalContext` 或從 `ObjectPool` 獲取池化的 `FastContext`，並將請求資料（Params, Headers）包裹。
4. **中間件執行**: 收集對應路徑的 Middleware 並依照順序執行。有待優化的防線在於中間件鏈 (Middleware Chain) 目前仍是在運行時動態生成與遍歷。
5. **回應生成**: 回傳封裝過的 `Response` 給 Bun。

### 2.2 核心介面 (MinimalContext 定義)
```typescript
class MinimalRequest implements FastRequest {
  private _searchParams: URLSearchParams | null = null;
  // 延遲初始化參數解析
  private getSearchParams(): URLSearchParams { ... }
}

export class MinimalContext implements IFastContext {
  public readonly req: MinimalRequest;
  private _resHeaders: Record<string, string> = {};
  private _requestScope: RequestScopeManager;
}
```

## 3. 關鍵設計決策

1. **捨棄 MinimalContext 的物件池化 (Object Pooling)**: 
   - **決策**: 對於簡單和靜態的請求，建立輕量物件的開銷低於查詢與重置 Object Pool 的開銷。因此 `MinimalContext` 設計上不支援 `init` 與 `reset`。
   - **優勢**: 避免池化時遺漏狀態重置所導致的跨請求污染。
   - **劣勢**: 在非常高併發 (High RPS) 下，物件建立的 Garbage Collection (GC) 壓力仍然會增加。但在無需 Middleware 的純靜態路由情境下，這是合理的 Trade-off。
2. **Hono 相容性的 Proxy 隔離**:
   - **決策**: 原生引擎中完全不使用 `Proxy`，只有在 `PhotonAdapter` 才啟用 `Proxy` 代理屬性存取。
   - **優勢**: 核心引擎的屬性存取開銷降到最低 (避免 V8 / JavaScriptCore 引擎中無法優化 Proxy 的問題)。

## 4. 效能、潛在風險與程式碼審查 (Code Review)

### ⚠️ 發現 1: `MinimalContext` 中的多次 `queries()` 解析效能瓶頸
- **位置**: `MinimalContext.ts:78` (`MinimalRequest.queries()`)
- **風險描述 (效能與記憶體開銷)**: `queries()` 方法內部使用了 `for (const [key, value] of params.entries())` 的迴圈來構造物件。由於 `getSearchParams()` 只負責快取 `URLSearchParams` 實例，若開發者的程式碼多次呼叫 `ctx.req.queries()`，每次都會創建並回傳一個全新的 `Record<string, string | string[]>` 物件，造成記憶體浪費與 CPU 開銷。
- **修正建議**: 應該將 `result` 進行快取 (Cache)，類似於 `_searchParams` 的作法。

### ⚠️ 發現 2: 請求體 (Body) 重複讀取引發的崩潰 (Body already read)
- **位置**: `MinimalContext.ts:106-116` (`json()`, `text()`, `formData()`)
- **風險描述 (邊際案例)**: `_request.json()` 或 `.text()` 都是直接呼叫底層的 Request 物件方法。若是 Middleware 中讀取了一次 body，後續的 Handler 再度讀取就會拋出 `TypeError: Body has already been consumed` 錯誤。
- **修正建議**: `FastContext`/`MinimalContext` 內部應紀錄 `_body` 的解析結果，若已解析則直接回傳記憶體中的快取，防範中間件讀取後造成後續崩潰。

### ⚠️ 發現 3: `MinimalContext` 的回應 Header 存在不必要的記憶體配分配 (Memory Allocation)
- **位置**: `MinimalContext.ts:151` (`getHeaders`)
- **風險描述**: `return { ...this._resHeaders, 'Content-Type': contentType }` 每次呼叫回應輔助函數 (`json()`, `text()`) 時，都會進行一次 Object Spread 複製。在高吞吐量下會產生大量的短命物件。
- **修正建議**: 直接在內部維護單一物件，返回時直接將預設的 Content-Type 補上即可。

## 5. 後續優化執行計劃 (完善現有計劃)

為了進一步強化 `/optimization-plan` 目錄中的執行步驟，強烈建議在原有計劃基礎上，將以下項目加入優先級列表：

| 優先級 | 新增/修改優化項目 | 說明與具體行動 |
|-------|---------|---------|
| **P1** | **Body Payload 快取機制** | 防止 Request Body Read-Twice 崩潰。在 `MinimalRequest` 實作對 `.json()`, `.text()` 的 Promise 快取。 |
| **P2** | `MinimalContext` 的 Query String 物件快取 | 修改 `queries()` 方法，將轉換出的 Record 快取在類別實例屬性上，避免相同請求多次解析。 |
| **P2** | **AOTRouter 中間件結果快取機制深化** | `AOTRouter.collectMiddleware` 每次都要比對 Pattern。應將 `path -> middleware[]` 結果建立一個有限大小的 LRU 快取，讓同一個 URL 第二次造訪時的 Middleware 蒐集時間降至 `O(1)`。 |
| **P3** | **Allocator 零複製 Object Spread** | 消除 `getHeaders()` 裡頭那種會觸發 Shallow Copy 的展開運算子，改為直接操作 Headers 變數本身以通過嚴苛基準測試。 |

## 6. 結論

目前模組已具有高度的效能量能，並且架構非常清晰地分離了雙執行路徑。針對現有缺陷進行上述記憶體分配與多次解析的打擊防堵後，框架整體的穩定性及高併發吞吐量能夠穩健達成預期提升 30%-50% 的目標。此份文件可作為開發者接下來實作 Phase 2 與 Phase 7（微優化）的強力指南。
