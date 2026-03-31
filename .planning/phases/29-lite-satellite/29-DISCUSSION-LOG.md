# Phase 29: Lite Satellite - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 29-lite-satellite
**Areas discussed:** Collision 偵測策略, boot() 整合方式, gravito.config.ts 範例, 錯誤訊息設計

---

## Collision 偵測策略

| Option | Description | Selected |
|--------|-------------|----------|
| Container 層放防 | singletonInline() 內部檢查 key 是否已存在 | |
| plugin() 層放防 | 在 plugin() 方法中檢查 name 是否已被其他 Lite Satellite 使用 | |
| 兩層都放 | plugin() 檢查 name 重複 + Container 檢查 key 重複 | ✓ |

**User's choice:** 兩層都放
**Notes:** 最完整的保護，兩層互補（一個抓 plugin 重名，一個抓 key 重名）

---

| Option | Description | Selected |
|--------|-------------|----------|
| Dev-only throw | 與 Success Criteria 2 一致，Production 下靜默覆蓋或 warn | ✓ |
| 全環境 throw | Binding collision 是嚴重錯誤，不論環境都應該 fail fast | |
| Dev throw + Prod warn | Dev mode throw exception，Production 用 logger.warn | |

**User's choice:** Dev-only throw
**Notes:** 與 success criteria 文字一致

---

| Option | Description | Selected |
|--------|-------------|----------|
| 檢查 installedOrbits | plugin() 已將 name push 到 installedOrbits，檢查新 plugin name 是否已在其中 | ✓ |
| 獨立 Set 追蹤 | 新增 private inlinePluginNames: Set<string> | |
| Container 反查 | 檢查 container.has(`inline:${name}:*`) | |

**User's choice:** 檢查 installedOrbits
**Notes:** 用現有機制，簡單且不需新增 data structure

---

| Option | Description | Selected |
|--------|-------------|----------|
| throw CONTAINER_BINDING_COLLISION | singletonInline() 內部檢查 has(namespacedKey)，已存在則 throw | ✓ |
| warn + skip | 發現重複 key 時 logger.warn 並跳過註冊 | |

**User's choice:** throw CONTAINER_BINDING_COLLISION
**Notes:** 與 plugin() 層的 name 檢查互補

## boot() 整合方式

| Option | Description | Selected |
|--------|-------------|----------|
| 自動走 plugin() 流程 | boot() 偵測到 plain object + 有 name 屬性時，自動走 core.plugin() | ✓ |
| 維持現狀 + 專屬入口 | config.orbits 行為不變，Lite Satellite 必須透過專屬 config.plugins 或手動 core.plugin() | |
| 新增 config.plugins 欄位 | GravitoConfig 新增 plugins: GravitoOrbit[] 專屬欄位 | |

**User's choice:** 自動走 plugin() 流程
**Notes:** boot() 中偵測 plain object + name 自動路由到 plugin()

---

| Option | Description | Selected |
|--------|-------------|----------|
| 用 name 屬性判斷 | 有 name + 非 constructor 實例化的 plain object → plugin()，其餘 → orbit() | ✓ |
| 明確的 type discriminator | 新增 type: 'lite-satellite' | 'orbit' 欄位 | |
| You decide | Claude 自行判斷 | |

**User's choice:** 用 name 屬性判斷
**Notes:** 簡單且向後相容

## gravito.config.ts 範例

| Option | Description | Selected |
|--------|-------------|----------|
| 直接 object literal | orbits: [PhotonOrbit, { name: 'ping', install(core) { ... } }] | ✓ |
| definePlugin() helper | 提供 definePlugin({ name, install }) helper function | |
| 兩者都支援 | object literal 和 definePlugin() 都可以用 | |

**User's choice:** 直接 object literal
**Notes:** 零額外 API，最簡單

## 錯誤訊息設計

| Option | Description | Selected |
|--------|-------------|----------|
| SystemException | 與 MiddlewareDriftException 一致，使用 SystemException('CONTAINER_BINDING_COLLISION') | ✓ |
| 專屬 ContainerException | 新增 ContainerException 子類 | |
| GravitoException | 直接用基礎類 | |

**User's choice:** SystemException
**Notes:** 與 Phase 28 的 MiddlewareDriftException 模式一致

---

| Option | Description | Selected |
|--------|-------------|----------|
| 衝突雙方資訊 | 顯示衝突的 key、既有來源 plugin name、新來源 plugin name | ✓ |
| 簡單 key 資訊 | 僅顯示衝突的 key | |
| You decide | Claude 自行判斷 | |

**User's choice:** 衝突雙方資訊
**Notes:** 提供足夠 debug 資訊

---

| Option | Description | Selected |
|--------|-------------|----------|
| 與 Container 層一致 | 同樣用 SystemException('CONTAINER_BINDING_COLLISION')，訊息說明是 plugin name 重複 | ✓ |
| 專屬 error code | 新增 PLUGIN_NAME_COLLISION error code | |
| You decide | Claude 判斷是否需要區分 | |

**User's choice:** 與 Container 層一致
**Notes:** 統一 error code，簡化 catch 邏輯

## Claude's Discretion

- Dev-mode detection mechanism
- Exact error message wording and formatting
- Test structure and organization

## Deferred Ideas

None — discussion stayed within phase scope
