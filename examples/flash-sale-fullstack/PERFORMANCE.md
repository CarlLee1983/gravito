# Flash Sale System - 性能基準報告

搶購系統的性能測試與優化進度追蹤。

---

## 概覽

| 里程碑 | 目標 | 狀態 |
|------|------|------|
| **MVP (Week 1-2)** | 基礎功能 | ✅ 完成 |
| **高併發 (Week 3-5)** | 100 QPS | ⏳ 進行中 |
| **性能優化 (Week 6-7)** | 1000+ QPS | 📋 計畫中 |
| **文檔 (Week 8)** | 完整文檔 | 📋 計畫中 |

---

## 性能測試矩陣

### Week 5: 初步基準測試（無快取）

| 階段 | VU | 目標 QPS | P50 | P95 | P99 | 錯誤率 | 狀態 |
|------|----|---------|----|----|----|--------|------|
| Warm up | 50 | 50 | - | - | - | - | 🔄 待測 |
| Ramp up | 500 | 500 | - | - | - | - | 🔄 待測 |
| Spike | 1000 | 1000 | - | - | - | - | 🔄 待測 |
| Stress | 1000 | 1000 | - | - | - | - | 🔄 待測 |

**說明**：
- VU = Virtual Users (並發用戶數)
- QPS = Queries Per Second (每秒查詢數)
- P50/P95/P99 = 延遲百分位數

### Week 6: 快取優化後基準

| 階段 | VU | 目標 QPS | P50 | P95 | P99 | 錯誤率 | 對比 Week 5 |
|------|----|---------|----|----|----|--------|-----------|
| Warm up | 50 | 50 | - | - | - | - | - |
| Ramp up | 500 | 500 | - | - | - | - | - |
| Spike | 1000 | 1000 | - | - | - | - | - |
| Stress | 1000 | 1000 | - | - | - | - | - |

---

## 詳細結果記錄

### Week 5 - 初步測試

#### 測試執行

```bash
# 執行命令
bun run test:load

# 執行時間：2026-02-07 14:10 - 14:32 (約 22 分鐘)
# 環境：本地開發環境
# 配置：無快取，HTTP 伺服器實現缺陷
```

#### 測試結果

**測試執行但全部失敗** ❌

**失敗原因**：HTTP 伺服器連接問題
- 應用程序缺少 HTTP 路由實現
- Photon HTTP 引擎未正確配置 Satellite 路由
- 所有請求返回「connection refused」

**統計數據**：
- 測試執行時間：13 分 7.8 秒（完整執行）
- 完成的迭代數：1,147,851 次
- 中斷的迭代數：287 次
- 成功請求：0 個 (0%)
- 失敗請求：全部 (100%)
- 錯誤類型：`dial tcp 127.0.0.1:3000: connect: connection refused`
- 測試失敗：Exit code 99（閾值超過）

#### 分析與發現

**關鍵發現**：
- ✅ 應用程序框架正確啟動（Application 和 PlanetCore 初始化成功）
- ✅ Satellites 正確註冊（Flash Sale、Inventory Lock、Payment）
- ✅ 隊列系統正確初始化（Bull Queue 配置成功）
- ❌ **HTTP 伺服器未暴露 API 端點**（致命缺陷）
- ❌ Photon HTTP 引擎未註冊 Satellite 路由

**技術問題**：
1. `app.core.liftoff()` 啟動 HTTP 伺服器但未暴露端點
2. FlashSaleServiceProvider 和 Satellite 路由未被 Photon 識別
3. HTTP 控制器（ProductController、OrderController）未被自動發現

#### 所需修復

**Critical**：
- [ ] 實現 HTTP 路由與控制器自動發現機制
- [ ] 配置 Photon 中間件與 Satellite 整合
- [ ] 驗證應用程序入口點 (app.ts) 的正確性

#### 錯誤樣本

```
time="2026-02-07T14:10:36+08:00" level=warning msg="Request Failed"
error="Get \"http://localhost:3000/api/products\": dial tcp 127.0.0.1:3000: connect: connection refused"

time="2026-02-07T14:10:36+08:00" level=error msg="GoError: the body is null so we can't transform it to JSON
- this likely was because of a request error getting the response
```

---

### Week 6 - 快取優化後測試

#### 快取策略

**已實現的快取**：

1. **商品信息快取** (Redis)
   - TTL: 5 分鐘
   - Key: `product:{productId}`
   - 更新策略：主動失效

2. **庫存快取** (Redis)
   - TTL: 60 秒 (高頻更新)
   - Key: `inventory:{productId}`
   - 更新策略：立即更新

3. **用戶會話快取** (Redis)
   - TTL: 30 分鐘
   - Key: `session:{userId}`
   - 更新策略：活動延期

