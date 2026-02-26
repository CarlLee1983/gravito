# Tier 2 版本更新計劃

## 概述
- **包數量**：79 個（packages/ 64 + satellites/ 16）
- **排除**：8 個 Tier 1 核心包
- **分類**：3 個子層（2A、2B、2C）

## Tier 2A：純版本更新（45 個包）

### 描述
只需更新 package.json 中的 peerDependencies/devDependencies 版本引用，無代碼修改。

### 版本更新規則
- `@gravito/core`: ^1.6.1 → ^2.0.0
- `@gravito/atlas`: ^1.6.0 → ^2.0.0
- `@gravito/stream`: ^2.0.2 → ^2.1.0
- `@gravito/photon`: ^1.0.1 → ^1.1.0
- `@gravito/signal`: ^3.0.4 → ^3.1.0
- `@gravito/stasis`: ^3.1.1 → ^3.2.0

### 包清單（45 個）
```
packages:
- admin-ui-catalog
- admin-ui-commerce
- admin-ui-core
- admin-ui-custom-fields
- admin-ui-media
- admin-ui-menu
- admin-ui-messaging
- admin-ui-reporting
- admin-ui-theme
- admin-ui-users
- admin-ui-workflow
- beam
- chromatic
- colony
- constellation
- cosmos
- echo
- flare
- flux
- forge
- graphql
- horizon
- impulse
- ion
- luminosity-adapter-photon
- mass
- monolith
- monitor
- nebula
- nebula-s3
- nova
- orbit-cloudflare
- prism
- pulsar
- quark
- ripple
- scaffold
- spectrum
- velocity

satellites:
- ad
- analytics
- announcement
- blog
- chat
- commerce
- content-hub
- crm
- invoice
- membership
- news
- reporting
- support
- survey
- tax
- workflow
```

**預期操作時間**：5 分鐘（腳本自動化）

---

## Tier 2B：代碼調整（6 個包）

### 描述
需要進行代碼遷移或架構調整，除版本更新外還需修改代碼。

### 調整類型與包

#### B1: Middleware 遷移（2 個包）
- `@gravito/fortify`: Security middleware 遷移準備
  - 可能需要更新導入路徑

- `@gravito/sentinel`: Auth middleware 遷移準備
  - 可能需要更新導入路徑

#### B2: 特殊依賴調整（4 個包）
- `@gravito/impulse-bridge`: 依賴 impulse + 新的 resilience
  - 需要驗證集成

- `@gravito/orbit-cloudflare`: 特殊適配器
  - 需要驗證版本相容性

- `@gravito/luminosity-adapter-photon`: Adapter 特殊邏輯
  - 需要驗證版本相容性

- `@gravito/quark`: 可能依賴 stream 內部 API
  - 需要檢查是否使用了移除的 API

**預期操作時間**：20 分鐘（手動檢查 + 小規模修改）

---

## Tier 2C：Satellites（16 個）

### 描述
業務領域外掛，可能需要特殊處理或 Atlas 類型導入路徑更新。

### 包清單（16 個）
```
ad
analytics
announcement
blog
chat
commerce
content-hub
crm
invoice
membership
news
reporting
support
survey
tax
workflow
```

### 特殊考慮
- **commerce**: 有已知的 flash-sale 依賴（已在 Phase 3.3 中驗證）
- **其他**：檢查是否有 Atlas 類型導入需要更新

**預期操作時間**：15 分鐘（驗證 + 必要的小調整）

---

## 執行流程

### Phase 1：Tier 2A 自動化更新
```bash
bun scripts/update-tier2a-versions.ts
```

### Phase 2：Tier 2B 手動檢查
```bash
# 逐個檢查以下包
cd packages/fortify && bun typecheck
cd packages/sentinel && bun typecheck
cd packages/impulse-bridge && bun typecheck
cd packages/orbit-cloudflare && bun typecheck
cd packages/luminosity-adapter-photon && bun typecheck
cd packages/quark && bun typecheck
```

### Phase 3：Tier 2C Satellites 驗證
```bash
# 運行 satellites 隔離驗證
bun run scripts/validate-satellite-isolation.ts
```

### Phase 4：全量檢查與提交
```bash
bun run typecheck:full
bun run check
git add -A && git commit -m "chore: update Tier 2 packages..."
```

---

## 成功指標

- [ ] 45 個 Tier 2A 包版本更新完成
- [ ] 6 個 Tier 2B 包代碼檢查完成
- [ ] 16 個 Tier 2C Satellites 驗證完成
- [ ] TypeScript 檢查：0 錯誤
- [ ] Biome 檢查：0 錯誤
- [ ] 所有變更已提交

---

## 風險評估

| 項目 | 風險等級 | 緩解措施 |
|------|--------|--------|
| 中間件 API 更改 | 🟡 中 | 在 Tier 2B 中仔細檢查 |
| Satellite 隔離違規 | 🟡 中 | 執行隔離驗證腳本 |
| 類型不相容 | 🟡 中 | 運行完整 TypeScript 檢查 |
| 迴圈依賴 | 🔴 高 | 執行依賴圖生成檢查 |

---

## 時間表

- **Tier 2A**：~5 分鐘
- **Tier 2B**：~20 分鐘
- **Tier 2C**：~15 分鐘
- **全量檢查**：~10 分鐘
- **總計**：~50 分鐘
