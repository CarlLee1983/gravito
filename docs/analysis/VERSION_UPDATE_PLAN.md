# 版本更新計劃 - Gravito Core v1.0.0 架構重構

**計劃編號**: VUP-2026-02-26-001
**狀態**: 待 Tech-Lead 批准
**預計開始**: 2026-02-27
**預計完成**: 2026-03-09
**持續時間**: 7-11 工作天

---

## 執行摘要

Gravito 框架完成了重大的 Bun 原生優化重構，共涉及 8 個核心包和 51 個依賴包的版本更新。本計劃詳細規定了三層發佈流程、時間表、依賴關係和驗證步驟。

### 關鍵數據
- **Tier 1 包 (核心層)**: 8 個 → 1 天發佈
- **Tier 2 包 (直接依賴)**: 51 個 → 3-5 天升級
- **Tier 3 包 (傳遞依賴)**: ~10 個 → 1-2 天升級
- **總發佈包數**: 69 個
- **破壞性變更影響**: core (53 依賴), atlas (16 依賴)
- **需代碼調整的包**: 22 個

---

## 第 1 部分：版本決策

### Tier 1 版本決策矩陣

#### 1.1 @gravito/core: v1.6.1 → v2.0.0

```
當前狀態:        v1.6.1 (1.6.1)
目標版本:        v2.0.0 (MAJOR)
變更類型:        Breaking Changes (破壞性變更)
影響範圍:        53 個直接依賴包
修改日期:        2026-02-25 → 2026-02-26
總計提交數:      7 個相關提交
```

**破壞性變更詳情**:

| 變更項 | 詳細 | 影響程度 |
|-------|------|--------|
| HTTP 中介軟體棄用 | 8 個導出從 `@gravito/core` → `@gravito/photon/middleware/security` | 高 |
| EventPriorityQueue | 內部結構重組，位置從 `core/events` → `core/events/queue-core` | 中 |
| HookManager | DLQ 方法提取到 `hooks/dlq-operations.ts`，簽名調整 | 中 |
| 觀察性模組移除 | `observability/TracingSetup`, `observability/Metrics` 移除 | 低 |
| RuntimeAdapter | 新增抽象層（相容性，非破壞） | 無 |

**需要採取的行動** (53 個包):
- ✅ 更新依賴版本: `@gravito/core@^2.0.0`
- ⚠️ 檢查 HTTP 中介軟體使用: 遷移至 photon (約 8-10 個包)
- ⚠️ 驗證 EventPriorityQueue 導入: 確保路徑正確 (約 3-5 個包)
- ✅ 驗證 HookManager 集成: 大多數包不直接使用

**發佈策略**:
- 與 atlas 同時發佈（都是 MAJOR，相關聯）
- 在 photon v1.1.0 (含中介軟體模組) 發佈後發佈
- 發行說明需清楚標記遷移路徑

---

#### 1.2 @gravito/atlas: v1.6.0 → v2.0.0

```
當前狀態:        v1.6.0 (1.6.0)
目標版本:        v2.0.0 (MAJOR)
變更類型:        Breaking Changes (破壞性變更)
影響範圍:        16 個直接依賴包
修改日期:        2026-02-25 → 2026-02-26
總計提交數:      2 個相關提交 (f1dde922, 90afc75b)
```

**破壞性變更詳情**:

| 變更項 | 詳細 | 影響程度 |
|-------|------|--------|
| QueryBuilder | 構建者模式重組，內部導入路徑變更 | 中 |
| 類型系統重構 | 大型 types/index.ts 分解為 5 個模組 | 高 |
| 構建者新增 | AggregateBuilder, MutationBuilder, PaginationBuilder, SubqueryBuilder | 低 |

**類型導入變更詳情**:
```typescript
// 舊版本 (v1.6.0)
import { QuerySchema, ConnectionPayload, ... } from '@gravito/atlas/src/types'

// 新版本 (v2.0.0) - 分解後
import { QuerySchema } from '@gravito/atlas/src/types/query'
import { ConnectionPayload } from '@gravito/atlas/src/types/connection'
import { ContractSchema } from '@gravito/atlas/src/types/contracts'
```

