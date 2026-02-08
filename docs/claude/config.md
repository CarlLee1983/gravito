# 工具配置詳情

> **用途**：完整的工具配置參考（TypeScript、Biome、Turbo）
> **何時查閱**：配置工具、調整規則或驗證設定時
> **返回**：[CLAUDE.md](../../CLAUDE.md)

---

## TypeScript 配置（tsconfig.base.json）

### 編譯選項

```json
{
  "compilerOptions": {
    "target": "ESNext",              // 編譯目標：最新 ECMAScript
    "module": "ESNext",              // 模組系統：原生 ES Module
    "moduleResolution": "bundler",   // 模組解析策略：bundler (Bun)
    "lib": ["ESNext"],               // 可用的 API：全部 ESNext
    "declaration": true              // 生成 .d.ts 型別定義
  }
}
```

### 嚴格檢查（強制性）

| 選項 | 效果 | 目的 |
|---|---|---|
| `noUnusedLocals: true` | 禁止未使用的局部變數 | 檢測死代碼 |
| `noUnusedParameters: true` | 禁止未使用的參數 | 清理函數簽名 |
| `noImplicitReturns: true` | 要求顯式 return | 防止隱含 undefined |
| `noFallthroughCasesInSwitch: true` | switch 必須 break | 防止邏輯錯誤 |
| `noUncheckedIndexedAccess: false` | 允許索引訪問（可選） | 在特定場景放寬檢查 |

### 路徑映射（8 個核心包）

```json
"paths": {
  "@gravito/core": ["packages/core/src/index.ts"],
  "@gravito/core/*": ["packages/core/src/*"],
  "@gravito/monolith": ["packages/monolith/src/index.ts"],
  "@gravito/atlas": ["packages/atlas/src/index.ts"],
  "@gravito/mass": ["packages/mass/src/index.ts"],
  "@gravito/enterprise": ["packages/enterprise/src/index.ts"],
  "@gravito/stasis": ["packages/stasis/src/index.ts"],
  "@gravito/stream": ["packages/stream/src/index.ts"],
  "@gravito/astral": ["packages/astral/src/index.ts"],
  "@gravito/impulse": ["packages/impulse/src/index.ts"]
}
```

**注意**：其他包使用隱含解析（`@gravito/<name>` → `packages/<name>/src/index.ts`）

### JSX 與裝飾器

```json
"compilerOptions": {
  "jsx": "react-jsx",              // JSX 轉譯：自動導入 React
  "experimentalDecorators": true,  // 支持 @decorator 語法
  "emitDecoratorMetadata": true    // 生成裝飾器元數據（ReflectAPI）
}
```

---

## Biome 配置（biome.json）

### 格式化規則

```json
"formatter": {
  "enabled": true,
  "indentStyle": "space",      // 縮排：空格（不用 Tab）
  "indentWidth": 2,            // 每級 2 個空格
  "lineEnding": "lf",          // 換行：Unix 風格（LF）
  "lineWidth": 100             // 最大行長：100 字元
}
```

### JavaScript 專用規則

```json
"javascript": {
  "globals": ["Bun"],          // 全域變數：Bun 運行時
  "formatter": {
    "jsxQuoteStyle": "double", // JSX 引號：雙引號
    "quoteStyle": "single",    // JS 引號：單引號
    "semicolons": "asNeeded",  // 分號：不必要時省略
    "trailingCommas": "es5",   // 尾隨逗號：ES5 風格（支援 IE）
    "arrowParentheses": "always", // 箭頭函數：總是加括號
    "bracketSpacing": true     // 物件括號：{ foo } 而非 {foo}
  }
}
```

### Linter 規則（強制檢查）

#### Complexity（複雜度）

| 規則 | 嚴度 | 說明 |
|---|---|---|
| `noExtraBooleanCast` | error | 禁止多餘的布林轉換 |
| `noUselessCatch` | error | 禁止無用的 catch 塊 |
| `noUselessConstructor` | error | 禁止空建構子 |
| `useFlatMap` | error | 優先用 flatMap 而非 map().flat() |
| `useOptionalChain` | error | 優先用 `?.` 而非 `&&` |

