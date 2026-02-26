# NPM 發佈檢查清單 - Gravito v1.0.0 Tier 1 & 2

## 進度追蹤

### ✅ 完成的工作

#### Phase 1：版本更新
- [x] Tier 1 核心層 8 個包版本更新
  - @gravito/core: 1.6.1 → 2.0.0 (MAJOR)
  - @gravito/atlas: 1.6.0 → 2.0.0 (MAJOR)
  - @gravito/stream: 2.0.2 → 2.1.0 (MINOR)
  - @gravito/photon: 1.0.1 → 1.1.0 (MINOR)
  - @gravito/signal: 3.0.4 → 3.1.0 (MINOR)
  - @gravito/stasis: 3.1.1 → 3.2.0 (MINOR)
  - @gravito/plasma: 2.0.0 (無變更)
  - @gravito/resilience: 1.0.0 (新發佈)

- [x] Tier 2 依賴包版本引用更新
  - 28+ 個直接依賴包已更新 peerDependencies

#### Phase 2：代碼品質檢查
- [x] cosmos 移除未使用變數 (_lastError)
- [x] quasar 移除未使用變數 (_originalLength)
- [x] graphql 移除未使用參數 (params)
- [x] Satellites 隔離驗證通過 (16 個)

#### Phase 3：Tier 2C Satellites
- [x] 16 個 Satellites 隔離驗證通過
- [x] commerce → flash-sale 依賴已驗證

### ⏳ 進行中

- 全量 TypeScript 檢查 (Turbo 並行執行)
- 構建驗證

### 📋 待完成的工作

#### Phase 4：最終檢查
- [ ] TypeScript 檢查：0 錯誤（等待中）
- [ ] Biome 代碼檢查：0 錯誤
- [ ] 所有測試通過
- [ ] 構建成功

#### Phase 5：NPM 發佈準備
- [ ] 發行說明準備
- [ ] 破壞性變更文檔
- [ ] 遷移指南
- [ ] README 更新

#### Phase 6：NPM 發佈
- [ ] Tier 1：8 個核心包（2.0.0 版本）
- [ ] Tier 2：51 個依賴包（新版本）
- [ ] Satellites：16 個業務模組

---

## 版本發佈策略

### 分層發佈計劃

#### 第一波：Tier 1 核心層（Day 1）
時間：30 分鐘內
包：
1. @gravito/core (2.0.0) - 核心依賴，先發佈
2. @gravito/atlas (2.0.0) - 數據層依賴
3. @gravito/signal (3.1.0) - 事件系統
4. @gravito/stasis (3.2.0) - 快取系統
5. @gravito/stream (2.1.0) - 隊列系統
6. @gravito/photon (1.1.0) - HTTP 引擎
7. @gravito/plasma (2.0.0) - Redis 客戶端
8. @gravito/resilience (1.0.0) - 彈性系統

#### 第二波：Tier 2 核心依賴（Day 1, 30 分鐘後）
時間：1 小時
包：28+ 個直接依賴 Tier 1 的包

#### 第三波：Tier 2C Satellites（Day 2）
時間：1 小時
包：16 個業務 Satellites

---

## 破壞性變更清單

### 🔴 MAJOR Breaking Changes

#### @gravito/core 1.6.1 → 2.0.0
- HTTP middleware 分離到 @gravito/photon
- 遷移指南：更新導入路徑

#### @gravito/atlas 1.6.0 → 2.0.0
- 類型導入路徑調整
- 遷移指南：更新 import 語句

### 🟡 MINOR Changes

#### @gravito/stream 2.0.2 → 2.1.0
- 新增 Resilience 集成
- 向後相容

#### @gravito/photon 1.0.1 → 1.1.0
- 新增 HTTP middleware
- 向後相容

#### @gravito/signal 3.0.4 → 3.1.0
- 新增 Resilience 支援
- 向後相容

#### @gravito/stasis 3.1.1 → 3.2.0
- 新增快取統計
- 向後相容

---

## 提交記錄

- **e7c2102b**: chore: update Tier 1 package versions and fix cosmos TypeScript error
- **3d2e2468**: docs: add Tier 2 upgrade plan and version update script
- **f293f245**: fix: remove unused variable in quasar mock-redis test
- **PENDING**: fix: remove unused params in graphql security plugin

---

## 下一步行動

1. ⏳ 等待 TypeScript 檢查完成
2. 📝 準備發行說明和遷移指南
3. 🧪 最終測試驗證
4. 🚀 按照分層計劃發佈到 NPM
5. 📢 社群通知

---

## 風險評估

| 項目 | 風險 | 狀態 |
|------|------|------|
| 循環依賴 | 低 | ✅ 已驗證 |
| Satellite 隔離 | 低 | ✅ 已驗證 |
| 類型相容性 | 中 | ⏳ TypeScript 檢查中 |
| 中間件 API 變更 | 中 | ⏳ 待驗證 |
| NPM 發佈順序 | 中 | 📋 計劃完成 |

---

## 時間表

- **現在** → **T+10分鐘**：TypeScript 檢查完成
- **T+10分鐘** → **T+20分鐘**：最終驗證和準備
- **T+30分鐘**：第一波 NPM 發佈（Tier 1）
- **T+90分鐘**：第二波 NPM 發佈（Tier 2）
- **T+1天**：第三波 NPM 發佈（Satellites）
