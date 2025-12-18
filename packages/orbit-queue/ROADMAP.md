# Orbit Queue 路線圖

## 已完成功能

### v0.1.0（當前版本）

- ✅ 核心架構（Job、QueueManager、Worker、Consumer）
- ✅ 序列化系統（JSON、ClassName）
- ✅ 基礎驅動：
  - ✅ MemoryDriver（開發用）
  - ✅ DatabaseDriver（PostgreSQL、MySQL、SQLite）
  - ✅ RedisDriver
- ✅ 企業級 Broker 驅動：
  - ✅ KafkaDriver
  - ✅ SQSDriver
- ✅ Orbit 整合（OrbitQueue）
- ✅ CLI 工具（獨立 Consumer）
- ✅ 測試覆蓋

## 計劃中的功能

### v0.2.0 - 額外 Broker 驅動

#### RabbitMQDriver
- [ ] 實作 RabbitMQ 驅動
- [ ] 支援 Exchange 和 Queue 管理
- [ ] 支援多種 Exchange 類型
- [ ] 支援持久化隊列
- [ ] 支援確認機制

#### NATSDriver
- [ ] 實作 NATS 驅動
- [ ] 支援 JetStream（持久化消息）
- [ ] 支援訂閱模式
- [ ] 支援請求/回應模式

### v0.3.0 - 雲端原生驅動

#### GooglePubSubDriver
- [ ] 實作 Google Cloud Pub/Sub 驅動
- [ ] 支援 Topic 和 Subscription 管理
- [ ] 支援批量操作
- [ ] 支援死信主題

#### AzureServiceBusDriver
- [ ] 實作 Azure Service Bus 驅動
- [ ] 支援 Queue 和 Topic 管理
- [ ] 支援會話（Sessions）
- [ ] 支援死信隊列

### v0.4.0 - 進階功能

#### 功能增強
- [ ] Job 優先級支援
- [ ] Job 鏈（Chain Jobs）
- [ ] Job 批次（Batch Jobs）
- [ ] 進度追蹤（Progress Tracking）
- [ ] 失敗隊列（Failed Jobs Queue）
- [ ] 重試策略配置（指數退避、固定間隔等）

#### 監控和觀察性
- [ ] 指標收集（Metrics）
- [ ] 分散式追蹤支援
- [ ] 健康檢查端點
- [ ] 隊列監控儀表板

### v0.5.0 - 效能優化

#### 效能改進
- [ ] 連接池管理
- [ ] 批量處理優化
- [ ] 非同步推送優化
- [ ] 記憶體使用優化

#### 擴展性
- [ ] 水平擴展支援
- [ ] 負載均衡
- [ ] 動態 Worker 調整

## 長期規劃

### 獨立驅動包

為了保持核心包的輕量，計劃將以下驅動拆分為獨立的可選包：

- `@gravito/orbit-queue-database` - 資料庫驅動包
- `@gravito/orbit-queue-redis` - Redis 驅動包
- `@gravito/orbit-queue-kafka` - Kafka 驅動包
- `@gravito/orbit-queue-sqs` - SQS 驅動包
- `@gravito/orbit-queue-rabbitmq` - RabbitMQ 驅動包（計劃中）
- `@gravito/orbit-queue-nats` - NATS 驅動包（計劃中）
- `@gravito/orbit-queue-pubsub` - Google Pub/Sub 驅動包（計劃中）
- `@gravito/orbit-queue-azure` - Azure Service Bus 驅動包（計劃中）

### 企業功能

- [ ] 多租戶支援
- [ ] 權限控制
- [ ] 審計日誌
- [ ] 合規性支援

## 貢獻

歡迎貢獻新的驅動或功能！請參考 [CONTRIBUTING.md](../../CONTRIBUTING.md) 了解詳細資訊。