#### Correctness（正確性）- 最嚴格

| 規則 | 嚴度 | 說明 |
|---|---|---|
| `noConstAssign` | error | 禁止 const 重新賦值 |
| `noUndeclaredVariables` | error | 禁止未宣告變數 |
| `noUnreachable` | error | 禁止無法到達的代碼 |
| `noUnsafeOptionalChaining` | error | 禁止不安全的可選鏈 |
| `noUnusedVariables` | error | 禁止未使用變數 |

#### Security（安全性）

| 規則 | 嚴度 | 說明 |
|---|---|---|
| `noDangerouslySetInnerHtml` | error | 禁止 dangerouslySetInnerHTML（XSS 風險） |
| `noGlobalEval` | error | 禁止全域 eval（命令注入） |

#### Style（風格）

| 規則 | 嚴度 | 說明 |
|---|---|---|
| `useConst` | error | 優先用 const |
| `useExportType` | error | 匯出型別用 `export type` |
| `useImportType` | error | 匯入型別用 `import type` |
| `useTemplate` | warn | 優先用模板字符串 |

### 特殊覆蓋規則

#### 1. GraphQL 包（最嚴格）

```json
{
  "includes": ["packages/graphql/**/*.ts", "packages/graphql/**/*.tsx"],
  "linter": {
    "rules": {
      "suspicious": {
        "noExplicitAny": "error"  // 禁止 any（必須精確型別）
      }
    }
  }
}
```

#### 2. HTML 和 CSS（禁用 Lint）

```json
{
  "includes": ["**/views/emails/**/*.html", "**/*.html"],
  "linter": { "enabled": false },
  "formatter": { "enabled": false }
}
```

**原因**：Email HTML、模板語言、特殊格式

#### 3. JavaScript 檔案（禁用 Lint）

```json
{
  "includes": ["**/ion/src/*.js", "packages/**/bin/*.js"],
  "linter": { "enabled": false },
  "formatter": { "enabled": false }
}
```

**原因**：Node.js 指令碼、編譯産物

#### 4. Vue 和 Svelte（允許未使用變數）

```json
{
  "includes": ["examples/**/*.vue", "templates/**/*.vue"],
  "linter": {
    "rules": {
      "correctness": {
        "noUnusedVariables": "off"  // 解除限制（模板可能使用未明顯參考）
      }
    }
  }
}
```

#### 5. k6 性能測試（允許未宣告變數）

```json
{
  "includes": ["examples/**/tests/k6/**/*.js"],
  "linter": {
    "rules": {
      "correctness": {
        "noUndeclaredVariables": "off"  // 解除限制（k6 提供全域變數）
      }
    }
  }
}
```

---

## Turbo 配置（turbo.json）

### 任務定義（Task Pipeline）

#### build（構建）

```json
{
  "build": {
    "dependsOn": ["^build"],       // 依賴：先構建上游依賴
    "inputs": [
      "src/**",
      "package.json",
      "tsconfig.json"
    ],
    "outputs": [
      "dist/**",
      ".next/**",
      "!.next/cache/**"             // 排除快取目錄
    ]
  }
}
```

**邏輯**：A → B 時，先構建 A 再構建 B（拓撲排序）

#### test（測試）

```json
{
  "test": {
    "dependsOn": [],               // 無依賴（並行可執行）
    "inputs": [
      "src/**",
      "tests/**",
      "package.json",
      "tsconfig.json",
      "bunfig.toml"
    ],
    "outputs": []                  // 無輸出檔案（僅報告）
  }
}
```

#### test:unit 和 test:integration（優化的測試任務）

```json
{
  "test:unit": {
    "dependsOn": [],
    "inputs": [
      "src/**",
      "tests/**/*.test.ts",
      "!tests/**/*.integration.test.ts"  // 排除整合測試
    ],
    "cache": true                  // 啟用快取（單元測試確定性高）
  },
  "test:integration": {
    "dependsOn": [],
    "inputs": [
      "src/**",
      "tests/**/*.integration.test.ts"   // 僅整合測試
    ],
    "cache": true
  }
}
```

#### typecheck（型別檢查）

