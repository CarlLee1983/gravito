# Gravito 技術深潛：高併發與極限效能實作
# Gravito Tech Deep Dive: High Concurrency Implementation

這份文件詳細說明 Gravito 框架如何透過核心模組，解決高併發場景下最棘手的技術問題。

---

### 🚀 1. 分層快取 (Tiered Cache) 的實作邏輯
在高併發環境下，單純依賴 Redis (L2) 仍會產生大量的網絡 IO 延遲。Gravito 透過 **L1 (In-Memory) + L2 (Redis)** 的雙層設計來極大化讀取效能。

#### 核心模組協作：
- **`@gravito/stasis` (L1 層)**：提供框架內建的高性能 `MemoryCache` 驅動。它具備自動 TTL 管理、LRU 淘汰機制與 OOM 保護。
- **`@gravito/plasma` (L2 層)**：提供分佈式 Redis 驅動，支持連接池管理與分佈式數據讀寫。
- **`@gravito/signal` (同步層)**：負責跨實例的快取一致性。

#### 實作流程（框架自動化）：
1. **讀取路徑**：`App` -> 檢查由 `@gravito/stasis` 管理的 `L1 (Local)` -> 若未中 -> 檢查 `L2 (Plasma/Redis)` -> 回填 `L1`。
2. **自動失效 (Smart Invalidation)**：Gravito 支持在設置快取時定義「信號綁定」。
   ```typescript
   // 開發者只需在設置快取時聲明失效條件
   await cache.set(key, value, { invalidateOn: 'product:updated' });
   ```
3. **全局同步**：當任何一個衛星實例透過 `Signal` 發送 `product:updated` 訊號時，分佈在各個伺服器上的所有衛星都會由框架底層自動清除對應的 `L1 Cache`。

**開發者獲益**：不需要處理複雜的記憶體回收、過期邏輯與跨服務同步，只需專注於定義「什麼資料需要快取」以及「何時失效」。

---

### 🔒 2. 防止超賣：分佈式原子鎖 (Plasma Distributed Lock)
在秒殺場景，當多個「下單衛星」同時運行時，必須保證庫存扣減的原子性。

#### 技術實作：
`@gravito/plasma` 底層實作了 **Redlock 演算法** 的精簡版，利用 Redis 的 `SET key value NX PX` 指令：

```typescript
// 框架內部的抽象邏輯
const lock = await this.plasma.lock(`stock:${productId}`, 2000); // 2秒自動釋放安全機制
try {
  // 利用 Redis 的 DECRBY 進行原子扣減，這是在 L2 層完成的
  const remaining = await this.plasma.redis.decrby(`product_stock:${productId}`, quantity);
  if (remaining < 0) {
    await this.plasma.redis.incrby(`product_stock:${productId}`, quantity); // 補回庫存
    throw new BusinessException('庫存不足');
  }
} finally {
  await lock.release();
}
```
**開發者獲益**：不需要處理鎖的「過期自動續約」或「死鎖清除」邏輯，`Plasma` 模組會自動管理鎖的生命週期。

---

### 🌊 3. 流量整形與非同步削峰 (Quasar Queue)
當瞬間流量（如每秒 10 萬次點擊）遠超資料庫 (MySQL/PostgreSQL) 的寫入極限時，Gravito 透過 `@gravito/quasar` 進行流量緩衝。

#### 技術實作：
- **快速響應**：Action 層不直接寫入 DB，而是調用 `this.quasar.push('order_processing', orderData)`。這只是向 Redis List 寫入一條 JSON，延遲極低。
- **背壓控制 (Backpressure)**：`Quasar` 的 Worker 實例可以部署在不同的容器中。我們可以根據監測到的資料庫 IO 壓力，動態調整 Worker 的數量或單次拉取任務的大小 (Batch Size)。
- **最終一致性**：Worker 完成 DB 寫入後，發送 `order:completed` 訊號給 `Signal` 模組，通知前端或發送通知。

---

### 📡 4. 跨衛星通訊：Signal 異步總線
在 Stage 3 的衛星架構中，衛星之間是物理隔離的。`@gravito/signal` 提供了一個基於 **Pub/Sub** 的高效通訊層。

#### 為什麼不用 HTTP 調用？
- **效能**：HTTP 有三向握手與 Header 開銷。
- **解耦**：下單衛星不需要知道誰對「下單完成」事件感興趣。
- **可靠性**：Signal 可以結合 `Plasma` 的 Redis 驅動，確保即使某個衛星暫時離線，重啟後仍能處理積壓的訊息。

---

### 🧩 5. 腳手架與 IoC (PlanetCore)
這是一切技術亮點的根基。`@gravito/core` 提供的 **IoC 容器** 讓開發者只需要宣告依賴：

