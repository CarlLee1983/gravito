# Stage 3: 極限擴張期 —— 分佈式星系 (Satellite) 架構
**Distributed Satellites: The Galactic Scale**

當你的專案成長到需要支撐「秒殺搶購」這種極端負載時，單機架構已不再適用。Gravito 的真正肌肉在於：**讓你的整潔代碼，瞬間獲得分佈式的戰鬥力。**

---

### 1. 物理演進：衛星細胞分裂 (Satellite Splitting)
在 Stage 2 中，我們已經實現了「邏輯上的領域隔離」。到了 Stage 3，我們利用 `Launchpad` 指令，將原本住在同一個進程的 `ServiceProvider` 物理拆分為獨立的服務進程（Micro-services ready）。

-   **API 網關衛星 (Gateway)**：專門負責流量過濾、身份驗證、全局限流與 WAF 防禦，擋住 90% 的無效或惡意請求。
-   **下單衛星 (Ordering)**：純粹的業務邏輯處理中心，可根據 CPU 負載實現秒級水平擴展。
-   **庫存衛星 (Inventory)**：部署在具備高 IOPS 的硬體上，利用 `Plasma` 處理最核心的原子鎖與庫存扣減。

> **為什麼是「衛星」而非傳統微服務？**
> 因為衛星架構強調「行星核心」(Core) 的一致性。所有衛星共享相同的配置模型、日誌格式與 OpenTelemetry 追蹤規範，減少了傳統微服務帶來的運維碎片化。

---

### 2. 開發自己的衛星：設計藍圖與規範
開發者可以參考 `satellites/flash-sale` 的結構。在 Gravito 中，衛星不只是一個資料夾，它是一個**具備自我治理能力的業務單元**：

1.  **ServiceProvider**：衛星的進入點，定義了該領域對外的「公開介面」。
2.  **純淨領域層 (Domain)**：這是衛星的靈魂，不准依賴 Redis、MySQL 或任何 HTTP 庫，只描述業務規則。
3.  **基礎設施層 (Infrastructure)**：實作持久化與快取。在此階段，我們會將 DB 實作替換為分佈式版本。
4.  **跨衛星通訊 (Signal)**：衛星之間禁止直接進行資料庫存取，必須透過事件。

```typescript
// 衛星通訊範例
export class MySatelliteServiceProvider extends ServiceProvider {
  boot() {
    // 監聽全局事件，實現跨衛星的最終一致性
    this.signal.on('order:validated', async (order) => {
      // 當訂單驗證完成後，此衛星負責後續的點數發放
      await this.container.make(PointService).grant(order.userId, order.amount);
    });
  }
}
```

---

### 3. 武裝分佈式組件：應對併發的銀彈 (Distributed Hardening)

#### A. 分層快取策略 (Tiered Cache - L1/L2)
在 `FlashSaleServiceProvider` 中，我們無痛接入了 L1/L2 雙層快取，針對資料特性精確打擊：

-   **L1 (In-Memory 本地記憶體)**：存放**靜態、低頻變動**的資料（如：商品名稱、規格、詳情）。資料直接存在衛星進程記憶體中，讀取延遲接近 0，徹底消除網絡開銷。
-   **L2 (Redis 分佈式快取)**：存放**動態、高頻變動且需全局一致**的資料（如：即時庫存數量、限購計數）。確保所有衛星實例看到的數據是同步且精確的。

#### B. 分佈式原子鎖 (Plasma Distributed Lock)
在多台下單衛星並行運作時，為了防止「超賣」，我們使用 `Plasma` 提供的 Redis 樂觀鎖或悲觀鎖：
```typescript
// 利用 Plasma 實作分佈式原子鎖，確保在庫存扣減時的絕對安全性
const lock = await this.plasma.lock(`stock_lock:${productId}`, 5000);
try {
  // 1. 從 L2 取得最新庫存
  // 2. 進行原子扣減 (DECR)
  // 3. 失敗則拋出 BusinessException，由 Responder 轉譯為 409 錯誤
} finally {
  await lock.release();
}
```

#### C. 非同步削峰 (Quasar Queue)
面對突發的百萬級流量，系統不再嘗試同步寫入資料庫：
1.  **快取驗證**：先在 L1/L2 驗證庫存與資格。
2.  **任務入隊**：迅速將訂單任務塞入 `Quasar` 高併發隊列，立即回傳「排隊中」給前端。
3.  **背景消費**：由 `Quasar Workers` 根據 DB 的承受能力，穩定的將訂單寫入磁碟，實現「柔性可用」。

---

### 4. 性能對比：演進的成果

| 指標 | Stage 1 (MVC) | Stage 2 (Clean/DDD) | Stage 3 (Satellites) |
| :--- | :--- | :--- | :--- |
| **併發能力 (RPS)** | 100 ~ 200 | 200 ~ 500 | **10,000+** |
| **平均延遲 (Latency)** | 500ms+ | 200ms | **< 20ms (L1 Hit)** |
| **資料一致性** | 強一致性 (DB) | 強一致性 (DB) | **最終一致性 (Event-driven)** |
| **容錯性** | 單點故障即崩潰 | 單點故障即崩潰 | **衛星故障隔離、斷路器保護** |

---

### 5. 終極啟示
Gravito 的演進式架構讓我們實現了：**「開發時保有單體的簡單，運行時擁有分佈式的強大」**。

不論你的業務是從 10 人還是 100 萬人開始，這套架構都能讓你以最低的成本完成轉型。你可以從 `examples/flash-sale-fullstack/src` 中直接看到這套最終型態的實作程式碼，那是目前 Gravito 在高併發領域的最優解。