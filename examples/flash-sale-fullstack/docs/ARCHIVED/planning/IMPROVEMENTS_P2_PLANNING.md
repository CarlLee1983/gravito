# Flash Sale 後續改進 - P2 優先級規劃

**優先級**：🟡 P2（長期優化）
**預計週期**：3-4 週（120-160 小時）
**前置條件**：P0 + P1 完成
**目標**：實現數據庫分片、多區域部署、異步報表，支持超大規模並發

---

## 📋 P2 任務分解

### Task P2.1: 資料庫分片策略（基於 userId）

**預計工作量**：12 小時
**技術棧**：Shard Key, Consistent Hashing, Knex.js
**風險等級**：High（架構變更，需充分測試和回滾計劃）

#### 設計方案

```typescript
// 分片管理器
export class ShardingManager {
  private shardCount = 8  // 8 個分片
  private shards: Database[] = []

  constructor(config: DatabaseConfig) {
    // 初始化 8 個分片
    for (let i = 0; i < this.shardCount; i++) {
      this.shards[i] = knex({
        ...config,
        database: `${config.database}_shard_${i}`,
        pool: { min: 1, max: 5 },
      })
    }
  }

  // 計算分片 ID
  private getShardId(userId: string): number {
    const hash = hashFunction(userId)
    return hash % this.shardCount
  }

  // 獲取用戶對應的分片
  private getShard(userId: string): Database {
    return this.shards[this.getShardId(userId)]
  }

  // 分片查詢
  async getOrders(userId: string, filters?: any) {
    const shard = this.getShard(userId)
    return shard('orders')
      .where('user_id', userId)
      .where(filters ?? {})
      .select()
  }

  // 跨分片查詢（聚合）
  async getOrderStats(): Promise<OrderStats> {
    const promises = this.shards.map(shard =>
      shard('orders').count('id as total').sum('amount as total_amount')
    )

    const results = await Promise.all(promises)

    return results.reduce((acc, r) => ({
      total: acc.total + (r[0]?.total ?? 0),
      totalAmount: acc.totalAmount + (r[0]?.total_amount ?? 0),
    }), { total: 0, totalAmount: 0 })
  }

  // 分片遷移（無停機）
  async rebalanceShard(fromShard: number, toShard: number) {
    // 使用事件驅動遷移，不影響線上業務
    const events = await this.eventLog.getRange(
      fromShard,
      lastMigratedVersion
    )

    for (const event of events) {
      await this.applyEventToShard(event, toShard)
    }

    this.updateRoutingTable()
  }
}
```

#### 實施清單

- [ ] **Task P2.1.1**：分片架構設計（2 小時）
  - 分片鍵選擇（userId）
  - 分片數量決策（8 個）
  - 一致性哈希實現
  - 路由表管理

- [ ] **Task P2.1.2**：分片數據庫部署（2 小時）
  - 建立 8 個獨立資料庫實例
  - 初始化分片數據表
  - 配置連接池
  - 監控設置

- [ ] **Task P2.1.3**：應用層分片邏輯（4 小時）
  - ShardingManager 實現
  - 單分片查詢優化
  - 跨分片聚合查詢
  - 分片路由中間件

- [ ] **Task P2.1.4**：數據遷移和驗證（3 小時）
  - 無停機遷移方案
  - 數據驗證和對帳
  - 灰度發布（10% → 50% → 100%）
  - 回滾計劃

- [ ] **Task P2.1.5**：性能基準測試（1 小時）
  - 分片查詢性能驗證
  - 聚合查詢性能測試
  - 並發測試（10K+ QPS）

#### 預期收益

| 指標 | 當前 | 目標 | 提升 |
|------|------|------|------|
| 最大 QPS | 1000 | 10000+ | ⬆ 10x |
| 單分片負載 | 1000 req | 125 req | ⬇ 8x |
| 查詢延遲 | 12ms | < 8ms | ⬇ 33% |
| 可擴展性 | 單機限制 | 線性擴展 | 無限 |

#### 風險和緩解

| 風險 | 嚴重性 | 緩解措施 |
|------|--------|----------|
| 數據遷移失敗 | High | 完整回滾計劃、數據驗證 |
| 分片不均衡 | Medium | 定期重平衡、監控 |
| 跨分片查詢效率 | Medium | 限制跨分片操作、緩存 |
| 複雜性增加 | Medium | 文檔、工具、自動化 |

---

### Task P2.2: 多區域部署與地域快取

