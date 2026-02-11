# P2.2.5 災難恢復和故障轉移測試
# Disaster Recovery and Failover Testing

## 概述
本文檔介紹 Flash Sale 超大規模分佈式系統的災難恢復（DR）管理器實現。該系統管理災難恢復計畫、執行故障轉移測試、驗證 RTO/RPO 目標、並生成根因分析（RCA）報告。

## 核心概念

### RTO 與 RPO

#### Recovery Time Objective (RTO)
**定義**：系統從故障到完全恢復所允許的最大時間

```
故障發生 ─────── 檢測 ─────── 通知 ─────── 恢復 ─────── 完全就緒
           ↑─────────────────────────── RTO ──────────────────↑
           (分鐘/小時)
```

**示例**：
- 關鍵服務：RTO = 5 分鐘（最多停機 5 分鐘）
- 次要服務：RTO = 30 分鐘
- 非關鍵服務：RTO = 2 小時

#### Recovery Point Objective (RPO)
**定義**：系統可接受的最大數據丟失時間

```
最後備份 ─────────────── 故障 ─────── 恢復
         ↑────── RPO ────┤
         (分鐘/秒)
```

**示例**：
- 交易數據：RPO = 30 秒（最多丟失 30 秒的交易）
- 日誌數據：RPO = 5 分鐘
- 緩存數據：RPO = 無限制（可完全丟失）

### RTO vs RPO 的關係

| 情景 | RTO | RPO | 含義 |
|------|-----|-----|------|
| **銀行交易** | 1 分鐘 | 10 秒 | 快速恢復，數據損失最小 |
| **電商平臺** | 5 分鐘 | 1 分鐘 | 可容忍短期中斷，但數據丟失要少 |
| **社交媒體** | 1 小時 | 30 分鐘 | 中等恢復時間，可容忍部分數據丟失 |

## 架構設計

### 核心組件

```
┌─────────────────────────────────────────────┐
│     DisasterRecoveryManager                 │
├─────────────────────────────────────────────┤
│  計畫管理層                                  │
│  • createPlan()      - 創建 DR 計畫         │
│  • getPlan()         - 查詢計畫             │
│  • getAllPlans()     - 列出所有計畫         │
├─────────────────────────────────────────────┤
│  故障轉移測試層                              │
│  • executeFailoverTest()  - 執行測試       │
│  • detectFailure()        - 故障檢測       │
│  • executeRecoverySteps() - 執行恢復步驟   │
│  • verifyRecovery()       - 驗證恢復       │
├─────────────────────────────────────────────┤
│  根因分析層                                  │
│  • performRCA()      - 生成 RCA            │
│  • getAllRCAs()      - 查詢所有 RCA        │
├─────────────────────────────────────────────┤
│  報告與指標層                                │
│  • getMetrics()      - 獲取匯總指標        │
│  • generateDRReport()- 生成 DR 報告        │
├─────────────────────────────────────────────┤
│  事件系統層                                  │
│  • on()              - 監聽事件             │
│  • emit()            - 觸發事件             │
└─────────────────────────────────────────────┘
```

### 關鍵介面

#### DisasterRecoveryPlan
定義 DR 計畫的結構

```typescript
interface DisasterRecoveryPlan {
  planId: string                    // 計畫 ID
  name: string                      // 計畫名稱
  description: string               // 詳細描述
  criticality: 'critical' | 'high' | 'medium' | 'low'
  rtoMinutes: number               // RTO 目標（分鐘）
  rpoMinutes: number               // RPO 目標（分鐘）
  affectedSystems: string[]        // 受影響系統
  recoverySteps: RecoveryStep[]    // 恢復步驟
  lastTestedAt?: Date              // 最後測試時間
  testInterval: number             // 測試間隔（毫秒）
}
```

#### RecoveryStep
定義單個恢復步驟

