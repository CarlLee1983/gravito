#!/bin/bash
# 驗證 OpenTelemetry 分佈式追蹤

echo "=== Flash Sale Tracing 驗證 ==="
echo ""

# 1. 檢查 Jaeger 是否運行
echo -n "1. Jaeger UI... "
if curl -s http://localhost:16686 > /dev/null 2>&1; then
  echo "✓ OK"
else
  echo "✗ FAIL"
  echo "   請先執行: docker-compose up -d jaeger"
  exit 1
fi

# 2. 發送測試請求
echo "2. 發送測試請求..."
curl -s http://localhost:3000/api/products > /dev/null 2>&1
curl -s -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","productId":"product-1","quantity":1}' > /dev/null 2>&1
echo "   等待 Span 匯出 (5s)..."
sleep 5

# 3. 查詢 Jaeger API
echo -n "3. 檢查 Jaeger 中的 Traces... "
RESPONSE=$(curl -s "http://localhost:16686/api/services")
SERVICES=$(echo "$RESPONSE" | grep -o '"serviceName":"flash-sale-service"' | wc -l)
if [ "$SERVICES" -gt "0" ]; then
  echo "✓ OK (服務已註冊)"
else
  echo "⚠ WARN (服務尚未出現，可能需要等待更長時間)"
fi

# 4. 查詢 traces
echo "4. 查詢最近的 Traces..."
TRACES=$(curl -s "http://localhost:16686/api/traces?service=flash-sale-service&limit=5")
TRACE_COUNT=$(echo "$TRACES" | grep -o '"traceID"' | wc -l)
echo "   找到 $TRACE_COUNT 條 Trace"

if [ "$TRACE_COUNT" -gt "0" ]; then
  echo ""
  echo "=== 驗證成功 ✓ ==="
  echo ""
  echo "Jaeger UI: http://localhost:16686"
  echo "查詢服務: flash-sale-service"
  exit 0
else
  echo ""
  echo "=== 驗證待驗證 ⚠ ==="
  echo ""
  echo "未找到任何 Traces，請確保："
  echo "1. 應用正在運行: bun run src/app.ts"
  echo "2. 已發送 HTTP 請求"
  echo "3. 環境變數已設置: OTEL_TRACING_ENABLED=true"
  exit 1
fi
