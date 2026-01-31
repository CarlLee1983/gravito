/**
 * @gravito/monitor - Configuration Examples
 *
 * 本檔案提供 Monitor Orbit 的配置範例和最佳實踐指南
 */

import { defineMonitorConfig } from '@gravito/monitor'

// ============================================================================
// 範例 1: 開發環境配置
// ============================================================================

/**
 * 開發環境配置
 *
 * 特點：
 * - 關閉 cache 以獲得即時的健康檢查結果
 * - 啟用所有功能以便於測試
 * - 使用預設路徑
 */
export const developmentConfig = defineMonitorConfig({
  health: {
    enabled: true,
    path: '/health',
    readyPath: '/ready',
    livePath: '/live',
    timeout: 5000,
    cacheTtl: 0, // 開發環境不使用快取，獲得即時結果
  },
  metrics: {
    enabled: true,
    path: '/metrics',
    defaultMetrics: true,
    prefix: 'gravito_',
    defaultLabels: {
      env: 'development',
      service: 'my-app',
    },
  },
  tracing: {
    enabled: true, // 開發環境啟用 tracing 方便除錯
    serviceName: 'my-app-dev',
    endpoint: 'http://localhost:4318/v1/traces',
    sampleRate: 1.0, // 100% 採樣
  },
})

// ============================================================================
// 範例 2: 測試環境配置
// ============================================================================

/**
 * 測試環境配置
 *
 * 特點：
 * - 啟用快取以減少測試時的檢查次數
 * - 降低 timeout 加快測試速度
 * - 關閉 tracing 減少依賴
 */
export const testConfig = defineMonitorConfig({
  health: {
    enabled: true,
    cacheTtl: 5000, // 5 秒快取，平衡效能與即時性
    timeout: 3000, // 降低 timeout 加快測試
  },
  metrics: {
    enabled: true,
    defaultMetrics: false, // 測試環境可能不需要 runtime metrics
    prefix: 'test_',
  },
  tracing: {
    enabled: false, // 測試環境通常不需要 tracing
  },
})

// ============================================================================
// 範例 3: 生產環境配置（推薦）
// ============================================================================

/**
 * 生產環境配置（推薦設定）
 *
 * 特點：
 * - 啟用 10 秒 cache 防止高頻 Probe 造成雪崩
 * - 合理的 timeout 設定
 * - 完整的標籤以便於監控
 * - 選擇性啟用 tracing（根據需求和成本考量）
 */
export const productionConfig = defineMonitorConfig({
  health: {
    enabled: true,
    path: '/health',
    readyPath: '/ready',
    livePath: '/live',
    timeout: 5000,
    cacheTtl: 10000, // ⚠️ 重要：10 秒快取防止 K8s Probe 雪崩
  },
  metrics: {
    enabled: true,
    path: '/metrics',
    defaultMetrics: true,
    prefix: 'gravito_',
    defaultLabels: {
      env: 'production',
      service: process.env.SERVICE_NAME || 'gravito-app',
      version: process.env.APP_VERSION || '1.0.0',
      region: process.env.REGION || 'unknown',
    },
  },
  tracing: {
    enabled: true,
    serviceName: process.env.SERVICE_NAME || 'gravito-app',
    serviceVersion: process.env.APP_VERSION || '1.0.0',
    endpoint: process.env.OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    sampleRate: 0.1, // 10% 採樣，平衡可觀測性與成本
    resourceAttributes: {
      'deployment.environment': 'production',
      'service.namespace': process.env.K8S_NAMESPACE || 'default',
    },
  },
})

// ============================================================================
// 範例 4: 高流量服務配置
// ============================================================================

/**
 * 高流量服務配置
 *
 * 適用場景：
 * - 每秒數千個請求
 * - Kubernetes 多副本部署
 * - 需要嚴格控制健康檢查負載
 *
 * 特點：
 * - 更長的 cache TTL
 * - 降低 tracing 採樣率
 * - 優化的 timeout 設定
 */
export const highTrafficConfig = defineMonitorConfig({
  health: {
    enabled: true,
    timeout: 3000, // 縮短 timeout 避免拖慢 Probe
    cacheTtl: 30000, // ⚠️ 30 秒快取，適合高頻 Probe 場景
  },
  metrics: {
    enabled: true,
    defaultMetrics: true,
    prefix: 'gravito_',
    defaultLabels: {
      env: 'production',
      tier: 'high-traffic',
    },
  },
  tracing: {
    enabled: true,
    sampleRate: 0.01, // 1% 採樣，降低開銷
  },
})

// ============================================================================
// 範例 5: Kubernetes 部署配置
// ============================================================================