```typescript
interface RecoveryStep {
  stepId: string                  // 步驟 ID
  order: number                   // 執行順序
  name: string                    // 步驟名稱
  description: string             // 步驟描述
  expectedDuration: number        // 預期時長（毫秒）
  criticalPath: boolean           // 是否在關鍵路徑上
  dependencies: string[]          // 依賴的步驟 ID
  rollbackStep?: string           // 回滾步驟 ID
}
```

#### FailoverTest
記錄故障轉移測試結果

```typescript
interface FailoverTest {
  testId: string                  // 測試 ID
  planId: string                  // 關聯計畫 ID
  startTime: Date                 // 開始時間
  endTime?: Date                  // 結束時間
  status: 'planned' | 'running' | 'completed' | 'failed' | 'rolled-back'
  affectedRegions: string[]       // 受影響區域
  scenario: 'region-failure' | 'database-failure' | 'cache-failure' | 'network-partition'
  metrics: {
    rtoActual: number            // 實際 RTO（毫秒）
    rpoActual: number            // 實際 RPO（毫秒）
    dataLoss: number             // 數據丟失記錄數
    timeToDetect: number         // 檢測時間
    timeToNotify: number         // 通知時間
    timeToMigrate: number        // 遷移時間
    successRate: number          // 成功率（%）
  }
  results: TestResult[]          // 各區域測試結果
}
```

#### RCA (Root Cause Analysis)
根因分析報告

```typescript
interface RCA {
  rcaId: string                  // RCA ID
  failureId: string              // 故障 ID
  testId: string                 // 關聯測試 ID
  timestamp: Date                // 生成時間
  rootCause: string              // 根本原因
  contributingFactors: string[]  // 協因
  timeline: TimelineEvent[]      // 事件時間線
  recommendations: string[]      // 改進建議
  assignedTo?: string            // 分配負責人
  status: 'open' | 'in-progress' | 'resolved'
}
```

## 故障轉移測試流程

### 執行流程圖

```
開始故障轉移測試
   ↓
[1] 檢測故障 (detectFailure)
   • 模擬故障場景
   • 記錄檢測時間
   ├─ 區域故障 (region-failure)
   ├─ 數據庫故障 (database-failure)
   ├─ 快取故障 (cache-failure)
   └─ 網絡分割 (network-partition)
   ↓
[2] 通知團隊 (notifyTeam)
   • 發送告警
   • 記錄通知時間
   ↓
[3] 執行恢復步驟 (executeRecoverySteps)
   • 按順序執行步驟
   • 處理依賴關係
   • 記錄每步結果
   ├─ 依賴解析：如果步驟 B 依賴步驟 A
   │  └─ 必須等待 A 完成後再執行 B
   └─ 關鍵路徑：關鍵路徑上的延遲直接影響 RTO
   ↓
[4] 驗證恢復 (verifyRecovery)
   • 檢查數據一致性
   • 計算數據丟失
   • 驗證系統就緒
   ↓
[5] 計算指標 (updateMetrics)
   • RTO Actual = 檢測時間 + 遷移時間
   • RPO Actual = 數據丟失時間
   • 成功率 = 成功步驟數 / 總步驟數
   ↓
[6] RCA 分析 (performRCA)
   • 生成事件時間線
   • 識別根本原因
   • 提出改進建議
   ↓
[7] 生成報告
   • 計畫信息
   • 測試結果
   • 指標統計
   • 建議
   ↓
完成測試
```

### 測試場景

#### 1. 區域故障 (region-failure)
**場景**：整個區域（如 us-east-1）不可用

**恢復步驟**：
1. **檢測故障** (10 秒) - 監控系統檢測到區域不響應
2. **啟動故障轉移** (30 秒) - 路由流量到次要區域
3. **驗證次要區域** (20 秒) - 確認次要區域正常

**預期 RTO**：60 秒

#### 2. 數據庫故障 (database-failure)
**場景**：主數據庫副本無法訪問

**恢復步驟**：
1. **提升副本** (15 秒) - 提升複製副本為主副本

**預期 RTO**：15 秒

#### 3. 快取故障 (cache-failure)
**場景**：快取層（Redis）發生故障

**恢復步驟**：
1. **啟動故障轉移** (30 秒)
2. **檢測故障** (10 秒)
3. **驗證恢復** (20 秒)

