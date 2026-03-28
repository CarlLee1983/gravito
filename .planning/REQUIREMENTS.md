# Requirements: Gravito-Core v2.0.0

**Defined:** 2026-03-28
**Core Value:** 穩定可靠的核心基礎設施 — core 及所有 Orbit 包必須具備 production-ready 的錯誤處理與韌性機制

## v2.0.0 Requirements

Requirements for v2.0.0 major release. Each maps to roadmap phases.

### Error Model

- [ ] **ERRM-01**: 所有 Orbit 包的 Error 類別繼承 GravitoException，消除 bare `throw new Error()`
- [ ] **ERRM-02**: 每個 Orbit 包定義結構化錯誤碼命名空間（如 `db.connection_failed`、`redis.timeout`）
- [ ] **ERRM-03**: 所有錯誤正確傳播 cause 欄位，保留完整錯誤鏈

### Resilience Primitives

- [ ] **RESL-01**: 通用 `withRetry<T>()` utility 支援指數退避、jitter、Retryable/Terminal 分類
- [ ] **RESL-02**: 合併 3 個重複的 CircuitBreaker 實作為統一的 `@gravito/resilience` CB
- [ ] **RESL-03**: `withResilience()` 組合 API 正確包裝 retry + CB + timeout

### Orbit Integration

- [ ] **INTG-01**: Circuit breaker 整合至 atlas DB 連線池
- [ ] **INTG-02**: Circuit breaker 整合至 plasma Redis 客戶端
- [ ] **INTG-03**: atlas、plasma、stream、signal、beam 註冊 `core:shutdown` handler 含 deadline
- [ ] **INTG-04**: 所有 Orbit 包向 `@gravito/monitor` 註冊健康檢查
- [ ] **INTG-05**: `OrbitDegradationManager` 在 CB open 時返回 typed fallback 而非拋出錯誤

### Full Migration

- [ ] **MIGR-01**: ~50 個 Orbit 包全量採用新錯誤模型（分批遷移）
- [ ] **MIGR-02**: 所有現有測試適配新錯誤類型（contract tests 先行）

### Release

- [ ] **RELS-01**: 每個被修改的 Orbit 包更新 package.json 版本號（major bump to 2.0.0）

## v2.1.0 Requirements

Deferred to next release. Tracked but not in current roadmap.

### Advanced Resilience

- **ADVR-01**: Request-scoped error context enrichment — 自動 trace ID / user context 傳播
- **ADVR-02**: Per-Orbit error namespace registry — `ErrorRegistry.register(namespace, codes)` for documentation generation
- **ADVR-03**: Idempotency key propagation for HTTP retries — 關鍵用於 commerce/payment 流程

## Out of Scope

| Feature | Reason |
|---------|--------|
| 性能優化 | v1.5.2 optimization roadmap 已規劃，與錯誤處理無關 |
| Satellite 業務邏輯改造 | 本次僅改造 Orbit 層，Satellite 自然受益於統一錯誤模型 |
| Obsidian 文檔庫 | 文檔工作暫緩，優先處理核心穩定性 |
| neverthrow / Effect-TS | 需重寫全部 call sites，不適合 brownfield 50+ 包遷移 |
| 全局 try/catch wrapper | Anti-pattern：靜默吞錯誤，破壞 TypeScript 類型窄化 |
| 單一全局 Circuit Breaker | Anti-pattern：一個慢服務觸發所有服務斷路 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ERRM-01 | TBD | Pending |
| ERRM-02 | TBD | Pending |
| ERRM-03 | TBD | Pending |
| RESL-01 | TBD | Pending |
| RESL-02 | TBD | Pending |
| RESL-03 | TBD | Pending |
| INTG-01 | TBD | Pending |
| INTG-02 | TBD | Pending |
| INTG-03 | TBD | Pending |
| INTG-04 | TBD | Pending |
| INTG-05 | TBD | Pending |
| MIGR-01 | TBD | Pending |
| MIGR-02 | TBD | Pending |
| RELS-01 | TBD | Pending |

**Coverage:**
- v2.0.0 requirements: 14 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 14 ⚠️

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 after initial definition*
