# v1.6 優化驗證與風險評估存檔

本文件匯總了 @gravito/core v1.6 優化計劃的驗證結果、基準測試數據與風險評估。

---

## 1. 驗證計劃總覽
- **單元測試**: 確保快取清除（Reset）、Body 多次讀取、中間件執行順序正確。
- **類型檢查**: 驗證優化後不影響 Public API 的類型定義。
- **相容性**: 確保 PhotonAdapter 依然能夠完美適配 Hono 中間件。

---

## 2. 基準測試結果 (Benchmark)
*摘要自原始測試數據*

| 項目 | 優化前 | 優化後 | 提升 |
|-----|-------|-------|-----|
| 空路由 RPS | ~142k | ~185k | +30% |
| 3 中間件 RPS | ~78k | ~102k | +30% |
| Context Create | ~1800ns | ~120ns | +93% |
| Query Access | ~500ns | ~50ns | +90% |

---

## 3. 風險評估與緩解
- **Body Consumed**: 已透過 Body 快取機制解決。
- **Memory Leak**: AOTRouter 的 LRU 快取限制為 1000 項目，防止無限增長。
- **Cache Inconsistency**: 引入單調遞增的版本號（Version Tracking），確保中間件變更時即時刷新。

---

## 4. 向後相容性指南
- **對外介面**: 保持原有 `Gravito`, `PhotonAdapter`, `Context` 的 API 不變。
- **內部介面**: 部分池化開關由自動決定，不建議開發者手動干預。
