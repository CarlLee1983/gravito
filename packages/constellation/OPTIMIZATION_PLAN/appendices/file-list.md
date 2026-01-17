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

### 文件

- `bench/BASELINE.md` - Phase 0 基準測試結果
- `packages/constellation/OPTIMIZATION_PLAN/appendices/shard-manifest-spec.md` - Shard Manifest 規格
- `packages/constellation/OPTIMIZATION_PLAN/appendices/xml-parsing-writeback-strategy.md` - XML 解析/回寫策略
- `packages/constellation/OPTIMIZATION_PLAN/appendices/consistency-locking-strategy.md` - 一致性與鎖定方案