**預期 RTO**：60 秒

#### 4. 網絡分割 (network-partition)
**場景**：區域間網絡連接中斷

**恢復步驟**：
1. **檢測分割** (5 秒)
2. **啟動獨立模式** (10 秒)
3. **驗證本地操作** (5 秒)

**預期 RTO**：20 秒

## 時間線分析

### 事件時間線示例

```
故障時刻 (T=0)
   ↓
故障檢測完成 (T=1000ms) - timeToDetect
   ↓
團隊通知完成 (T=1500ms) - timeToNotify
   ↓
數據遷移開始 (T=1500ms)
   ├─ 步驟 1: 檢測故障 (T=1500-1510ms)
   ├─ 步驟 2: 啟動故障轉移 (T=1510-1620ms)
   └─ 步驟 3: 驗證恢復 (T=1620-1730ms)
   ↓
恢復完成 (T=1730ms) - timeToMigrate
   ↓
系統完全就緒 (T=1730ms)

RTO Actual = 1000 + 230 = 1230ms (目標: 5 分鐘 = 300000ms) ✓ 符合
```

## RCA (根因分析) 框架

### RCA 生成過程

```
故障轉移測試完成
   ↓
檢查是否符合 RTO/RPO 目標
   ├─ 符合 ✓ → 不需要 RCA
   └─ 不符合 ✗ → 執行 RCA
      ↓
   1. 收集事件時間線
      • 故障開始時間
      • 檢測完成時間
      • 通知完成時間
      • 恢復完成時間
      ↓
   2. 分析時間差距
      • 檢測延遲
      • 通知延遲
      • 遷移延遲
      ↓
   3. 識別根本原因
      • 監控系統反應遲緩
      • 通知流程低效
      • 恢復步驟耗時長
      ↓
   4. 提出改進建議
      • 優化檢測算法
      • 自動化通知流程
      • 優化數據遷移
```

### RCA 時間線事件

```typescript
{
  timestamp: Date,           // 事件發生時間
  event: string,            // 事件描述
  impact: 'critical' | 'major' | 'minor',  // 影響級別
  component: string         // 相關組件
}
```

**示例時間線**：
```
[critical] 2026-02-11 14:00:00 - 區域故障開始 (us-east-1)
[critical] 2026-02-11 14:00:01 - 故障檢測完成
[major]    2026-02-11 14:00:01.5 - 團隊通知
[major]    2026-02-11 14:00:01.8 - 故障轉移啟動
[minor]    2026-02-11 14:00:02 - 恢復完成
```

## 性能指標

### 關鍵指標

| 指標 | 單位 | 含義 | 目標值 |
|------|------|------|--------|
| **RTO Actual** | 毫秒 | 實際恢復時間 | ≤ 目標 RTO |
| **RPO Actual** | 毫秒 | 實際數據丟失時間 | ≤ 目標 RPO |
| **timeToDetect** | 毫秒 | 故障檢測時間 | < 10000 |
| **timeToNotify** | 毫秒 | 告警通知時間 | < 1000 |
| **timeToMigrate** | 毫秒 | 數據遷移時間 | < 50000 |
| **successRate** | % | 成功步驟比例 | ≥ 90% |
| **dataLoss** | 條數 | 丟失記錄數 | 儘可能少 |
| **compliance** | % | 符合 RTO/RPO 的測試比例 | ≥ 95% |

### 指標計算

```typescript
// RTO 實際值 = 檢測時間 + 遷移時間
rtoActual = timeToDetect + timeToMigrate

// RPO 實際值 = 數據丟失對應的時間
rpoActual = dataLoss > 0 ?
            (故障時刻到最後備份的時間) : 0

// 成功率 = 成功步驟數 / 總步驟數 × 100%
successRate = (passed steps / total steps) × 100

// 符合性 = 符合 RTO/RPO 的測試 / 總測試數 × 100%
compliance = (compliant tests / total tests) × 100
```

## 事件系統

### 事件類型