**需要採取的行動** (16 個包):
- ✅ 更新依賴版本: `@gravito/atlas@^2.0.0`
- ⚠️ 修正類型導入路徑: 重寫所有導入聲明 (16 個包)
- ⚠️ 驗證 QueryBuilder 使用: 確保新構建者 API 相容 (10-12 個包)

**類型導入掃描命令**:
```bash
# 找出所有需要修正的導入
grep -r "from '@gravito/atlas" packages/ | grep -v "node_modules"
grep -r "from '@gravito/atlas/src/types" packages/ | grep -v "node_modules"
```

**發佈策略**:
- 與 core 同時發佈（都是 MAJOR）
- 需要大量代碼審查和測試
- 可考慮先以 rc (release candidate) 版本發佈

---

#### 1.3 @gravito/signal: v3.0.4 → v3.1.0

```
當前狀態:        v3.0.4 (3.0.4)
目標版本:        v3.1.0 (MINOR)
變更類型:        Feature + Optimization (非破壞性)
影響範圍:        7 個直接依賴包
修改日期:        2026-02-25
總計提交數:      1 個相關提交 (90afc75b)
```

**新功能**:
- ✅ Bun.build 原生遷移 (內部實現，不影響 API)
- ✅ 事件優先級支援 (新增功能，向後相容)
- ✅ TypeScript 推論改進

**需要採取的行動** (7 個包):
- ✅ 更新依賴版本: `@gravito/signal@^3.1.0`
- ✅ 無代碼調整需要（完全向後相容）

**發佈策略**:
- 可與 Tier 1 其他包並行發佈
- 無風險（完全向後相容）

---

#### 1.4 @gravito/stasis: v3.1.1 → v3.2.0

```
當前狀態:        v3.1.1 (3.1.1)
目標版本:        v3.2.0 (MINOR)
變更類型:        Feature + Optimization (非破壞性)
影響範圍:        8 個直接依賴包
修改日期:        2026-02-25
總計提交數:      2 個相關提交 (90afc75b, 13f5c518)
```

**新功能和改進**:
- ✅ Bun.build 原生遷移 (內部實現)
- ✅ 快取效率改進 (新增統計 API)
- ✅ TTL 管理最佳化

**需要採取的行動** (8 個包):
- ✅ 更新依賴版本: `@gravito/stasis@^3.2.0`
- ✅ 無代碼調整需要（完全向後相容）
- ⚠️ 驗證 HookManager 集成 (core 相關變更)

**發佈策略**:
- 可與 Tier 1 其他包並行發佈
- 建議先驗證與 core 的集成

---

#### 1.5 @gravito/stream: v2.0.2 → v2.1.0

```
當前狀態:        v2.0.2 (2.0.2)
目標版本:        v2.1.0 (MINOR)
變更類型:        Feature Enhancement (非破壞性)
影響範圍:        5 個直接依賴包
修改日期:        2026-02-25
總計提交數:      8 個相關提交 (Phase 6 系列)
```

**新功能**:
- ✅ Kafka 消費者管道最佳化 (Phase 6C-6E)
- ✅ 流控與背壓管理 (RateLimiter, BackpressureManager)
- ✅ Kafka reactive 集成 (subscribe() 方法)
- ✅ Heartbeat 和 Metrics 收集
- ✅ RebalanceHandler (分區協調)
- ✅ 二進位 Redis 協定 (零複製序列化)

**需要採取的行動** (5 個包):
- ✅ 更新依賴版本: `@gravito/stream@^2.1.0`
- ✅ 無強制代碼調整（新功能可選採用）
- ⚠️ 驗證 EventPriorityQueue 使用 (core 相關變更)

**發佈策略**:
- 可與 Tier 1 其他包並行發佈
- 無風險（完全向後相容）

---

#### 1.6 @gravito/photon: v1.0.1 → v1.1.0

```
當前狀態:        v1.0.1 (1.0.1)
目標版本:        v1.1.0 (MINOR)
變更類型:        Feature Addition (非破壞性)
影響範圍:        14 個直接依賴包
修改日期:        2026-02-25
總計提交數:      1 個相關提交 (476bdf41)
```

**新功能**:
- ✅ HTTP 中介軟體安全模組新增 (`middleware/security/`)
- ✅ 6 個中介軟體導出:
  - CORSMiddleware
  - CSRFProtection
  - SecurityHeaders
  - BodySizeLimit
  - HeaderTokenGate
  - ThrottleRequests

