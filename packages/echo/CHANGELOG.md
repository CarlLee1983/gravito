# @gravito/echo

## 3.1.1

### Patch Changes

- Convert all workspace:\* dependencies to version numbers for npm publishing

  - Fixed 144 workspace:\* dependencies across 58 packages
  - Ensures all packages work properly when installed from npm
  - Resolves issues with bunx and npm installation of CLI tools
  - All internal dependencies now use explicit version constraints

- Updated dependencies
  - @gravito/core@1.6.1

## 3.1.0

### Minor Changes

- **Request Buffer Middleware (v1.1)**: 新增請求緩衝中介軟體，防止框架自動解析 JSON 導致簽章驗證失敗

  - 在驗證前緩存原始 request body
  - 支援自訂最大 body 大小（預設 10MB）
  - 可配置跳過特定 content types
  - 預設啟用，可透過配置停用

- **Circuit Breaker Pattern (v1.1)**: 新增熔斷器模式，保護下游服務免於雪崩效應

  - 實作完整狀態機（CLOSED → OPEN → HALF_OPEN）
  - 每個目標 host 使用獨立的熔斷器
  - 可配置失敗閾值（預設 5 次）與恢復閾值（預設 2 次）
  - 支援狀態變更回調（onOpen, onHalfOpen, onClose）
  - 整合到 WebhookDispatcher，自動保護所有出站 Webhook

- **Key Rotation Manager (v1.2)**: 新增密鑰輪換管理器，支援零停機時間的密鑰更新
  - 支援多版本密鑰管理（主密鑰 + 多個輔助密鑰）
  - Grace Period 機制（預設 24 小時），確保輪換期間的平滑過渡
  - 自動清理過期密鑰
  - WebhookReceiver 自動嘗試所有活動密鑰進行驗證
  - 提供 `registerProviderWithRotation` 和 `rotateProviderKey` API

### Patch Changes

- 更新 `WebhookReceiver.handle()` 方法，新增可選的 `context` 參數以支援 buffered requests
- 擴展 `WebhookDispatcher` 與 `OrbitEcho` 類型定義，支援新功能配置
- 新增 `RequestBufferMiddleware`, `CircuitBreaker`, `KeyRotationManager` 模組
- 更新架構文件至 v1.2.0，記錄所有新功能與技術規格
- 新增 112 個單元測試，覆蓋所有新功能（Request Buffer: 14 tests, Circuit Breaker: 17 tests, Key Rotation: 19 tests）

## 3.0.1

### Patch Changes

- Updated dependencies
  - @gravito/core@1.2.1

## 3.0.0

### Patch Changes

- Updated dependencies
  - @gravito/core@1.2.0

## 2.0.0

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @gravito/core@1.1.0

## 1.0.0

### Patch Changes

- Updated dependencies
  - @gravito/core@1.0.0