```json
{
  "typecheck": {
    "dependsOn": ["^build"],       // 需先構建依賴（型別資訊）
    "inputs": [
      "src/**",
      "tests/**",
      "package.json",
      "tsconfig.json"
    ],
    "outputs": []
  }
}
```

#### dev（開發伺服器）

```json
{
  "dev": {
    "cache": false,                // 禁用快取
    "persistent": true             // 長時間運行
  }
}
```

### 快取策略

| 任務 | 快取 | 原因 |
|---|---|---|
| `build` | ✅ 啟用 | 輸出檔案確定性高 |
| `test` | ❌ 禁用 | 設定檔修改可能影響結果 |
| `test:unit` | ✅ 啟用 | 單元測試純函數，確定性高 |
| `test:integration` | ✅ 啟用 | 整合測試結果確定 |
| `typecheck` | ✅ 啟用 | 型別檢查確定性高 |
| `lint` | ❌ 禁用 | 碼風格容易改變 |
| `dev` | ❌ 禁用 | 開發伺服器持久化 |

### 受影響包檢查

Turbo 自動計算依賴圖：

```
修改 packages/core/src/index.ts
  ↓
受影響：所有依賴 core 的包（photon、atlas、signal 等）
  ↓
自動構建受影響包
  ↓
Pre-push hook 驗證成功
```

---

## Git Hooks 配置（simple-git-hooks）

### Pre-commit Hook

```bash
export PATH="$HOME/.bun/bin:$PATH" && bunx lint-staged
```

**執行流程**：
1. 查找暫存檔案（`git add` 的檔案）
2. 執行 `biome check --write` 自動修復格式
3. 重新暫存修復後的檔案
4. 允許提交

**條件**：所有 `.js`, `.ts`, `.cjs`, `.mjs` 檔案必須通過 Biome 檢查

### Pre-push Hook

```bash
cd "$(git rev-parse --show-toplevel)" && \
export PATH="$HOME/.bun/bin:$PATH" && \
bun scripts/validate-affected-packages.ts
```

**執行流程**：
1. 檢查自上次主分支後的所有提交
2. 計算受影響包
3. 驗證受影響包的完整構建（`bun run build`）
4. 防止推送破損程式碼

**條件**：所有受影響包都必須構建成功

---

## 工作目錄結構

```
gravito-core-dx/
├── tsconfig.base.json          # 基礎 TypeScript 配置
├── biome.json                  # Biome 格式化與 Lint
├── turbo.json                  # Turbo 任務定義和快取
├── package.json                # 根目錄腳本和工作空間
├── bunfig.toml                 # Bun 運行時配置
├── .git/hooks/                 # Git 自動執行的 hooks
│   ├── pre-commit              # 由 simple-git-hooks 生成
│   └── pre-push                # 由 simple-git-hooks 生成
├── .changeset/                 # Changesets 發佈記錄
├── .turbo/                     # Turbo 快取（自動生成）
├── packages/*/tsconfig.json    # 包級別 TypeScript 配置
└── satellites/*/tsconfig.json  # Satellite 級別 TypeScript 配置
```

---

## 常見配置場景

### 添加新的 Turbo 任務

```json
// turbo.json
"myTask": {
  "dependsOn": ["build"],        // 依賴關係
  "inputs": ["src/**"],          // 輸入檔案
  "outputs": ["dist/**"],        // 輸出檔案
  "cache": true                  // 是否快取
}
```

然後在 `package.json` 中定義腳本，Turbo 會自動編排。

### 修改 Biome 規則

```bash
# 檢查目前 Lint 結果
bun run lint

# 自動修復
bun run check:fix

# 驗證修改
bun run check
```

### 清除 Turbo 快取

```bash
# 完整清除
rm -rf .turbo

# 強制重新計算（不使用快取）
bun run typecheck:full
bun run build -- --force
```

---

## 相關文件

- [返回 CLAUDE.md](../../CLAUDE.md)
- [開發工作流程](./development.md)
- [故障排除指南](./troubleshooting.md)
- [命令參考](./commands.md)
- [docs/operations/CONFIGURATION.md](../operations/CONFIGURATION.md) - 詳細配置指南
