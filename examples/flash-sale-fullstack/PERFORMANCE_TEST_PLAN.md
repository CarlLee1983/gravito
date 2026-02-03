# 性能測試計畫

搶購系統的 k6 性能測試執行指南。

---

## 前置要求

### 環境設置

```bash
# 1. 啟動 Docker 容器
docker-compose up -d

# 2. 驗證服務可用
docker-compose ps

# 3. 檢查連接
curl http://localhost:3000/health
redis-cli ping
psql -h localhost -U postgres -d flash_sale -c "SELECT version();"
```

### 依賴檢查

```bash
# 驗證 k6 已安裝
k6 version

# 驗證應用可以啟動
bun run typecheck  # 通過 ✅

# 應用啟動（另開終端）
bun run dev
```

---

## 測試執行

### 快速測試 (5 分鐘)

```bash
# 執行輕量級測試
k6 run load-tests/k6-test.js -e VU=10 -e DURATION=5m
```

### 標準測試 (13 分鐘)

```bash
# 執行標準性能測試
bun run test:load

# 或直接使用 k6
k6 run load-tests/k6-test.js
```

### 完整測試 (30 分鐘)

```bash
# 執行完整壓力測試（需要較強的機器）
k6 run load-tests/k6-test.js -e VU=2000 -e DURATION=30m
```

---

## 測試場景

### 場景 1：列表查詢 (20% 流量)

```
GET /api/products
```

**期望**：
- 快取命中率 > 95%（前 5 分鐘後）
- P99 < 50ms（有快取）

### 場景 2：訂單建立 (70% 流量)

```
POST /api/orders
```

**期望**：
- P99 < 1000ms
- 成功率 > 99%

### 場景 3：訂單查詢 (10% 流量)

```
GET /api/orders/{orderId}
```

**期望**：
- P99 < 200ms
- 快取命中率 > 80%

---

## 性能基準記錄

### 執行標準測試

```bash
# 在應用啟動後執行
bun run test:load

# 結果輸出示例
# http_reqs...................: 12345    42.2/s
# http_req_duration...........: avg=234ms p(95)=456ms p(99)=789ms
# http_req_failed.............: 5%
# success_rate................: 95%
```

### 記錄指標到 PERFORMANCE.md

在 PERFORMANCE.md 中的對應表格中填入：

| 指標 | 值 |
|------|-----|
| 總請求數 | XXX |
| 吞吐 (QPS) | XX |
| P50 延遲 | XXms |
| P95 延遲 | XXms |
| P99 延遲 | XXms |
| 錯誤率 | X% |

---

## 瓶頸分析

### 常見瓶頸及解決方案

| 瓶頸 | 表現 | 解決方案 |
|------|------|--------|
| 數據庫連接 | P99 > 500ms | 增加 pool.max |
| CPU 綁定 | CPU 使用率 > 80% | 啟用多進程 |
| Redis 競爭 | 鎖操作延遲 | 優化鎖算法 |
| 隊列堆積 | 消費延遲 | 增加消費者數 |

### 性能優化順序

1. **立即修復** (Critical)
   - 修正 P99 > 1000ms 的端點
   - 修正錯誤率 > 5% 的端點

2. **短期優化** (High Priority)
   - 加入二級快取
   - 優化慢查詢
   - 增加 DB 連接池

3. **中期改進** (Medium Priority)
   - 分佈式追蹤
   - 真實流量測試
   - 資料庫分片

---

## 測試結果報告

### 報告模板

```markdown
## [日期] 性能測試報告

### 測試環境
- 機器：[CPU/Memory]
- 應用版本：[Git commit]
- 快取狀態：[已啟用/禁用]

### 測試結果
[複製 k6 輸出]

### 關鍵指標
- 最大 QPS：XX
- P99 延遲：XXms
- 錯誤率：X%
- 成功率：XX%

### 分析
[描述發現的瓶頸]

### 建議改進
1. XXX
2. XXX
```

---

## 故障排除

### 連接超時

```bash
# 檢查應用
curl -v http://localhost:3000/health

# 檢查 Redis
redis-cli ping

# 檢查 PostgreSQL
psql -h localhost -U postgres -d flash_sale -c "SELECT 1;"
```

### 高錯誤率

```bash
# 查看應用日誌
docker-compose logs -f app

# 檢查數據庫連接
docker-compose logs -f postgres
```

### 測試卡住

```bash
# 查看 k6 進程
ps aux | grep k6

# 停止所有 k6 進程
pkill -f "k6 run"

# 重新啟動應用
docker-compose restart app
```

---

## 自動化測試腳本

### 對比測試（快取前後）

```bash
#!/bin/bash

# 1. 禁用快取，執行測試
echo "=== 測試 1：無快取 ==="
bun run test:load > results_no_cache.txt

# 2. 啟用快取，執行測試
echo "=== 測試 2：有快取 ==="
bun run test:load > results_with_cache.txt

# 3. 對比結果
echo "=== 對比分析 ==="
diff results_no_cache.txt results_with_cache.txt
```

---

## 後續工作

- [ ] 執行基準性能測試
- [ ] 記錄結果到 PERFORMANCE.md
- [ ] 分析瓶頸
- [ ] 實施優化
- [ ] 再次測試並對比改進

---

**最後更新**：2026-02-02
