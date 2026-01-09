# Gravito 生態系統技術白皮書
**版本 1.0.0**

## 引言

Gravito 是一個專為 TypeScript 時代設計的現代化、開發者優先的異步任務處理生態系統。它由兩個共生的核心支柱組成：
1.  **Gravito Stream**：高效能、原子性的隊列處理引擎。
2.  **Gravito Zenith**：集中式的運維控制平面與監控系統。

本白皮書詳細介紹了 Gravito 的架構決策、技術棧以及實作模式，闡述我們如何提供企業級的可靠性與零配置的極致開發者體驗。

---

# 第一部分：Gravito Stream (核心引擎)

**設計哲學**：「極速下的原子級可靠性 (Atomic Reliability at Speed)」。
Stream 旨在處理高吞吐量的同時，確保在任何 Race Condition 或崩潰情況下都不會遺失資料。

## 1. 智能隊列路由與存儲 (Smart Queue Routing & Storage)
*   **功能**：多策略隊列路由（優先級與標準模式）。
*   **技術**：Redis Lists (O(1)) 與 命名空間分區 (Namespace Partitioning)。
*   **實作細節**：
    *   Stream 不採用全域 Sorted Sets (O(log N)) 來處理所有任務，而是針對常見情況進行最佳化。
    *   **標準任務**：存儲於標準 Redis Lists (`RPUSH` / `LPOP`) 以獲得最大吞吐量。
    *   **優先級任務**：透過 **隱式分區 (Implicit Partitioning)** 實作。一個「高優先級」任務會被路由到獨立的 Key (`queue:name:critical`)。Consumer 被程式化為嚴格按照順序輪詢這些 Key (`critical` > `high` > `default` > `low`)。
*   **成果**：我們實現了優先級處理，但沒有傳統優先級隊列常見的效能懲罰。

## 2. 原子性保證與並發控制 (Guaranteed Atomicity & Concurrency Control)
*   **功能**：無 Race Condition 的速率限制 (Rate Limiting)。
*   **技術**：Redis Lua Scripting (`EVAL`)。
*   **實作細節**：
    *   所有關鍵狀態流轉都在 Redis 伺服器端原子性地完成。
    *   **速率限制**：當 Worker 請求任務時，Lua 腳本會原子性地執行：
        1. 檢查當前時間窗口計數器 (Fixed Window 策略)。
        2. 若未超限：增加計數器並執行 `LPOP`。
        3. 若已超限：立即返回 Null。
*   **成果**：數百個 Worker 可以同時轟炸隊列，而絕不會突破速率限制或重複執行同一任務。

## 3. 彈性機制：優雅重試與指數退避 (Resilience: Graceful Retry & Exponential Backoff)
*   **功能**：自癒式任務管道 (Self-Healing Job Pipelines)。
*   **技術**：客戶端智能 (Client-Side Intelligence) + 排程存儲 (Redis ZSET)。
*   **實作細節**：
    *   不同於原始隊列直接讓任務「失敗」，Stream Worker 將執行封裝在彈性層中。
    *   **失敗時**：Worker 捕獲錯誤，使用公式 `delay = initial * (multiplier ^ attempts)` 計算下次重試時間。
    *   **行動**：任務**不會**被丟棄，而是帶著新的時間戳 Score 被重新調度到 `Delayed` 集合中。
*   **成果**：暫時性錯誤（API 超時、DB 鎖死）會自動修復，無需人工介入，從而避免警報疲勞。

## 4. 死信隊列管理 (Deep Letter Queue Management, DLQ)
*   **功能**：有毒任務隔離 (Toxic Job Isolation)。
*   **技術**：專用 Redis Lists (`queue:name:failed`)。
*   **實作細節**：
    *   當任務耗盡其 `maxAttempts` 時，會被原子地移動到 `failed` 列表。
    *   **零遺失保證**：我們使用 `RPOPLPUSH`（或其 Lua 等價物）確保任務在從活躍隊列移動到失敗隊列的過程中，沒有任何毫秒是處於「消失」狀態的。
    *   **手動重播**：系統提供 API 批量將任務從 `failed` 移回 `waiting`，有效地重置其嘗試計數器。
*   **成果**：壞數據不會阻塞隊列。開發者可以檢查失敗的 Payload，修復 Bug，然後重播任務。

---

# 第二部分：Gravito Zenith (控制平面)

**設計哲學**：「最大化可見性，最小化開銷 (Maximum Visibility, Minimum Overhead)」。
Zenith 旨在提供即時洞察，同時絕不降低隊列引擎的效能。

## 1. 即時遙測 (Real-Time Telemetry)
*   **功能**：駭客任務風格的即時日誌與指標流。
*   **技術**：Server-Sent Events (SSE) + Redis Pub/Sub。
*   **實作細節**：
    *   **生產者**：Worker 透過 `PUBLISH flux:logs` 發送不透明事件。
    *   **橋接器**：Zenith 伺服器訂閱 Redis 並將訊息轉發到 HTTP SSE Stream。
    *   **前端**：React (Vite) 連接到 `/api/logs/stream` 並即時更新狀態庫 (TanStack Query/Zustand)。
*   **成果**：開發者能**即時**看到發生的事情（延遲低於 100ms），無需手動刷新頁面。

## 2. 分佈式 Worker 健康監控
*   **功能**：Worker 自動發現與資源監控。
*   **技術**：帶 TTL (Time-To-Live) 的臨時 Key。
*   **實作細節**：
    *   **心跳**：每個 Worker 進程每 5 秒自動寫入一個 Key `worker:{uuid}`，並設定 15 秒過期。
    *   **Payload**：包含詳細的進程指標：CPU 負載平均值、RSS 記憶體使用量、Heap 統計。
    *   **發現**：Console 僅需掃描這些 Key。如果 Worker 崩潰（無心跳），Key 會自動過期消失。
*   **成果**：無需中心化註冊表。系統能準確反映當前活躍容量，並自動清理過期的 Worker 記錄。

## 3. 混合持久化 (Hybrid Persistence - The Audit Layer)
*   **功能**：無需 Redis 記憶體成本的長期歷史搜尋。
*   **技術**：多語言持久化 (Redis + SQL)。
*   **實作細節**：
    *   Redis 的 RAM 很昂貴。我們將其視為「熱緩衝區 (Hot Buffer)」。
    *   **Fire-and-Forget 歸檔**：當任務完成（成功或失敗）時，異步 Hook 會將完整的任務 Payload 和結果寫入 SQL 資料庫 (SQLite/MySQL)。
    *   **分離**：活躍隊列 (Redis) 保持精簡快速。歷史記錄 (SQL) 在廉價的磁碟存儲上無限增長。
*   **成果**：您可以搜尋三個月前的數百萬條歷史任務來除錯，而完全不會拖慢今天的處理速度。

## 4. UI/UX 架構
*   **功能**：頂級的應用程式體驗。
*   **技術**：React 19, TailwindCSS, Framer Motion, Lucide Icons。
*   **實作細節**：
    *   **樂觀 UI (Optimistic UI)**：按鈕（暫停/恢復、重試）會立即更新 UI 狀態，而 API 呼叫在背景進行。
    *   **虛擬化**：列表可以流暢地渲染成千上萬行任務。
    *   **美學**：玻璃擬態 (Glassmorphism) 與微互動提供了現代、專業的感覺，增強開發者的信任感。
*   **成果**：一個開發者會**喜歡**使用的工具，減少了維護後台基礎設施的摩擦。
