# 發布前檢查清單

**檢查日期：** 2026-01-17  
**目標版本：** @gravito/atlas v2.0.0

---

## ✅ 版本號確認

### package.json
- [x] **版本號**：`2.0.0` ✅
- [x] **名稱**：`@gravito/atlas` ✅
- [x] **描述**：已更新 ✅

### 版本號一致性
- [x] package.json: `2.0.0` ✅
- [x] CHANGELOG.md: `2.0.0` ✅
- [x] 所有文檔: `v2.0` 或 `v2.0.0` ✅

---

## ✅ 代碼檢查

### 測試
- [x] 所有測試通過（322 pass, 0 fail）
- [x] 測試覆蓋率符合要求
- [x] 性能基準測試通過

### 代碼品質
- [x] 類型檢查通過
- [x] Linter 檢查通過
- [x] 無明顯性能問題

---

## ✅ 文檔檢查

### 主要文檔
- [x] README.md - 已更新
- [x] README.zh-TW.md - 已更新
- [x] CHANGELOG.md - 已更新到 2.0.0

### 官網文檔
- [x] docs/en/api/atlas.md - 已更新
- [x] docs/zh-TW/api/atlas.md - 已更新
- [x] docs/en/api/atlas/getting-started.md - 已更新
- [x] docs/zh-TW/api/atlas/getting-started.md - 已更新

### 實施計劃文檔
- [x] 所有狀態文件已更新
- [x] 升級指南已完善

---

## ✅ 功能驗證

### 核心功能
- [x] CRUD 操作正常
- [x] QueryBuilder 正常
- [x] Relationships 和 Eager Loading 正常
- [x] Transactions 正常

### 新功能（v2.0）
- [x] 環境變數配置
- [x] 配置檔案支援
- [x] 調試工具
- [x] 錯誤訊息改進
- [x] Grammar LRU 快取
- [x] Prepared Statements
- [x] Batch Hydration 優化

---

## 📋 發布步驟

### 1. 最終檢查
- [x] 版本號確認
- [x] 所有測試通過
- [x] 文檔完整
- [x] CHANGELOG 更新

### 2. Git 操作
```bash
# 確認所有更改已提交
git status

# 創建版本標籤
git tag -a v2.0.0 -m "feat: [atlas] v2.0 - Performance optimizations and DX improvements"

# 推送標籤
git push origin v2.0.0
```

### 3. NPM 發布
```bash
# 確認已登入 NPM
npm whoami

# 發布到 NPM
cd packages/atlas
npm publish
```

### 4. 發布後確認
- [ ] 確認 NPM 上版本號正確
- [ ] 確認 CHANGELOG 顯示正確
- [ ] 確認 README 顯示正確
- [ ] 測試安裝：`bun add @gravito/atlas@2.0.0`

---

## 🎯 發布說明

### 標題
```
feat: [atlas] v2.0 - Performance optimizations and DX improvements
```

### 主要內容
- 性能優化（Model hydration ↑300-500%, Query compilation ↑50-100%）
- 開發者體驗改進（更好的錯誤訊息、調試工具、類型安全）
- 新功能（環境變數配置、Prepared Statements、Batch Hydration）
- 破壞性變更說明（見升級指南）

### 相關文件
- [升級指南](./10-upgrade-guide.md)
- [最終驗證](./FINAL_VERIFICATION.md)
- [風險評估](./09-risks/README.md)
- [版本號檢查清單](./VERSION_CHECKLIST.md)

---

## ✅ 檢查結論

**狀態：** ✅ **準備發布**

- [x] 版本號：2.0.0 ✅
- [x] 所有測試通過 ✅
- [x] 文檔完整 ✅
- [x] CHANGELOG 更新 ✅

**可以進行發布操作**

---

## 🔗 相關文件

- [版本號檢查清單](./VERSION_CHECKLIST.md)
- [PR 檢查清單](./PR_CHECKLIST.md)
- [文檔更新總結](./DOCUMENTATION_UPDATE_SUMMARY.md)
