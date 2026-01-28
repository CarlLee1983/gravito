title: Pulsar Architecture 技術架構規格書
# Pulsar Architecture 技術架構規格書 (v3.0.1)

本文件詳述 `@gravito/pulsar` 的內部架構、Session 生命週期管理以及安全防護機制。

---

## 1. 核心哲學：Stateful over Stateless

Pulsar 旨在為無狀態的 HTTP 協議提供一個安全、高效的狀態管理層。
- **Inertia-Ready**：深度整合 Inertia.js 所需的 Flash Data 模式。
- **Security-First**：預設啟用 CSRF 防護與 HTTP-Only Cookie。
- **Driver-Agnostic**：透過統一的 `SessionStore` 介面，支援從記憶體到 Redis 的無縫切換。

---

## 2. 模組組件分析

### 2.1 SessionService (Proxy Object)
- **職責**：提供開發者友善的 API (`get`, `put`, `flash`)，並追蹤狀態變更 (Dirty Checking)。
- **位置**：`src/index.ts` -> `session` object
- **機制**：
  - 每個請求創建一個獨立的 Session 物件。
  - **Flash Data (Implemented)**：支援 `flash()`, `getFlash()`, `reflash()`, `keep()`，用於跨請求的一次性數據傳遞。
  - **Dot Notation**：支援 `session.put('user.profile.name', 'Carl')` 的巢狀存取，並內建 Prototype Pollution 防護。
  - **Lazy Save**：僅在 `dirty` 標記為真或達到 `touchInterval` 時才寫回存儲。

### 2.2 Flash Data Lifecycle
- **職責**：管理跨請求的一次性訊息。
- **位置**：`src/types.ts` (`SessionRecord.flash`) 與 `src/index.ts`
- **演算法** (Two-Phase Rotation - Implemented)：
  1. **Request Start**：將 `next` 移至 `now` (使上個請求的 Flash 可讀)，清空 `next`。
  2. **During Request**：`flash()` 寫入 `next`，`getFlash()` 讀取 `now`。
  3. **Request End**：`now` 被丟棄，`next` 被持久化。

### 2.3 CSRF Service
- **職責**：生成與驗證防偽標記。
- **位置**：`src/index.ts`
- **驗證邏輯**：
  - 針對非 GET/HEAD/OPTIONS 請求。
  - 比對 Header (`X-XSRF-TOKEN`) 或 Cookie (`XSRF-TOKEN`) 中的 Token 與 Session 中的 `_csrf` 值。
  - 使用 `safeEquals` 防止時序攻擊 (Timing Attack)。

### 2.4 Drivers
- **職責**：實作 `SessionStore` 介面。
- **內建**：
  - `RedisSessionStore`: 基於 TTL 的自動過期，適合生產環境。
  - `FileSessionStore`: 基於 JSON 檔案，適合單機/開發。
  - `MemorySessionStore`: 基於 LRU Map，適合測試。

---

## 3. 技術規格與設計決策

### 3.1 Session ID 安全性
- **生成**：使用 `crypto.randomBytes(32)` 生成高熵 Token。
- **Rotation**：`regenerate()` 會更換 ID 但保留資料，防止 Session Fixation 攻擊。
- **Cookie**：預設 `HttpOnly`, `SameSite=Lax`，防止 XSS 竊取 Session ID。

### 3.2 效能優化：Touch Interval
頻繁寫入 Session (例如每個請求都更新 `lastActivityAt`) 會造成 Redis 負載過高。
- **策略**：引入 `touchIntervalSeconds` (預設 60s)。
- **效果**：若 Session 資料未變更且距離上次更新小於 60 秒，則跳過寫入操作。這將 Session I/O 降低了 90% 以上 (對於靜態資源或頻繁輪詢的場景)。

### 3.3 依賴注入 (Inertia Compatibility)
Pulsar 自動處理了 Inertia 請求的特殊邏輯：
- 當 CSRF 驗證失敗且為 Inertia 請求時，自動回傳 `409 Conflict` (或 Redirect Back) 並 Flash 錯誤訊息，而非直接 403，讓前端能優雅處理 Session 過期。

---

## 4. 潛在風險與效能評估

### 4.1 Race Condition (並發寫入)
由於 Session 是「讀-修-寫」模型，若同一用戶發起兩個並發請求：
1. Req A 讀取 Session V1。
2. Req B 讀取 Session V1。
3. Req A 寫入 Session V2。
4. Req B 寫入 Session V3 (覆蓋了 A 的變更)。
- **緩解**：Pulsar 尚未實作樂觀鎖 (Optimistic Locking)。對於高度依賴 Session 一致性的場景 (如購物車)，建議使用原子操作的資料庫或 Redis Hash。

### 4.2 Cookie 大小限制
Flash Data 儲存在伺服器端，但 Session ID 儲存在 Cookie。
- **限制**：Session ID 本身很小，但若未正確設定 Domain，可能會在子網域間造成 Cookie 衝突或溢出。

---

## 5. 後續優化建議

### 短期 (v1.1)
1. **Cookie Session Driver**：新增將加密後的 Session Data 直接存儲在 Cookie 的 Driver (類似 Laravel `cookie` driver)，適合無狀態架構。
2. **SameSite 配置**：支援 `Strict` 模式的動態切換。

### 中期 (v1.2)
1. **Locking Mechanism**：引入 `atomic` 選項，利用 Redis 分布式鎖防止 Session Race Condition。

### 長期 (v2.0)
1. **Session Tagging**：支援 `session.tag('user:123').invalidate()`，實現基於標籤的批量 Session 清除 (如強制用戶登出)。

---
*Created by Gravito Architect.*
