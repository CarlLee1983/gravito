# @gravito/core 效能優化計劃

> **注意**: 本文件已拆分為多個文件，請查看 `optimization-plan/` 資料夾。

## 快速連結

- **[README.md](./optimization-plan/README.md)** - 執行摘要、架構說明、實施優先級
- **[00-baseline.md](./optimization-plan/00-baseline.md)** - Phase 0: 基準測試基線建立
- **[01-middleware-precompile.md](./optimization-plan/01-middleware-precompile.md)** - Phase 1: 中間件鏈預編譯
- **[02-minimal-context-query-cache.md](./optimization-plan/02-minimal-context-query-cache.md)** - Phase 2: MinimalContext Query 快取
- **[03-photon-adapter-proxy.md](./optimization-plan/03-photon-adapter-proxy.md)** - Phase 3: PhotonAdapter Proxy 消除
- **[04-aot-router-cache.md](./optimization-plan/04-aot-router-cache.md)** - Phase 4: AOTRouter 中間件快取
- **[05-headers-pooling.md](./optimization-plan/05-headers-pooling.md)** - Phase 5: FastContext Headers 池化
- **[06-container-symbol-key.md](./optimization-plan/06-container-symbol-key.md)** - Phase 6: Container Symbol Key
- **[07-micro-optimizations.md](./optimization-plan/07-micro-optimizations.md)** - Phase 7: 其他微優化
- **[verification.md](./optimization-plan/verification.md)** - 驗證計劃與測試清單
- **[risks-and-compatibility.md](./optimization-plan/risks-and-compatibility.md)** - 風險評估與向後相容性指南

---

## 為什麼拆分？

原文件長達 1732 行，在實行計劃時容易失去注意力。拆分後：

1. ✅ 每個 Phase 獨立文件，專注單一優化項目
2. ✅ 更容易追蹤進度（完成一個 Phase 就關閉一個文件）
3. ✅ 降低認知負擔，避免資訊過載
4. ✅ 方便團隊協作（不同人可同時處理不同 Phase）

---

**版本**: 2.0.0  
**日期**: 2026-01-17  
**目標**: 提升框架整體吞吐量 30-50%
