# 版本更新快速參考卡 - Gravito Core v1.0.0

**生成日期**: 2026-02-26 | **狀態**: 待批准 | **用途**: 快速查閱

---

## 核心數字

| 指標 | 數值 |
|------|------|
| Tier 1 包 | 8 |
| Tier 2 包 | 51 |
| 總發佈包 | 69+ |
| MAJOR 版本 | 2 |
| 完成時間 | 7-11 天 |
| HTTP 中介軟體遷移 | 53 包 |
| Atlas 類型變更 | 16 包 |

---

## Tier 1 版本速查

```
@gravito/plasma         1.6.1 → 2.0.0 ✅ MAJOR
@gravito/atlas          1.6.0 → 2.0.0 ✅ MAJOR
@gravito/core           1.6.1 → 2.0.0 ✅ MAJOR
@gravito/signal         3.0.4 → 3.1.0 ✨ MINOR
@gravito/stasis         3.1.1 → 3.2.0 ✨ MINOR
@gravito/stream         2.0.2 → 2.1.0 ✨ MINOR
@gravito/photon         1.0.1 → 1.1.0 ✨ MINOR (新增 middleware)
@gravito/resilience     1.0.0 → 1.0.0 ⏳ 待決策
```

---

## 破壞性變更速查

### HTTP 中介軟體遷移

```typescript
// ❌ 舊
import { cors, csrf } from '@gravito/core'

// ✅ 新
import { cors, csrf } from '@gravito/photon/middleware/security'
```

**8 個導出**: cors, csrfProtection, getCsrfToken, securityHeaders, bodySizeLimit, requireHeaderToken, createHeaderGate, ThrottleRequests

### Atlas 類型導入

```typescript
// ❌ 舊
import { QuerySchema, ConnectionPayload } from '@gravito/atlas/src/types'

// ✅ 新
import { QuerySchema } from '@gravito/atlas/src/types/query'
import { ConnectionPayload } from '@gravito/atlas/src/types/connection'
```

---

## 發佈時間表

| 階段 | 日期 | 時間 | 範圍 |
|------|------|------|------|
| **準備** | 2026-02-27 ~ 2026-02-28 | 2-3 天 | 驗證 + 掃描 + 遷移準備 |
| **Tier 1** | 2026-03-01 | 1 天 | 8 個核心包 |
| **Tier 2** | 2026-03-02 ~ 2026-03-05 | 3-5 天 | 51 個直接依賴 |
| **Tier 3** | 2026-03-08 ~ 2026-03-09 | 1-2 天 | 8-12 個傳遞依賴 |

---

## Tier 2 分組速查

| 組 | 數量 | 型式 | 時間 | 特點 |
|----|------|------|------|------|
| **2A** | 45 | PATCH | 2-3h | 自動化，無代碼變更 |
| **2B** | 6 | MINOR | 4-5h | 手動調整，6 個包 |
| **2C** | 16 | MINOR | 5-6h | Atlas 類型遷移 |

**2A 包**: admin-* (13) + satellite-* (16) + 其他 (16)
**2B 包**: astral, constellation, cosmos, flare, impulse-bridge, impulse
**2C 包**: constellation, flare, impulse, launchpad, luminosity, mass, monolith, nebula, nova, pulsar, scaffold, sentinel, spectrum, zenith, ion, monitor

---

## 關鍵決策點

### @gravito/resilience 測試策略

| 選項 | 時間 | 覆蓋率 | 風險 | 推薦 |
|------|------|------|------|------|
| A | 0h | 0% | 高 | ❌ |
| B | 5-6h | 60-70% | 中 | ✅ **推薦** |
| C | 11h | 75%+ | 低 | ⏸️ |

**決策**: 選項 B（核心測試）
- 優先級 1 模組 3,017 行完全驗證
- 時間合理，風險可接受

---

## 驗證命令速查

```bash
# 構建驗證
bun run build
bun run typecheck:full
bun run test

# HTTP 中介軟體掃描
grep -r "from '@gravito/core'" packages/ | \
  grep -E "(cors|csrf|securityHeaders)"

# Atlas 類型導入掃描
grep -r "from '@gravito/atlas/src/types'" packages/

# Tier 1 版本驗證
npm view @gravito/core version
npm view @gravito/atlas version

# Tier 2 批量發佈
for pkg in packages/admin-*; do
  (cd $pkg && npm publish)
done
```

---

## 成功標準快檢

- [ ] Tier 1: 8 個包發佈 ✅
- [ ] Tier 2: 51 個包升級 ✅
- [ ] Tier 3: 8-12 個包升級 ✅
- [ ] 零發佈失敗
- [ ] 零嚴重回滾
- [ ] 發行說明完整

---

## 風險清單

| 風險 | 影響 | 緩解 |
|------|------|------|
| HTTP 中介軟體遷移失敗 | 高 | 發佈前掃描 + 驗證 |
| Atlas 類型不匹配 | 高 | 自動化腳本修正 |
| resilience 未測試 | 中 | 執行選項 B |

---

## 聯絡人 & 參考

| 項目 | 位置 |
|------|------|
| 完整分析 | ARCHITECTURE_REFACTOR_ANALYSIS.md |
| 執行計劃 | VERSION_UPDATE_PLAN.md |
| 檢查清單 | COMPLETE_PUBLISH_CHECKLIST.md |
| 執行摘要 | ANALYSIS_EXECUTIVE_SUMMARY.md |

---

## 一頁摘要

**Gravito Core v1.0.0 版本更新**:
- **8 個核心包** Bun 原生優化重構
- **69+ 個包** 需要更新
- **7-11 天** 完整發佈周期
- **三層架構**: Tier 1 (1天) → Tier 2 (3-5天) → Tier 3 (1-2天)
- **2 個破壞性變更**: HTTP 中介軟體遷移 + Atlas 類型重組
- **核心決策**: resilience 測試 → **推薦選項 B**
- **成功率**: 95%+

---

**快速參考卡 v1.0** | **2026-02-26** | **待批准**
