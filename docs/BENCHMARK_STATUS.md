# Gravito Engine - Benchmark Implementation

## 當前狀態

### 已完成
1. ✅ 安裝 `oha` benchmark 工具
2. ✅ 創建 4 個 baseline 測試服務器：
   - Bun Native (理論上限)
   - Gravito Engine
   - Hono (目標對比)
   - Elysia (競爭對手)
3. ✅ 實作自動化 benchmark runner
4. ✅ 修正 JSON 解析邏輯以匹配 oha 輸出格式

### Benchmark 配置
- **測試場景**: GET / (最簡單的靜態路由)
- **預熱時間**: 5 秒
- **測試時間**: 30 秒
- **並發連接**: 100
- **工具**: oha (Rust 實作，避免 Node.js Event Loop 瓶頸)

## 初步結果 (第一次運行)

從第一次不完整的運行中，我們獲得了以下數據：

| 框架 | RPS | 延遲 p50 | 延遲 p95 | 延遲 p99 |
|------|-----|----------|----------|----------|
| Bun Native | ~93,295 | 0.97ms | 1.78ms | 2.30ms |
| Gravito Engine | ~73,974 | 1.24ms | 2.12ms | 2.92ms |
| Hono | (啟動失敗) | - | - | - |
| Elysia | (測試中斷) | - | - | - |

### 關鍵發現

1. **Gravito vs Bun Native**: 
   - Gravito 比原生 Bun.serve 慢約 **20.7%**
   - 這是框架開銷，需要優化

2. **性能差距分析**:
   - RPS 差距: 19,321 req/s
   - 延遲增加: ~0.27ms (p50)
   
3. **潛在瓶頸**:
   - 物件池可能有額外開銷
   - 路由匹配（即使是靜態路由）
   - Context 創建/重置
   - 中間件執行框架

## 下一步行動

### 立即執行 (正在進行)
- [ ] 完成完整的 4 框架 benchmark
- [ ] 獲得 Gravito vs Hono 的準確對比數據

### 如果未達標 (< +20% vs Hono)

#### 階段 1: 性能分析
1. 使用 Bun profiler 生成火焰圖
2. 識別熱點代碼路徑
3. 測量每個組件的開銷

#### 階段 2: 優化策略

**優先級 1: 路由優化**
- 檢查靜態路由 Map 查找是否真的 O(1)
- 減少路由匹配過程中的對象創建
- 考慮內聯關鍵路徑代碼

**優先級 2: Context 優化**
- 減少 FastContext.reset() 的開銷
- 延遲解析可能仍有優化空間
- 考慮更激進的內聯

**優先級 3: 中間件優化**
- 對於零中間件的路由，跳過中間件執行邏輯
- 優化 next() 函數調用

**優先級 4: 池化優化**
- 測試不同的池大小
- 考慮使用更輕量的池實作
- 評估是否池化真的帶來收益

#### 階段 3: 極致優化
如果常規優化仍不夠：
- 考慮使用 Bun 的 FFI 或底層 API
- 研究 Elysia 的優化技巧
- 可能需要重寫部分核心邏輯

## Benchmark 文件結構

```
examples/benchmarks/
├── servers/
│   ├── bun-native.ts          # 原生 Bun.serve
│   ├── gravito-baseline.ts    # Gravito Engine
│   ├── hono-baseline.ts       # Hono
│   └── elysia-baseline.ts     # Elysia
├── baseline-runner.ts         # 自動化測試腳本
└── results/
    ├── latest-run.log         # 最新運行日誌
    └── baseline-*.json        # 歷史結果
```

## 成功標準 (來自 RFC)

| 指標 | 目標值 | 當前狀態 |
|------|--------|----------|
| 靜態路由 RPS | > Hono +20% | 待測試 |
| 動態路由 RPS | > Hono +15% | 待測試 |
| 每請求記憶體分配 | < 1KB | 待測試 |
| 框架開銷 | 盡可能接近原生 | ~20.7% |

## 備註

- 第一次運行遇到了導入路徑問題（已修復）
- oha 的 JSON 輸出格式與預期不同（已修復）
- 需要等待完整 benchmark 完成才能做出最終判斷
