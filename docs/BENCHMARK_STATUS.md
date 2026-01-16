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

## 最新結果 (2026-01-16)



| 框架 | RPS | 延遲 p50 | 延遲 p95 | 延遲 p99 | vs Native |

|------|-----|----------|----------|----------|-----------|

| Bun Native | 123,608 | 0.61ms | 1.78ms | 2.72ms | - |

| **Gravito Engine** | **116,495** | **0.65ms** | **1.86ms** | **2.70ms** | **-5.8%** |

| Hono | 95,976 | 0.78ms | 2.16ms | 3.32ms | -22.4% |

| Elysia | 66,769 | 0.77ms | 2.56ms | 15.93ms | -46.0% |



### 關鍵成就



1.  **極致性能**: Gravito Engine 僅比原生 Bun.serve 慢 5.8% (框架開銷極低)。

2.  **超越目標**: 成功達成「比 Hono 快 20%」的目標，實際領先 **21.4%** (116.5k vs 96.0k)。

3.  **優化生效**:

    - MinimalContext 與路徑提取優化成功。

    - 靜態路由 AOT 分析消除了中間件檢查開銷。

    - Phase 4 Cookie 解析去重進一步減少了關鍵路徑開銷。

## 下一步行動

### 已完成優化
- [x] Phase 1: 核心優化 (extractPath, MinimalContext)
- [x] Phase 2: 路由優化 (AOT Compile, isPureStaticApp)
- [x] Phase 3: Context 優化 (Headers reset)
- [x] Phase 4: Handler 分析 (Analyzer, 智能 Context 選擇)

### 後續計劃
- 目前性能已接近理論極限 (Bun Native)，進一步優化收益極邊際。
- 建議轉向功能完善與穩定性測試。