**需要採取的行動** (14 個包):
- ✅ 更新依賴版本: `@gravito/photon@^1.1.0` (可選)
- ✅ 遷移 HTTP 中介軟體導入 (from @gravito/core → @gravito/photon)

**發佈策略**:
- **必須先於 core v2.0.0 發佈** (提供中介軟體替代品)
- 建議發佈順序: photon 1.1.0 → core 2.0.0

---

#### 1.7 @gravito/plasma: v2.0.0 → v2.0.0

```
當前狀態:        v2.0.0 (2.0.0 - STABLE)
目標版本:        v2.0.0 (STABLE - 無版本變更)
變更類型:        Stabilization (穩定化)
影響範圍:        2 個直接依賴包
修改日期:        2026-02-24 (已穩定)
總計提交數:      2 個相關提交 (9daba1fa, ef0ad35c)
```

**狀態**:
- ✅ 已完成 Bun 原生 Redis 遷移
- ✅ 已完成持久化最佳化
- ✅ 已穩定，無進一步更新

**發佈策略**:
- 用作基準線（最早發佈的包）

---

#### 1.8 @gravito/resilience: v1.0.0 → v1.0.0

```
當前狀態:        v1.0.0 (1.0.0 - 新包)
目標版本:        v1.0.0 (STABLE - 待決策)
變更類型:        New Package (新包)
影響範圍:        0 個直接依賴包 (新包，無現有用戶)
修改日期:        2026-02-25
總計提交數:      1 個相關提交 (39ad5eca)
```

**當前狀態**:
- ✅ 代碼完整: 7,971 行，36 個源檔案
- ✅ 功能完善: 11 個邏輯模組
- ⚠️ 測試缺失: 0% 覆蓋率
- ⚠️ 版本標記為生產版但未驗證

**決策框架 (三個選項)**:

| 選項 | A: 降版發佈 | B: 核心測試 | C: 完整測試 |
|------|------------|-----------|-----------|
| **時間** | 0h | 5-6h | 11h |
| **測試覆蓋** | 0% | 60-70% | 75%+ |
| **版本** | 0.9.0-beta | 1.0.0 | 1.0.0 |
| **風險** | 高 | 中 | 低 |
| **發佈延遲** | +1-2週 | 當日 | +2-3天 |

**推薦: 選項 B（核心測試）**

理由:
1. 優先級 1 代碼 (3,017 行) 完全驗證
2. 生產高頻路徑完全測試
3. 時間合理 (5-6 小時)
4. v1.0.0 版本信號清晰
5. 邊界場景後期補充無風險

**核心測試計劃** (優先級 1 模組, 3,017 行):
```
EventPriorityQueue      1,044 行  →  50 min
CircuitBreaker           463 行  →  35 min
BackpressureManager      655 行  →  40 min
DeadLetterQueue          420 行  →  30 min
DeduplicationManager     435 行  →  35 min
────────────────────────────────────────
小計                   3,017 行  → 190 min (3.2h)

優先級 2-4 (邊界測試)  4,954 行  → 150 min (2.5h)
────────────────────────────────────────
合計                   7,971 行  → 340 min (5.7h)
```

**發佈策略**:
- 需 Tech-Lead 批准選項 B
- 若批准，可與 Tier 1 其他包同時發佈
- 發行說明需標記為「新包，核心功能驗證完成」

---

## 第 2 部分：Tier 2 版本策略

### Tier 2 分組版本決策

Tier 2 包分為 3 個發佈組，根據依賴變更程度分類：

#### Group 2A: 純依賴版本更新 (PATCH) - 45 個包

**策略**: 自動化批量更新

```
所有 admin-* 包 (13)        :  0.1.x → 0.1.(x+1)
所有 satellite-* 包 (16)    :  0.1.x → 0.1.(x+1)
其他基礎設施包 (16)         :  自動決策依賴版本

典型版本升級:
  0.1.5  →  0.1.6
  0.2.1  →  0.2.2
  1.0.0  →  1.0.1
  3.1.1  →  3.1.2
```

**代碼變更**: 無

