# Phase 18: Foundation Orbit Migration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 18-foundation-orbit-migration
**Areas discussed:** Migration Order & Strategy, ResiliencePolicy Configuration, Photon CB Integration, Shutdown Handler Design

---

## Migration Order & Strategy

### Q1: Migration order

| Option | Description | Selected |
|--------|-------------|----------|
| plasma -> signal -> photon -> atlas (推薦) | 由簡至繁：plasma 最簡單（已有 shutdown、單一 RedisError）→ signal（已有 error codes）→ photon（CB 整合）→ atlas（最複雜，6+ error classes） | ✓ |
| atlas 先（最高風險先行） | 先處理最難的部分，確保模式正確再推廣到簡單的包 | |
| 平行遷移（每包一個 plan） | 四個包同時開始，各自獨立的 plan。速度最快但模式可能不一致 | |

**User's choice:** plasma -> signal -> photon -> atlas (推薦)

### Q2: Error class 轉換策略

| Option | Description | Selected |
|--------|-------------|----------|
| 重新繼承 + 保留工廠方法 (推薦) | 每個 Error class 改為 extends DatabaseException 等，保留原有 factory methods 和屬性。舊名稱保留為 deprecated re-export | ✓ |
| 全新替代（破壞性） | 刪除舊 Error classes，全部用 DatabaseException + ErrorCodes 替代 | |
| 雙軌過渡 | 新舊並存一個版本 | |

**User's choice:** 重新繼承 + 保留工廠方法 (推薦)

### Q3: 驗證策略

| Option | Description | Selected |
|--------|-------------|----------|
| 逐包驗證 (推薦) | 每完成一個包：typecheck + test + contract test 全過才進入下一包 | ✓ |
| 批次驗證 | 先全部遷移再統一執行 typecheck + test | |

**User's choice:** 逐包驗證 (推薦)

---

## ResiliencePolicy Configuration

### Q4: 預設 ResiliencePolicy 參數

| Option | Description | Selected |
|--------|-------------|----------|
| 採用建議預設值 (推薦) | atlas: retry 3x + CB 5/30s + 5000ms; plasma: CB 3/15s + 2000ms; signal: retry 3x + 10000ms; photon: CB 10/60s | ✓ |
| 更保守的預設 | 降低 retry 次數和 CB threshold，更快 fail | |
| 讓 Claude 決定具體數字 | 原則確定，具體參數由 Claude 根據最佳實踐決定 | |

**User's choice:** 採用建議預設值 (推薦)

### Q5: 現有 retry 邏輯衝突

| Option | Description | Selected |
|--------|-------------|----------|
| 替換為 withRetry (推薦) | 移除各包自訂 retry 邏輯，統一用 @gravito/resilience 的 withRetry | ✓ |
| 保留現有 + 加層 | 保留各包 retry 作為內部實作，外層再用 withResilience 包裝 | |
| 保留但標記 deprecated | 現有 retry 保留但加 @deprecated，並行提供 withRetry 新路徑 | |

**User's choice:** 替換為 withRetry (推薦)

---

## Photon CB Integration

### Q6: CB middleware 整合方式

| Option | Description | Selected |
|--------|-------------|----------|
| 換底層保介面 (推薦) | middleware 公開 API 不變，內部改用 @gravito/resilience CB | ✓ |
| 完全替換為 withResilience | 移除 circuit-breaker middleware，改用 withResilience() 在 handler 層級接入 | |
| 保留兩套 | 現有 middleware CB 保留作為 HTTP 層 CB，resilience CB 用於 I/O 層 | |

**User's choice:** 換底層保介面 (推薦)

### Q7: CB open 時 HTTP 回應

| Option | Description | Selected |
|--------|-------------|----------|
| 503 Service Unavailable (推薦) | CB open = 後端服務暫時不可用。加 Retry-After header | ✓ |
| 429 Too Many Requests | 強調「請稍後重試」語義 | |
| 依錯誤類型決定 | DB CB open → 503，Redis CB open → 503，外部 API CB open → 502 | |

**User's choice:** 503 Service Unavailable (推薦)

---

## Shutdown Handler Design

### Q8: Shutdown deadline 機制

| Option | Description | Selected |
|--------|-------------|----------|
| 統一 deadline + 優雅降級 (推薦) | 每個 Orbit 註冊帶 deadline 的 shutdown handler。順序：photon(2s) → signal(5s) → plasma(3s) → atlas(5s)。全局 10s 超時 | ✓ |
| 簡單版（無 deadline） | 僅註冊 core:shutdown hook，無超時機制 | |
| Claude 決定細節 | 原則確定（每包都要 shutdown hook + deadline），具體數字由 Claude 決定 | |

**User's choice:** 統一 deadline + 優雅降級 (推薦)

---

## Claude's Discretion

- Exact ErrorCodes namespace values per package
- Internal module organization within each package's error files
- Shutdown handler implementation details (Promise.race vs AbortController)
- How to handle plasma `retryWithBackoff()` removal
- Contract test structure per package

## Deferred Ideas

None — discussion stayed within phase scope.
