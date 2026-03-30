# Phase 25: Container Type Improvement - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 25-container-type-improvement
**Areas discussed:** ServiceMap 修復範圍, 下游包採用策略, 現有 cast 清理

---

## ServiceMap 修復範圍

### Q1: Container.d.ts 處理策略

| Option | Description | Selected |
|--------|-------------|----------|
| 同步修改 .d.ts（推薦） | Container.ts 和 Container.d.ts 一起改，保持手動維護現狀。最小變更、最安全。 | ✓ |
| 刪除 .d.ts，用構建產生 | 移除手動 Container.d.ts，讓 build:dts 自動產生。需要驗證構建結果一致。 | |
| 你決定 | Claude 根據實際情況判斷最佳方案 | |

**User's choice:** 同步修改 .d.ts（推薦）
**Notes:** 保持手動維護現狀，最小化變更風險。

### Q2: Overload 行為驗證

| Option | Description | Selected |
|--------|-------------|----------|
| 擴展現有測試（推薦） | 在 service-map.test.ts 中增加型別推斷驗證（確認回傳型別非 any）和未註冊 key 的 fallback 行為。 | ✓ |
| 維持現有測試就好 | service-map.test.ts 已涵蓋基本場景，不需新增。 | |
| 你決定 | Claude 判斷測試充分度 | |

**User's choice:** 擴展現有測試（推薦）
**Notes:** 增加型別推斷驗證和 fallback 行為測試。

---

## 下游包採用策略

| Option | Description | Selected |
|--------|-------------|----------|
| 僅修 Container（推薦） | 本 phase 只修 Container 型別。各 orbit 包的 ServiceMap 採用留給 v2.2 或各包自行決定。符合 SC 和 v2.1.0 範圍限制。 | ✓ |
| 加一個範例包 | 選一個常用的 orbit（如 atlas/db）加入 ServiceMap augmentation 作為採用範例。超出原 scope 但提供實際價值。 | |
| 你決定 | Claude 判斷是否值得 | |

**User's choice:** 僅修 Container（推薦）
**Notes:** 符合 v2.1.0 僅改善 core 包 DX 的原則。

---

## 現有 cast 清理

| Option | Description | Selected |
|--------|-------------|----------|
| 不清理（推薦） | 本 phase 僅修 Container 型別。cast 清理需要先有 ServiceMap augmentation，而那是各 orbit 包的事。順序正確：先有型別基礎→再採用→最後清理。 | ✓ |
| 清理 core 包內的 | 僅清理 packages/core/ 內部的 cast（如 DeadLetterQueueManager），不動 orbit 包。 | |
| 你決定 | Claude 判斷哪些值得清理 | |

**User's choice:** 不清理（推薦）
**Notes:** 正確順序：fix type foundation → adopt augmentation → clean casts。

---

## Claude's Discretion

- Biome ignore comment wording
- JSDoc adjustments on ServiceMap
- Test structure within service-map.test.ts

## Deferred Ideas

- ServiceMap augmentation in orbit packages (v2.2+)
- Cast cleanup across codebase (after augmentation adoption)
- Container full generic refactor TYPE-04 (v2.2+)