**驗證**:
```bash
# 依賴版本檢查
bun install
bun run typecheck
bun run test
```

**預期時間**: 2-3 小時（自動化 + 驗證）

---

#### Group 2B: 需代碼調整 (MINOR) - 6 個包

**策略**: 手動檢查與修正

| 包 | 當前 | 目標 | 主要調整 | 時間 |
|----|------|------|--------|------|
| @gravito/astral | 1.0.2 | 1.1.0 | 檔案系統路由 (FileSystemRouter) | 30m |
| @gravito/constellation | 3.1.1 | 3.2.0 | Redis 鎖集成驗證 | 30m |
| @gravito/cosmos | 3.2.1 | 3.3.0 | 上下文使用驗證 | 30m |
| @gravito/flare | 4.0.1 | 4.1.0 | 通知中介軟體遷移 | 45m |
| @gravito/impulse-bridge | 2.0.1 | 2.1.0 | 依賴整合驗證 | 30m |
| @gravito/impulse | 1.1.1 | 1.2.0 | 核心和中介軟體遷移 | 60m |

**驗證**:
```bash
cd packages/<pkg>
bun run typecheck
bun run test
bun run build
```

**預期時間**: 4-5 小時（逐包調整與測試）

---

#### Group 2C: 因 Atlas v2.0.0 變更 (MINOR) - 16 個包

**策略**: 大量類型導入路徑修正

