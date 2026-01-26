# 🛡️ 預防類似 CI 問題的系統性策略

**目標：** 在問題發生前就發現並修復，避免花費大量時間在修復上

---

## 📊 問題根本原因總結

### 已發生的問題
1. **跨包類型檢查問題**：`zenith` 的嚴格檢查發現 `atlas` 的未使用導入
2. **配置不一致**：不同包的 TypeScript 配置標準不同
3. **本地檢查不足**：本地開發時無法發現跨包依賴問題
4. **CI 檢查不完整**：CI 可能沒有檢查所有依賴關係

---

## 🎯 多層防護策略

### 第一層：開發時預防（最快反饋）

#### 1.1 增強 Pre-commit Hook
**當前狀態：** 只檢查變更文件的 biome lint  
**改進方案：**

```json
{
  "simple-git-hooks": {
    "pre-commit": "export PATH=\"~/.bun/bin:$PATH\" && bunx lint-staged",
    "pre-push": "export PATH=\"~/.bun/bin:$PATH\" && bun run check && bun run typecheck:affected"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "biome check --write --diagnostic-level=error",
      "bun run scripts/check-unused-imports.ts"
    ]
  }
}
```

**新增腳本：**
- `scripts/check-unused-imports.ts` - 檢查未使用的導入
- `scripts/typecheck-affected.ts` - 檢查受影響的包及其依賴

#### 1.2 統一的 TypeScript 配置標準
**問題：** 不同包有不同的嚴格程度  
**解決方案：**

創建 `tsconfig.base.json` 定義共享的嚴格規則：
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

所有包的 `tsconfig.json` 都應該 `extends` 這個基礎配置。

#### 1.3 IDE 配置
**建議：** 在 `.vscode/settings.json` 中啟用：
```json
{
  "typescript.preferences.includePackageJsonAutoImports": "off",
  "typescript.suggest.autoImports": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": "explicit",
    "source.fixAll": "explicit"
  }
}
```

---

### 第二層：本地驗證（提交前）

#### 2.1 新增驗證腳本
創建 `scripts/validate-before-push.ts`：

```typescript
// 檢查所有依賴關係
// 1. 找出變更的包
// 2. 找出所有依賴這些包的包
// 3. 對所有受影響的包運行 typecheck
```

#### 2.2 改進 Pre-push Hook
**當前：** `bunx turbo run typecheck test --filter=[HEAD^1]`  
**問題：** 只檢查變更的包，不檢查依賴它們的包

**改進：**
```bash
# 1. 檢查變更的包
# 2. 找出所有依賴這些包的包（使用 workspace 依賴圖）
# 3. 對所有包運行 typecheck
bun run scripts/validate-affected-packages.ts
```

---

### 第三層：CI 增強（PR 階段）

#### 3.1 改進 CI Workflow
**當前問題：**
- CI 中的 typecheck 可能沒有檢查所有依賴關係
- 沒有專門的跨包依賴檢查

**改進方案：**

```yaml
# .github/workflows/ci.yml
jobs:
  typecheck:
    name: Typecheck (All Dependencies)
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
      
      - name: Install dependencies
        run: bun install --frozen-lockfile
      
      # 檢查所有包的 typecheck
      - name: Typecheck all packages
        run: bun run typecheck
      
      # 專門檢查跨包依賴
      - name: Check cross-package dependencies
        run: bun run scripts/check-cross-package-types.ts
      
      # 檢查未使用的導入
      - name: Check unused imports
        run: bun run scripts/check-unused-imports.ts --all
```

#### 3.2 新增檢查腳本

**`scripts/check-cross-package-types.ts`**
```typescript
// 1. 讀取所有 package.json
// 2. 構建依賴圖
// 3. 對每個包，檢查它依賴的所有包的源代碼是否符合嚴格標準
// 4. 報告所有問題
```

**`scripts/check-unused-imports.ts`**
```typescript
// 使用 TypeScript compiler API 檢查未使用的導入
// 或使用 biome 的 organizeImports
```

---

### 第四層：自動化工具

