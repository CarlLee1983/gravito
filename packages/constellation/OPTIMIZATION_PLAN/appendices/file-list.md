# 新增檔案清單

[← 返回總覽](../README.md)

---

## 預期新增檔案

### 核心優化

- `src/core/SitemapParser.ts` - Sitemap XML 解析器
- `src/core/SitemapStreamGenerator.ts` - 流式 XML 生成器
- `src/core/ShardManager.ts` - Shard 管理邏輯

### 測試

- `bench/xml-stream.bench.ts` - XML 構建性能測試
- `bench/full-generation.bench.ts` - 端到端性能測試
- `bench/incremental.bench.ts` - 增量生成性能測試
- `bench/memory-profiler.ts` - 內存分析工具
- `bench/BASELINE.md` - 基準測試結果

### 工具

- `src/utils/performance.ts` - 性能監控工具
