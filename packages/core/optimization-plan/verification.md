# 驗證計劃

## 基準測試套件

詳見 **[00-baseline.md](./00-baseline.md)** 的基準測試設計。

## HTTP 負載測試

```bash
# 使用 oha 或 wrk
oha -n 100000 -c 100 http://localhost:3000/api/health

# 對比指標：
# - Requests/sec
# - Latency p50, p99
# - Memory usage
```

## 成功標準

| 指標 | 當前基準 | 目標 | 驗證方法 |
|-----|---------|-----|---------|
| 空路由 RPS | ~150k | ~200k+ | oha benchmark |
| 3 中間件路由 RPS | ~80k | ~110k+ | oha benchmark |
| Context 創建時間 (pooled) | ~2µs | ~100ns | mitata bench |
| Context 創建時間 (Proxy) | 待測量 | 降低 50%+ | mitata bench |
| 記憶體/請求 | ~8KB | ~4KB | heaptrack |
| p99 延遲 | ~1ms | ~0.5ms | oha benchmark |

---

## 測試清單（計劃驗證）

### 1) 行為一致性測試（必要）

- **中間件語意對齊**
  - 中間件未呼叫 `next()` 且回傳 `Response`
  - 中間件呼叫 `next()` 且回傳 `undefined`
  - 多層中間件混合以上兩種情境
- **錯誤傳遞**
  - 中間件 throw error 時，是否仍走既有 error handler
- **Dynamic route 行為**
  - 多次請求同一動態路由，應維持相同 handler 與 middleware 執行順序

### 2) 快取正確性測試（必要）

- **AOTRouter 快取鍵**
  - 不同路由但 middleware 長度相同時，不應錯用快取
- **compiledDynamicRoutes 快取**
  - 不同 pattern 不得共享 compiled handler
- **失效機制**
  - 新增或更新 middleware 後，快取必須清除

### 3) 效能驗證（必要）

- **Phase 1-4**
  - mitata：中間件鏈、路由匹配、Proxy / Pool 開銷
  - oha / wrk：空路由、3 中間件、動態路由、PhotonAdapter 路徑
- **Phase 5**
  - Headers 策略基準測試，並記錄「採用/不採用」判定依據

### 4) 安全與記憶體（建議）

- **Pool 釋放**
  - 例外或中斷情境下是否釋放
- **快取大小**
  - 動態路由與中間件快取在高路由數量下的記憶體曲線