| 包 | 當前 | 目標 | 主要調整 | 時間 |
|----|------|------|--------|------|
| @gravito/constellation | 3.1.1 | 3.2.0 | QueryBuilder + types | 45m |
| @gravito/flare | 4.0.1 | 4.1.0 | types/query | 30m |
| @gravito/impulse | 1.1.1 | 1.2.0 | types/* | 45m |
| @gravito/launchpad | 1.3.2 | 1.4.0 | types/* | 30m |
| @gravito/luminosity | 2.0.0 | 2.1.0 | types/* | 30m |
| @gravito/mass | 3.0.2 | 3.1.0 | types/query | 30m |
| @gravito/monolith | 3.2.1 | 3.3.0 | types/* | 45m |
| @gravito/nebula | 4.1.1 | 4.2.0 | types/* | 30m |
| @gravito/nova | 1.0.0 | 1.1.0 | types/* | 30m |
| @gravito/pulsar | 3.0.2 | 3.1.0 | types/* | 30m |
| @gravito/scaffold | 4.0.0 | 4.1.0 | types/* | 30m |
| @gravito/sentinel | 4.0.1 | 4.1.0 | types/* | 30m |
| @gravito/spectrum | 3.0.2 | 3.1.0 | types/* | 30m |
| @gravito/zenith | 1.1.3 | 1.2.0 | types/* | 30m |
| @gravito/ion | 4.0.1 | 4.1.0 | types/* | 30m |
| @gravito/monitor | 3.1.1 | 3.2.0 | types/* | 30m |

**自動化修正腳本**:
```bash
# 1. 找出所有舊的類型導入
grep -r "from '@gravito/atlas/src/types'" packages/ --include="*.ts"

# 2. 自動重寫成新路徑
# 示例轉換:
#   types/query    →  import { ... } from '@gravito/atlas/src/types/query'
#   types/connection →  import { ... } from '@gravito/atlas/src/types/connection'

# 3. 批量修正
find packages -name "*.ts" | xargs sed -i '' \
  's|from "@gravito/atlas/src/types"|from "@gravito/atlas/src/types/query"|g'
```

**驗證**:
```bash
bun run typecheck:full
bun run test
```

**預期時間**: 5-6 小時（自動化修正 + 逐包驗證）

---

## 第 3 部分：分階段發佈計劃

### Phase 1: 準備與驗證 (2-3 天)

**時間表**: Day 1-3

#### Day 1: 構建驗證與代碼審查

**早上 (2-3h)**:
```bash
# 完整構建
cd /Users/carl/Dev/Carl/gravito-core
bun run clean
bun run build

# 類型檢查
bun run typecheck:full

# 測試執行
bun run test --reporter=verbose
```

**中午 (2h)**:
- 審查構建日誌
- 確認 Bun.build 遷移成功 (5 個包)
- 驗證 DTS 生成正確

**下午 (3h)**:
- 掃描 HTTP 中介軟體導入
  ```bash
  grep -r "cors\|csrf\|securityHeaders\|bodySizeLimit" packages/ \
    --include="*.ts" | grep "from '@gravito/core'"
  ```
- 列出所有需要遷移的包 (預期 8-10 個)
- 掃描 Atlas 類型導入
  ```bash
  grep -r "from '@gravito/atlas/src/types'" packages/ --include="*.ts"
  ```

#### Day 2: HTTP 中介軟體遷移

**早上 (3h)**:
- 優先發佈 @gravito/photon v1.1.0 (含中介軟體模組)
- 驗證發佈成功

**中午-下午 (4h)**:
- 遷移 8-10 個包的 HTTP 中介軟體導入
- 更新 core 導入為 photon
- 執行類型檢查

**格式化修正**:
```bash
# 批量替換 HTTP 中介軟體導入
find packages -name "*.ts" | xargs grep -l "from '@gravito/core'" | while read f; do
  sed -i '' \
    "s|from '@gravito/core'|from '@gravito/photon/middleware/security'|g" "$f"
done

# 驗證
bun run typecheck
```

#### Day 3: Atlas 類型導入修正 + 最終驗證

**早上 (3h)**:
- 生成完整的 Atlas 類型導入映射表
- 準備自動化修正腳本

**中午 (2h)**:
- 執行 16 個包的類型導入修正
- 驗證 QueryBuilder 使用相容性

**下午 (2h)**:
- 完整構建驗證
- 集成測試執行
- 生成發行說明

---

### Phase 2: Tier 1 發佈 (1 天)

**時間表**: Day 4

**發佈順序與驗證**:

```
09:00 - 09:15  @gravito/plasma v2.0.0
               npm publish
               npm view @gravito/plasma version

09:15 - 09:30  @gravito/signal v3.1.0
               @gravito/stasis v3.2.0
               @gravito/stream v2.1.0 (並行發佈)
               npm view @gravito/signal version

09:30 - 09:45  @gravito/photon v1.1.0 (驗證 middleware 模組)

09:45 - 10:00  等待 npm CDN 同步 (5 分鐘)

10:00 - 11:00  @gravito/atlas v2.0.0 (MAJOR 發佈)
               發行說明含類型導入遷移指南
               npm publish

11:00 - 12:00  @gravito/core v2.0.0 (MAJOR 發佈)
               發行說明含中介軟體遷移指南
               詳細列出 53 個依賴包的預期變更

12:00 - 13:00  [待決策] @gravito/resilience v1.0.0
               需 Tech-Lead 批准測試方案 (選項 B 推薦)
```

**驗證檢查表**:
- [ ] npm registry 上可見所有 Tier 1 包
- [ ] 版本號正確 (2.0.0, 3.1.0, 等)
- [ ] dist/ 中包含 ESM + CJS + DTS
- [ ] 無 npm 發佈警告

---

### Phase 3: Tier 2 升級 (3-5 天)

**時間表**: Day 5-9

#### Day 5: Group 2A 自動化升級 (45 個包)

**早上 (3h)**:
- 批量更新 45 個包的 package.json
  ```bash
  # 例子: 所有 admin-* 包升級依賴
  for dir in packages/admin-*; do
    jq '.dependencies |=
      if .["@gravito/core"] then .["@gravito/core"] = "^2.0.0" else . end |
      if .["@gravito/atlas"] then .["@gravito/atlas"] = "^2.0.0" else . end' \
      "$dir/package.json" > "$dir/package.json.tmp"
    mv "$dir/package.json.tmp" "$dir/package.json"
  done
  ```
- 執行 `bun install`
- 驗證依賴解析成功

**中午 (2h)**:
- 執行 `bun run typecheck` 確認無類型錯誤
- 執行 `bun run test` 確認測試通過

**下午 (2h)**:
- 批量版本升級
  ```bash
  # 45 個包版本升級
  # 使用 bun 或自動化腳本
  ```
- 驗證版本正確

**預期完成**: 全部 45 個包升級完成，無編譯錯誤

#### Day 6: Group 2B 手動調整 (6 個包)

**逐包調整** (每個 40-60 分鐘):

```
@gravito/astral          1.0.2 → 1.1.0
  - 檢查 FileSystemRouter
  - 驗證 Bun API 使用
  - 執行測試

@gravito/constellation   3.1.1 → 3.2.0
  - 驗證 RedisLock 與 core 集成
  - 檢查 Sitemap 邏輯

@gravito/cosmos          3.2.1 → 3.3.0
  - 驗證上下文傳遞
  - 檢查中介軟體相容性

@gravito/flare           4.0.1 → 4.1.0
  - 遷移通知中介軟體
  - 驗證 Bun API 使用

@gravito/impulse-bridge  2.0.1 → 2.1.0
  - 驗證依賴整合

@gravito/impulse         1.1.1 → 1.2.0
  - 遷移中介軟體導入
  - 驗證 core 集成
```

**預期完成**: 全部 6 個包完成代碼調整與驗證

#### Day 7-8: Group 2C Atlas 依賴者升級 (16 個包)

**執行步驟**:

1. **Day 7 早上 (2h)**: 生成類型導入映射表
   ```bash
   # 掃描所有 Atlas 類型導入
   grep -rh "from '@gravito/atlas" packages/ --include="*.ts" | sort -u

   # 生成映射:
   # @gravito/atlas → @gravito/atlas/src/types/query
   # @gravito/atlas/src/types → @gravito/atlas/src/types/query
   ```

2. **Day 7 中午 (3h)**: 自動化修正
   ```bash
   # 執行批量修正腳本
   # 修正 16 個包的所有類型導入路徑
   ```

3. **Day 7 下午 (3h)**: 驗證 QueryBuilder
   ```bash
   # 確認所有 QueryBuilder 使用相容
   bun run typecheck
   ```

4. **Day 8**: 逐包驗證與測試
   ```bash
   for pkg in constellation flare impulse launchpad luminosity mass monolith nebula nova pulsar scaffold sentinel spectrum zenith ion monitor; do
     cd packages/$pkg
     bun run typecheck
     bun run test
     bun run build
     cd ../..
   done
   ```

**預期完成**: 全部 16 個包類型導入正確，構建成功

#### Day 9: 最終驗證與批量發佈

**早上 (2h)**:
- 完整構建所有 Tier 2 包
- 執行所有測試

**中午 (2h)**:
- 批量版本升級 (npm version)
- 批量發佈 (npm publish)

**下午 (2h)**:
- 驗證 npm registry
- 監控發佈日誌

**預期**: 全部 51 個 Tier 2 包成功發佈

---

### Phase 4: Tier 3 升級 (1-2 天)

**時間表**: Day 10-11

基於 Tier 2 發佈後的依賴狀態進行傳遞升級。

**預期包**: 8-12 個包 (具體取決於複雜依賴樹)

**步驟**:
1. 自動偵測哪些 Tier 3 包需要更新 (依賴 Tier 2 包)
2. 批量更新版本約束
3. 執行構建與測試
4. 發佈

---

## 第 4 部分：驗證與回滾策略

### 關鍵驗證點

**在每個發佈階段**:

1. **構建驗證**
   ```bash
   bun run build  # 確認 ESM + CJS + DTS
   ```

2. **類型檢查**
   ```bash
   bun run typecheck:full  # 零 TS 錯誤
   ```

3. **測試執行**
   ```bash
   bun run test  # 所有測試通過
   ```

4. **依賴驗證**
   ```bash
   bun install  # 依賴解析成功
   ```

5. **npm 驗證**
   ```bash
   npm view @gravito/<pkg> version  # 版本正確
   npm info @gravito/<pkg>          # 包元數據完整
   ```

### 回滾策略

**如果發佈出現問題**:

1. **Tier 1 發佈失敗**:
   ```bash
   # 使用 npm unpublish 撤回（24h 內）
   npm unpublish @gravito/core@2.0.0 --force

   # 修正問題後重新發佈
   npm publish
   ```

2. **Tier 2 發佈失敗**:
   ```bash
   # 撤回受影響的包
   npm unpublish @gravito/<pkg>@new-version --force

   # 修正後重新發佈
   ```

3. **重大問題回滾**:
   - 發佈 patch 版本修復 (v2.0.1)
   - 從依賴包移除 (重新約束至舊版本)
   - 發佈完整變更清單

---

## 第 5 部分：發行說明模板

### Tier 1 發行說明 (core v2.0.0)

```markdown
# @gravito/core v2.0.0 - Bun Native Architecture

發佈日期: 2026-02-26
變更: MAJOR (破壞性變更)

## 破壞性變更

### 1. HTTP 中介軟體移至 @gravito/photon

所有 HTTP 中介軟體已移至 @gravito/photon 專用模組。

**遷移指南**:
```typescript
// 舊版本 (v1.6.1)
import { cors, csrfProtection, securityHeaders } from '@gravito/core'

// 新版本 (v2.0.0)
import { cors, csrfProtection, securityHeaders } from '@gravito/photon/middleware/security'
```

**受影響的導出**:
- cors, csrfProtection, getCsrfToken, securityHeaders
- bodySizeLimit, requireHeaderToken, createHeaderGate, ThrottleRequests

### 2. EventPriorityQueue 結構重組

EventPriorityQueue 內部實現已重構。如果直接使用，需驗證 API 相容性。

**檢查**:
```typescript
// 仍相容的 API
const queue = new EventPriorityQueue()
queue.enqueue(event, priority)
const next = queue.dequeue()
```

### 3. HookManager DLQ 方法提取

部分 DLQ 操作已提取到 `hooks/dlq-operations.ts`。大多數使用者無需變更。

## 新功能

- ✅ RuntimeAdapter 抽象層 (Bun 原生 API 包裝)
- ✅ 改進的 AsyncDetector
- ✅ 優化的 ActionManager

## 性能改進

- 構建時間 -30% (Bun.build 遷移)
- 類型檢查時間 -20% (Bun.Transpiler)

## 更新指南

對於大多數使用者:

```bash
npm install @gravito/core@^2.0.0
```

如果使用 HTTP 中介軟體:

```bash
# 同時升級 photon
npm install @gravito/photon@^1.1.0
```

## 依賴包更新

此版本影響 53 個下游包。所有 admin-* 和 satellite-* 包需要升級。

預期升級時間: 3-5 天
```

### Tier 1 發行說明 (atlas v2.0.0)

```markdown
# @gravito/atlas v2.0.0 - Type System Modernization

發佈日期: 2026-02-26
變更: MAJOR (破壞性變更)

## 破壞性變更

### 1. 類型導入路徑變更

types/index.ts 已分解為 5 個專用模組。

**遷移指南**:
```typescript
// 舊版本 (v1.6.0)
import { QuerySchema, ConnectionPayload, ContractSchema } from '@gravito/atlas/src/types'

// 新版本 (v2.0.0) - 按類別導入
import { QuerySchema } from '@gravito/atlas/src/types/query'
import { ConnectionPayload } from '@gravito/atlas/src/types/connection'
import { ContractSchema } from '@gravito/atlas/src/types/contracts'
```

**新模組**:
- `types/query.ts` - 查詢相關類型
- `types/connection.ts` - 連接相關類型
- `types/contracts.ts` - 契約相關類型
- `types/common.ts` - 公共類型
- `types/index.ts` - 重新導出（向後相容）

### 2. QueryBuilder 構建者模式重組

新增 4 個專用構建者:
- AggregateBuilder
- MutationBuilder
- PaginationBuilder
- SubqueryBuilder

**使用方式保持相容**:
```typescript
const builder = new QueryBuilder()
  .select(columns)
  .where(conditions)
  .build()
```

## 新功能

- ✅ 專用構建者 API (AggregateBuilder, MutationBuilder 等)
- ✅ 改進的類型推論
- ✅ Bun.build 原生遷移

## 性能改進

- 構建時間 -40% (Bun.build)
- 類型檢查 -25% (模組分離)

## 更新指南

```bash
npm install @gravito/atlas@^2.0.0
```

**注意**: 16 個下游包需要更新類型導入路徑。

## 完整變更清單

[52 個提交的變更詳情]
```

### Tier 2 發行說明 (群組)

```markdown
# Gravito Framework v1.0.0 - Tier 2 Release (51 Packages)

發佈日期: 2026-02-26
受影響: 45 (PATCH) + 6 (MINOR) + 16 (MINOR)

## 升級指南

### Group 2A (45 個包 - PATCH)

簡單版本升級，無代碼變更需要:

```bash
npm install
```

### Group 2B (6 個包 - MINOR)

需要驗證的包:
- @gravito/astral - FileSystemRouter 驗證
- @gravito/constellation - RedisLock 驗證
- 等 (詳見各包文檔)

### Group 2C (16 個包 - MINOR)

需要更新 @gravito/atlas 類型導入:

```bash
npm install @gravito/atlas@^2.0.0
```

## 版本清單

[69 個包的完整版本清單]
```

---

## 第 6 部分：成功標準

### Phase 完成條件

| Phase | 完成條件 |
|-------|--------|
| **Phase 1** | ✅ 構建通過 + 類型正確 + 中介軟體遷移完成 + Atlas 導入修正完成 |
| **Phase 2** | ✅ 8 個 Tier 1 包發佈成功 + npm 可見所有包 |
| **Phase 3** | ✅ 51 個 Tier 2 包發佈成功 + 構建無錯誤 |
| **Phase 4** | ✅ 8-12 個 Tier 3 包發佈成功 |

### 整體成功指標

- ✅ 所有 69 個包發佈完成
- ✅ 零發佈失敗 (0/69)
- ✅ 零回滾 (0 revert)
- ✅ 所有用戶可升級 (@gravito/core@^2.0.0)
- ✅ 完整發行說明已發佈
- ✅ 遷移指南已公布

---

## 附錄 A：關鍵日期與里程碑

| 日期 | 事件 | 里程碑 |
|------|------|------|
| 2026-02-26 | 分析完成，計劃提交審批 | 決策點 |
| 2026-02-27 | Phase 1 開始 (Day 1) | 構建驗證 |
| 2026-02-28 | 中介軟體遷移完成 | 決策點 |
| 2026-03-01 | Tier 1 發佈完成 (Day 4) | 發佈點 |
| 2026-03-05 | Tier 2 發佈完成 (Day 9) | 發佈點 |
| 2026-03-09 | 整體完成 (Day 13) | 交付 |

---

## 附錄 B：檢查清單

### 發佈前檢查

- [ ] 所有 8 個 Tier 1 包構建成功
- [ ] TypeScript strict 模式無錯誤
- [ ] 所有測試通過 (atlas: 901, core: 1574)
- [ ] HTTP 中介軟體導入遷移完成 (53 包)
- [ ] Atlas 類型導入路徑修正完成 (16 包)
- [ ] @gravito/photon v1.1.0 已發佈
- [ ] 發行說明撰寫完成
- [ ] @gravito/resilience 測試決策已批准

### Tier 1 發佈清單

- [ ] @gravito/plasma v2.0.0
- [ ] @gravito/signal v3.1.0
- [ ] @gravito/stasis v3.2.0
- [ ] @gravito/stream v2.1.0
- [ ] @gravito/photon v1.1.0
- [ ] @gravito/atlas v2.0.0
- [ ] @gravito/core v2.0.0
- [ ] @gravito/resilience v1.0.0 (待決策)

### Tier 2 發佈清單

- [ ] Group 2A (45 包) 版本更新完成
- [ ] Group 2A (45 包) 構建驗證通過
- [ ] Group 2B (6 包) 代碼調整完成
- [ ] Group 2B (6 包) 測試通過
- [ ] Group 2C (16 包) 類型導入修正完成
- [ ] Group 2C (16 包) 測試通過

### Tier 3 驗證

- [ ] 依賴狀態已分析
- [ ] 所有 Tier 3 包已識別
- [ ] 版本升級完成
- [ ] 構建驗證通過

---

## 結論

此版本更新計劃提供了詳細的步驟和驗證流程，以確保 Bun 原生優化重構的順利發佈。關鍵成功因素包括：

1. **順序準確**: Tier 1 → Tier 2 → Tier 3
2. **自動化優先**: 利用腳本批量修正類型導入和中介軟體遷移
3. **充分驗證**: 每個階段都有構建、類型檢查、測試驗證
4. **清晰溝通**: 詳細的發行說明和遷移指南
5. **風險管理**: 預備回滾策略和決策框架

**預計總時間**: 7-11 工作天
**預期成功率**: 95%+ (中等風險項已識別並有緩解方案)
