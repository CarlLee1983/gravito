# 本地 CI 驗證指南

為了避免 CI 環境一直出錯，我們提供了多個本地驗證工具，幫助你在推送前發現問題。

## 🚀 快速開始

在推送代碼前，執行以下命令進行完整驗證：

```bash
# 方式 1: 使用 CI 模擬腳本（推薦）
bun run ci:simulate

# 方式 2: 手動執行各個步驟
bun run check                    # Biome 檢查
bun run typecheck:validate       # 驗證 typecheck 配置
bun run typecheck:verify         # 使用 bunx 驗證 typecheck（與 CI 一致）
bun run typecheck:full           # 完整 typecheck
bun run build                    # 建置所有套件
bun run test:coverage            # 執行測試
```

## 📋 驗證工具說明

### 1. `typecheck:validate` - 配置驗證

檢查所有套件的 `typecheck` 配置是否一致且正確：

```bash
bun run typecheck:validate
```

**檢查項目：**
- ✅ 是否使用 `bunx tsc`（CI 環境必須）
- ✅ 是否有 `--skipLibCheck`（對於有類型衝突的套件）
- ✅ 配置是否統一
- ✅ `tsconfig.json` 中的 `skipLibCheck` 設定

### 2. `typecheck:verify` - 實際執行驗證

使用 `bunx tsc` 實際執行所有套件的 typecheck，確保與 CI 環境一致：

```bash
bun run typecheck:verify
```

**為什麼需要這個？**
- 本地環境可能使用不同的 TypeScript 解析方式
- CI 環境使用 `bunx tsc`，必須確保本地也能通過
- 提前發現類型錯誤

### 3. `ci:simulate` - 完整 CI 模擬

模擬完整的 CI 流程，包括所有檢查步驟：

```bash
bun run ci:simulate
```

**執行步驟：**
1. Biome 檢查（程式碼格式和品質）
2. Typecheck 配置驗證
3. Typecheck 執行
4. 建置所有套件
5. 執行測試
6. 驗證建置輸出

## 🔧 Git Hooks

我們已經在 `pre-push` hook 中整合了驗證步驟：

```json
"pre-push": "bun run check && bun run typecheck:validate && bun run typecheck:verify && bun run typecheck:full && turbo run test --filter=[HEAD^1]"
```

這意味著每次 `git push` 時，會自動執行：
- ✅ Biome 檢查
- ✅ Typecheck 配置驗證
- ✅ Typecheck 實際驗證（使用 bunx）
- ✅ 完整 Typecheck
- ✅ 相關套件的測試

## ⚠️ 常見問題

### Q: 為什麼本地通過但 CI 失敗？

**A:** 可能的原因：
1. **TypeScript 解析方式不同**
   - 本地可能使用 `tsc` 或 `npx tsc`
   - CI 使用 `bunx tsc`
   - **解決方案：** 使用 `bun run typecheck:verify` 驗證

2. **配置不一致**
   - 某些套件使用不同的 typecheck 配置
   - **解決方案：** 使用 `bun run typecheck:validate` 檢查

3. **環境差異**
   - 本地可能有快取或不同的 node_modules 結構
   - **解決方案：** 執行 `bun install --frozen-lockfile` 確保依賴一致

### Q: 如何跳過 pre-push hook？

**不建議跳過，但如果有緊急情況：**

```bash
git push --no-verify
```

**注意：** 這會跳過所有驗證，可能導致 CI 失敗。

### Q: 如何只驗證特定套件？

```bash
# 驗證單一套件
cd packages/atlas && bunx tsc --noEmit --skipLibCheck

# 使用 turbo 過濾
turbo run typecheck --filter=@gravito/atlas
```

## 📝 最佳實踐

1. **推送前必做：**
   ```bash
   bun run ci:simulate
   ```

2. **修改 typecheck 配置後：**
   ```bash
   bun run typecheck:validate
   bun run typecheck:verify
   ```

3. **添加新套件時：**
   - 確保使用 `bunx tsc --noEmit --skipLibCheck`
   - 執行 `bun run typecheck:validate` 檢查配置

4. **定期檢查：**
   ```bash
   # 每週執行一次完整驗證
   bun run ci:simulate
   ```

## 🎯 配置標準

所有套件的 `typecheck` 腳本應該統一為：

```json
{
  "scripts": {
    "typecheck": "bunx tsc --noEmit --skipLibCheck"
  }
}
```

**對於沒有類型衝突的套件（沒有同時使用 `@types/node` 和 `bun-types`）：**

```json
{
  "scripts": {
    "typecheck": "bunx tsc --noEmit"
  }
}
```

## 🔍 故障排除

如果驗證失敗，檢查：

1. **Bun 版本是否正確：**
   ```bash
   bun --version  # 應該是 1.3.4
   ```

2. **依賴是否安裝：**
   ```bash
   bun install --frozen-lockfile
   ```

3. **TypeScript 是否可用：**
   ```bash
   bunx tsc --version
   ```

4. **查看詳細錯誤：**
   ```bash
   bun run typecheck:verify 2>&1 | tee typecheck-errors.log
   ```

---

**記住：** 本地驗證通過 ≠ CI 一定通過，但能大幅降低失敗機率！

