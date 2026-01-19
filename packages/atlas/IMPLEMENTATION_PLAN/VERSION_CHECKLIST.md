# 版本號檢查清單

**檢查日期：** 2026-01-17  
**目標版本：** @gravito/atlas v2.0.0

---

## ✅ 版本號一致性檢查

### package.json
- [x] **package.json** - 已更新為 `"version": "2.0.0"`

### CHANGELOG.md
- [x] **CHANGELOG.md** - 已包含 `## 2.0.0` 版本記錄

### README 文件
- [x] **README.md** - 已包含 v2.0 新功能說明
- [x] **README.zh-TW.md** - 已包含 v2.0 新功能說明

### 官網文檔
- [x] **docs/en/api/atlas.md** - 已包含 v2.0 說明
- [x] **docs/zh-TW/api/atlas.md** - 已包含 v2.0 說明
- [x] **docs/en/api/atlas/getting-started.md** - 已包含 v2.0 說明
- [x] **docs/zh-TW/api/atlas/getting-started.md** - 已包含 v2.0 說明

### 實施計劃文檔
- [x] **IMPLEMENTATION_PLAN/README.md** - 目標版本：v2.0
- [x] **IMPLEMENTATION_PLAN/PR_CHECKLIST.md** - 目標版本：v2.0.0
- [x] **IMPLEMENTATION_PLAN/10-upgrade-guide.md** - 升級到 v2.0

---

## 📋 版本號引用檢查

### 正確的版本號格式
- ✅ `2.0.0` - package.json 中的完整版本號
- ✅ `v2.0` - 文檔中的簡化版本號（用於說明）
- ✅ `v2.0.0` - PR 和發布說明中的完整版本號

### 需要避免的格式
- ❌ `1.3.0` - 舊版本號（已更新）
- ❌ `2.0` - 缺少 patch 版本號（package.json 中應使用 2.0.0）

---

## 🔍 版本號搜尋結果

### package.json
```json
"version": "2.0.0"  ✅
```

### CHANGELOG.md
```markdown
## 2.0.0  ✅
```

### README 文件
- `v2.0` 新功能說明 ✅
- `New in v2.0` 標記 ✅

### 官網文檔
- `Atlas v2.0` 說明 ✅
- `v2.0 新增` 標記 ✅

---

## ✅ 發布前檢查

### 必須確認
- [x] package.json 版本號已更新為 `2.0.0`
- [x] CHANGELOG.md 已包含 `2.0.0` 版本記錄
- [x] 所有文檔中的版本號引用一致
- [x] 升級指南已準備

### 發布時注意事項
1. **版本號格式**：使用 `2.0.0`（遵循 SemVer）
2. **Git Tag**：建議使用 `v2.0.0` 格式
3. **發布說明**：引用 `@gravito/atlas@2.0.0`
4. **NPM 發布**：確保版本號與 package.json 一致

---

## 📝 版本號更新記錄

| 文件 | 舊版本 | 新版本 | 狀態 |
|------|--------|--------|------|
| package.json | 1.3.0 | 2.0.0 | ✅ 已更新 |
| CHANGELOG.md | 1.3.0 | 2.0.0 | ✅ 已更新 |
| README.md | - | v2.0 | ✅ 已更新 |
| README.zh-TW.md | - | v2.0 | ✅ 已更新 |
| docs/en/api/atlas.md | - | v2.0 | ✅ 已更新 |
| docs/zh-TW/api/atlas.md | - | v2.0 | ✅ 已更新 |

---

## 🎯 總結

**版本號狀態：** ✅ **一致**

- package.json: `2.0.0` ✅
- CHANGELOG: `2.0.0` ✅
- 所有文檔: `v2.0` 或 `v2.0.0` ✅

**準備發布：** ✅ **是**

---

## 🔗 相關文件

- [PR 檢查清單](./PR_CHECKLIST.md)
- [文檔更新總結](./DOCUMENTATION_UPDATE_SUMMARY.md)
- [官網文檔更新](./OFFICIAL_DOCS_UPDATE.md)
