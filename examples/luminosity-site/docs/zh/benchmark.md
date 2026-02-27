---
title: 效能基準測試
order: 6
---

# 🔥 效能基準測試實證 (Benchmark)

Luminosity 專為 **極大規模 (Extreme Scale)** 而設計。我們不只空談效能，我們用資料證明。
透過獨特的 **串流架構 (Streaming Architecture)**，Luminosity 能夠以極低的固定記憶體消耗，為數百萬個 URL 產生 Sitemap。

## 100 萬個 URL 的挑戰

為 1,000,000 個頁面產生 Sitemap 是大型應用常見的效能瓶頸。
傳統解決方案通常將所有資料載入記憶體，導致 Node.js 進程崩潰 (Heap Out of Memory)，或需要昂貴的高記憶體伺服器。

**Luminosity 的解決方案：**
1. **非同步迭代器 (Async Iterators)**：從資料庫直接串流資料到 XML 寫入器。
2. **背壓處理 (Backpressure)**：尊重磁碟 I/O 的寫入能力。
3. **自動分片 (Automatic Sharding)**：當達到 50,000 URL 限制時自動分割檔案。

## 測試結果

我們進行了一項受控測試，為 **1,000,000 個 URL** 產生 Sitemap 索引。

### 測試環境
- **硬體**: MacBook Pro (Apple Silicon, M-series)
- **系統**: macOS 25.2.0
- **Runtime**: Bun 1.3.9
- **資料庫**: SQLite (真實資料庫，110 MB，100 萬筆產品資料)
- **查詢方式**: `bun:sqlite` 原生 Iterable 串流查詢

### 關鍵指標 (2026-02-27 實測)

| 指標 | 結果 | 備註 |
| :--- | :--- | :--- |
| **總 URL 數** | **1,000,000** | 完整的 Sitemap 索引產生 |
| **耗時** | **8.12s** | 端到端處理時間（3 次平均） |
| **吞吐量** | **123,076 URLs/sec** | 穩定的超高速處理能力 |
| **記憶體峰值** | **174 MB** | **固定 Heap 用量 (Constant Usage)** 🤯 |

### 測試結果詳細數據

| 測試輪次 | 耗時 | 峰值記憶體 | 吞吐量 |
| :--- | :--- | :--- | :--- |
| **Run #1** | 7.98s | 195 MB | 125,258 URLs/s |
| **Run #2** | 8.30s | 157 MB | 120,514 URLs/s |
| **Run #3** | 8.10s | 170 MB | 123,456 URLs/s |
| **平均值** | **8.12s** | **174 MB** | **123,076 URLs/s** |

> **注意**：最令人印象深刻的是記憶體用量。無論處理 1 萬還是 1000 萬個 URL，記憶體佔用都保持平穩。相比舊版基準線（14.2s），性能提升 **43%**。

## 效能最佳化詳解

### 2026 年優化亮點

我們在最新版本中修復了兩個關鍵效能瓶頸，使吞吐量提升 76%：

#### 1️⃣ **流式寫入的微任務優化**
使用緩衝區機制，改為每渲染 **5,000 行進行一次 `yield`**，而非每行都 yield。
這極大幅度降低了 Node/Bun 的 stream overhead 和 Event Loop Context Switching。

#### 2️⃣ **資料庫查詢的 O(N²) 修復**
- ❌ **舊方法**：使用 `LIMIT 50,000 OFFSET ?` 分頁，SQLite 每次都從頭掃描
- ✅ **新方法**：使用 `bun:sqlite` 的原生 Iterable 串流查詢，直接用 C++ Generator

## 實作細節

以下是我們 Benchmark 中使用的核心邏輯。請注意使用 **`bun:sqlite` 原生 Iterable**，它確保了一次只處理一行資料，且零額外記憶體開銷。

```typescript
// 使用 @gravito/luminosity 的範例（最佳做法）
const sitemap = OrbitSitemap.static({
  baseUrl: 'https://store.example.com',
  outDir: './dist-sitemaps',
  providers: [
    {
      async *getEntries() {
        // 使用 bun:sqlite 的原生 Iterable
        const stmt = db.prepare('SELECT slug, updated_at FROM products')

        // 關鍵：逐行迭代，永遠不要把 100 萬行塞進陣列！
        // bun:sqlite statement 本身就是 native Iterable
        for (const row of stmt as Iterable<any>) {
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

await sitemap.generate()
```

### 為什麼這個方法這麼快？

1. **無分頁開銷** - 不使用 OFFSET，完全避免 O(N²) 掃描
2. **常數記憶體** - 一次只載入一行到記憶體
3. **C++ 加速** - bun:sqlite 直接使用 C++ SQLite binding，無 JSON 序列化開銷
4. **背壓支援** - Async Generator 自動處理磁碟 I/O 背壓

## 親自驗證

您可以親自執行此基準測試。程式碼託管於我們的 [GitHub Repository](https://github.com/gravito-framework/gravito/tree/main/examples/luminosity-benchmark)。

1. Clone 專案庫。
2. 進入 `examples/luminosity-benchmark` 目錄。
3. 執行種子產生與測試：

```bash
bun install
bun run seed      # 產生 100 萬筆測試資料
bun run benchmark # 啟動引擎
```
