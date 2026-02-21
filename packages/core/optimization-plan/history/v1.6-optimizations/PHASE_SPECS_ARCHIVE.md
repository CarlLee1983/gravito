# v1.6 優化實施方案存檔 (Phase 0 - 08)

本文件匯總了 @gravito/core v1.6 優化計劃中各階段的設計規格與技術細節。

---

## [Phase 0] 基準測試基線建立
**目標**: 建立數據支撐，驗證優化收益。
- **Context 創建**: 測試 FastContext (pooled) vs MinimalContext。
- **Proxy 開銷**: 量化 PhotonAdapter 中 Proxy 的效能損失。
- **URL 解析**: 驗證 `extractPath()` 相比於 `new URL()` 的性能提升。
- **檢測指標**: RPS (oha), Latency (p50/p99), Context Creation (ns/op)。

---

## [Phase 1] 中間件鏈預編譯 (Middleware Precompile)
**目標**: 消除每請求創建 `next` 閉包的開銷。
- **方案**: 在註冊階段將中間件陣列表轉換為鏈式調用函數。
- **特化**: 針對 0 或 1 個中間件提供快速路徑。
- **收益**: 預計提升 10-15% 吞吐量。

---

## [Phase 2] MinimalContext Query 快取
**目標**: 避免 `queries()` 每次呼叫都重建物件。
- **方案**: 在 `MinimalRequest` 引入 `_cachedQueries` 欄位。
- **機制**: 首次存取時遍歷 `URLSearchParams` 並存入快取，後續直接返回。

---

## [Phase 3] PhotonAdapter Proxy 消除
**目標**: 解決 Hono 相容層的 Proxy 效能瓶頸。
- **問題**: Proxy 存取比直接屬性存取慢 10-20 倍。
- **方案**: 改用 `ObjectPool` 預先建立包裝物件，或手動代理所有屬性。

---

## [Phase 4] AOTRouter 中間件快取
**目標**: 解決動態路由中間件收集的 O(n) 問題。
- **方案**: 引入 LRU 快取存儲 `method:path` 對應的中間件鏈。
- **失效機制**: 當 `use()` 被呼叫導致全局中間件變更時，增加版本號使快取失效。

---

## [Phase 5] AOTRouter 快取深化
**詳見**: 與 Phase 4 整合實施。

---

## [Phase 6] Headers Object Spread 優化
**現狀析**: 使用 `Object.assign` 已足夠高效。
- **結論**: 向後相容性與性能平衡點已達成，無須進一步改進。

---

## [Phase 7] 其他微優化 (Micro-optimizations)
- **Path 提取**: 已實施無 URL 物件的 `extractPath`。
- **JSON 序列化**: 針對靜態路徑預序列化。

---

## [Phase 8] 深度架構分析總結
**核心發現**:
1. **雙執行路徑**: 確立了原生引擎與相容層的分離。
2. **Body 消費機制**: 確認了 Body 快取對於中間件鏈的重要性。
3. **版本控制**: 實現了基於版本號的快取刷新機制。