```
plan:created
│ 觸發時機：創建新 DR 計畫
├─ 數據：DisasterRecoveryPlan

test:started
│ 觸發時機：開始故障轉移測試
├─ 數據：{ testId, planId, scenario }

test:completed
│ 觸發時機：測試成功完成
├─ 數據：FailoverTest

test:failed
│ 觸發時機：測試失敗
├─ 數據：{ testId, error }

rca:created
│ 觸發時機：生成 RCA 報告
├─ 數據：RCA
```

### 事件監聽示例

```typescript
const manager = new DisasterRecoveryManager()

// 監聽測試開始
manager.on('test:started', (data) => {
  console.log(`測試 ${data.testId} 開始`)
  alerting.send(`Failover test started: ${data.scenario}`)
})

// 監聽測試完成
manager.on('test:completed', (test) => {
  console.log(`測試完成，RTO=${test.metrics.rtoActual}ms`)
  if (test.metrics.rtoActual > 300000) {
    // 如果超過目標 RTO，發送告警
    alerting.sendWarning('RTO exceeded!')
  }
})

// 監聽 RCA 生成
manager.on('rca:created', (rca) => {
  console.log(`RCA 已生成：${rca.rootCause}`)
  jira.createIssue({
    title: `DR Failure: ${rca.rootCause}`,
    description: rca.recommendations.join('\n')
  })
})
```

## 測試設計

### 測試覆蓋

本實現包含 **21 個測試用例**，覆蓋以下方面：

**1. 計畫管理 (3 個測試)**
- 創建 DR 計畫
- 創建多個計畫
- 查詢計畫

**2. 故障轉移測試 (6 個測試)**
- 區域故障轉移測試
- 數據庫故障轉移測試
- 快取故障轉移測試
- 網絡分割轉移測試
- 指標追蹤
- 符合性驗證

**3. 恢復指標 (4 個測試)**
- 平均 RTO 計算
- 成功率追蹤
- 符合性百分比
- 數據丟失追蹤

**4. RCA 分析 (2 個測試)**
- RCA 生成
- 時間線包含

**5. 事件系統 (2 個測試)**
- 測試開始事件
- 測試完成事件

**6. 報告生成 (3 個測試)**
- DR 報告生成
- 計畫詳情包含
- 測試統計包含

**7. 集成場景 (1 個測試)**
- 完整災難恢復流程

### 測試工具

測試使用以下輔助工具確保質量：

- **Bun Test Framework**：原生 TypeScript 測試支持
- **Mock 時間**：使用簡短延遲模擬真實場景
- **隨機模擬**：模擬故障和恢復成功率
- **事件驗證**：確認所有事件正確觸發

## 使用示例

### 創建 DR 計畫

```typescript
const manager = new DisasterRecoveryManager()

const plan = manager.createPlan({
  planId: 'plan-primary-region',
  name: 'Primary Region Failure',
  description: 'Failover from primary to secondary region',
  criticality: 'critical',
  rtoMinutes: 5,          // 5 分鐘恢復目標
  rpoMinutes: 1,          // 1 分鐘數據丟失目標
  affectedSystems: ['api-servers', 'databases', 'cache'],
  recoverySteps: [
    {
      stepId: 'step-1',
      order: 1,
      name: 'Detect Failure',
      description: 'Detect primary region failure',
      expectedDuration: 10000,  // 10 秒
      criticalPath: true,
      dependencies: [],
    },
    {
      stepId: 'step-2',
      order: 2,
      name: 'Initiate Failover',
      description: 'Start failover process',
      expectedDuration: 30000,  // 30 秒
      criticalPath: true,
      dependencies: ['step-1'],
    },
    {
      stepId: 'step-3',
      order: 3,
      name: 'Verify Secondary',
      description: 'Verify secondary region readiness',
      expectedDuration: 20000,  // 20 秒
      criticalPath: true,
      dependencies: ['step-2'],
    },
  ],
  testInterval: 24 * 60 * 60 * 1000,  // 每 24 小時測試一次
})
```

### 執行故障轉移測試

