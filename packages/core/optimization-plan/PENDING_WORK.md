# 待完成優化工作清單

> **更新日期**: 2026-02-21
> **狀態**: 根據深度代碼審查（Phase 08）重新整理
> **目標**: 追蹤所有已識別但未實現的優化項目

---

## 優先級總覽

> � 已完成的優化項目（P1 - P2 階段）已歸檔至 [DETAILED_WORK_LOG.md](./history/v1.6-optimizations/DETAILED_WORK_LOG.md)。

### 🔴 P1 優先級（關鍵、影響大、應立即著手）

*目前無待處理的 P1 項目。*

### 🟠 P2 優先級（高影響、需要進行）

*目前無待處理的 P2 項目。*

### 🟡 P3 優先級（中等影響）

| 項目 | 位置 | 問題描述 | 預估提升 | 複雜度 | 狀態 |
|-----|------|--------|--------|-------|------|
| **PhotonAdapter Proxy 消除** | PhotonAdapter.ts | Proxy 無法被 JS 引擎優化 | 15-25% | 高 | 📋 計劃中 |
| **FastContext Headers 池化** | FastContext.ts | Headers 創建開銷 | 待驗證 | 低 | 📋 計劃中 |

### 🟢 P4 優先級（低優先、可選優化）

| 項目 | 位置 | 問題描述 | 預估提升 | 複雜度 | 狀態 |
|-----|------|--------|--------|-------|------|
| **Container Symbol Key** | Container.ts | 新增 Symbol 支援 | 2-3% | 低 | 📋 計劃中 |
| **JSON 序列化快取** | 靜態路由 | 預序列化靜態響應 | 1-2% | 低 | 📋 計劃中 |
| **Request Body 快取** | FastContext.ts | 快取 .json()/.text() 結果 | 3-5% | 低 | 📋 計劃中 |


---

## 詳細工作項 (Pending)

關於已完成項目的詳細日誌，請參閱 [DETAILED_WORK_LOG.md](./history/v1.6-optimizations/DETAILED_WORK_LOG.md)。

---

### Phase 7: PhotonAdapter Proxy 消除 ⏳

**優先級**: P3
**預估工作量**: 3-5 天
**影響範圍**: PhotonAdapter.ts, PhotonContextWrapper

#### 7.1 問題分析

Proxy 無法被 JS 引擎優化，造成 15-25% 的性能損失

**現狀**: PhotonContextWrapper 使用 Proxy 代理屬性存取

#### 7.2 實現方案（方案 C: 物件池化）

- [ ] 設計 PhotonAdapterContextPool
- [ ] 修改 handler 轉換函數
- [ ] 測試 Hono API 相容性
- [ ] 性能基準測試

**參考**: `03-photon-adapter-proxy.md` (已歸檔)

---

### Phase 8: FastContext Headers 池化 ⏳

**優先級**: P3
**預估工作量**: 1-2 天
**條件**: 需要先基準測試驗證假設

- [ ] 測試 Headers 創建開銷
- [ ] 如果收益 > 5%，實現池化機制
- [ ] 否則標記為「不優化」

---

### Phase 9: 微優化集合 ⏳

**優先級**: P4
**預估工作量**: 1-2 天

#### 9.1 Container Symbol Key
- [ ] 添加 Symbol 支援
- [ ] 更新文件推薦

#### 9.2 JSON 序列化快取（靜態響應）
- [ ] 預序列化靜態響應
- [ ] 應用於健康檢查等路由

#### 9.3 Request Body 快取 (FastContext)
- [ ] 在 FastContext 添加 `_cachedJson` 和 `_jsonParsed`
- [ ] 在 reset() 時清除快取


---

### Phase 7: PhotonAdapter Proxy 消除 ⏳

**優先級**: P3
**預估工作量**: 3-5 天
**影響範圍**: PhotonAdapter.ts, PhotonContextWrapper

#### 7.1 問題分析

Proxy 無法被 JS 引擎優化，造成 15-25% 的性能損失

**現狀**: PhotonContextWrapper 使用 Proxy 代理屬性存取

#### 7.2 實現方案（方案 C: 物件池化）

- [ ] 設計 PhotonAdapterContextPool
- [ ] 修改 handler 轉換函數
- [ ] 測試 Hono API 相容性
- [ ] 性能基準測試