#### 4.1 Biome 增強配置
**當前：** biome 有 `organizeImports`，但沒有檢查未使用導入的規則

**改進：**
```json
{
  "linter": {
    "rules": {
      "correctness": {
        "noUnusedVariables": "error"  // 從 warn 改為 error
      }
    }
  },
  "assist": {
    "actions": {
      "source": {
        "organizeImports": "on",
        "removeUnusedImports": "on"  // 新增
      }
    }
  }
}
```

#### 4.2 自動修復工具
創建 `scripts/auto-fix-imports.ts`：
```typescript
// 1. 掃描所有 TypeScript 文件
// 2. 使用 TypeScript compiler API 找出未使用的導入
// 3. 自動移除
// 4. 格式化
```

---

## 📋 實施檢查清單

### 立即實施（高優先級）

- [ ] **統一 TypeScript 配置**
  - [ ] 創建 `tsconfig.base.json` 定義嚴格規則
  - [ ] 更新所有包的 `tsconfig.json` 繼承基礎配置
  - [ ] 驗證所有包都啟用 `noUnusedLocals` 和 `noUnusedParameters`

- [ ] **增強 Pre-push Hook**
  - [ ] 創建 `scripts/validate-affected-packages.ts`
  - [ ] 更新 `package.json` 中的 pre-push hook
  - [ ] 測試驗證腳本

- [ ] **改進 CI Workflow**
  - [ ] 添加跨包依賴檢查步驟
  - [ ] 添加未使用導入檢查步驟
  - [ ] 確保所有檢查都在 PR 階段運行

### 中期實施（中優先級）

- [ ] **自動化工具**
  - [ ] 創建 `scripts/check-unused-imports.ts`
  - [ ] 創建 `scripts/auto-fix-imports.ts`
  - [ ] 整合到開發流程中

- [ ] **文檔和指南**
  - [ ] 創建開發指南文檔
  - [ ] 創建常見問題文檔
  - [ ] 更新 PR 模板

### 長期改進（低優先級）

- [ ] **TypeScript Project References**
  - [ ] 評估使用 Project References 的可行性
  - [ ] 如果可行，實施重構

- [ ] **監控和報告**
  - [ ] 創建 CI 問題追蹤儀表板
  - [ ] 定期審查和優化檢查流程

---

## 🔧 具體實施步驟

### 步驟 1：創建統一的 TypeScript 配置

1. 創建 `tsconfig.base.json`
2. 更新所有包的 `tsconfig.json`
3. 驗證所有包都能通過 typecheck

### 步驟 2：創建驗證腳本

1. 創建 `scripts/validate-affected-packages.ts`
2. 創建 `scripts/check-cross-package-types.ts`
3. 創建 `scripts/check-unused-imports.ts`
4. 測試所有腳本

### 步驟 3：更新 CI 和 Hooks

1. 更新 `.github/workflows/ci.yml`
2. 更新 `package.json` 中的 hooks
3. 測試本地和 CI 環境

### 步驟 4：文檔和培訓

1. 創建開發指南
2. 更新 README
3. 團隊培訓

---

## 📈 預期效果

### 問題發現時間
- **之前：** 在 CI 失敗後才發現（花費 30-60 分鐘修復）
- **之後：** 在本地開發時就發現（花費 1-2 分鐘修復）

### 問題發生頻率
- **之前：** 每個 PR 可能遇到 1-2 次
- **之後：** 幾乎不會發生（自動預防）

### 開發效率
- **之前：** 頻繁的 CI 失敗打斷工作流
- **之後：** 流暢的開發體驗，問題在源頭解決

---

## 🔗 相關資源

- [TypeScript 編譯器選項](https://www.typescriptlang.org/tsconfig)
- [Biome 文檔](https://biomejs.dev/)
- [Turbo 文檔](https://turbo.build/repo/docs)
- [Monorepo 最佳實踐](https://monorepo.tools/)

---

## 📝 維護和更新

此策略應該：
- 每季度審查一次
- 根據新出現的問題更新
- 根據團隊反饋優化
- 記錄所有改進和學習
