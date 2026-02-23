---
title: 開發指南
---

# 開發指南

本指南幫助開發者避免常見問題，特別是跨套件依賴和類型檢查問題。

---

## 🚀 快速開始

### 開發前檢查清單

在開始開發前，確保：

1. ✅ 已安裝所有依賴：`bun install`
2. ✅ 本地測試通過：`bun test`
3. ✅ 類型檢查通過：`bun run typecheck`
4. ✅ 代碼格式正確：`bun run format`

---

## 🛡️ 避免常見問題

### 1. 未使用的導入

**問題：** 未使用的導入會導致其他套件的嚴格類型檢查失敗。

**預防：**
- 使用 IDE 的自動移除未使用導入功能
- 提交前運行 `bun run scripts/check-unused-imports.ts`
- 使用 `biome check --write` 自動修復

**修復：**
```bash
# 自動修復
bun run scripts/check-unused-imports.ts --fix

# 或使用 biome
bunx biome check --write --organize-imports-enabled=true
```

### 2. 跨套件類型檢查問題

**問題：** 當你修改一個套件時，依賴它的套件可能會因為類型問題而失敗。

**預防：**
- 提交前運行 `bun run scripts/validate-affected-packages.ts`
- 確保所有套件的 `tsconfig.json` 都繼承 `tsconfig.base.json`
- 啟用 `noUnusedLocals` 和 `noUnusedParameters`

**檢查：**
```bash
# 檢查受影響的套件
bun run scripts/validate-affected-packages.ts

# 檢查所有套件
bun run typecheck
```

### 3. 配置不一致

**問題：** 不同套件的 TypeScript 配置不一致會導致問題。

**解決：**
- 所有套件的 `tsconfig.json` 應該 `extends` `../../tsconfig.base.json`
- 不要覆蓋嚴格檢查選項（`noUnusedLocals`, `noUnusedParameters`）

---

## 📝 開放標準開發流程

1. **創建分支**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **開發**
   - 編寫代碼
   - 運行測試：`bun test`
   - 檢查類型：`bun run typecheck`

3. **提交前檢查**
   ```bash
   # 格式化代碼
   bun run format
   
   # 檢查 lint
   bun run check
   
   # 檢查未使用的導入
   bun run scripts/check-unused-imports.ts
   
   # 檢查受影響的套件
   bun run scripts/validate-affected-packages.ts
   ```

4. **提交**
   ```bash
   git add .
   git commit -m "feat: your feature"
   ```

5. **推送前檢查**
   - Pre-push hook 會自動運行檢查
   - 如果失敗，修復問題後再推送

---

## 🔧 工具和腳本

- `bun run typecheck` - 檢查所有套件的類型
- `bun run check` - 運行 biome lint 和格式化檢查
- `bun run format` - 格式化所有代碼
- `bun run ci:simulate` - 執行完整 CI 模擬 (包含下方所有檢查)
- `bun run scripts/validate-affected-packages.ts` - 檢查受影響的套件 (自動檢測變更與依賴)
- `bun run scripts/check-unused-imports.ts` - 檢查未使用的導入 (`--fix` 可自動移除)
- `bun run scripts/check-docs.ts` - 檢查文檔連結與結構是否正確

---

## 🐛 常見問題排查 (Troubleshooting)

### CI 失敗：類型檢查錯誤
**症狀：** CI 中某個套件的 typecheck 失敗，但本地通過。
**解決：**
1. 運行 `bun run scripts/check-unused-imports.ts --all`。
2. 運行 `bun run scripts/validate-affected-packages.ts`。
3. 檢查所有套件的 `tsconfig.json` 是否繼承 `tsconfig.base.json`。

### Pre-push Hook 失敗
**症狀：** `git push` 時 hook 失敗。
**解決：** 查看錯誤訊息，運行對應檢查腳本修復。
**跳過檢查（不推薦）：** `git push --no-verify`。

---

## 💡 最佳實踐

1. **頻繁檢查**：開發過程中經常運行檢查，不要等到最後。
2. **使用 IDE**：配置 IDE 自動移除未使用的導入。
3. **小步提交**：頻繁提交，每次提交前都檢查。
4. **閱讀錯誤**：仔細閱讀錯誤訊息，理解根本原因。

---

## 🆘 需要幫助？

1. 查看 [及時修復分析](../../archive/implementation-plans/CI_FIX_ANALYSIS.md)
2. 檢查 [CI 日誌](https://github.com/gravito-framework/gravito/actions)
3. 創建 Issue 或詢問團隊成員。
