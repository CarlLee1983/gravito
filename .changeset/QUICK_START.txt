# Changesets 快速使用指南

## 🚀 基本流程

### 1. 開發時標記變更

當你修改了任何套件後，執行：

```bash
bun run changeset
```

這會引導你：
- 選擇受影響的套件（例如：`@gravito/orbit-session`）
- 選擇版本類型：
  - `patch` - Bug 修復（1.0.0 → 1.0.1）
  - `minor` - 新功能（1.0.0 → 1.1.0）
  - `major` - 破壞性變更（1.0.0 → 2.0.0）
- 寫變更說明

### 2. 提交 Changeset

```bash
git add .changeset
git commit -m "feat: update orbit-session"
```

### 3. 發布前更新版本號

```bash
bun run changeset:version
```

這會：
- 根據 changesets 自動更新所有套件的版本號
- 自動更新內部依賴的版本號
- 生成/更新 CHANGELOG.md
- 刪除已處理的 changeset 檔案

### 4. 發布到 NPM

```bash
# 方式一：使用 changesets 發布（推薦）
bun run changeset:publish

# 方式二：使用現有的發布腳本
bun run publish:all
```

## 📝 範例

### 範例：更新 orbit-session

```bash
# 1. 修改了 packages/orbit-session/src/... 的程式碼

# 2. 創建 changeset
bun run changeset
# 選擇：@gravito/orbit-session
# 選擇：patch (bug fix) 或 minor (新功能)
# 說明：Fix session store memory leak

# 3. 提交
git add .changeset packages/orbit-session
git commit -m "fix(orbit-session): fix memory leak in session store"

# 4. 發布時
bun run changeset:version  # 自動更新版本號
bun run publish:all        # 發布
```

## 🔄 與現有流程整合

你可以選擇：

**選項 A：完全使用 Changesets**
```bash
bun run changeset          # 標記變更
bun run changeset:version  # 更新版本
bun run changeset:publish  # 發布
```

**選項 B：混合使用（推薦）**
```bash
bun run changeset          # 標記變更
bun run changeset:version  # 更新版本
bun run publish:all        # 使用現有發布腳本（支援更多功能）
```

## ⚠️ 注意事項

1. **版本號計算**：Changesets 會根據變更類型自動計算版本號
2. **內部依賴**：會自動更新 `workspace:*` 依賴的版本號
3. **CHANGELOG**：每個套件會自動生成 CHANGELOG.md
4. **忽略套件**：`@gravito/site` 已被設定為忽略，不會被發布

## 📚 更多資訊

- [Changesets 官方文檔](https://github.com/changesets/changesets)
- [專案整合指南](../docs/CHANGESETS_INTEGRATION_GUIDE.md)

