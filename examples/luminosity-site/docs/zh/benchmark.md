# 🔥 效能實證 (Benchmark)

Luminosity 專為 **極大規模 (Extreme Scale)** 而設計。我們不只空談效能，我們用數據證明。
透過獨特的 **串流架構 (Streaming Architecture)**，Luminosity 能夠以極低的固定記憶體消耗，為數百萬個 URL 生成 Sitemap。

## 100 萬個 URL 的挑戰

為 1,000,000 個頁面生成 Sitemap 是大型應用常見的效能瓶頸。
傳統解決方案通常將所有數據載入記憶體，導致 Node.js 進程崩潰 (Heap Out of Memory)，或需要昂貴的高記憶體伺服器。

**Luminosity 的解決方案：**
1. **非同步迭代器 (Async Iterators)**：從資料庫直接串流數據到 XML 寫入器。
2. **背壓處理 (Backpressure)**：尊重磁碟 I/O 的寫入能力。
3. **自動分片 (Automatic Sharding)**：當達到 50,000 URL 限制時自動分割檔案。

## 測試結果

我們進行了一項受控測試，為 **1,000,000 個 URL** 生成 Sitemap 索引。

### 測試環境
- **硬體**: MacBook Pro (M2 Pro)
- **Runtime**: Bun v1.1
- **資料庫**: SQLite (模擬 100 萬筆產品資料)

### 關鍵指標

| 指標 | 結果 | 備註 |
| :--- | :--- | :--- |
| **總 URL 數** | **1,000,000** | 完整的 Sitemap 索引生成 |
| **耗時** | **~14.2s** | 端到端處理時間 |
| **吞吐量** | **~70,000 URLs/sec** | 極速處理能力 |
| **記憶體峰值** | **84 MB** | **固定 Heap 用量 (Constant Usage)** 🤯 |

> **注意**：最令人印象深刻的是記憶體用量。無論處理 1 萬還是 1000 萬個 URL，記憶體佔用都保持平穩。

## 實作細節

以下是我們 Benchmark 中使用的核心邏輯。請注意 `yield` 的使用，它確保了一次只處理一行數據。

```typescript
// 使用 @gravito/luminosity 的範例
const sitemap = new SeoEngine({
  baseUrl: 'https://store.example.com',
  mode: 'dynamic', // 或 incremental
  resolvers: [
    {
      async *getEntries() {
        // 從資料庫獲取 Iterator
        const stmt = db.prepare('SELECT slug, updated_at FROM products')
        
        // 逐行迭代 - 永遠不要把 100 萬行塞進陣列！
        for (const row of stmt.iterate()) {
          yield {
            url: `/products/${row.slug}`,
            lastmod: row.updated_at,
            changefreq: 'daily'
          }
        }
      }
    }
  ]
})

await sitemap.init()
```

## 親自驗證

您可以親自執行此基準測試。程式碼託管於我們的 [GitHub Repository](https://github.com/gravito-framework/gravito/tree/main/examples/luminosity-benchmark)。

1. Clone 專案庫。
2. 進入 `examples/luminosity-benchmark` 目錄。
3. 執行種子生成與測試：

```bash
bun install
bun run seed      # 生成 100 萬筆測試資料
bun run benchmark # 啟動引擎
```
