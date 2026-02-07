# 生產環境部署檢查清單

重試系統生產環境完整部署指南

## 📋 目錄

1. [前置條件](#前置條件)
2. [資源規劃](#資源規劃)
3. [10 步部署流程](#10-步部署流程)
4. [驗證腳本](#驗證腳本)
5. [監控告警設置](#監控告警設置)
6. [容量規劃](#容量規劃)
7. [故障恢復計劃](#故障恢復計劃)
8. [SLO 定義](#slo-定義)

---

## 前置條件

### 基礎設施

#### Redis 集群（可用性要求）

```bash
# 最小配置：3 節點（Sentinel）
# 推薦配置：5 節點（Sentinel）+ 主從複製

redis-sentinel-1: primary
redis-sentinel-2: replica
redis-sentinel-3: replica
```

**檢查清單**：
- [ ] Redis 版本 >= 6.0（支援 ACL）
- [ ] 3 個或以上的 Sentinel 節點
- [ ] 主從複製延遲 < 100ms
- [ ] 持久化啟用（AOF）
- [ ] 內存大小 >= 4GB
- [ ] 最大連接數 >= 10000

#### 應用服務器

```bash
# 最小配置
CPU: 2 核心
內存: 4GB
存儲: 10GB

# 推薦配置（生產環境）
CPU: 8 核心
內存: 16GB
存儲: 100GB
```

**檢查清單**：
- [ ] Node.js >= 16.0
- [ ] 磁盤空間足夠
- [ ] 網路連接穩定（延遲 < 10ms）
- [ ] 防火牆規則已配置

### 軟體依賴

```bash
# 驗證版本
node --version          # >= 16.0
npm --version          # >= 7.0
redis-cli --version    # >= 6.0

# 驗證包依賴
npm ls bullmq          # 應該顯示已安裝
npm ls redis           # 應該顯示已安裝
npm ls @gravito/core   # 應該顯示 >= 2.0.0
```

### 監控棧

- [ ] Prometheus >= 2.35.0
- [ ] Grafana >= 9.0.0
- [ ] AlertManager >= 0.23.0
- [ ] 足夠的磁盤空間儲存指標（30 天）

---

## 資源規劃

### 按流量級別規劃

| 指標 | 小流量 | 中流量 | 大流量 |
|------|--------|--------|--------|
| **日事件量** | < 1M | 1M - 10M | > 10M |
| **QPS** | < 100 | 100 - 1000 | > 1000 |
| **CPU** | 2 核 | 4-8 核 | 16+ 核 |
| **內存** | 4GB | 8-16GB | 32GB+ |
| **Redis** | 單機 + Sentinel | 集群 (3 節點) | 集群 (5+ 節點) |
| **應用實例** | 1-2 | 3-5 | 10+ |

### 容量計算

```typescript
// 計算所需資源

interface Workload {
  dailyEventCount: number
  avgEventSize: number
  retryRatio: number
  maxConcurrency: number
}

function calculateResources(workload: Workload) {
  const {
    dailyEventCount,
    avgEventSize,
    retryRatio,
    maxConcurrency
  } = workload

  // Redis 內存估計
  const baseQueueSize = dailyEventCount * avgEventSize
  const retrySize = baseQueueSize * retryRatio
  const totalMemory = (baseQueueSize + retrySize) * 1.5 // 50% 安全邊際
  const estimatedMemory = Math.ceil(totalMemory / 1024 / 1024) // MB

  // CPU 需求
  const expectedCPU = Math.ceil(maxConcurrency / 1000) // 每 1000 QPS 1 核心

  // 磁盤需求（30 天指標）
  const metricsPerDay = dailyEventCount * 10 // 估計 10 個指標/事件
  const diskPerDay = (metricsPerDay * 100) / 1024 / 1024 // MB
  const monthlyDisk = Math.ceil(diskPerDay * 30)

  return {
    redis: {
      memory_gb: Math.ceil(estimatedMemory / 1024),
      recommended: estimatedMemory * 2 > 4096 ? 'cluster' : 'standalone'
    },
    app: {
      cpu_cores: expectedCPU,
      memory_gb: Math.ceil(expectedCPU * 2),
      instances: Math.max(1, Math.ceil(maxConcurrency / 1000))
    },
    monitoring: {
      storage_gb: Math.ceil(monthlyDisk / 1024)
    }
  }
}

// 示例
const resources = calculateResources({
  dailyEventCount: 5000000,
  avgEventSize: 500,
  retryRatio: 0.05,
  maxConcurrency: 500
})

console.log(resources)
```

---

## 10 步部署流程

### 步驟 1: 環境準備（預部署）

```bash
#!/bin/bash
set -e

echo "📋 環境準備..."

# 1.1 創建部署目錄
mkdir -p /opt/gravito-app/{app,logs,config,backups}
cd /opt/gravito-app

# 1.2 檢查依賴
node --version && echo "✅ Node.js 已安裝"
redis-cli --version && echo "✅ Redis 已安裝"
docker --version && echo "✅ Docker 已安裝"

# 1.3 創建用戶和權限
useradd -m -s /bin/bash gravito || true
chown -R gravito:gravito /opt/gravito-app
chmod 755 /opt/gravito-app

echo "✅ 環境準備完成"
```

### 步驟 2: Redis 部署（基礎設施）

```yaml
# docker-compose.redis.yml
version: '3.8'

services:
  redis-primary:
    image: redis:7-alpine
    container_name: redis-primary
    ports:
      - "6379:6379"
    command: >
      redis-server
      --appendonly yes
      --appendfsync everysec
      --maxmemory 4gb
      --maxmemory-policy allkeys-lru
    volumes:
      - redis-primary-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis-replica-1:
    image: redis:7-alpine
    container_name: redis-replica-1
    ports:
      - "6380:6379"
    command: redis-server --slaveof redis-primary 6379
    depends_on:
      redis-primary:
        condition: service_healthy
    volumes:
      - redis-replica-1-data:/data

  redis-replica-2:
    image: redis:7-alpine
    container_name: redis-replica-2
    ports:
      - "6381:6379"
    command: redis-server --slaveof redis-primary 6379
    depends_on:
      - redis-primary
    volumes:
      - redis-replica-2-data:/data

volumes:
  redis-primary-data:
  redis-replica-1-data:
  redis-replica-2-data:
```

部署命令：
```bash
# 2.1 啟動 Redis
docker-compose -f docker-compose.redis.yml up -d

# 2.2 驗證
sleep 10
docker-compose -f docker-compose.redis.yml ps
redis-cli INFO replication

# 2.3 備份初始狀態
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb /opt/gravito-app/backups/dump-initial.rdb
```

### 步驟 3: 應用部署

```bash
#!/bin/bash
set -e

echo "📦 部署應用程序..."

# 3.1 下載應用
cd /opt/gravito-app/app
git clone https://github.com/your-org/gravito-core.git .
git checkout v2.0.0

# 3.2 安裝依賴
npm ci --only=production

# 3.3 構建應用
npm run build

# 3.4 複製配置
cp /opt/gravito-app/config/.env .env.production

# 3.5 驗證構建
npm run typecheck
npm run test

echo "✅ 應用部署完成"
```

### 步驟 4: 配置管理

```bash
# 4.1 創建環境配置
cat > /opt/gravito-app/config/.env <<'EOF'
# Redis
REDIS_HOST=redis-primary
REDIS_PORT=6379
REDIS_DB=0

# 重試配置
RETRY_INITIAL_DELAY_MS=1000
RETRY_MULTIPLIER=2
RETRY_MAX_DELAY_MS=60000
RETRY_MAX_RETRIES=5

# 背壓配置
BACKPRESSURE_WARNING_THRESHOLD=500
BACKPRESSURE_CRITICAL_THRESHOLD=1000

# 應用配置
APP_PORT=3000
APP_ENV=production
LOG_LEVEL=info

# Prometheus
PROMETHEUS_PORT=9090
METRICS_ENABLED=true
EOF

# 4.2 保護敏感信息
chmod 600 /opt/gravito-app/config/.env
```

### 步驟 5: 監控棧部署

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus-retry-alerts.yml:/etc/prometheus/rules/retry-alerts.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana-retry-dashboard.json:/etc/grafana/provisioning/dashboards/retry.json
    depends_on:
      - prometheus

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager-data:/alertmanager

volumes:
  prometheus-data:
  grafana-data:
  alertmanager-data:
```

### 步驟 6: 應用啟動

```bash
#!/bin/bash
set -e

echo "🚀 啟動應用..."

cd /opt/gravito-app/app

# 6.1 啟動應用（使用 PM2）
pm2 start npm --name "gravito-app" -- start

# 6.2 檢查日誌
sleep 5
pm2 logs gravito-app | head -20

# 6.3 驗證健康檢查
sleep 10
curl http://localhost:3000/health || echo "❌ 健康檢查失敗"

echo "✅ 應用已啟動"
```

### 步驟 7: 初始化驗證

```bash
#!/bin/bash

echo "🔍 初始化驗證..."

# 7.1 應用健康
echo "1. 檢查應用健康..."
APP_HEALTH=$(curl -s http://localhost:3000/health)
echo "   $APP_HEALTH"

# 7.2 Redis 連接
echo "2. 檢查 Redis 連接..."
redis-cli ping

# 7.3 Prometheus 指標
echo "3. 檢查 Prometheus..."
curl -s http://localhost:9090/api/v1/query?query=up | jq '.data.result[]'

# 7.4 Grafana 訪問
echo "4. 檢查 Grafana..."
curl -s http://localhost:3001/api/health | jq '.database'

echo "✅ 初始化驗證完成"
```

### 步驟 8: 數據遷移（如果需要）

```bash
#!/bin/bash

echo "🔄 數據遷移..."

# 8.1 備份舊數據
mysqldump -u root -p old_retry_db > /opt/gravito-app/backups/old-db-backup.sql

# 8.2 遷移待重試任務
npm run migrate:retries

# 8.3 驗證遷移
redis-cli DBSIZE

echo "✅ 數據遷移完成"
```

### 步驟 9: 告警配置

```bash
#!/bin/bash

echo "📢 配置告警..."

# 9.1 啟用告警規則
curl -X POST http://localhost:9090/-/reload

# 9.2 配置 Slack
cat > alertmanager.yml <<'EOF'
global:
  resolve_timeout: 5m

route:
  receiver: 'slack-notifications'
  group_by: ['alertname']

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - api_url: $SLACK_WEBHOOK_URL
        channel: '#alerts'
        send_resolved: true
EOF

# 9.3 測試告警
curl -X POST \
  http://localhost:9093/api/v1/alerts \
  -H 'Content-Type: application/json' \
  -d '[{"labels":{"alertname":"TestAlert"}}]'

echo "✅ 告警配置完成"
```

### 步驟 10: 生產驗收

```bash
#!/bin/bash

echo "✅ 生產驗收..."

# 10.1 性能基準測試
echo "1. 性能測試..."
k6 run packages/core/tests/k6/retry-system-load.js

# 10.2 壓力測試
echo "2. 壓力測試..."
npm run test:stress

# 10.3 監控檢查
echo "3. 監控儀表板..."
echo "   訪問 http://grafana-host:3001"

# 10.4 最終檢查清單
echo "4. 最終檢查清單..."
cat > /tmp/production-checklist.txt <<'CHECKLIST'
- [ ] 應用程序運行無誤
- [ ] Redis 連接穩定
- [ ] Prometheus 指標正常收集
- [ ] Grafana 儀表板可訪問
- [ ] 所有告警規則已啟用
- [ ] 日誌輪轉已配置
- [ ] 備份計劃已設置
- [ ] 監控聯絡人已配置
CHECKLIST

cat /tmp/production-checklist.txt
echo "✅ 生產驗收完成"
```

---

## 驗證腳本

### 完整驗證腳本

```bash
#!/bin/bash
# production-verification.sh

set -e

echo "🔍 生產環境驗證..."

# 應用層
echo -e "\n📱 應用層驗證"
curl -s http://localhost:3000/health | jq '.' || echo "❌ 應用無響應"
curl -s http://localhost:3000/metrics | grep gravito_event || echo "❌ 指標無響應"

# Redis 層
echo -e "\n🗄️  Redis 層驗證"
redis-cli ping && echo "✅ Redis 連接正常"
redis-cli INFO replication | grep role && echo "✅ Redis 複製正常"
redis-cli DBSIZE | head -1 && echo "✅ Redis 數據存在"

# Prometheus
echo -e "\n📊 Prometheus 驗證"
curl -s http://localhost:9090/-/healthy && echo "✅ Prometheus 正常"
curl -s http://localhost:9090/api/v1/rules | jq '.data.groups | length' && echo "✅ 告警規則已加載"

# Grafana
echo -e "\n📈 Grafana 驗證"
curl -s -u admin:admin http://localhost:3001/api/health | jq '.database' && echo "✅ Grafana 正常"

# 日誌
echo -e "\n📝 日誌驗證"
tail -n 5 /opt/gravito-app/app/logs/application.log | grep -i error && echo "⚠️ 發現錯誤日誌" || echo "✅ 日誌無異常"

echo -e "\n✅ 驗證完成"
```

---

## 監控告警設置

### 關鍵指標監控

| 指標 | 告警閾值 | 嚴重級別 |
|------|---------|---------|
| 重試隊列深度 | > 500 | WARNING |
| 重試隊列深度 | > 2000 | CRITICAL |
| DLQ 大小 | > 1000 | WARNING |
| DLQ 大小 | > 5000 | CRITICAL |
| 重試失敗率 | > 30% | WARNING |
| 重試失敗率 | > 50% | CRITICAL |
| Redis 連接 | 連接失敗 | CRITICAL |
| 應用 CPU | > 80% | WARNING |
| 應用 CPU | > 95% | CRITICAL |

### Slack 通知配置

```yaml
# alertmanager.yml
global:
  slack_api_url: ${SLACK_WEBHOOK_URL}

route:
  receiver: slack-notifications
  group_by: ['alertname', 'cluster']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

receivers:
  - name: slack-notifications
    slack_configs:
      - channel: '#alerts-retry-system'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts.Firing }}{{ .Annotations.description }}{{ end }}'
        send_resolved: true
```

---

## 容量規劃

### 存儲容量

```typescript
// 計算 Redis 存儲需求

interface StorageCalculation {
  dailyEvents: number
  retryRatio: number
  avgEventSize: number // 字節
  ttlDays: number
}

function calculateStorage(params: StorageCalculation) {
  const {
    dailyEvents,
    retryRatio,
    avgEventSize,
    ttlDays
  } = params

  // 基礎隊列
  const baseStorage = dailyEvents * avgEventSize * ttlDays

  // 重試隊列
  const retryStorage = baseStorage * retryRatio

  // DLQ
  const dlqStorage = dailyEvents * avgEventSize * retryRatio * ttlDays

  // 指標
  const metricsStorage = dailyEvents * 100

  // 總計（加 50% 安全邊際）
  const totalBytes = (baseStorage + retryStorage + dlqStorage + metricsStorage) * 1.5

  return {
    base_gb: baseStorage / 1024 / 1024 / 1024,
    retry_gb: retryStorage / 1024 / 1024 / 1024,
    dlq_gb: dlqStorage / 1024 / 1024 / 1024,
    metrics_gb: metricsStorage / 1024 / 1024 / 1024,
    total_gb: Math.ceil(totalBytes / 1024 / 1024 / 1024),
    recommended_redis_gb: Math.ceil(totalBytes / 1024 / 1024 / 1024 * 1.5)
  }
}
```

---

## 故障恢復計劃

### 備份策略

```bash
#!/bin/bash

# 每日備份
0 2 * * * /opt/gravito-app/scripts/backup.sh

# 備份腳本
cat > /opt/gravito-app/scripts/backup.sh <<'BACKUP'
#!/bin/bash
set -e

BACKUP_DIR=/opt/gravito-app/backups
DATE=$(date +%Y-%m-%d_%H-%M-%S)

# 備份 Redis
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb $BACKUP_DIR/redis-$DATE.rdb

# 備份配置
tar czf $BACKUP_DIR/config-$DATE.tar.gz /opt/gravito-app/config

# 備份日誌
tar czf $BACKUP_DIR/logs-$DATE.tar.gz /opt/gravito-app/app/logs

# 清理 7 天前的備份
find $BACKUP_DIR -type f -mtime +7 -delete

echo "✅ 備份完成"
BACKUP
```

### 恢復流程

```bash
#!/bin/bash

echo "🔄 恢復流程..."

# 1. 停止應用
pm2 stop all

# 2. 恢復 Redis
redis-cli SHUTDOWN
cp /opt/gravito-app/backups/redis-$DATE.rdb /var/lib/redis/dump.rdb
redis-server

# 3. 恢復配置
tar xzf /opt/gravito-app/backups/config-$DATE.tar.gz

# 4. 啟動應用
pm2 start all

# 5. 驗證
curl http://localhost:3000/health

echo "✅ 恢復完成"
```

---

## SLO 定義

### 服務級別目標

| SLO | 目標 | 檢查方法 |
|-----|------|---------|
| **可用性** | 99.9% | Prometheus 健康檢查 |
| **事件派發延遲** | P95 < 50ms | 應用指標 |
| **重試成功率** | > 95% | 應用指標 |
| **告警響應時間** | < 5 分鐘 | AlertManager |
| **平均修復時間** | < 1 小時 | 事件日誌 |

### SLI 監控

```yaml
# prometheus 規則
groups:
  - name: sli-monitoring
    rules:
      # 可用性
      - record: sli:availability
        expr: up{job="gravito-app"}

      # 延遲
      - record: sli:dispatch_latency_p95
        expr: histogram_quantile(0.95, rate(gravito_event_dispatch_duration_seconds_bucket[5m]))

      # 重試成功率
      - record: sli:retry_success_rate
        expr: |
          rate(gravito_event_retry_attempt_total{status="success"}[5m]) /
          rate(gravito_event_retry_attempt_total[5m])
```

---

## 快速參考

### 部署命令速查表

```bash
# 部署
./scripts/deploy.sh

# 驗證
./scripts/verify.sh

# 監控
./scripts/monitor.sh

# 備份
./scripts/backup.sh

# 恢復
./scripts/restore.sh

# 日誌
tail -f /opt/gravito-app/app/logs/application.log

# 健康檢查
curl http://localhost:3000/health
```

---

需要幫助？查看：
- [RetryScheduler 指南](./RETRY_SCHEDULER_GUIDE.md)
- [遷移指南](./RETRY_MIGRATION_GUIDE.md)
- [監控指南](./RETRY_SYSTEM_MONITORING.md)
