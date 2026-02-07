# Retry System Monitoring Stack Setup

快速設置 Prometheus + Grafana + K6 監控體系

## 📋 目錄

1. [Docker Compose 快速部署](#docker-compose-快速部署)
2. [手動部署](#手動部署)
3. [驗證設置](#驗證設置)
4. [常見問題](#常見問題)

---

## Docker Compose 快速部署

### 前置條件

- Docker 20.10+
- Docker Compose 2.0+
- 至少 2GB 可用記憶體

### 部署步驟

#### 1. 創建 Docker Compose 配置

```bash
cat > docker-compose.monitoring.yml <<'EOF'
version: '3.8'

services:
  # Redis - Bull Queue 後端
  redis:
    image: redis:7-alpine
    container_name: retry-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    networks:
      - monitoring
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  # Prometheus - 時序資料庫
  prometheus:
    image: prom/prometheus:latest
    container_name: retry-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus-retry-alerts.yml:/etc/prometheus/rules/retry-alerts.yml:ro
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
    networks:
      - monitoring
    depends_on:
      - redis
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:9090/-/healthy"]
      interval: 5s
      timeout: 3s
      retries: 5

  # AlertManager - 告警管理
  alertmanager:
    image: prom/alertmanager:latest
    container_name: retry-alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
      - alertmanager-data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    networks:
      - monitoring
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:9093/-/healthy"]
      interval: 5s
      timeout: 3s
      retries: 5

  # Grafana - 可視化儀表板
  grafana:
    image: grafana/grafana:latest
    container_name: retry-grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_INSTALL_PLUGINS=grafana-piechart-panel
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
      - ./grafana-retry-dashboard.json:/etc/grafana/provisioning/dashboards/retry-system.json:ro
    networks:
      - monitoring
    depends_on:
      prometheus:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  redis-data:
  prometheus-data:
  alertmanager-data:
  grafana-data:

networks:
  monitoring:
    driver: bridge
EOF
```

#### 2. 創建 Prometheus 配置

```bash
cat > prometheus.yml <<'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'gravito-retry-system'
    static_configs:
      - targets: ['localhost:8080']  # 應用程式暴露指標的端點

rule_files:
  - 'rules/retry-alerts.yml'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
EOF
```

#### 3. 創建 AlertManager 配置

```bash
cat > alertmanager.yml <<'EOF'
global:
  resolve_timeout: 5m

route:
  receiver: 'retry-system'
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

receivers:
  - name: 'retry-system'
    webhook_configs:
      - url: 'http://localhost:3000/api/alerts'  # 應用程式 Webhook 端點
        send_resolved: true
EOF
```

#### 4. 啟動堆疊

```bash
docker-compose -f docker-compose.monitoring.yml up -d

# 等待所有服務就緒
docker-compose -f docker-compose.monitoring.yml ps

# 查看日誌
docker-compose -f docker-compose.monitoring.yml logs -f
```

#### 5. 驗證服務

```bash
# Prometheus
curl -s http://localhost:9090/api/v1/query?query=up | jq .

# Grafana
curl -s http://localhost:3001/api/health | jq .

# AlertManager
curl -s http://localhost:9093/api/v1/alerts | jq .

# Redis
docker exec retry-redis redis-cli ping
```

---

## 手動部署

### 前置條件

- Linux/macOS（Ubuntu 20.04 或更新版本推薦）
- Go 1.18+（用於構建）
- Node.js 16+（用於 K6）

### Prometheus 部署

```bash
# 1. 下載 Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.40.0/prometheus-2.40.0.linux-amd64.tar.gz
tar xzf prometheus-2.40.0.linux-amd64.tar.gz
cd prometheus-2.40.0.linux-amd64

# 2. 複製配置
cp /path/to/prometheus.yml .
cp /path/to/prometheus-retry-alerts.yml rules/

# 3. 啟動
./prometheus --config.file=prometheus.yml
```

### Grafana 部署

```bash
# 1. 安裝 Grafana（Ubuntu）
sudo apt-get install -y adduser libfontconfig1
wget https://dl.grafana.com/oss/release/grafana_9.0.0_amd64.deb
sudo dpkg -i grafana_9.0.0_amd64.deb

# 2. 啟動服務
sudo systemctl start grafana-server
sudo systemctl enable grafana-server

# 3. 導入儀表板
curl -X POST http://localhost:3000/api/datasources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Prometheus",
    "type": "prometheus",
    "url": "http://localhost:9090",
    "access": "proxy",
    "isDefault": true
  }'

curl -X POST http://localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @grafana-retry-dashboard.json
```

### AlertManager 部署

```bash
# 1. 下載 AlertManager
wget https://github.com/prometheus/alertmanager/releases/download/v0.25.0/alertmanager-0.25.0.linux-amd64.tar.gz
tar xzf alertmanager-0.25.0.linux-amd64.tar.gz

# 2. 複製配置
cp alertmanager.yml alertmanager-0.25.0.linux-amd64/

# 3. 啟動
cd alertmanager-0.25.0.linux-amd64
./alertmanager
```

### Redis 部署

```bash
# 使用 Docker（推薦）
docker run -d \
  --name retry-redis \
  -p 6379:6379 \
  redis:7-alpine

# 或使用包管理器（Ubuntu）
sudo apt-get install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### K6 部署

```bash
# 安裝 K6
wget https://github.com/grafana/k6/releases/download/v0.48.0/k6-v0.48.0-linux-amd64.tar.gz
tar xzf k6-v0.48.0-linux-amd64.tar.gz
sudo mv k6 /usr/local/bin/

# 驗證安裝
k6 version
```

---

## 驗證設置

### 端點檢查清單

| 服務 | URL | 預期狀態 |
|------|-----|--------|
| Prometheus | http://localhost:9090 | 200 OK |
| Grafana | http://localhost:3000 | 302 (重定向到登入) |
| AlertManager | http://localhost:9093 | 200 OK |
| Redis | localhost:6379 | PONG（ping） |

### 詳細驗證腳本

```bash
#!/bin/bash

echo "=== Monitoring Stack Verification ==="

# 1. Prometheus
echo -e "\n1. Checking Prometheus..."
PROM_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9090)
if [ "$PROM_STATUS" == "200" ]; then
  echo "✅ Prometheus: OK"
else
  echo "❌ Prometheus: FAILED ($PROM_STATUS)"
fi

# 2. Grafana
echo -e "\n2. Checking Grafana..."
GRAF_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
if [ "$GRAF_STATUS" == "200" ]; then
  echo "✅ Grafana: OK"
else
  echo "❌ Grafana: FAILED ($GRAF_STATUS)"
fi

# 3. AlertManager
echo -e "\n3. Checking AlertManager..."
ALERT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9093)
if [ "$ALERT_STATUS" == "200" ]; then
  echo "✅ AlertManager: OK"
else
  echo "❌ AlertManager: FAILED ($ALERT_STATUS)"
fi

# 4. Redis
echo -e "\n4. Checking Redis..."
REDIS_STATUS=$(redis-cli ping 2>/dev/null)
if [ "$REDIS_STATUS" == "PONG" ]; then
  echo "✅ Redis: OK"
else
  echo "❌ Redis: FAILED"
fi

# 5. Prometheus 目標
echo -e "\n5. Checking Prometheus Targets..."
TARGETS=$(curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets | length')
echo "📊 Active targets: $TARGETS"

# 6. Prometheus 告警規則
echo -e "\n6. Checking Alert Rules..."
RULES=$(curl -s http://localhost:9090/api/v1/rules | jq '.data.groups[0].rules | length' 2>/dev/null)
echo "📋 Alert rules: $RULES"

echo -e "\n=== Verification Complete ==="
```

執行驗證：

```bash
chmod +x verify.sh
./verify.sh
```

---

## 常見問題

### Q1: Prometheus 無法連接到應用程式

**症狀**: `up{job="gravito-retry-system"} = 0`

**解決方案**:
1. 確保應用程式暴露指標端點（預設 `/metrics`）
2. 檢查防火牆規則，允許 Prometheus 訪問應用程式
3. 驗證 `prometheus.yml` 中的 `targets` 配置正確

```bash
# 測試應用程式指標端點
curl http://localhost:8080/metrics | head -20
```

### Q2: Grafana 無法連接 Prometheus

**症狀**: Grafana 顯示 "Datasource is not responding"

**解決方案**:
1. 檢查 Prometheus 是否運行：`curl http://localhost:9090/api/v1/query?query=up`
2. 在 Grafana 中重新添加 Prometheus 資料源
3. 檢查 Grafana 與 Prometheus 之間的網路連接（如使用 Docker，確保在同一網路）

### Q3: 告警未觸發

**症狀**: 告警規則配置但未發送通知

**解決方案**:
1. 驗證告警規則是否正確：`curl http://localhost:9090/api/v1/rules`
2. 檢查 AlertManager 配置中的 `receivers`
3. 確保 AlertManager 和 Prometheus 通信正常

```bash
# 測試告警規則評估
curl "http://localhost:9090/api/v1/query?query=gravito_event_retry_queue_depth"
```

### Q4: Redis 連接失敗

**症狀**: Bull Queue 無法訪問 Redis

**解決方案**:
1. 確保 Redis 服務運行：`redis-cli ping`
2. 檢查 Redis 密碼（如有）
3. 驗證 Redis 配置中的主機名和端口

```bash
# 檢查 Redis 連接
redis-cli
> INFO server
> KEYS "*"  # 查看所有鍵
```

### Q5: Grafana 儀表板未加載數據

**症狀**: Grafana 面板顯示 "No data"

**解決方案**:
1. 確認應用程式已生成指標
2. 檢查時間範圍（右上角）
3. 驗證查詢語句正確：在 Prometheus 中測試

```bash
# 在 Prometheus 中測試查詢
curl "http://localhost:9090/api/v1/query?query=sum(gravito_event_retry_queue_depth)"
```

---

## 清理與卸載

### Docker Compose

```bash
# 停止服務
docker-compose -f docker-compose.monitoring.yml down

# 刪除所有數據（小心！）
docker-compose -f docker-compose.monitoring.yml down -v
```

### 手動部署

```bash
# Prometheus
sudo systemctl stop prometheus
sudo systemctl disable prometheus

# Grafana
sudo systemctl stop grafana-server
sudo systemctl disable grafana-server

# Redis
sudo systemctl stop redis-server
sudo systemctl disable redis-server

# AlertManager
# 無系統服務，直接終止進程
```

---

## 下一步

1. 配置告警通知（Slack、PagerDuty、郵件等）
2. 運行 K6 性能測試：`k6 run retry-system-load.js`
3. 配置 Grafana 儀表板告警
4. 建立 SLO 監控儀表板

---

**最後更新**: 2026-02-07
**維護者**: DevOps 團隊
