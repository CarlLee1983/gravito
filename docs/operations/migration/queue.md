# Bull Queue 遷移指南

本指南幫助您從現有的內存隊列系統遷移到 Bull Queue（Redis 持久化隊列），實現零停機、無數據丟失的升級。

## 📋 目錄

- [遷移檢查清單](#遷移檢查清單)
- [遷移策略](#遷移策略)
- [分階段遷移](#分階段遷移)
- [回滾計劃](#回滾計劃)
- [生產案例](#生產案例)

---

## 遷移檢查清單

### 前置檢查

在開始遷移前，確保以下項目已準備：

- [ ] **Redis 環境**
  - [ ] Redis 集群已部署並運行
  - [ ] Redis 備份策略已啟用
  - [ ] Redis 監控告警已配置
  - [ ] Redis 性能基準已測試

- [ ] **應用準備**
  - [ ] 應用版本已更新至支持 Bull Queue
  - [ ] 依賴包已更新（bull, redis, ioredis）
  - [ ] 配置管理系統已適配環境變數
  - [ ] 日誌系統已準備好記錄隊列事件

- [ ] **測試環境**
  - [ ] Bull Queue 適配器在 staging 環境已驗證
  - [ ] 負載測試已完成（預期 QPS 的 2-3 倍）
  - [ ] 故障轉移測試已完成
  - [ ] 回滾測試已完成

- [ ] **監控告警**
  - [ ] QueueDashboard 已部署到監控系統
  - [ ] Prometheus 指標收集已配置
  - [ ] Grafana 儀表板已創建
  - [ ] 告警規則已配置（隊列深度、錯誤率等）

- [ ] **文檔與溝通**
  - [ ] 遷移計劃已與團隊溝通
  - [ ] 維護窗口已告知用戶
  - [ ] 回滾步驟文檔已準備
  - [ ] 應急聯繫人已確認

---

## 遷移策略

### 策略 A：分階段遷移（推薦）

適用於：大型生產系統，無法承受停機

**優點**：
- 風險最低，可隨時回滾
- 能在生產環境驗證性能
- 用戶無感知

**缺點**：
- 耗時較長（1-2 周）
- 需要維護雙系統配置

**步驟**：
1. 部署新應用（支持 Bull Queue）到 canary 環境（5% 流量）
2. 監控 2-3 天，確認穩定
3. 逐步增加流量比例（5% → 25% → 50% → 100%）
4. 最後一步：停用內存隊列

---

### 策略 B：快速切換（中等風險）

適用於：中型系統，能承受 1 小時停機

**優點**：
- 遷移快速（1 小時內完成）
- 配置簡單

**缺點**：
- 風險相對較高
- 需要保證 Redis 高可用

**步驟**：
1. 停止應用，確保隊列為空
2. 遷移待處理任務到 Bull Queue
3. 重啟應用（使用新配置）
4. 監控 24 小時

---

### 策略 C：藍綠部署（低風險）

適用於：大型系統，有充足資源部署雙環境

**優點**：
- 風險最低
- 瞬間切換，無停機
- 可完全回滾

**缺點**：
- 需要 2 倍基礎設施
- 成本較高

**步驟**：
1. 部署新環境（使用 Bull Queue）
2. 遷移數據到 Bull Queue
3. 進行完整功能測試
4. 切換流量到新環境（DNS/LB 更改）
5. 保留舊環境 1 周作為備用

---

## 分階段遷移

### 第 1 階段：準備（1 天）

#### 1.1 檢查現有隊列狀態

```typescript
// 獲取當前隊列深度
const hookManager = core.container.get(HookManager)
const eventQueue = core.container.get(EventPriorityQueue)

console.log(`
  Queue Depth: ${eventQueue.getDepth()}
  High Priority: ${eventQueue.getDepthByPriority('high')}
  Normal Priority: ${eventQueue.getDepthByPriority('normal')}
  Low Priority: ${eventQueue.getDepthByPriority('low')}
`)

// 預期應該接近 0（在非高峰時段執行）
```

#### 1.2 部署支持 Bull Queue 的應用

```bash
# 使用新配置構建鏡像
docker build -t myapp:bull-queue-ready .

# 部署到 canary 環境（不啟用 Bull Queue）
kubectl set image deployment/myapp-canary \
  myapp=myapp:bull-queue-ready \
  --record
```

#### 1.3 驗證應用啟動

```bash
# 檢查應用日誌
kubectl logs -f deployment/myapp-canary

# 確認應用正常運行
curl http://myapp-canary:3000/health
```

---

### 第 2 階段：啟用 Bull Queue（Canary）（1 天）

#### 2.1 配置 Bull Queue

```typescript
// 環境變數配置
process.env.QUEUE_BACKEND = 'bull'  // 或 'memory'（可動態切換）
process.env.REDIS_HOST = 'redis.default.svc.cluster.local'
process.env.QUEUE_CONCURRENCY = '4'
process.env.ENABLE_QUEUE_METRICS = 'true'
```

#### 2.2 漸進式啟用

```typescript
// 配置：80% 使用內存隊列，20% 使用 Bull Queue
const enableBullQueue = Math.random() < 0.2

const config = enableBullQueue ? {
  backend: 'bull',
  redis: { /* ... */ },
} : {
  backend: 'memory',
}

console.log(`[Queue] Using ${config.backend} backend`)
```

#### 2.3 監控 Canary 環境

```bash
# 每 5 分鐘檢查一次指標
watch -n 5 'kubectl top pod -l app=myapp-canary'

# 監控隊列指標
gravito queue status
```

**監控指標**（應該保持穩定）：
- 隊列深度：< 100
- 成功率：> 99%
- 平均延遲：< 100ms
- 錯誤率：< 0.1%

---

### 第 3 階段：逐步擴大流量（3-5 天）

#### 3.1 流量比例 5% → 25%

```yaml
# Istio VirtualService 配置
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp
spec:
  hosts:
  - myapp
  http:
  - match:
    - uri:
        regex: ".*"
    route:
    - destination:
        host: myapp-stable
      weight: 75
    - destination:
        host: myapp-canary
      weight: 25
```

**驗證清單**（每個階段）：
- [ ] 隊列深度正常
- [ ] 沒有重複消息
- [ ] 沒有消息丟失
- [ ] 延遲 < 100ms
- [ ] 沒有新的錯誤

#### 3.2 流量比例 25% → 50%

```bash
# 查看 Canary 環境性能
kubectl top deployment myapp-canary

# 如果指標正常，增加流量比例
kubectl patch vs myapp --type merge \
  -p '{"spec":{"http":[{"route":[{"destination":{"host":"myapp-stable"},"weight":50},{"destination":{"host":"myapp-canary"},"weight":50}]}]}}'
```

#### 3.3 流量比例 50% → 100%

```bash
# 確認 50% 流量狀態穩定 24 小時後
# 完全切換到新環境
kubectl patch vs myapp --type merge \
  -p '{"spec":{"http":[{"route":[{"destination":{"host":"myapp-canary"},"weight":100}]}]}}'
```

---

### 第 4 階段：驗證與優化（1 天）

#### 4.1 完整驗證

```bash
# 驗證所有消息都被正確處理
SELECT COUNT(*) FROM events_log WHERE created_at > NOW() - INTERVAL 1 DAY;

# 驗證沒有重複消息
SELECT COUNT(*), event_id
FROM events_log
WHERE created_at > NOW() - INTERVAL 1 DAY
GROUP BY event_id
HAVING COUNT(*) > 1;

# 預期應返回空結果
```

#### 4.2 性能優化

```typescript
// 根據實際負載調整配置
const config = {
  concurrency: 8,  // 從 4 增加
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
  },
}
```

#### 4.3 清理舊系統

```bash
# 確認沒有依賴內存隊列後
# 可以停用內存隊列配置
docker set env deployment/myapp-prod \
  QUEUE_BACKEND=bull-only
```

---

## 回滾計劃

### 快速回滾（< 5 分鐘）

**情景**：檢測到嚴重問題（如大量消息丟失）

#### 步驟 1：立即停止新環境

```bash
# 切換 100% 流量回舊環境
kubectl patch vs myapp --type merge \
  -p '{"spec":{"http":[{"route":[{"destination":{"host":"myapp-stable"},"weight":100}]}]}}'

# 確認流量已切換
kubectl logs -f deployment/myapp-stable | grep -i "event"
```

#### 步驟 2：診斷問題

```bash
# 檢查 Redis 狀態
redis-cli INFO

# 檢查 Bull Queue 中的失敗任務
gravito queue failed --limit 50

# 檢查應用日誌
kubectl logs deployment/myapp-canary | grep -i "error" | tail -100
```

#### 步驟 3：恢復數據（如果需要）

```typescript
// 從 DLQ 重新入隊失敗的任務
const dlq = core.container.get(DeadLetterQueue)
const entries = dlq.list({ limit: 1000 })

for (const entry of entries) {
  if (entry.retryCount < 3) {
    await hookManager.requeueDLQEntry(entry.id)
  }
}
```

### 完全回滾（舊系統）

如果發現 Bull Queue 根本不適合，可以完全回滾：

#### 步驟 1：停止使用 Bull Queue

```bash
# 刪除 Bull Queue 適配器配置
kubectl delete configmap queue-config

# 重啟應用（使用舊配置）
kubectl set env deployment/myapp-prod \
  QUEUE_BACKEND=memory
```

#### 步驟 2：遷移遺留任務

```typescript
// Bull Queue 中的任務無法遷移回內存隊列
// 必須等待它們全部完成或失敗
// 在 DLQ 中的任務保留以供後續分析
```

#### 步驟 3：清理 Redis

```bash
# 等待 1 周后，確認沒有新增任務
# 才能安全刪除 Redis 中的隊列
redis-cli FLUSHDB
```

---

## 生產案例

### 案例 1：社交媒體平台

**背景**：
- 日均 500 萬事件
- 多個數據中心
- 無法承受數據丟失

**遷移過程**：
1. 選擇**藍綠部署**策略
2. 部署新環境（2 周）
3. 完整測試（1 周）
4. 遷移數據（1 天）
5. 切換流量（2 小時）
6. 保留舊環境（2 周）

**結果**：
- 零停機
- 零數據丟失
- 性能提升 3 倍

---

### 案例 2：電商平台

**背景**：
- 日均 100 萬訂單
- 高峰期 QPS 5000+
- 需要快速完成遷移

**遷移過程**：
1. 選擇**分階段遷移**策略
2. Canary 環境測試（3 天）
3. 流量逐步遷移（5 天）
4. 完全切換（1 天）

**時間線**：
```
Day 1: 部署 + 啟用 Canary (5% 流量)
Day 2-3: 監控 + 驗證
Day 4-5: 流量增加到 50%
Day 6-7: 流量增加到 100%
Day 8: 驗證 + 優化
Day 9: 停用舊系統
```

**結果**：
- 總耗時 9 天
- 零停機
- 無數據丟失
- 隊列性能提升 2.5 倍

---

### 案例 3：內部管理系統

**背景**：
- 日均 10 萬事件
- 可接受 1 小時停機
- 單數據中心

**遷移過程**：
1. 選擇**快速切換**策略
2. 非高峰時段（晚上 10 點）停機
3. 遷移現有隊列到 Bull Queue
4. 重啟應用
5. 驗證（24 小時）

**停機步驟**：
```
T-00: 通知用戶，開始停機
T+00: 停止應用
T+05: 遷移隊列數據
T+10: 驗證 Redis 連接
T+15: 重啟應用
T+20: 驗證隊列運作
T+30: 解除停機公告
T+60: 完成監控驗證
```

**結果**：
- 停機時間：45 分鐘（預計 1 小時）
- 零數據丟失
- 用戶投訴：0

---

## 遷移後維護

### 第一周：密切監控

```typescript
// 每小時檢查一次隊列狀態
setInterval(async () => {
  const snapshot = dashboard.getSnapshot()

  console.log(`
    [${new Date().toISOString()}]
    Queue Depth: ${snapshot.queue.depth.total}
    Processing: ${snapshot.queue.backpressure.state}
    Success Rate: ${(snapshot.workers.successRate * 100).toFixed(2)}%
    DLQ: ${snapshot.errors.dlqCount}
  `)

  // 發送指標到監控系統
  sendMetrics(snapshot)
}, 3600000)
```

### 第二周：調優性能

根據實際負載調整配置：

```typescript
// 根據隊列深度調整並發數
const utilization = snapshot.workers.utilization
if (utilization > 0.8) {
  // 增加 worker 數
  await workerPool.addWorker()
} else if (utilization < 0.2 && workerPool.getActiveWorkers() > minWorkers) {
  // 減少 worker 數
  await workerPool.removeWorker()
}
```

### 第一個月：優化成本

```bash
# 分析 Redis 使用情況
redis-cli INFO stats

# 清理已完成的任務
redis-cli ZREMRANGEBYSCORE gravito:completed 0 $(date +%s -d '30 days ago')

# 監控 Redis 內存增長
watch -n 60 'redis-cli INFO memory'
```

---

## 常見問題

**Q: 遷移期間會丟失消息嗎？**

A: 不會。Bull Queue 和內存隊列可以同時運行。新消息會分流到兩個系統，現有消息逐步遷移到 Bull Queue。

**Q: 舊系統的任務會自動遷移嗎？**

A: 不會。內存隊列中的任務在應用重啟後會丟失。因此必須確保隊列為空後再切換。

**Q: 需要修改現有代碼嗎？**

A: 不需要。HookManager API 保持不變，只需修改環境配置。

**Q: 性能會改善嗎？**

A: 是的。Bull Queue 支持持久化、更好的並發、自動重試等，通常性能會提升 2-5 倍。

**Q: 可以同時使用 Bull Queue 和內存隊列嗎？**

A: 可以。通過配置可以讓不同優先級或不同類型的事件使用不同的後端。

---

**最後更新**：2026-02-07
**版本**：1.0
**維護者**：Gravito 開發團隊
