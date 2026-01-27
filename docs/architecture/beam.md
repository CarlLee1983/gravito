# 🌌 Beam Architecture 技術架構規格書 (v1.0)

本文件詳述 `@gravito/beam` 的內部架構、型別推斷機制以及零運行時開銷 (Zero Runtime Overhead) 的設計策略。

---

## 1. 核心哲學：Lightweight & Type-Safe

`@gravito/beam` 是專為 Gravito 生態系設計的輕量級 RPC 客戶端。它的核心目標是提供類似 tRPC 的開發體驗，但完全基於標準的 Web Fetch API 與 TypeScript 推斷，無需額外的程式碼生成步驟。

### 核心原則
- **Zero Runtime Overhead**：在預設情況下，它只是 `@gravito/photon/client` 的型別封裝，無任何額外邏輯。
- **Type Inference**：直接從後端 `Photon` 實例推斷型別，實現前後端型別同步。
- **Progressive Enhancement**：僅在需要進階功能（如攔截器、重試）時才引入額外的 Fetch Wrapper。

---

## 2. 模組組件分析

### 2.1 Factory (Entrypoint)
- **職責**：建立客戶端實例，並根據配置決定是否啟用增強模式。
- **位置**：`src/index.ts`
- **關鍵邏輯**：
  ```typescript
  export function createBeam(baseUrl, options) {
    // Fast Path: 若無進階選項，直接返回原生客戶端 (零開銷)
    if (!options?.timeout && !options?.retry && ...) {
      return beamClient(baseUrl, options)
    }
    // Slow Path: 啟用增強型 Fetch
    return beamClient(baseUrl, { ...options, fetch: createEnhancedFetch(options) })
  }
  ```

### 2.2 Middleware Pipeline (Enhanced Fetch)
- **職責**：處理逾時、重試、攔截器與標頭解析。
- **位置**：`src/index.ts` -> `createEnhancedFetch`
- **執行順序**：
  1. **Header Resolution**：解析動態標頭（支援 Async Function）。
  2. **OnRequest**：請求前攔截器。
  3. **Fetch Execution**：執行實際請求（封裝了 Timeout）。
  4. **Retry Logic**：若失敗則根據策略進行指數退避重試。
  5. **OnResponse**：回應後攔截器。
  6. **OnError**：錯誤處理攔截器（注意：錯誤仍會被拋出）。

### 2.3 Error System
- **職責**：提供結構化的錯誤類型，便於前端捕捉與處理。
- **位置**：`src/errors.ts`
- **類別層次**：
  - `BeamError` (Base)
    - `BeamNetworkError` (網路層級錯誤，如 DNS 失敗)
    - `BeamTimeoutError` (請求逾時)
    - `BeamHttpError` (HTTP 4xx/5xx)

---

## 3. 技術規格與設計決策

### 3.1 為什麼選擇 Type-Only Import？
Beam 鼓勵使用 `import type { AppType }` 引入後端定義。
- **優點**：確保前端 Bundle 完全不包含後端程式碼，僅在編譯時使用型別資訊。
- **實作**：`createBeam<T>` 的泛型 `T` 接受 `Photon` 實例類型，透過 TypeScript 的 `Infer` 機制自動展開路由結構。

### 3.2 Fast Path 優化策略
為了確保極致效能，Beam 採用了「條件式封裝」策略。
- **決策**：大多數簡單請求不需要攔截器或重試邏輯。
- **效果**：在未啟用進階選項時，Beam 的運行時開銷為 **0ms**（完全等同於直接呼叫 `hc`）。
- **權衡**：這增加了 `createBeam` 函數的複雜度，但換取了更好的預設效能。

### 3.3 動態標頭解析 (Dynamic Headers)
為了支援現代 Auth 流程（如短效 Token 自動刷新），`headers` 選項支援異步函數。
- **設計**：`() => Promise<Record<string, string>>`
- **場景**：在發送請求前，前端可檢查 Token 是否過期並自動刷新，確保請求帶上最新的 Token。

---

## 4. 潛在風險與效能評估

### 4.1 型別推斷效能 (TypeScript Performance)
對於擁有數千個路由的超大型應用，TypeScript 的型別推斷可能會變慢。
- **風險**：`AppType` 是一個極度複雜的遞迴型別。
- **緩解**：建議使用 `AppRoutes` 模式，將路由模組化 (`app.route()`)，降低單一型別的深度與廣度。

### 4.2 記憶體洩漏風險 (Intercept Chaining)
若 `onRequest` 或 `onResponse` 攔截器中包含閉包引用大型物件且未釋放，可能導致記憶體洩漏。
- **評估**：Beam 本身無狀態，但使用者的攔截器實作需謹慎。

### 4.3 重試風暴 (Retry Storm)
內建的重試機制若配置不當（如所有客戶端同時重試），可能導致後端雪崩。
- **防護**：預設採用指數退避 (Exponential Backoff)，且預設僅重試 0 次。建議使用者設定合理的 `jitter`（目前尚未內建 Jitter，為優化點）。

---

## 5. 後續優化建議

### 短期 (v1.1)
1. **新增 Jitter 支援**：在重試邏輯中加入隨機抖動，避免驚群效應 (Thundering Herd)。
2. **支援 AbortSignal**：雖然 `fetch` 支援，但可將其整合至 `BeamOptions` 以便於統一管理取消邏輯。

### 中期 (v1.2)
1. **請求去重 (Deduplication)**：針對相同的 GET 請求，在 Promise 尚未解決前共用同一個請求，減少網路流量。

### 長期 (v2.0)
1. **React Server Actions 整合**：探索與 Next.js Server Actions 的深度整合，提供更加無縫的 SSR 資料獲取體驗。

---
*Created by Gravito Architect.*
