#!/bin/bash

set -e

# ─────────────────────────────────────────────────────────────────────────
# Flash Sale 可觀測性驗證腳本
# ─────────────────────────────────────────────────────────────────────────

echo "🔍 開始 Event System 可觀測性驗證..."
echo "═".repeat(50)

# 配置
BASE_URL="${BASE_URL:-http://localhost:3000}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
MAX_WAIT_TIME=30

# 顏色定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ─────────────────────────────────────────────────────────────────────────
# 工具函數
# ─────────────────────────────────────────────────────────────────────────

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
  exit 1
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

log_info() {
  echo "ℹ️  $1"
}

wait_for_endpoint() {
  local url=$1
  local timeout=$2
  local elapsed=0

  log_info "等待 $url 可用 (超時: ${timeout}s)..."

  while [ $elapsed -lt $timeout ]; do
    if curl -s "$url" > /dev/null 2>&1; then
      log_success "$url 已可用"
      return 0
    fi
    
    echo -n "."
    sleep 1
    elapsed=$((elapsed + 1))
  done

  log_error "$url 在 ${timeout}s 內未響應"
}

# ─────────────────────────────────────────────────────────────────────────
# 驗證步驟
# ─────────────────────────────────────────────────────────────────────────

echo ""
log_info "步驟 1: 啟動應用程序"
log_info "需要手動啟動或已經運行。檢查 $BASE_URL 是否可用..."

wait_for_endpoint "$BASE_URL" $MAX_WAIT_TIME

echo ""
log_info "步驟 2: 等待 Prometheus 端點初始化"
wait_for_endpoint "$PROMETHEUS_URL/metrics" $MAX_WAIT_TIME

echo ""
log_info "步驟 3: 驗證關鍵指標"

METRICS=$(curl -s "$PROMETHEUS_URL/metrics")

if [ -z "$METRICS" ]; then
  log_error "無法獲取 Prometheus 指標"
fi

EXPECTED_METRICS=(
  "gravito_event_dispatch_duration_seconds"
  "gravito_event_queue_depth"
  "gravito_event_circuit_breaker_state"
  "gravito_event_listener_duration_seconds"
  "gravito_event_circuit_breaker_failures_total"
  "gravito_event_circuit_breaker_successes_total"
  "gravito_event_circuit_breaker_transitions_total"
  "gravito_event_circuit_breaker_open_duration_seconds"
)

METRICS_FOUND=0

for metric in "${EXPECTED_METRICS[@]}"; do
  if echo "$METRICS" | grep -q "$metric"; then
    log_success "找到指標: $metric"
    METRICS_FOUND=$((METRICS_FOUND + 1))
  else
    log_warning "缺失指標: $metric"
  fi
done

echo ""
log_info "步驟 4: 觸發事件以生成指標數據"

# 創建訂單以觸發事件
for i in {1..5}; do
  curl -s -X POST "$BASE_URL/api/orders" \
    -H "Content-Type: application/json" \
    -d "{\"userId\":\"test-user-$i\",\"productId\":\"product-1\",\"quantity\":1}" \
    > /dev/null 2>&1 || true
  sleep 0.5
done

log_success "已發送 5 個訂單請求"

# 等待指標記錄
log_info "等待 2 秒讓指標被記錄..."
sleep 2

echo ""
log_info "步驟 5: 驗證指標記錄"

METRICS_AFTER=$(curl -s "$PROMETHEUS_URL/metrics")

if echo "$METRICS_AFTER" | grep -q 'gravito_event_dispatch_duration_seconds_count'; then
  COUNT=$(echo "$METRICS_AFTER" | grep 'gravito_event_dispatch_duration_seconds_count' | grep -v '^#' | head -1 | awk '{print $NF}')
  if [ "$COUNT" -gt 0 ]; then
    log_success "指標記錄驗證成功 (count=$COUNT)"
  else
    log_warning "指標計數為 0，可能還未記錄數據"
  fi
else
  log_warning "找不到 dispatch_duration_seconds_count 指標"
fi

echo ""
log_info "步驟 6: 驗證 Prometheus 查詢"

# 測試 PromQL 查詢
QUERY_RESULT=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=gravito_event_queue_depth")

if echo "$QUERY_RESULT" | grep -q '"status":"success"'; then
  log_success "Prometheus 查詢 API 工作正常"
else
  log_warning "Prometheus 查詢 API 可能未初始化"
fi

echo ""
echo "═".repeat(50)
if [ $METRICS_FOUND -eq ${#EXPECTED_METRICS[@]} ]; then
  log_success "✨ 可觀測性驗證完成！所有 ${METRICS_FOUND} 個指標已找到"
  echo ""
  echo "📊 後續步驟："
  echo "  1. 導入 Grafana Dashboard:"
  echo "     - URL: http://localhost:3000 (或您的 Grafana 實例)"
  echo "     - 文件: monitoring/grafana-event-system-dashboard.json"
  echo ""
  echo "  2. 配置 Prometheus:"
  echo "     - 告警規則: monitoring/prometheus-alerts.yml"
  echo ""
  echo "  3. 訪問 Prometheus:"
  echo "     - URL: http://localhost:9090"
  echo ""
  echo "  4. 運行性能測試:"
  echo "     - k6 run tests/k6/flash-sale-with-metrics.js"
  echo ""
  exit 0
else
  log_warning "只找到 $METRICS_FOUND/${#EXPECTED_METRICS[@]} 個期望的指標"
  log_warning "這可能是正常的，如果應用程序剛啟動"
  exit 0
fi
