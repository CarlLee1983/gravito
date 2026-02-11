# Stasis 技術架構深探 🏗️

`@gravito/stasis` 的設計目標是成為雲原生環境下最靈活且高效的快取解決方案。本文件將詳細解釋其核心架構設計與運作原理。

---

## 🚀 核心設計哲學

### 1. 統一抽象 (Unified Abstraction)
開發者無需關心底層是 Redis、Memory 還是檔案系統。Stasis 提供了一套標準化的介面，使得驅動程式的切換僅需在配置中修改一行代碼，而不需要變更任何業務邏輯。

### 2. 混合式架構 (Tiered/Hybrid Architecture)
這是 Stasis 最強大的特性。透過 `TieredStore`，我們結合了雙層存儲的優勢：
*   **L1 (近端快取)**：存放在進程記憶體中，讀取延遲 < 0.01ms。
*   **L2 (分散式快取)**：存放在 Redis 中，確保多節點數據同步。

**運作邏輯：**
1.  **Read-Through**：讀取時先看 L1，未命中則看 L2。L2 命中後自動寫回 L1 (Backfill)。
2.  **Write-Through**：寫入時同步更新 L1 與 L2，確保數據實時性。

---

## 📡 分散式一致性 (Signal 聯動)

在多實例環境中，L1 快取最頭痛的問題是「數據過時」。Stasis 推薦搭配 `@gravito/signal` 實現 **「主動失效」**：

1.  **事件發送**：當某一個實例執行了資料更新（或 `cache.forget`）。
2.  **廣播同步**：透過 Signal 發送一個失效信號。
3.  **自動清理**：其餘所有實例接收到信號後，自動清理該 Key 在當前進程 L1 中的舊數據。

這確保了你在享受本地快取極致效能的同時，依然擁有強一致性的體驗。

---

## 🧠 智慧預測機制 (Predictive Cache)

Stasis 內建了基於 **馬可夫鏈 (Markov Chain)** 的預測驅動器。
它可以追蹤 Key 的存取順序。例如：當使用者頻繁存取 `user:1/profile` 後接著存取 `user:1/settings`。
預測器會學習到這個行為，並在使用者存取 Profile 時，**提前非同步預熱 (Prefetch)** Settings 到 L1 之中，從而將後續請求的延遲降至最低。

---

## 🛡️ 系統容錯 (Circuit Breaker)

對於分散式應用，Redis 故障不應導致整個系統崩潰。
Stasis 的 `Circuit Breaker` 驅動器能監控底層連接狀態：
*   **自動熔斷**：當 Redis 超時次數過多，自動停止存取。
*   **優雅降級**：自動切換至 `MemoryStore` 或 `NullStore`，確保應用程式保持運行。
*   **自動恢復**：定期探測 Redis 是否恢復，並無縫切換回主存儲。
