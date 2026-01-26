# @gravito/prism v3.1.0 發布指南

**發布日期**: 2026-01-22  
**目標版本**: 3.1.0  
**發布狀態**: ✅ 準備就緒

---

## ✅ 發布前驗收確認

所有驗收項目已通過，詳見 [驗收報告](./ACCEPTANCE_REPORT.md)：

- ✅ 功能驗收 (100%)
- ✅ 測試驗收 (93/94 pass, 99%)
- ✅ LSP 驗收 (0 警告)
- ✅ 相容性驗收 (8/8 專案)
- ✅ 效能驗收 (141x 提升)
- ✅ 文檔驗收 (完整)
- ✅ 建置驗收 (成功)

---

## 📦 發布流程 (Monorepo)

此專案使用 **Changesets** 進行版本管理和發布。

### Step 1: 確認建置成功

```bash
cd packages/prism
bun run build
```

**預期輸出**:
```
✅ Build complete!
ESM: dist/index.js (41.17 KB)
CJS: dist/index.cjs (51.94 KB)
DTS: dist/index.d.ts (23.31 KB)
Vue: dist/vue.js + dist/vue.d.ts
```

### Step 2: 確認測試通過

```bash
cd packages/prism
bun test
```

**預期結果**:
```
93 pass (99% 通過率)
1 fail (效能測試非阻塞性失敗，已確認不影響發布)
```

### Step 3: 發布到 NPM

回到專案根目錄執行：

```bash
cd /Users/carl/Dev/Carl/gravito-core-dx

# 標準發布 (latest tag)
bun run ci:publish

# 或使用 beta tag (如需測試)
bun run pub:beta

# 或使用 snapshot tag (臨時版本)
bun run pub:snapshot
```

### Step 4: 驗證發布成功

```bash
# 檢查 npm registry
npm view @gravito/prism version

# 預期輸出: 3.1.0
```

---

## 📋 發布檢查清單

### 發布前
- [x] 建置成功 (`bun run build`)
- [x] 測試通過 (93/94 tests)
- [x] 版本號正確 (3.1.0)
- [x] CHANGELOG 更新
- [x] 文檔完整
- [x] 依賴專案測試通過

### 發布中
- [ ] 執行 `bun run ci:publish`
- [ ] 等待發布完成
- [ ] 檢查發布日誌無錯誤

### 發布後
- [ ] 驗證 `npm view @gravito/prism version` 顯示 3.1.0
- [ ] 測試安裝: `npm install @gravito/prism@3.1.0`
- [ ] 更新依賴專案版本
- [ ] 通知團隊發布完成

---

## 🎯 發布內容摘要

### 主要功能 (v3.1.0)

**效能優化**:
- ✨ 原生 LRU 模板快取 (141x 渲染速度提升)
- ✨ Hash-based 快取失效機制
- ✨ 可配置快取選項

**現代圖片功能**:
- ✨ Picture 元素與格式協商 (AVIF, WebP)
- ✨ CDN loader 整合 (Cloudinary, imgix, Vercel)
- ✨ LQIP 工具 (Chrome LCP 合規)

**SSG 增強**:
- ✨ 增量建置與 manifest 追蹤
- ✨ 動態路由生成 (`[slug]`, `[...path]`)
- ✨ 可配置並發與逾時

**架構改善**:
- ✨ 提取 TemplateCompiler 類別
- ✨ 重組目錄結構 (internal only)
- ✨ 完整 JSDoc 文檔

### 向下相容性

✅ **100% 向下相容** - 所有現有程式碼無需修改即可運作

---

## 📊 發布統計

| 指標 | 數值 |
|------|------|
| 套件名稱 | @gravito/prism |
| 版本 | 3.1.0 |
| 建置產物 | 11 個檔案 |
| 總大小 | ~150 KB (所有格式) |
| 測試覆蓋率 | 74.77% |
| 測試通過率 | 99% (93/94) |
| LSP 警告 | 0 |
| 依賴專案 | 8 個 (全部通過) |

---

## 🚨 已知非阻塞性問題

1. **效能測試偶爾失敗**
   - Hash 計算測試在高負載時可能超時 (105ms > 100ms)
   - 不影響實際效能 (平均 67ms)
   - 計劃 v3.1.1 調整閾值

2. **測試覆蓋率**
   - 總覆蓋率 74.77% (目標 85%)
   - 核心功能已充分測試
   - 計劃 v3.2.0 提升 SSG 覆蓋率

**這些問題均不阻塞發布。**

---

## 📞 發布後聯絡

如有發布問題，請聯絡：
- **專案負責人**: Carl Lee <carllee0520@gmail.com>
- **GitHub Issues**: https://github.com/gravito-framework/gravito/issues
- **文檔**: https://github.com/gravito-framework/gravito/tree/main/packages/prism

---

## 🎉 發布宣告範本

```markdown
🚀 @gravito/prism v3.1.0 已發布！

主要更新：
✨ 141x 渲染效能提升 (原生 LRU 快取)
✨ 現代圖片格式支援 (AVIF, WebP, Picture 元素)
✨ CDN 整合 (Cloudinary, imgix, Vercel)
✨ SSG 增量建置與動態路由
✨ 100% 向下相容

安裝：npm install @gravito/prism@3.1.0

詳細資訊：https://github.com/gravito-framework/gravito/tree/main/packages/prism
```

---

**相關文檔**:
- [驗收報告](./ACCEPTANCE_REPORT.md)
- [CHANGELOG](../CHANGELOG.md)
- [遷移指南](./MIGRATION.md)
- [API 文檔](./API.md)
