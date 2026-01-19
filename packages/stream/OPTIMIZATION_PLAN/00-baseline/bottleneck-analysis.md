# Phase 0 瓶頸分析報告

## 1. 識別瓶頸

透過 Phase 0 的基準測試，我們識別出以下核心瓶頸：

### A. Redis 吞吐量受限於 I/O 與序列化
- **現象**: Redis `pushMany` (100 batch) 約 17.5k jobs/s，而 `popMany` 約 41k jobs/s。
- **分析**: 
  - `pushMany` 在寫入前需要對每個 Job 進行 `JSON.stringify`。對於 100 個 Job，這是一筆不小的 CPU 開銷。
  - `pushMany` 目前使用了 `LPUSH key ...payloads`，雖然是批量寫入，但大型 Payload 會增加網絡傳輸負擔。
  - `popMany` 較快，是因為它主要執行讀取，且 Lua 腳本優化了部分原子操作。

### B. 單條操作延遲 (Round-trip)
- **現象**: 單條 Push+Pop E2E 延遲約 3.3ms。
- **分析**:
  - 主要來自 Docker 網絡回環與 Redis 操作本身的 Overhead。
  - 如果應用層有大量單條 Pushes，這將成為整條流水線的木桶短板。

### C. 內存驅動極限
- **現象**: 內存驅動吞吐量大於 400k jobs/s。
- **分析**:
  - 瓶頸已不在 I/O，而是在 JS 引擎的垃圾回收 (GC) 與對象分配開銷。

## 2. 優化機會

根據上述分析，後續 Phase 的優化方向：

1. **序列化優化 (Phase 2)**: 引入更高效的序列化方案（如縮減 JSON 欄位名或嘗試 binary 格式），減少 `pushMany` 的 CPU 開銷與字節大小。
2. **批量操作強化 (Phase 3)**:
   - 全面檢查是否有不必要的 one-by-one 操作（如當前 `retryFailed` 在某些情況下可能是單條循環）。
   - 強化 Lua 腳本，讓 `popMany` 能夠跨優先級隊列進行原子批量獲取。
3. **類型安全與核心架構 (Phase 1)**: 雖然不直接提升性能，但能減少運行時對象形狀變更 (hidden class changes) 導致的 V8 性能降級。

## 3. 結論

當前系統在未經優化的情況下已展現出不錯的基準，特別是批量操作的能力。未來的重點將放在減少序列化開銷與提升 Redis 通訊效率上。