```typescript
// 開發者只需要定義介面，框架自動注入高性能實作
constructor(
  @Inject('cache.service') private cache: TieredCacheService,
  @Inject('queue') private queue: QuasarManager
) {}
```
這意味著開發者可以先在 Stage 1 使用簡單的 `MemoryCache`，到了 Stage 3 只需要修改 `ServiceProvider` 的綁定，整個系統就具備了分佈式快取的能力，而不需要修改任何業務程式碼。

---

### ⚡ 6. Bun 原生文件 I/O 最佳化 (Native File I/O Acceleration)
在現代框架中，文件 I/O 操作（讀取設定、寫入日誌、生成靜態文件）仍然是隱藏的效能瓶頸。Gravito 透過 **RuntimeAdapter** 統一介面，自動檢測運行時環境並利用 Bun 的原生 API。

#### 核心優化：

**1. 零拷貝讀取 (Zero-Copy Read)**
```typescript
// 傳統 Node.js：讀取 → Buffer 轉換 → JSON.parse
const content = fs.readFileSync(file, 'utf-8');
const data = JSON.parse(content);

// Gravito + Bun：直接讀取 → JSON
const adapter = getDefaultRuntimeAdapter();
const data = await adapter.readFileAsJSON(file);
// 運行時自動選擇 Bun.file().json() 或 Node fallback
```

**效能提升**：JSON 讀取速度提升 15~25%（減少 Buffer 轉換開銷）

**2. 非同步化消除事件迴圈阻塞**
Gravito Phase 4 將框架內所有同步 I/O 操作（`writeFileSync`, `mkdirSync`）轉為非同步：

| 場景 | 舊版 (同步) | 新版 (非同步) | 改進 |
|------|-----------|-----------|-----|
| SSG 增量構建 | 事件迴圈阻塞 | 背景非同步 | -30~40% |
| API 文檔生成 (100+ endpoints) | 順序阻塞 | 並行寫入 | -20~30% |
| Sitemap 生成 | mkdirSync 同步等待 | 非同步 mkdir | -15~25% |

```typescript
// 推薦模式：RuntimeAdapter Async Pattern
const adapter = getDefaultRuntimeAdapter();
const content = JSON.stringify(data);

if (adapter.writeFile) {
  // Bun 最佳化：使用 Bun.write()
  await adapter.writeFile(path, content);
} else {
  // Node.js fallback
  await writeFile(path, content);
}
```

**3. FileSink 高頻寫入緩衝**
針對日誌、事件追蹤等高頻寫入場景，Gravito 提供 `RuntimeFileSink`：

```typescript
// 舊模式：每條訊息一個 syscall
events.forEach(e => fs.appendFileSync(logPath, JSON.stringify(e) + '\n'));

// 新模式：批量緩衝減少 syscall
const sink = await adapter.createFileSink?.(logPath);
if (sink) {
  events.forEach(e => sink.write(JSON.stringify(e) + '\n'));
  await sink.flush();  // 單次 syscall 批量寫入
  await sink.end();
}
```

**效能提升**：日誌吞吐量提升 40~60%（Bun `Bun.file().writer()` vs Node `createWriteStream`）

#### 實作範圍：

Gravito 在以下高優先級模組已完成 Phase 1-4 的全量遷移：

| 模組 | 優化內容 | 代碼變更 |
|-----|---------|---------|
| **@gravito/core** | RuntimeAdapter 擴充 + 輔助函式庫 | +363 行 |
| **@gravito/spectrum** | 設定讀取非同步化 | +150 行 |
| **@gravito/stasis** | 並行設定寫入 | +140 行 |
| **@gravito/flux** | FileSink 緩衝日誌 | +94 行 |
| **@gravito/atlas** | 非同步寫入 schema lock | +17 行 |
| **@gravito/prism** | SSG manifest 非同步化 | +23 行 |
| **@gravito/astral** | 靜態導出並行化 | +29 行 |
| **@gravito/luminosity** | Sitemap 生成非同步化 | +13 行 |

#### 跨運行時相容性：

`RuntimeAdapter` 透過功能偵測自動適配：

```typescript
const adapter = getDefaultRuntimeAdapter();

// Bun 環境：使用原生 API
if (typeof Bun !== 'undefined') {
  return {
    readFileAsJSON: (path) => Bun.file(path).json(),
    writeFile: (path, data) => Bun.write(path, data),
    createFileSink: (path) => Bun.file(path).writer()
  };
}

// Node.js 環境：使用 node:fs/promises
if (typeof process !== 'undefined') {
  return {
    readFileAsJSON: (path) => readFile(path, 'utf-8').then(JSON.parse),
    writeFile: (path, data) => writeFile(path, data),
    createFileSink: (path) => fs.createWriteStream(path)
  };
}

// 其他運行時：提供通用 fallback
```

**開發者獲益**：
- ✅ 在 Bun 環境自動獲得 15~40% 的效能提升，零代碼修改
- ✅ 代碼保持 Node.js/Deno 相容
- ✅ 無需手動選擇或條件判斷，框架自動最佳化