```typescript
// 執行區域故障測試
const test = await manager.executeFailoverTest(
  'plan-primary-region',
  'region-failure',
  ['us-east-1']  // 受影響的區域
)

console.log(`RTO Actual: ${test.metrics.rtoActual}ms`)
console.log(`Success Rate: ${test.metrics.successRate}%`)
console.log(`Data Loss: ${test.metrics.dataLoss} records`)

if (test.metrics.rtoActual <= 300000) {
  console.log('✓ 符合 RTO 目標')
} else {
  console.log('✗ 未符合 RTO 目標')
}
```

### 生成報告

```typescript
// 獲取匯總指標
const metrics = manager.getMetrics()
console.log(`Total Tests: ${metrics.totalTests}`)
console.log(`Successful: ${metrics.successfulTests}`)
console.log(`Failed: ${metrics.failedTests}`)
console.log(`Compliance: ${metrics.compliance.toFixed(2)}%`)

// 生成完整 DR 報告
const report = manager.generateDRReport()
console.log(report)

// 輸出示例：
// ========== DISASTER RECOVERY REPORT ==========
//
// --- RECOVERY PLANS ---
// Primary Region Failure
//   RTO: 5 分鐘, RPO: 1 分鐘
//   Criticality: critical
//   Affected Systems: api-servers, databases, cache
//   Recovery Steps: 3
//
// --- FAILOVER TEST RESULTS ---
// Total Tests: 5
// Successful: 5
// Failed: 0
// Success Rate: 100.00%
// RTO Compliance: 100.00%
//
// --- RECOVERY METRICS ---
// Average RTO: 0.23s
// Average RPO: 0.05s
// Total Data Loss: 0 records
```

## 最佳實踐

### 1. 定期測試
- 至少每月進行一次 DR 測試
- 定期輪流測試不同故障場景
- 在業務低峰期進行測試

### 2. 文檔維護
- 及時更新恢復步驟
- 記錄每次測試的結果
- 追蹤改進建議的實施狀況

### 3. 團隊培訓
- 確保團隊理解 RTO/RPO 概念
- 培訓人員熟悉恢復步驟
- 定期進行災難恢復演練

### 4. 監控告警
- 監控實際 RTO/RPO 指標
- 設置告警門檻
- 及時發現和處理問題

### 5. 持續改進
- 分析每次測試的 RCA
- 根據 RCA 推薦改進系統
- 定期審查和更新 DR 計畫

## 故障排除

### 問題 1：測試超時

**症狀**：故障轉移測試執行時間過長

**原因**：恢復步驟的 expectedDuration 過長

**解決方案**：
- 降低 expectedDuration 的値
- 優化恢復步驟的實現
- 並行執行獨立步驟

### 問題 2：RTO 超出目標

**症狀**：實際 RTO > 目標 RTO

**原因**：
- 故障檢測慢
- 通知流程低效
- 恢復步驟耗時

**解決方案**：
- 改進監控系統靈敏度
- 自動化通知流程
- 優化恢復步驟順序
- 並行執行非依賴步驟

### 問題 3：數據丟失

**症狀**：dataLoss > 0

**原因**：副本同步滯後、備份不完整

**解決方案**：
- 增加備份頻率
- 改進複製協議
- 實施同步複製

## 相關組件

- **MultiRegionManager** (P2.2.1) - 多區域架構管理
- **GeographicCacheManager** (P2.2.3) - 地域快取層
- **RegionalMonitoringSystem** (P2.2.4) - 區域監控告警
- **CrossRegionDeploymentManager** (P2.2.2) - 跨區域部署

## 總結

DisasterRecoveryManager 提供了完整的災難恢復解決方案，包括：
- ✅ 靈活的計畫管理
- ✅ 多種故障場景測試
- ✅ 精確的 RTO/RPO 驗證
- ✅ 自動化 RCA 分析
- ✅ 詳細的報告和指標
- ✅ 事件驅動的通知機制

通過規範化的測試和不斷改進，可以顯著提高系統的可用性和容災能力。
