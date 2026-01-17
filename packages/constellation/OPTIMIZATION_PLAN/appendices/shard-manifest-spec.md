# Shard Manifest 規格

> **用途**: 提供 URL → Shard 的穩定映射，支援增量更新定位與一致性校驗  
> **適用**: Phase 3 增量生成

---

## 設計目標

1. **可重現**：同一組輸入產生相同分片結果
2. **可追溯**：可快速定位 URL 所屬 shard
3. **可校驗**：可用於驗證 index 與 shard 一致性
4. **可擴充**：支援未來新增規則或 metadata

---

## 基本結構（JSON）

```json
{
  "version": 1,
  "generatedAt": "2026-01-17T12:00:00.000Z",
  "baseUrl": "https://example.com",
  "maxEntriesPerShard": 50000,
  "sort": "url-lex",
  "shards": [
    {
      "filename": "sitemap-1.xml",
      "from": "/a",
      "to": "/m",
      "count": 48210,
      "lastmod": "2026-01-17"
    },
    {
      "filename": "sitemap-2.xml",
      "from": "/n",
      "to": "/z",
      "count": 49602,
      "lastmod": "2026-01-17"
    }
  ]
}
```

---

## 欄位說明

- `version`: Manifest 格式版本（預設 1）
- `generatedAt`: 生成時間（ISO 8601）
- `baseUrl`: 影響 URL 組合與排序的基準
- `maxEntriesPerShard`: shard 上限（需與 generator 設定一致）
- `sort`: 分片排序規則（例如 `url-lex`）
- `shards`: shard 清單
  - `filename`: shard 檔名
  - `from` / `to`: 該 shard 覆蓋的 URL 範圍（依排序規則）
  - `count`: shard 內 entry 數量
  - `lastmod`: shard 更新日期（可用於快速檢查）

---

## 規則與約束

1. **排序規則固定**：必須與生成器採用相同排序
2. **同步更新**：更新 shard 後必須同步更新 manifest 與 sitemap index
3. **單檔模式**：可將 `shards` 視為單一項目，`filename` 為主檔
4. **校驗用途**：可用 `count` 與 index 的 shard 列表比對一致性

---

## 建議存放位置

- 與 sitemap index 同層，例如：`sitemap-manifest.json`
- 如有多環境或多語系，可加上前綴或路徑區分

