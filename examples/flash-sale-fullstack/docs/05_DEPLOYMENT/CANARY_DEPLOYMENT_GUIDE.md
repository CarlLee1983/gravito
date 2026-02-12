# Flash Sale 灰度部署指南 (Canary Deployment)

**文檔版本**：v1.0
**建立日期**：2026-02-11
**部署目標**：將 Flash Sale P0/P1/P2 系統安全部署到生產環境
**預計耗時**：8-12 小時（Canary → Rollout → Full）

---

## 📋 目錄

1. [部署概述](#部署概述)
2. [前置準備](#前置準備)
3. [Phase 1: Canary（5%）](#phase-1-canary-5)
4. [Phase 2: Rollout（50%）](#phase-2-rollout-50)
5. [Phase 3: Full（100%）](#phase-3-full-100)
6. [監控告警](#監控告警)
7. [回滾計畫](#回滾計畫)
8. [常見問題](#常見問題)

---

## 部署概述

### 灰度部署策略

```
Day 1-2（開發完成）
        ↓
[ 部署就緒 - v2.0.0 ]
        ↓
┌─────────────────────────────────────────┐
│ 灰度部署：三階段上線策略                 │
└─────────────────────────────────────────┘
        ↓
┌──────────────────┐
│ Phase 1: Canary  │
│ 5% 流量 (2-4h)  │
│ 監控 & 驗證      │
└──────────────────┘
        ↓ (通過驗證)
┌──────────────────┐
│ Phase 2: Rollout │
│ 50% 流量 (4-6h) │
│ 監控 & 驗證      │
└──────────────────┘
        ↓ (通過驗證)
┌──────────────────┐
│ Phase 3: Full    │
│ 100% 流量 (24h) │
│ 持續監控 & 穩定  │
└──────────────────┘
        ↓
[ 生產就緒 - 穩定運行 ]
```

### 部署目標

| 階段 | 用戶占比 | 監控時間 | 決策時間 | 目標 |
|------|---------|---------|---------|------|
| **Canary** | 5% | 2-4 小時 | 30 分鐘 | 驗證基礎功能 |
| **Rollout** | 50% | 4-6 小時 | 30 分鐘 | 驗證性能&穩定性 |
| **Full** | 100% | 24+ 小時 | 監控中 | 確保長期穩定 |

---

## 前置準備

### 1. 環境檢查清單

執行以下命令驗證部署就緒狀態：

```bash
# 檢查代碼質量
bun run typecheck
bun run check          # Lint + 格式化檢查

# 檢查構建
bun run build

# 檢查測試
bun run test

# 檢查部署配置
echo "檢查 Docker 鏡像準備"
docker images | grep flash-sale

echo "檢查 Kubernetes 配置"
kubectl get nodes
kubectl get ns
```

✅ **預期結果**：
- typecheck：0 個錯誤
- lint：0 個錯誤
- 測試：752+ 通過
- 構建：成功
- Docker 鏡像：可用
- Kubernetes：正常運行

### 2. 版本確認

```bash
# 確認版本
git describe --tags
# 預期：v2.0.0 或 feature/flash-sale-p2-improvements

# 確認提交
git log --oneline -1
# 預期：daf6883b 或更新

# 確認分支
git branch
# 預期：* feature/flash-sale-p2-improvements
```

### 3. 監控系統準備

確保以下系統已正確部署和連接：

```bash
# Prometheus 健康檢查
curl http://localhost:9090/-/healthy

# Grafana 訪問驗證
curl http://localhost:3001 -I

# AlertManager 檢查
curl http://localhost:9093/-/healthy

# Jaeger 追蹤驗證
curl http://localhost:16686/api/services
```

✅ **預期結果**：
- Prometheus：200 OK
- Grafana：200 OK
- AlertManager：200 OK
- Jaeger：返回服務列表

### 4. 數據備份

```bash
# 備份現有數據庫
mysqldump -u root -p flash_sale > backup_$(date +%Y%m%d_%H%M%S).sql

# 備份 Redis 快取
redis-cli BGSAVE

# 驗證備份
ls -lah backup_*.sql
redis-cli LASTSAVE
```

### 5. 通知相關方

- 📧 通知運維團隊
- 📧 通知業務經理
- 📢 準備客戶溝通
- 🔔 設置告警聯絡人

---

## Phase 1: Canary (5%)

### 目標
- 驗證新版本的基礎功能
- 檢測顯著的性能問題
- 驗證監控系統是否正常工作

### 時間表

```
時間           任務                        負責人
─────────────────────────────────────────────────
T+0  (14:00)   1. 部署Canary版本          DevOps
T+5  (14:05)   2. 驗證部署成功            DevOps
T+10 (14:10)   3. 執行煙霧測試            QA
T+15 (14:15)   4. 開始監控數據收集        Ops
─────────────────────────────────────────────────
T+30 (14:30)   [ 決策點 1 ] - 是否通過？  架構師
                ✅ 通過 → 進入 Rollout
                ❌ 失敗 → 執行回滾
─────────────────────────────────────────────────
T+60 (15:00)   [ 繼續監控 ]               Ops
T+120 (16:00)
T+240 (18:00)
```

### Canary 部署步驟

#### Step 1: 部署新版本（5% 用戶）

```bash
# 1. 創建新版本的 Pod
kubectl set image deployment/flash-sale-web \
  flash-sale=flash-sale:v2.0.0 \
  --record

# 2. 設置流量比例（使用 Istio VirtualService）
cat << 'EOF' | kubectl apply -f -
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: flash-sale
spec:
  hosts:
  - flash-sale.example.com
  http:
  - match:
    - uri:
        prefix: /
    route:
    - destination:
        host: flash-sale
        port:
          number: 3000
        subset: v1.3.0
      weight: 95
    - destination:
        host: flash-sale
        port:
          number: 3000
        subset: v2.0.0
      weight: 5
    timeout: 30s
    retries:
      attempts: 3
      perTryTimeout: 10s
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: flash-sale
spec:
  host: flash-sale
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
    loadBalancer:
      simple: ROUND_ROBIN
  subsets:
  - name: v1.3.0
    labels:
      version: v1.3.0
  - name: v2.0.0
    labels:
      version: v2.0.0
EOF

# 3. 驗證部署
kubectl rollout status deployment/flash-sale-web --timeout=5m
kubectl get pods -l app=flash-sale
```

#### Step 2: 煙霧測試（5 分鐘）

```bash
#!/bin/bash
# canary-smoke-test.sh

BASE_URL="https://api.flash-sale.example.com"
CANARY_HEADER="X-Canary-Test: true"

echo "🧪 Canary 煙霧測試開始..."

# 測試 1: 基礎健康檢查
echo "✓ 測試 1: 健康檢查"
response=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "$CANARY_HEADER" \
  "$BASE_URL/api/health")
if [ "$response" = "200" ]; then
  echo "  ✅ 通過"
else
  echo "  ❌ 失敗 (HTTP $response)"
  exit 1
fi

# 測試 2: 商品查詢
echo "✓ 測試 2: 商品查詢"
response=$(curl -s -H "$CANARY_HEADER" \
  "$BASE_URL/api/products?limit=10" | jq '.success')
if [ "$response" = "true" ]; then
  echo "  ✅ 通過"
else
  echo "  ❌ 失敗"
  exit 1
fi

# 測試 3: 訂單創建
echo "✓ 測試 3: 訂單創建"
response=$(curl -s -X POST -H "$CANARY_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "products": [{"id": "prod-1", "quantity": 1}],
    "shippingAddress": "test address"
  }' \
  "$BASE_URL/api/orders" | jq '.success')
if [ "$response" = "true" ]; then
  echo "  ✅ 通過"
else
  echo "  ❌ 失敗"
  exit 1
fi

# 測試 4: 快取驗證
echo "✓ 測試 4: 快取驗證"
response=$(curl -s -H "$CANARY_HEADER" \
  "$BASE_URL/api/products/trending" | jq '.cacheHitRate')
echo "  快取命中率: $response"

# 測試 5: 性能驗證
echo "✓ 測試 5: 性能驗證（P99 延遲）"
for i in {1..10}; do
  curl -s -H "$CANARY_HEADER" \
    "$BASE_URL/api/products" > /dev/null
done
echo "  ✅ 通過"

echo "✅ 所有煙霧測試通過！"
```

執行測試：
```bash
chmod +x canary-smoke-test.sh
./canary-smoke-test.sh
```

#### Step 3: 監控指標收集

設置 Prometheus 查詢以收集關鍵指標：

```promql
# 1. 請求成功率（應 > 99.5%）
sum(rate(http_requests_total{version="v2.0.0",status=~"2.."}[5m])) /
sum(rate(http_requests_total{version="v2.0.0"}[5m]))

# 2. P99 延遲（應 < 50ms）
histogram_quantile(0.99,
  rate(http_request_duration_seconds_bucket{version="v2.0.0"}[5m])
)

# 3. 錯誤率（應 < 0.5%）
sum(rate(http_requests_total{version="v2.0.0",status=~"5.."}[5m])) /
sum(rate(http_requests_total{version="v2.0.0"}[5m]))

# 4. CPU 使用率（應 < 70%）
container_cpu_usage_seconds_total{pod=~"flash-sale.*v2.0.0"}

# 5. 內存使用量（應 < 500MB）
container_memory_working_set_bytes{pod=~"flash-sale.*v2.0.0"}
```

### Canary 監控儀表板

建立 Grafana 儀表板監控以下指標：

| 指標 | 預期範圍 | 告警閾值 |
|------|---------|---------|
| 請求成功率 | > 99.5% | < 99% |
| P99 延遲 | < 50ms | > 100ms |
| P95 延遲 | < 30ms | > 60ms |
| 錯誤率 | < 0.5% | > 1% |
| CPU 使用率 | < 70% | > 80% |
| 內存使用量 | < 500MB | > 600MB |
| GC 暫停時間 | < 20ms | > 50ms |
| 快取命中率 | > 95% | < 90% |

### Canary 決策點 (T+30 分鐘)

#### ✅ 通過條件（進入 Rollout）

```
滿足所有以下條件：
✓ 請求成功率 ≥ 99.5%
✓ P99 延遲 < 50ms
✓ 錯誤率 ≤ 0.5%
✓ 無 Critical 級告警
✓ 煙霧測試全部通過
✓ 無性能倒退跡象
```

#### ❌ 失敗條件（立即回滾）

```
如果出現以下任何情況：
✗ 請求成功率 < 98%
✗ P99 延遲 > 100ms
✗ 錯誤率 > 1%
✗ 出現 Critical 級告警
✗ 煙霧測試失敗
✗ 性能明顯下降 (> 20%)
✗ 內存洩漏跡象
✗ 數據不一致問題
```

#### 回滾命令

```bash
# 立即回滾到舊版本
kubectl rollout undo deployment/flash-sale-web

# 驗證回滾
kubectl rollout status deployment/flash-sale-web
kubectl get pods -l app=flash-sale

# 檢查日誌
kubectl logs -l app=flash-sale -l version=v1.3.0 --tail=100
```

---

## Phase 2: Rollout (50%)

### 目標
- 在更大規模的用戶基數下驗證系統
- 驗證性能和穩定性
- 檢測邊界情況和罕見問題

### 時間表

```
時間           任務                        負責人
─────────────────────────────────────────────────
T+300 (19:00)  1. 流量逐步增加到50%        DevOps
T+305 (19:05)  2. 監控數據收集開始        Ops
T+330 (19:30)
              [ 監控關鍵指標 ]
─────────────────────────────────────────────────
T+600 (21:00)  [ 決策點 2 ] - 是否通過？  架構師
                ✅ 通過 → 進入 Full
                ❌ 失敗 → 執行回滾
─────────────────────────────────────────────────
T+360 (20:00)
T+480 (21:00)
```

### Rollout 部署步驟

#### Step 1: 漸進式流量增加

```bash
# 使用 Flagger 進行自動化金絲雀部署
cat << 'EOF' | kubectl apply -f -
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: flash-sale
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: flash-sale-web
  progressDeadlineSeconds: 60
  service:
    port: 3000
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
    - name: request-duration
      thresholdRange:
        max: 50
      interval: 1m
  webhooks:
  - name: acceptance-test
    url: http://flagger-loadtester/
    timeout: 30s
    metadata:
      type: smoke
      cmd: "curl -sd 'test' http://flash-sale-canary:3000/api/health"
  - name: load-test
    url: http://flagger-loadtester/
    timeout: 5s
    metadata:
      type: load
      cmd: "ab -n 100 -c 10 http://flash-sale-canary:3000/"
EOF

# 監控金絲雀進度
kubectl describe canary flash-sale

# 查看詳細的推展日誌
kubectl logs -l app.kubernetes.io/name=flagger --tail=50 -f
```

流量增加方案：
- T+0 分鐘：10% (v2.0.0)
- T+10 分鐘：20% (v2.0.0)
- T+20 分鐘：30% (v2.0.0)
- T+30 分鐘：40% (v2.0.0)
- T+40 分鐘：50% (v2.0.0)

#### Step 2: 壓力測試

使用 Apache Bench 或 k6 進行負載測試：

```bash
# k6 負載測試腳本
cat << 'EOF' > load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '5m', target: 100 },    // 5分鐘內升至100並發
    { duration: '10m', target: 200 },   // 10分鐘內升至200並發
    { duration: '5m', target: 0 },      // 5分鐘內逐步降至0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function () {
  const url = 'https://api.flash-sale.example.com';

  // 測試 API 端點
  let response = http.get(`${url}/api/products?limit=10`);
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
EOF

# 執行負載測試
k6 run load-test.js
```

#### Step 3: 集成測試

```bash
# 運行完整的集成測試套件
cd examples/flash-sale-fullstack

# 測試 P2.3 報表系統
bun test tests/cache-integration/scenarios/P2.3*.test.ts

# 測試 P2.1 分片系統
bun test docs/P2.1*.test.ts

# 測試 P2.2 多區域系統
bun test docs/P2.2*.test.ts

# 收集測試覆蓋率
bun test --coverage
```

### Rollout 決策點 (T+300 分鐘後)

#### ✅ 通過條件（進入 Full）

```
滿足所有以下條件：
✓ 請求成功率 ≥ 99.5%（相對於 v1.3.0）
✓ P95 延遲 ≤ 30ms（相對於 v1.3.0）
✓ P99 延遲 ≤ 50ms（相對於 v1.3.0）
✓ 錯誤率 ≤ 0.5%（相對於 v1.3.0）
✓ 快取命中率 ≥ 95%
✓ 無 Critical 級告警持續出現
✓ 性能無明顯下降（< 5% 差異）
✓ 負載測試通過（k6）
✓ 集成測試通過率 100%
✓ 無數據不一致報告
```

#### ❌ 失敗條件（立即回滾）

```
如果出現以下任何情況：
✗ 請求成功率下降 > 1%
✗ P99 延遲增加 > 100%
✗ 錯誤率 > 1%
✗ Critical 告警頻繁出現
✗ 負載測試失敗
✗ 集成測試通過率 < 95%
✗ 內存洩漏跡象加重
✗ 數據不一致問題出現
✗ 用戶投訴增加明顯
```

---

## Phase 3: Full (100%)

### 目標
- 完整部署到所有用戶
- 持續監控長期穩定性
- 確保系統處於最佳狀態

### 時間表

```
時間           任務                        負責人
─────────────────────────────────────────────────
T+700 (翌日08:00)
              1. 流量全量切換到v2.0.0    DevOps
              2. 停用v1.3.0實例          DevOps
              3. 啟動24小時監控          Ops
─────────────────────────────────────────────────
T+1400 (翌日翌日08:00)
              [ 最終驗收 ] - 穩定性確認  架構師
              ✅ 通過 → 生產就緒
              ❌ 問題 → 分析並修復
─────────────────────────────────────────────────
```

### Full 部署步驟

#### Step 1: 完全流量切換

```bash
# 更新 VirtualService 將100%流量導向v2.0.0
kubectl patch virtualservice flash-sale \
  --type merge \
  -p '{
    "spec": {
      "http": [{
        "route": [{
          "destination": {
            "host": "flash-sale",
            "subset": "v2.0.0"
          },
          "weight": 100
        }]
      }]
    }
  }'

# 驗證流量切換
kubectl get vs flash-sale -o yaml | grep weight

# 逐步停用舊版本實例
kubectl scale deployment flash-sale-web-v1.3.0 --replicas=0
```

#### Step 2: 24小時監控

設置持續監控以檢查：

```bash
# 監控腳本 (monitor-24h.sh)
#!/bin/bash

PROMETHEUS_URL="http://localhost:9090"
DURATION="24h"

echo "🔍 24小時監控開始..."

# 每小時記錄一次指標
for hour in {1..24}; do
  echo "[ 小時 $hour ]"

  # 請求成功率
  curl -s "${PROMETHEUS_URL}/api/v1/query" \
    --data-urlencode 'query=http_requests_success_rate{version="v2.0.0"}' | \
    jq '.data.result[0].value[1]' | \
    awk '{print "  成功率: " $1 "%"}'

  # P99 延遲
  curl -s "${PROMETHEUS_URL}/api/v1/query" \
    --data-urlencode 'query=http_request_p99_latency{version="v2.0.0"}' | \
    jq '.data.result[0].value[1]' | \
    awk '{print "  P99 延遲: " $1 "ms"}'

  # 錯誤率
  curl -s "${PROMETHEUS_URL}/api/v1/query" \
    --data-urlencode 'query=http_requests_error_rate{version="v2.0.0"}' | \
    jq '.data.result[0].value[1]' | \
    awk '{print "  錯誤率: " $1 "%"}'

  # 快取命中率
  curl -s "${PROMETHEUS_URL}/api/v1/query" \
    --data-urlencode 'query=cache_hit_rate{version="v2.0.0"}' | \
    jq '.data.result[0].value[1]' | \
    awk '{print "  快取命中率: " $1 "%"}'

  if [ $hour -lt 24 ]; then
    sleep 3600  # 等待1小時
  fi
done

echo "✅ 24小時監控完成！"
```

執行監控：
```bash
chmod +x monitor-24h.sh
./monitor-24h.sh | tee monitoring-report.log
```

#### Step 3: 最終驗收檢查

```bash
# 檢查清單
cat << 'EOF'
[ ] 1. 所有實例健康檢查通過
      kubectl get pods -l app=flash-sale -o wide

[ ] 2. 沒有 OOMKilled 或 CrashLoopBackOff 實例
      kubectl get events --sort-by='.lastTimestamp'

[ ] 3. 數據庫副本同步正常
      kubectl logs -l component=mysql-replication

[ ] 4. Redis 快取無異常
      redis-cli INFO replication
      redis-cli INFO memory

[ ] 5. Prometheus 告警清空
      curl http://localhost:9093/api/v1/alerts

[ ] 6. 用戶報告無異常
      確認支持團隊無投訴增加

[ ] 7. 關鍵業務指標正常
      訂單成功率 ≥ 99.5%
      支付成功率 ≥ 99.9%

[ ] 8. 性能指標達成
      P95 延遲 < 30ms
      P99 延遲 < 50ms
      快取命中率 > 95%

[ ] 9. 日誌無異常
      kubectl logs -l app=flash-sale --tail=1000 | grep ERROR

[ ] 10. 備份系統正常
       最新備份時間 < 1 小時
       備份完整性驗證通過
EOF
```

執行最終驗收：
```bash
# 1. 檢查實例狀態
kubectl get pods -l app=flash-sale --show-labels

# 2. 檢查事件
kubectl get events -A --sort-by='.lastTimestamp' | tail -20

# 3. 檢查告警
curl -s http://localhost:9093/api/v1/alerts | jq '.data | length'

# 4. 檢查指標
curl -s 'http://localhost:9090/api/v1/query?query=up{job="prometheus"}' | jq '.data.result'

# 5. 生成最終報告
echo "=== Flash Sale v2.0.0 部署驗收報告 ===" > final-report.md
echo "部署時間: $(date)" >> final-report.md
echo "版本: v2.0.0" >> final-report.md
echo "狀態: 生產就緒" >> final-report.md
```

---

## 監控告警

### 告警規則

| 告警名稱 | 條件 | 嚴重性 | 動作 |
|---------|------|--------|------|
| **HighErrorRate** | 錯誤率 > 1% 持續5分鐘 | 🔴 Critical | 自動回滾 |
| **HighLatency** | P99 延遲 > 100ms 持續5分鐘 | 🟠 Warning | 通知 |
| **LowCacheHitRate** | 命中率 < 90% 持續10分鐘 | 🟠 Warning | 通知 |
| **HighMemoryUsage** | 記憶體 > 600MB | 🟠 Warning | 通知 |
| **PodCrashLooping** | Pod 崩潰超過3次 | 🔴 Critical | 自動回滾 |
| **DatabaseReplicationLag** | 副本延遲 > 10s | 🟠 Warning | 通知 |
| **HighCPUUsage** | CPU > 80% 持續10分鐘 | 🟠 Warning | 自動擴展 |

### 通知渠道

```
告警 → Prometheus AlertManager
       ├─ Critical: PagerDuty + Slack + 短信
       ├─ Warning: Slack + Email
       └─ Info: 日誌記錄

Slack 頻道：#flash-sale-deployment
Email：devops-team@company.com
PagerDuty：On-call 工程師
```

---

## 回滾計畫

### 快速回滾（< 5 分鐘）

如果檢測到 Critical 問題，執行即時回滾：

```bash
#!/bin/bash
# rollback.sh

echo "⚠️ 執行回滾..."

# 1. 立即回滾部署
kubectl rollout undo deployment/flash-sale-web
kubectl rollout undo deployment/flash-sale-cache
kubectl rollout undo deployment/flash-sale-api

# 2. 驗證回滾完成
kubectl rollout status deployment/flash-sale-web --timeout=5m

# 3. 檢查實例狀態
echo "檢查實例..."
kubectl get pods -l app=flash-sale

# 4. 驗證流量恢復
echo "驗證流量恢復到 v1.3.0..."
curl -s http://api.flash-sale.example.com/api/health | jq '.version'

# 5. 驗證數據一致性
echo "驗證數據一致性..."
mysql -u root -p -e "SELECT COUNT(*) FROM flash_sale.orders"

# 6. 發送通知
echo "發送回滾通知..."
curl -X POST https://hooks.slack.com/services/YOUR/HOOK \
  -d '{
    "text": "🔴 Flash Sale v2.0.0 回滾完成。版本：v1.3.0"
  }'

echo "✅ 回滾完成！"
```

執行回滾：
```bash
chmod +x rollback.sh
./rollback.sh
```

### 數據恢復（如果需要）

```bash
# 1. 停止所有寫操作
kubectl patch deployment flash-sale-web \
  -p '{"spec": {"replicas": 0}}'

# 2. 恢復數據庫備份
mysql -u root -p < backup_$(date +%Y%m%d_%H%M%S).sql

# 3. 恢復 Redis 快取
redis-cli SHUTDOWN
# 恢復備份的 RDB 文件到 /var/lib/redis/dump.rdb
redis-server

# 4. 驗證數據
mysql -u root -p -e "SELECT COUNT(*) FROM flash_sale.orders"
redis-cli DBSIZE

# 5. 重啟應用
kubectl patch deployment/flash-sale-web \
  -p '{"spec": {"replicas": 5}}'
```

---

## 常見問題

### Q1: 如何在部署中途停止？

```bash
# 立即停止並回滾
./rollback.sh

# 或者手動停止
kubectl set image deployment/flash-sale-web \
  flash-sale=flash-sale:v1.3.0
```

### Q2: Canary 階段出現問題怎麼辦？

```
1. 立即執行回滾（< 30 秒）
2. 分析日誌和指標
3. 修復問題
4. 等待 1 小時後重新進行 Canary 測試
```

### Q3: 如何監控特定用戶的體驗？

```bash
# 為特定用戶標記流量
kubectl set env deployment/flash-sale-web \
  CANARY_USER_ID="user-123,user-456"

# 監控該用戶的指標
curl 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=http_requests_total{user_id=~"user-.*"}'
```

### Q4: 部署失敗後數據會丟失嗎？

```
不會。因為：
1. 我們執行了完整的數據庫備份
2. Redis 保存了快取（可恢復）
3. 回滾時數據保持不變
4. 備份每小時自動更新
```

### Q5: 如何檢查部署的完整性？

```bash
# 生成部署完整性報告
cat << 'EOF' > verify-deployment.sh
#!/bin/bash

echo "=== 部署完整性檢查 ==="

# 1. 版本檢查
echo "✓ 檢查版本..."
kubectl describe deployment flash-sale-web | grep Image

# 2. 副本檢查
echo "✓ 檢查副本..."
kubectl get deployment flash-sale-web

# 3. Pod 檢查
echo "✓ 檢查 Pod..."
kubectl get pods -l app=flash-sale -o wide

# 4. 服務檢查
echo "✓ 檢查服務..."
kubectl get svc flash-sale

# 5. 端點檢查
echo "✓ 檢查端點..."
kubectl get endpoints flash-sale

# 6. 配置檢查
echo "✓ 檢查配置..."
kubectl get configmap flash-sale-config -o yaml

# 7. 秘密檢查
echo "✓ 檢查秘密..."
kubectl get secrets | grep flash-sale

# 8. 日誌檢查
echo "✓ 檢查日誌..."
kubectl logs -l app=flash-sale --tail=10 | grep -i "error"

echo "=== 檢查完成 ==="
EOF

chmod +x verify-deployment.sh
./verify-deployment.sh
```

---

## 檢查清單

### 部署前檢查清單

```
部署前 (T-1 小時)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] 代碼構建驗證（0 個錯誤）
[ ] 測試通過率 100%（752+ 個測試）
[ ] 依賴檢查（無循環依賴）
[ ] 類型檢查（0 個類型錯誤）
[ ] Lint 檢查（0 個警告）
[ ] 備份已完成
[ ] 監控系統就緒
[ ] 告警規則已加載
[ ] Slack/PagerDuty 已連接
[ ] 通知已發送給相關方
```

### Canary 檢查清單

```
Canary 部署 (T+0 到 T+240)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
T+5  [ ] 部署驗證成功
     [ ] Pod 狀態 Running
     [ ] 煙霧測試通過
T+15 [ ] 監控數據收集中
     [ ] 無告警
T+30 [ ] 決策點檢查清單
     [ ] 成功率 ≥ 99.5% ✓
     [ ] P99 延遲 < 50ms ✓
     [ ] 錯誤率 ≤ 0.5% ✓
     [ ] 決策：PASS / FAIL
```

### Rollout 檢查清單

```
Rollout 部署 (T+300 到 T+600)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
T+310 [ ] 流量增加到 20%
      [ ] 負載測試開始
T+330 [ ] 流量增加到 40%
T+350 [ ] 集成測試運行
T+600 [ ] 決策點檢查清單
      [ ] 成功率 ≥ 99.5% ✓
      [ ] P95 延遲 ≤ 30ms ✓
      [ ] 負載測試通過 ✓
      [ ] 決策：PASS / FAIL
```

### Full 檢查清單

```
Full 部署 (T+700 到 T+1400)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
T+700  [ ] 流量切換到 100%
       [ ] v1.3.0 實例關閉
       [ ] 24小時監控開始
T+1400 [ ] 最終驗收檢查清單
       [ ] 所有實例健康 ✓
       [ ] 無 OOM 或崩潰 ✓
       [ ] 數據一致性驗證 ✓
       [ ] 快取運行正常 ✓
       [ ] 無告警 ✓
       [ ] 用戶反饋正面 ✓
       [ ] 性能目標達成 ✓
       [ ] 最終決策：通過
```

---

## 總結

### 部署時間線

| 階段 | 時間 | 用戶占比 | 決策時間 | 結果 |
|------|------|---------|---------|------|
| **Canary** | 2-4 小時 | 5% | T+30 | ✅ 通過 |
| **Rollout** | 4-6 小時 | 50% | T+300 | ✅ 通過 |
| **Full** | 24+ 小時 | 100% | T+1400 | ✅ 通過 |
| **合計** | **8-12 小時** | - | - | **✅ 生產就緒** |

### 成功標誌

```
✅ 灰度部署成功的標誌：

1. 所有三個階段都通過驗收
2. 沒有出現 Critical 級問題
3. 性能指標達成或超額完成
4. 用戶反饋正面
5. 系統穩定運行超過 24 小時
6. 備份和恢復機制已驗證
7. 監控告警系統正常運作
8. 團隊對系統有充分信心
```

### 生產就緒確認

一旦通過所有檢查點，Flash Sale v2.0.0 即被視為：

✅ **生產就緒**（Production Ready）
✅ **穩定可靠**（Stable & Reliable）
✅ **性能達成**（Performance Met）
✅ **支持就位**（Support Ready）

---

**部署指南版本**：v1.0
**最後更新**：2026-02-11
**下次評審**：部署完成後

🎉 **祝部署順利！**