**預計工作量**：15 小時
**技術棧**：CDN, Geo-Routing, Multi-Region Replication
**風險等級**：High（基礎設施複雜，需多區域測試）

#### 設計方案

```typescript
// 多區域部署管理
export class MultiRegionManager {
  // 地域路由
  private regions = {
    'us-east': { primary: true, replicas: ['us-west', 'eu-west'] },
    'us-west': { primary: false, replicas: [] },
    'eu-west': { primary: false, replicas: [] },
    'ap-southeast': { primary: false, replicas: [] },
  }

  // 根據客戶端地域選擇區域
  selectRegion(clientIp: string): string {
    const userRegion = this.geoDb.lookup(clientIp).region
    const closestRegion = this.findClosestRegion(userRegion)
    return closestRegion
  }

  // 地域快取
  async getProductWithGeoCache(productId: string, region: string) {
    // 1. 檢查區域本地快取
    let value = await this.regionalCache[region].get(key)
    if (value) return value

    // 2. 回源到主區域
    value = await this.regions['us-east'].cache.get(key)

    // 3. 複製到本地區域快取
    await this.regionalCache[region].set(key, value, 300)
    return value
  }

  // 跨區域複製
  private setupReplication() {
    // 主區域變更實時複製到從區域
    this.regions['us-east'].onChange(async (key, value) => {
      const targets = this.regions['us-east'].replicas

      for (const targetRegion of targets) {
        await this.replicateToRegion(targetRegion, key, value)
      }
    })
  }

  // 故障轉移
  async handleRegionFailure(failedRegion: string) {
    const backup = this.regions[failedRegion].replicas[0]

    // 重新路由到備份區域
    this.updateGeoRouting(failedRegion, backup)

    // 通知告警
    await this.alerting.notify(`Region ${failedRegion} failed, switched to ${backup}`)
  }
}
```

#### 實施清單

- [ ] **Task P2.2.1**：多區域架構設計（2 小時）
  - 區域規劃（US East/West, EU, APAC）
  - 主從複製策略
  - 故障轉移機制
  - 地域路由設計

- [ ] **Task P2.2.2**：跨區域部署（4 小時）
  - 在 4 個區域部署應用
  - 配置跨區域複製
  - 設置 CDN（靜態資源）
  - 地域 DNS 配置

- [ ] **Task P2.2.3**：地域快取層（4 小時）
  - 區域本地 Redis 實例
  - 地域親和度路由
  - 快取預熱和同步
  - 快取一致性保證

- [ ] **Task P2.2.4**：監控和告警（3 小時）
  - 區域健康檢查
  - 複製延遲監控
  - 故障轉移監控
  - 地域性能指標

- [ ] **Task P2.2.5**：災難恢復測試（2 小時）
  - 模擬區域故障
  - 驗證轉移時間（< 10s）
  - 驗證數據一致性
  - 文檔完善

#### 預期收益

| 指標 | 當前 | 目標 | 提升 |
|------|------|------|------|
| 全球平均延遲 | 200ms | < 50ms | ⬇ 75% |
| 地域親和度 | 無 | > 95% | 全覆蓋 |
| 故障恢復時間 | 手動 | < 10s | 自動化 |
| 可用性 | 99.9% | 99.99% | +0.09% |

#### 風險和緩解

| 風險 | 嚴重性 | 緩解措施 |
|------|--------|----------|
| 複製延遲 | High | 監控延遲、自動轉移 |
| 分散式事務 | High | 最終一致性設計 |
| 複雜度增加 | Medium | 自動化工具、文檔 |
| 成本增加 | Medium | 資源優化、預留實例 |

---

### Task P2.3: 異步報表生成系統

**預計工作量**：10 小時
**技術棧**：Bull Queue, Stream Processing, 異步任務
**風險等級**：Low（獨立系統，不影響核心業務）

#### 設計方案

