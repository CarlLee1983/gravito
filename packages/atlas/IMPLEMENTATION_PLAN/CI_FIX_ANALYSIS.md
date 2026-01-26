# CI 失敗根本原因分析與修復

**日期：** 2026-01-17  
**問題：** CI 中 `@gravito/zenith#typecheck` 失敗

---

## 🔍 問題分析

### 直接問題
```
../atlas/src/config/loadConfig.ts(6,1): error TS6133: 'ConnectionConfig' is declared but its value is never read.
../atlas/src/config/loadConfig.ts(8,10): error TS6133: 'defineConfig' is declared but its value is never read.
```

### 根本原因

1. **Monorepo 類型檢查機制**
   - `zenith` 包依賴 `@gravito/atlas` (workspace:*)
   - `zenith` 的 `tsconfig.json` 啟用了 `noUnusedLocals: true` 和 `noUnusedParameters: true`
   - 由於 TypeScript 的路徑映射（`@gravito/atlas` → `packages/atlas/src/index.ts`），TypeScript 會檢查 `atlas` 的源代碼
   - 當 `zenith` 進行 typecheck 時，會檢查所有被引用的源文件，包括 `atlas` 的源代碼

2. **未使用的導入**
   - `loadConfig.ts` 中導入了 `ConnectionConfig` 但未使用
   - `loadConfig.ts` 中導入了 `defineConfig` 但未使用（只在示例註釋中提到）

3. **配置不一致**
   - `atlas` 的 `tsconfig.json` 沒有啟用 `noUnusedLocals`
   - 這導致 `atlas` 的源代碼可能包含未使用的導入，但不會在 `atlas` 自己的 typecheck 中發現
   - 當其他包（如 `zenith`）啟用了嚴格檢查時，會發現這些問題

---

## ✅ 解決方案

### 1. 立即修復（修復未使用的導入）

移除 `loadConfig.ts` 中未使用的導入：
- 移除 `ConnectionConfig` 類型導入（未在代碼中使用）
- 移除 `defineConfig` 導入（只在示例註釋中提到，實際未使用）

### 2. 根本解決（防止未來問題）

#### 選項 A：在 atlas 的 tsconfig.json 中啟用嚴格檢查（推薦）
```json
{
  "compilerOptions": {
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**優點：**
- 在源頭發現問題
- 確保所有被依賴的包都符合嚴格標準
- 防止未來出現類似問題

**缺點：**
- 可能需要修復更多未使用的導入
- 可能影響開發體驗（需要更頻繁地清理未使用的代碼）

#### 選項 B：在 zenith 的 tsconfig.json 中排除 atlas 源代碼檢查
```json
{
  "compilerOptions": {
    "skipLibCheck": true  // 已啟用，但可能不夠
  },
  "exclude": [
    "../atlas/src/**/*"  // 排除 atlas 源代碼
  ]
}
```

**優點：**
- 快速修復
- 不影響 atlas 的開發

**缺點：**
- 治標不治本
- 其他包可能也會遇到同樣的問題
- 失去了跨包類型檢查的優勢

#### 選項 C：使用 TypeScript Project References（長期方案）

設置 TypeScript Project References，讓每個包只檢查自己的代碼。

**優點：**
- 符合 TypeScript 最佳實踐
- 清晰的依賴關係
- 更好的構建性能

**缺點：**
- 需要重構 tsconfig 結構
- 工作量較大

---

## 🎯 推薦方案

**短期（立即修復）：**
1. 移除 `loadConfig.ts` 中未使用的導入
2. 檢查 `atlas` 中是否還有其他未使用的導入

**中期（防止未來問題）：**
1. 在 `atlas` 的 `tsconfig.json` 中啟用 `noUnusedLocals: true`
2. 修復所有未使用的導入
3. 在 CI 中確保所有包的 typecheck 都通過

**長期（架構改進）：**
1. 考慮使用 TypeScript Project References
2. 統一 monorepo 中的 TypeScript 配置標準
3. 在根 `tsconfig.json` 中定義共享的嚴格檢查規則

---

## 📝 修復步驟

1. ✅ 修復 `loadConfig.ts` 中的未使用導入
2. ✅ 修復 `TinkerCommand.ts` 中的未使用變數
3. ✅ 在 `atlas` 的 `tsconfig.json` 中啟用 `noUnusedLocals` 和 `noUnusedParameters`
4. ✅ 驗證所有依賴 `atlas` 的包都能通過 typecheck（zenith, stream）

---

## 🔗 相關文件

- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Monorepo TypeScript 最佳實踐](https://www.typescriptlang.org/docs/handbook/project-references.html#what-is-a-project-reference)
