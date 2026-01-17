# 配置類型定義

[← 返回總覽](../README.md)

---

## 新增配置選項

### SitemapStreamOptions

```typescript
export interface SitemapStreamOptions {
  baseUrl: string
  pretty?: boolean
  // 新增
  useStreaming?: boolean  // 啟用流式生成
  bufferSize?: number      // 緩衝區大小（用於流式生成）
}
```

### IncrementalGeneratorOptions

```typescript
export interface IncrementalGeneratorOptions extends SitemapGeneratorOptions {
  changeTracker: ChangeTracker
  diffCalculator?: DiffCalculator
  autoTrack?: boolean
  // 新增
  enableTrueIncremental?: boolean  // 啟用真正的增量更新
  cacheBaseEntries?: boolean       // 快取基礎 entries
}
```