```typescript
// 異步報表生成系統
export class AsyncReportingService {
  // 報表任務隊列
  private reportQueue = new BullQueue('reports')

  // 生成報表（非阻塞）
  async generateReport(
    reportType: 'daily-summary' | 'sales-analysis' | 'user-behavior',
    filters: any
  ): Promise<string> {
    // 立即返回 jobId，異步生成
    const job = await this.reportQueue.add(
      { reportType, filters },
      { delay: 1000 }  // 1 秒後開始
    )

    return job.id
  }

  // 查詢報表狀態
  async getReportStatus(jobId: string) {
    const job = await this.reportQueue.getJob(jobId)

    if (job.isCompleted()) {
      return {
        status: 'completed',
        url: job.data.downloadUrl,
      }
    }

    if (job.isFailed()) {
      return {
        status: 'failed',
        error: job.failedReason,
      }
    }

    return {
      status: 'processing',
      progress: job.progress(),
    }
  }

  // 報表生成邏輯
  async processReport(job: any) {
    const { reportType, filters } = job.data
    const csv = await this.buildReport(reportType, filters)

    // 上傳到對象存儲（S3）
    const url = await this.s3.upload(`reports/${job.id}.csv`, csv)

    return { downloadUrl: url }
  }

  // 流式報表（大數據量）
  async* generateLargeReport(reportType: string) {
    const pageSize = 10000
    let offset = 0

    while (true) {
      const rows = await this.db.query(`
        SELECT * FROM orders
        LIMIT ? OFFSET ?
      `, [pageSize, offset])

      if (rows.length === 0) break

      yield this.convertToCSV(rows)
      offset += pageSize
    }
  }

  // 報表調度（定期生成）
  scheduleReports() {
    // 每天凌晨 2 點生成日報
    this.scheduler.cron('0 2 * * *', () => {
      this.generateReport('daily-summary', {})
    })

    // 每周一生成週報
    this.scheduler.cron('0 2 * * 1', () => {
      this.generateReport('sales-analysis', {})
    })
  }
}
```

#### 實施清單

- [ ] **Task P2.3.1**：報表隊列設計（1 小時）
  - 報表任務隊列（Bull Queue）
  - 優先級處理（緊急報表優先）
  - 重試機制
  - 死信隊列

- [ ] **Task P2.3.2**：報表生成引擎（4 小時）
  - 報表模板系統
  - 數據查詢優化
  - CSV/Excel 格式輸出
  - 流式生成（大數據量）

- [ ] **Task P2.3.3**：存儲和分發（2 小時）
  - 對象存儲集成（S3）
  - 報表縓存
  - 下載鏈接生成
  - 過期管理

- [ ] **Task P2.3.4**：UI 和調度（2 小時）
  - 報表管理頁面
  - 進度查詢 API
  - 定期報表調度
  - 郵件通知

- [ ] **Task P2.3.5**：測試和優化（1 小時）
  - 性能測試（百萬行報表）
  - 可靠性測試
  - 用戶驗收測試

#### 預期收益

| 指標 | 當前 | 目標 | 提升 |
|------|------|------|------|
| 用戶體驗 | 阻塞等待 | 即時響應 | 非阻塞 |
| 並發限制 | 受限 | 無限制 | 可擴展 |
| 報表生成時間 | 阻塞用戶 | 後台處理 | 異步 |
| 系統穩定性 | 受影響 | 隔離 | 獨立隊列 |

---

## 📊 P2 階段總結

| 任務 | 工作量 | 優先級 | 收益 | 風險 |
|------|--------|--------|------|------|
| P2.1 資料庫分片 | 12h | 🟡 High | 10x QPS | High |
| P2.2 多區域部署 | 15h | 🟡 High | 75% 延遲 + 99.99% 可用 | High |
| P2.3 異步報表 | 10h | 🟡 Medium | 非阻塞 + 可擴展 | Low |
| **合計** | **37h** | - | **超大規模部署就緒** | **中-高風險** |

---

## 🚀 執行計劃

### 前置條件

- P0 + P1 完成且穩定運行
- 監控和告警系統全覆蓋
- 團隊 Sharding/Multi-Region 培訓完成

### 執行策略

**分階段灰度發布**：

1. **Week 5-6 (P2.1 資料庫分片)**
   - 建立分片架構
   - 灰度：10% 流量 → 50% → 100%
   - 回滾計劃就緒

2. **Week 7-8 (P2.2 多區域部署)**
   - 部署 US/EU/APAC 區域
   - 地域路由測試
   - 故障轉移演習

3. **Week 9-10 (P2.3 異步報表)**
   - 報表系統上線
   - 定期報表調度
   - 用戶培訓

### 驗收標準

- [ ] 支持 10000+ QPS
- [ ] 全球 P95 延遲 < 50ms
- [ ] 99.99% 可用性驗證
- [ ] 零數據丟失（Sharding）
- [ ] 複製延遲 < 100ms（Multi-Region）
- [ ] 報表系統穩定性 99.9%+

---

**計劃開始日期**：2026-03-05（P1 完成後）
**預期完成日期**：2026-04-30
**里程碑**：全球範圍、超大規模、高可用搶購系統
