# 部署指南

搶購系統的完整部署與運維指南。

---

## 目錄

1. [本地開發環境](#本地開發環境)
2. [Docker 容器化](#docker-容器化)
3. [生產部署](#生產部署)
4. [監控與告警](#監控與告警)
5. [故障排除](#故障排除)
6. [性能優化](#性能優化)

---

## 本地開發環境

### 前置要求

```bash
# 檢查版本
node --version    # >= 18.0.0
bun --version     # >= 1.0.0
docker --version  # >= 20.10.0
```

### 快速開始

```bash
# 1. 複製代碼
git clone <repo>
cd gravito-core-ci-fix/examples/flash-sale-fullstack

# 2. 安裝依賴
bun install

# 3. 啟動基礎設施
docker-compose up -d

# 4. 驗證連接
npm run setup:verify

# 5. 啟動應用
bun run dev

# 6. 應用運行
# API: http://localhost:3000
# Docs: http://localhost:3000/docs (計畫中)
```

### 環境變數

```bash
# .env.local
HTTP_PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=flash_sale

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# 日誌
LOG_LEVEL=debug
```

---

## Docker 容器化

### docker-compose.yml

```yaml
version: '3.8'

services:
  # PostgreSQL
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: flash_sale
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

  # 應用 (生產構建)
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - '3000:3000'
    environment:
      DB_HOST: postgres
      REDIS_HOST: redis
      NODE_ENV: production
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
  redis_data:
```

### Dockerfile

```dockerfile
# 構建階段
FROM oven/bun:1 AS builder
WORKDIR /app
COPY . .
RUN bun install --production

# 執行階段
FROM oven/bun:1
WORKDIR /app
COPY --from=builder /app /app
EXPOSE 3000
CMD ["bun", "run", "src/app.ts"]
```

### 容器構建與推送

```bash
# 構建鏡像
docker build -t flash-sale:latest .

# 本地測試
docker run -p 3000:3000 \
  -e DB_HOST=host.docker.internal \
  -e REDIS_HOST=host.docker.internal \
  flash-sale:latest

# 推送到倉庫
docker tag flash-sale:latest myregistry.azurecr.io/flash-sale:latest
docker push myregistry.azurecr.io/flash-sale:latest
```

---

## 生產部署

### Kubernetes 部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flash-sale-api
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: flash-sale-api
  template:
    metadata:
      labels:
        app: flash-sale-api
    spec:
      containers:
      - name: api
        image: myregistry.azurecr.io/flash-sale:latest
        ports:
        - containerPort: 3000
        env:
        - name: DB_HOST
          value: postgres-service
        - name: REDIS_HOST
          value: redis-service
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: flash-sale-api
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3000
  selector:
    app: flash-sale-api
```

### 水平擴展

```bash
# 擴展到 5 個副本
kubectl scale deployment flash-sale-api --replicas=5

# 監控部署進度
kubectl rollout status deployment/flash-sale-api

# 檢查 Pod 狀態
kubectl get pods -l app=flash-sale-api
```

### 金絲雀部署

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: flash-sale-api
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: flash-sale-api
  progressDeadlineSeconds: 300
  service:
    port: 80
  analysis:
    interval: 1m
    threshold: 5
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
    - name: request-duration
      thresholdRange:
        max: 500
      interval: 1m
```

---

## 監控與告警

### Prometheus 指標

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'flash-sale-api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

### 關鍵告警

```yaml
# alerts.yml
groups:
  - name: flash_sale
    rules:
      # 高錯誤率告警
      - alert: HighErrorRate
        expr: rate(http_requests_failed[5m]) > 0.01
        for: 5m
        annotations:
          summary: 錯誤率超過 1%

      # 高延遲告警
      - alert: HighLatency
        expr: histogram_quantile(0.99, http_request_duration_ms) > 1000
        for: 5m
        annotations:
          summary: P99 延遲超過 1000ms

      # 隊列堆積告警
      - alert: QueueBacklog
        expr: job_queue_size > 10000
        for: 5m
        annotations:
          summary: 隊列堆積超過 10000

      # 資料庫連接池告警
      - alert: DBConnectionPoolExhausted
        expr: db_connections_used / db_connections_limit > 0.9
        for: 2m
        annotations:
          summary: 數據庫連接池使用率超過 90%

      # Redis 記憶體告警
      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.85
        for: 5m
        annotations:
          summary: Redis 記憶體使用率超過 85%
```

### Grafana 儀表板

```json
{
  "dashboard": {
    "title": "Flash Sale 系統監控",
    "panels": [
      {
        "title": "訂單成功率",
        "targets": [{"expr": "rate(orders_success[5m])"}]
      },
      {
        "title": "P99 延遲",
        "targets": [{"expr": "histogram_quantile(0.99, http_request_duration_ms)"}]
      },
      {
        "title": "隊列大小",
        "targets": [{"expr": "job_queue_size"}]
      },
      {
        "title": "庫存狀態",
        "targets": [{"expr": "inventory_available"}]
      }
    ]
  }
}
```

---

## 故障排除

### 應用無法啟動

```bash
# 1. 檢查依賴
docker-compose ps
# 確保所有服務都是 UP 狀態

# 2. 檢查日誌
docker-compose logs app

# 3. 驗證環境變數
cat .env.local

# 4. 清理並重啟
docker-compose down
docker-compose up -d
```

### 數據庫連接失敗

```bash
# 1. 測試連接
psql -h localhost -U postgres -d flash_sale -c "SELECT 1;"

# 2. 檢查連接池
docker exec flash-sale-postgres psql -U postgres -d flash_sale -c "
  SELECT datname, count(*) as connections
  FROM pg_stat_activity
  GROUP BY datname;
"

# 3. 增加連接池大小（gravito.config.ts）
pool: {
  min: 5,
  max: 50  // 增加
}
```

### Redis 連接失敗

```bash
# 1. 測試連接
redis-cli ping

# 2. 監控 Redis
redis-cli monitor

# 3. 檢查內存
redis-cli info memory

# 4. 清理快取
redis-cli FLUSHDB
```

### 高並發下性能下降

```bash
# 1. 檢查隊列堆積
redis-cli LLEN bull:orders:1

# 2. 增加消費者
# 在另一終端運行
bun run consumer

# 3. 監控 CPU/Memory
top
# 或 docker stats
docker stats
```

### 訂單卡在中間狀態

```bash
# 1. 查看隊列中的 job
redis-cli HGETALL bull:orders:jobs

# 2. 查看死信隊列
redis-cli LRANGE bull:orders:failed 0 -1

# 3. 重試失敗的 job
# (需要實現 retry 端點)
```

---

## 性能優化

### 資料庫優化

```sql
-- 建立索引
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_product_id ON orders(product_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_inventory_locks_product_id ON inventory_locks(product_id);

-- 檢查慢查詢
SELECT * FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC;
```

### Redis 優化

```bash
# 1. 監控執行時間
redis-cli --latency

# 2. 檢查記憶體使用
redis-cli info memory

# 3. 優化配置
# redis.conf
maxmemory-policy allkeys-lru  # 記憶體淘汰策略
```

### 應用層優化

```typescript
// 快取優化
CacheService.remember('key', async () => {
  return await expensiveOperation()
}, { ttl: 300 })

// 連接池優化
pool: {
  min: 5,
  max: 50,
  idleTimeoutMillis: 30000,
}

// 隊列優化
queue: {
  concurrency: 100,  // 增加消費者並發
  backoff: {
    type: 'exponential',
    delay: 2000
  }
}
```

---

## 檢查清單

### 部署前

- [ ] 代碼通過所有測試
- [ ] TypeScript 無錯誤
- [ ] 環境變數已配置
- [ ] 數據庫遷移已執行
- [ ] 備份已完成

### 部署中

- [ ] 金絲雀部署已開始
- [ ] 監控告警已啟用
- [ ] 日誌收集已配置
- [ ] 健康檢查通過

### 部署後

- [ ] 端點響應正常
- [ ] 日誌無錯誤
- [ ] 性能指標正常
- [ ] 告警未觸發

---

## 回滾計畫

```bash
# 快速回滾
kubectl rollout undo deployment/flash-sale-api

# 檢查回滾狀態
kubectl rollout status deployment/flash-sale-api

# 查看歷史版本
kubectl rollout history deployment/flash-sale-api
```

---

**最後更新**：2026-02-02