/**
 * Kubernetes 部署配置
 *
 * 對應的 K8s 配置：
 *
 * ```yaml
 * livenessProbe:
 *   httpGet:
 *     path: /live
 *     port: 3000
 *   initialDelaySeconds: 10
 *   periodSeconds: 10        # 每 10 秒探測一次
 *   timeoutSeconds: 3
 *   failureThreshold: 3
 *
 * readinessProbe:
 *   httpGet:
 *     path: /ready
 *     port: 3000
 *   initialDelaySeconds: 5
 *   periodSeconds: 5         # 每 5 秒探測一次
 *   timeoutSeconds: 3
 *   failureThreshold: 2
 * ```
 *
 * 計算：
 * - 10 個 Pod × 每秒 0.2 次 (5s 間隔) = 每秒 2 次請求
 * - 使用 10 秒 cache：實際 DB 查詢 = 每秒 0.2 次
 * - 負載降低 90%！
 */
export const kubernetesConfig = defineMonitorConfig({
  health: {
    enabled: true,
    path: '/health',
    readyPath: '/ready',
    livePath: '/live',
    timeout: 2500, // 略低於 K8s timeout (3s)
    cacheTtl: 10000, // 10 秒 cache，考慮 K8s Probe 頻率
  },
  metrics: {
    enabled: true,
    defaultMetrics: true,
    prefix: 'gravito_',
    defaultLabels: {
      env: process.env.NODE_ENV || 'production',
      pod: process.env.HOSTNAME || 'unknown',
      namespace: process.env.K8S_NAMESPACE || 'default',
    },
  },
  tracing: {
    enabled: true,
    serviceName: process.env.SERVICE_NAME || 'gravito-app',
    resourceAttributes: {
      'k8s.pod.name': process.env.HOSTNAME || 'unknown',
      'k8s.namespace.name': process.env.K8S_NAMESPACE || 'default',
    },
  },
})

// ============================================================================
// 最佳實踐指南
// ============================================================================

/**
 * 🎯 Health Check Cache TTL 選擇指南
 *
 * | 場景 | 建議 cacheTtl | 理由 |
 * |------|--------------|------|
 * | 開發環境 | 0ms | 即時反饋，方便除錯 |
 * | 測試環境 | 5000ms | 平衡效能與測試準確性 |
 * | 生產環境（一般）| 10000ms | 防止高頻 Probe 雪崩 |
 * | 高流量服務 | 30000ms | 嚴格控制下游負載 |
 * | 低頻檢查 | 0-5000ms | Probe 間隔 > 30s 可降低 cache |
 *
 * 計算公式：
 *   實際檢查頻率 = (Probe 頻率) / (cacheTtl / Probe 間隔)
 *
 * 範例：
 *   Probe 間隔 = 5s, cacheTtl = 10s
 *   → 每 10 秒實際執行 1 次檢查
 *   → 負載降低 50%
 */

/**
 * ⚠️ Route Pattern 與 High Cardinality
 *
 * Monitor 現在自動使用 routePattern 來防止高基數問題：
 *
 * ❌ 錯誤（舊版行為）：
 *   http_requests_total{path="/users/123"} 1
 *   http_requests_total{path="/users/456"} 1
 *   ... 無限增長
 *
 * ✅ 正確（新版自動處理）：
 *   http_requests_total{path="/users/:id"} 2
 *
 * 無需額外配置，Monitor 會自動：
 * 1. 從 Router 取得 routePattern
 * 2. 優先使用 routePattern 而非原始 path
 * 3. 降級到 normalizePath 作為備援
 */

/**
 * 📊 Metrics 標籤最佳實踐
 *
 * ✅ 好的標籤：
 * - env: production / staging / development
 * - service: user-api / payment-service
 * - version: 1.2.3
 * - region: us-west-1 / eu-central-1
 *
 * ❌ 避免的標籤：
 * - user_id: 123 (高基數！)
 * - session_id: abc-def (高基數！)
 * - timestamp: 1234567890 (高基數！)
 * - request_id: xxx (高基數！)
 *
 * 原則：標籤的唯一值應該 < 100 個
 */

/**
 * 🔍 Tracing 採樣率建議
 *
 * | 環境 | 建議 sampleRate | QPS 影響 |
 * |------|----------------|----------|
 * | 開發 | 1.0 (100%) | 所有請求 |
 * | 測試 | 1.0 (100%) | 所有請求 |
 * | 生產（低流量）| 0.5 (50%) | < 1000 QPS |
 * | 生產（中流量）| 0.1 (10%) | 1000-10000 QPS |
 * | 生產（高流量）| 0.01 (1%) | > 10000 QPS |
 *
 * 成本考量：
 * - 1% 採樣 @ 10000 QPS = 100 traces/s
 * - 0.1% 採樣 @ 100000 QPS = 100 traces/s
 * - 根據實際 QPS 調整採樣率以控制成本
 */