#### 測試執行

```bash
# 執行命令
bun run test:load

# 執行時間：[待記錄]
# 環境：本地開發環境
# 配置：啟用快取層
```

#### 測試結果

**尚未執行**

#### 性能改進

| 指標 | Week 5 | Week 6 | 改進 |
|------|--------|--------|------|
| P50 延遲 | - | - | - |
| P95 延遲 | - | - | - |
| P99 延遲 | - | - | - |
| 錯誤率 | - | - | - |
| 最大 QPS | - | - | - |

---

## 瓶頸分析

### Week 5 預期瓶頸

| 瓶頸 | 預計位置 | 解決方案 | 優先級 |
|------|--------|--------|--------|
| 資料庫連接 | PostgreSQL 連接池 | 調整池大小 | High |
| 事件派發 | Signal 系統 | 異步隊列 | High |
| 鎖競爭 | Redis 分佈式鎖 | 優化算法 | High |
| 隊列延遲 | Bull 隊列處理 | 增加消費者 | Medium |

### Week 6 預期收益

- [ ] 商品查詢快 50-70%
- [ ] 庫存查詢快 30-50%
- [ ] 總體吞吐提升 40%

---

## 性能目標

### 官方目標

- ✅ **Week 1-2**：基本功能就緒
- ⏳ **Week 3-5**：單實例 100+ QPS
- 📋 **Week 6-7**：單實例 1000+ QPS
- 📋 **Week 8**：P99 < 500ms, 99.9% 成功率

### 里程碑檢查點

| 周次 | 目標 | 說明 |
|------|------|------|
| Week 5 | 100 QPS | 無快取基線 |
| Week 6 | 300+ QPS | 快取層後 |
| Week 7 | 1000+ QPS | 框架優化後 |

---

## 壓力測試場景

### 場景 1：列出商品 (20%)
```javascript
GET /api/products
```
- **快取度**：高 (5 分鐘 TTL)
- **預期延遲**：< 50ms (有快取)

### 場景 2：建立訂單 (70%)
```javascript
POST /api/orders
{
  "productId": "product-xxx",
  "quantity": 1,
  "userId": "user-xxx"
}
```
- **複雜度**：高 (涉及多個 Satellites)
- **預期延遲**：< 1000ms

### 場景 3：查詢訂單狀態 (10%)
```javascript
GET /api/orders/{orderId}
```
- **快取度**：中 (60 秒 TTL)
- **預期延遲**：< 200ms

---

## 資源使用監控

### 數據庫

| 指標 | 限制 | 當前 | 狀態 |
|------|------|------|------|
| 連接數 | 100 | - | 待測 |
| 查詢時間 | 100ms | - | 待測 |
| 索引命中 | > 95% | - | 待測 |

### Redis

| 指標 | 限制 | 當前 | 狀態 |
|------|------|------|------|
| 記憶體 | 1GB | - | 待測 |
| 鍵命中率 | > 80% | - | 待測 |
| 操作延遲 | < 10ms | - | 待測 |

### 應用伺服器

| 指標 | 限制 | 當前 | 狀態 |
|------|------|------|------|
| CPU 使用率 | < 80% | - | 待測 |
| 記憶體 | < 512MB | - | 待測 |
| 文件描述符 | > 1000 | - | 待測 |

---

## 改進建議

### 即時修復 (Critical)

```markdown
- [ ] 優化資料庫連接池配置
- [ ] 加入 Redis 快取層 (進行中)
- [ ] 隊列消費者併發調整
```

### 短期改進 (High Priority)

```markdown
- [ ] 商品查詢添加索引
- [ ] 實現二級快取 (本地記憶體)
- [ ] 訂單查詢最佳化
```

### 中期改進 (Medium Priority)

```markdown
- [ ] 分佈式追蹤 (OpenTelemetry)
- [ ] 真實負載測試
- [ ] 資料庫分片策略
```

---

## 框架發現

在性能測試中發現的 Gravito 框架問題應記錄到：
- 📄 [FRAMEWORK_ISSUES.md](../FRAMEWORK_ISSUES.md)

---

## 版本記錄

| 版本 | 日期 | 更新 |
|------|------|------|
| v0.1 | 2026-02-02 | 初始建立，Week 5-6 計畫 |

---

## 相關文檔

- [ROADMAP.md](./ROADMAP.md) - 開發路線圖
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 系統架構
- [FRAMEWORK_ISSUES.md](../FRAMEWORK_ISSUES.md) - 框架問題記錄
- [README.md](./README.md) - 快速開始

---

**最後更新**：2026-02-02
**維護者**：搶購系統開發團隊
