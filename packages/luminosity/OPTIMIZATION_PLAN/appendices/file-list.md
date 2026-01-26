# 附錄 B: 新增檔案清單

[← 返回總覽](../README.md)

---


實施本計劃後，預計新增以下檔案：

```
packages/luminosity/
├── bench/
│   ├── xml-builder.bench.ts      # Phase 0
│   ├── full-pipeline.bench.ts    # Phase 0
│   ├── memory-profiler.ts        # Phase 0
│   └── BASELINE.md               # Phase 0
├── src/
│   ├── storage/
│   │   ├── WriteMutex.ts         # Phase 3.3
│   │   └── SnapshotManager.ts    # Phase 2.3
│   ├── scanner/
│   │   └── RouteWatcher.ts       # Phase 5.1 (可選)
│   └── testing/
│       └── index.ts              # Phase 8.6
└── tests/
    ├── storage/
    │   ├── adapter-streaming.test.ts    # Phase 2.0
    │   ├── jsonl-logger-streaming.test.ts # Phase 2.1
    │   ├── compactor-streaming.test.ts  # Phase 2.2
    │   └── snapshot-manager.test.ts     # Phase 2.3
    ├── engine/
    │   └── strategies/
    │       ├── incremental-cache.test.ts     # Phase 3.1
    │       ├── incremental-concurrent.test.ts # Phase 3.3
    │       └── dynamic-batch.test.ts          # Phase 3.2
    ├── xml/
    │   └── escape.test.ts        # Phase 1.2
    └── scanner/
        └── sitemap-builder-cache.test.ts # Phase 5.1
```

---

**版本歷史**:
- v2.0.0 (2026-01-17): 基於程式碼審查的完整修正版
  - 新增 Phase 2.0 (StorageAdapter 擴展)
  - 新增 Phase 3.3 (並發寫入保護)
  - 新增 Phase 3.4 (日誌輪替)
  - 重新設計 Phase 3.1 快取策略
  - 調整優先級順序
  - 更新時間估計為 5-7 週
- v1.1.0 (2026-01-17): 新增 Phase 8 - 開發者體驗優化
- v1.0.0 (2026-01-17): 初始版本