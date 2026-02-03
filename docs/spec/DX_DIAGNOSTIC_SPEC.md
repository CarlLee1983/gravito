# 🛠️ Gravito DX & Diagnostic Specification (GDXS)

本文件定義了 Gravito 框架中的開發者體驗（DX）、測試標準與診斷流程，旨在確保代碼品質與維運的可追蹤性。

## 1. 測試標準 (Testing Standards)

### 1.1 UseCase 測試
`UseCase` 是業務邏輯的唯一載體，必須具備 90% 以上的測試覆蓋率。
- **隔離原則**: 測試 `UseCase` 時，必須使用 `Container.bind()` 替換掉真實的 Repository 或外部服務。
- **範例**:
  ```typescript
  it('should register a member', async () => {
    container.singleton('membership.repo', () => new MockMemberRepo());
    const useCase = container.make(RegisterMember);
    const result = await useCase.execute(input);
    expect(result.email).toBe(input.email);
  });
  ```

### 1.2 Schema 漂移檢測 (Schema Drift)
利用 `grand-review.ts` 進行自動化掃描，確保以下三點 100% 同步：
1.  資料庫真實 Migration 欄位。
2.  `Domain/Entities` 的 TypeScript 屬性定義。
3.  `Atlas Model` 的 `@column` 宣告。

## 2. 錯誤診斷體系 (Diagnostics)

### 2.1 統一錯誤碼 (Error Codes)
禁止使用隨機的字串拋出錯誤。所有業務錯誤應繼承自 `GravitoException`，並定義對應的錯誤碼：
- `ERR_AUTH_001`: 密碼錯誤。
- `ERR_PAY_002`: 餘額不足。
- `ERR_CAT_003`: 商品已售罄。

### 2.2 日誌追蹤 (Logging)
- **Trace Context**: 所有日誌必須自動攜帶從 `PlanetCore` 傳遞下來的 `traceId`。
- **敏感數據**: 禁止在日誌中記錄密碼、信用卡號或個人的 PII（個人識別資訊）。

## 3. 開發者工具鏈 (Tooling)

### 3.1 CLI 診斷
利用 `gravito` CLI 進行快速診斷：
- `gravito doctor`: 檢查環境變數、資料庫連線與 Orbit 掛載狀態。
- `gravito check:schema`: 檢測數據模型的一致性。

### 3.2 熱重載與效能
- **JIT 預熱**: 鼓勵在生產環境啟動前執行 `core.warmup()`。
- **AOT 分析**: 開發環境下可開啟 `ENGINE_DEBUG=true` 查看路由編譯結果。

## 4. 代碼品質基準 (Quality Gates)

- [ ] 是否通過了全量 `bun test`？
- [ ] 是否存在未處理的 `@ts-expect-error`？
- [ ] 所有的 `any` 是否已具備明確的註釋說明？
- [ ] 是否已移除所有生產環境不需要的 `console.log`？

---
*Created by Gravito Quality Assurance Team.*