**參考**: `03-photon-adapter-proxy.md`

---

### Phase 8: FastContext Headers 池化 ⏳

**優先級**: P3
**預估工作量**: 1-2 天
**條件**: 需要先基準測試驗證假設

- [ ] 測試 Headers 創建開銷
- [ ] 如果收益 > 5%，實現池化機制
- [ ] 否則標記為「不優化」

---

### Phase 9: 微優化集合 ⏳

**優先級**: P4
**預估工作量**: 1-2 天

#### 9.1 Container Symbol Key
- [ ] 添加 Symbol 支援
- [ ] 更新文件推薦

#### 9.2 JSON 序列化快取（靜態響應）
- [ ] 預序列化靜態響應
- [ ] 應用於健康檢查等路由

#### 9.3 Request Body 快取（FastContext）
- [ ] 在 FastContext 添加 `_cachedJson` 和 `_jsonParsed`
- [ ] 在 reset() 時清除快取

---

## 工作流程指南

### 1. 開始優化前

```bash
# 確認當前代碼狀態
bun run typecheck
bun run build
bun test

# 確認無循環依賴
bun run scripts/generate-dependency-graph.ts
```

### 2. 執行每個 Phase

```bash
# Phase X 開始
# 1. 實現代碼
# 2. 運行測試
bun test

# 3. 運行基準測試
bun run bench

# 4. 對比性能改進
# 記錄數據到 benchmark-results/phase-X.json
```

### 3. 驗證無破壞性變更

```bash
# 類型檢查
bun run typecheck

# 全量構建
bun run build

# 完整測試
bun test
```

---

## 測試清單

### 行為一致性測試（必要）

- [ ] 中間件未呼叫 `next()` 且回傳 `Response`
- [ ] 中間件呼叫 `next()` 且回傳 `undefined`
- [ ] 多層中間件混合上述兩種情境
- [ ] 中間件 throw error 時，error handler 仍可正確處理
- [ ] 動態路由多次請求維持相同執行順序

### 快取正確性測試（必要）

- [ ] AOTRouter 快取鍵唯一性（不同路由不共享）
- [ ] compiledDynamicRoutes 快取（不同 pattern 不共享）
- [ ] Body/Query 快取清除機制
- [ ] 新增/更新中間件後快取失效

### 效能驗證（必要）

- [ ] Phase 1-2：Body/Query 快取效果驗證
- [ ] Phase 4-5：中間件預編譯及路由快取效果
- [ ] Phase 7-9：其他優化項效果驗證

### 安全與記憶體（建議）

- [ ] Pool 釋放（異常或中斷下是否安全釋放）
- [ ] 快取大小監控（高路由數量下的記憶體曲線）

---

## 成功標準

| 指標 | 當前基準 | 目標 | 驗證方法 |
|-----|---------|-----|---------|
| 空路由 RPS | ~150k | ~200k+ | oha benchmark |
| 3 中間件路由 RPS | ~80k | ~110k+ | oha benchmark |
| Context 創建時間 | ~2µs | ~100ns+ | mitata bench |
| 記憶體/請求 | ~8KB | ~4KB | heaptrack |
| p99 延遲 | ~1ms | ~0.5ms | oha benchmark |

---

## 追蹤與更新

**上次更新**: 2026-02-21 (優化實施完成)
**更新者**: Optimization Implementation Phase
**完成狀態**:
- ✅ Phase 0: 基準測試套件建立
- ✅ Phase 1: Body 快取實現 + 13 個測試
- ✅ Phase 2: Query 快取驗證 + 14 個測試
- ✅ Phase 3: 基準測試驗證
- ✅ Phase 4: 中間件預編譯 + 17 個測試
- ✅ Phase 5: AOTRouter 快取驗證
- ✅ Phase 6: Headers 優化驗證（已優化）

**新提交**:
- feat: Add text/formData caching to FastContext (4d74addc)
- test: Add MinimalContext query cache tests (e8696f88)
- test: Add middleware precompile tests (824c6219)
- perf: Add mitata benchmarks (a2f0f17f)

**下次步驟**: 執行基準測試套件驗證性能改進
```bash
bun packages/core/benchmarks/optimization-baseline.bench.ts
```

