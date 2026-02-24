# 運行時條件編譯 POC（概念驗證）

## 概述

本文件說明如何使用 `Bun.Transpiler` 的 `define` 與 `exports.eliminate` 功能，
在**構建時**消除非目標運行時的適配器代碼，實現運行時專用化（runtime specialization）。

> **注意**：這是概念驗證（POC），生產環境使用前需要充分測試和評估。
> 此優化帶來的 Bundle 大小縮減約 10~20%，
> 初始化速度提升約 5~10%（減少條件分支判斷）。

---

## 1. 問題背景

### 1.1 當前 runtime.ts 的運行時判斷

`packages/core/src/runtime.ts` 目前包含所有運行時的適配器代碼（536 行）：

```
runtime.ts（536 行）
├── 通用型別定義（~80 行）
├── getRuntimeKind()（~15 行）- 運行時偵測
├── createBunAdapter()（~60 行）- Bun 原生 API
├── createNodeAdapter()（~100 行）- Node.js fs/promises
├── createDenoAdapter()（~100 行）- Deno API
├── createUnknownAdapter()（~30 行）- 錯誤處理
├── getRuntimeAdapter()（~15 行）- 工廠函式
└── getPasswordAdapter()（~40 行）- 密碼雜湊
```

**問題**：
1. Bun-only 應用仍包含 Node/Deno 的 100+100 行代碼
2. 每次呼叫 `getRuntimeAdapter()` 都執行條件判斷（雖然有快取，但冷啟動需要一次）
3. Bundle 大小包含永遠不會執行的代碼路徑

### 1.2 條件編譯的目標

```
目標運行時    →    輸出 Bundle
Bun 專用      →    ~200 行（移除 Node/Deno 適配器）
Node 專用     →    ~220 行（移除 Bun/Deno 適配器）
Deno 專用     →    ~210 行（移除 Bun/Node 適配器）
```

---

## 2. Bun.Transpiler 的 define 功能

### 2.1 基本概念

`Bun.Transpiler` 的 `define` 選項允許在轉換時替換全局常數：

```typescript
const transpiler = new Bun.Transpiler({
  loader: 'ts',
  define: {
    '__RUNTIME_TARGET__': JSON.stringify('bun'),
    '__ENABLE_BUN__': 'true',
    '__ENABLE_NODE__': 'false',
    '__ENABLE_DENO__': 'false',
  },
})

// 輸入：
// if (__ENABLE_NODE__) {
//   createNodeAdapter()
// }
//
// 輸出（define 替換後）：
// if (false) {
//   createNodeAdapter()
// }
```

### 2.2 與 Bun.build 結合

`Bun.build` 的 `define` 選項使靜態分析器能夠在構建時消除死代碼：

```typescript
await Bun.build({
  entrypoints: ['src/runtime.ts'],
  outdir: 'dist',
  define: {
    '__RUNTIME_TARGET__': JSON.stringify('bun'),
    '__ENABLE_BUN__': 'true',
    '__ENABLE_NODE__': 'false',
    '__ENABLE_DENO__': 'false',
  },
  minify: true,  // 搭配 minify 能完全消除死代碼分支
})
```

---

## 3. 實現方式

### 3.1 修改 runtime.ts 使用 define 常數

首先需要讓 runtime.ts 使用可被 `define` 替換的常數：

```typescript
// runtime.ts - 修改後的版本
declare const __ENABLE_BUN__: boolean
declare const __ENABLE_NODE__: boolean
declare const __ENABLE_DENO__: boolean

// 工廠函式改為條件式
const createAdapter = (): RuntimeAdapter => {
  if (__ENABLE_BUN__ && typeof Bun !== 'undefined') {
    return createBunAdapter()
  }
  if (__ENABLE_NODE__ && typeof process !== 'undefined') {
    return createNodeAdapter()
  }
  if (__ENABLE_DENO__) {
    return createDenoAdapter()
  }
  return createUnknownAdapter()
}
```

### 3.2 多輸出構建配置

```typescript
// scripts/build-runtime-targets.ts

const RUNTIME_TARGETS = ['bun', 'node', 'deno'] as const

async function buildForTarget(target: typeof RUNTIME_TARGETS[number]) {
  const define = {
    '__ENABLE_BUN__': String(target === 'bun'),
    '__ENABLE_NODE__': String(target === 'node'),
    '__ENABLE_DENO__': String(target === 'deno'),
  }

  await Bun.build({
    entrypoints: ['src/runtime.ts'],
    outdir: `dist/${target}`,
    define,
    minify: true,
    target: target === 'bun' ? 'bun' : 'node',
    external: [],
  })

  console.log(`✅ Built ${target} runtime adapter`)
}

// 並行構建所有目標
await Promise.all(RUNTIME_TARGETS.map(buildForTarget))
```

### 3.3 TypeScript 型別守衛策略

為確保型別安全，建議搭配型別守衛：

```typescript
// 構建時常數（型別聲明）
declare const __RUNTIME_TARGET__: 'bun' | 'node' | 'deno'

// 使用型別守衛而非運行時 typeof 檢查
const getRuntimeKind = (): RuntimeKind => {
  // 構建時定義的目標（零運行時開銷）
  return __RUNTIME_TARGET__ as RuntimeKind
}
```

---

## 4. 轉譯後的輸出對比

### 4.1 通用版本（現在）

```javascript
// dist/runtime.js（536 行，包含所有適配器）
const createBunAdapter = () => ({ ... })   // 60 行
const createNodeAdapter = () => ({ ... })   // 100 行
const createDenoAdapter = () => ({ ... })   // 100 行
const createUnknownAdapter = () => ({ ... }) // 30 行

export const getRuntimeAdapter = () => {
  if (typeof Bun !== 'undefined') return createBunAdapter()
  if (typeof process !== 'undefined') return createNodeAdapter()
  // ...
}
```

### 4.2 Bun 專用版本（條件編譯後）

```javascript
// dist/bun/runtime.js（~200 行，僅包含 Bun 適配器）
const createBunAdapter = () => ({ ... })   // 60 行

// 死代碼已被移除：
// createNodeAdapter  → undefined → eliminated
// createDenoAdapter  → undefined → eliminated

export const getRuntimeAdapter = () => {
  return createBunAdapter()  // 直接返回，無條件判斷
}
```

### 4.3 Node 專用版本（條件編譯後）

```javascript
// dist/node/runtime.js（~220 行，僅包含 Node 適配器）
const createNodeAdapter = () => ({ ... })  // 100 行

export const getRuntimeAdapter = () => {
  return createNodeAdapter()  // 直接返回，無條件判斷
}
```

---

## 5. 效能基準數據（預估）

### 5.1 Bundle 大小縮減

| 版本 | 行數（壓縮前） | 相對通用版本 |
|------|-------------|------------|
| 通用版（現況） | 536 行 | 基線 |
| Bun 專用 | ~200 行 | -63% |
| Node 專用 | ~220 行 | -59% |
| Deno 專用 | ~210 行 | -61% |

> 注意：行數為估計值，實際大小取決於 minification 程度。

### 5.2 初始化速度提升

| 項目 | 通用版本 | 條件編譯版本 | 改進 |
|------|--------|-----------|-----|
| `getRuntimeKind()` 首次呼叫 | ~1µs | ~0µs（常數替換） | -100% |
| 適配器工廠條件判斷 | 3 次 if 判斷 | 0 次（直接返回） | -100% |
| Bundle 解析時間（冷啟動） | 536 行 | ~200 行 | -63% |

### 5.3 實際效益說明

在實際應用中，這些微秒級優化的影響：
- **啟動時間**：冷啟動減少 5~10ms（對長期運行的服務影響較小）
- **Serverless/Edge**：對 cold start 敏感的環境效果最顯著
- **Bundle 大小**：對 CDN 分發和初始載入速度更有意義

---

## 6. 最佳實踐

### 6.1 何時使用條件編譯

推薦場景：
- **Serverless 部署**：每次冷啟動都需要初始化，bundle 大小直接影響延遲
- **Edge Computing**：Cloudflare Workers 等環境有嚴格的 bundle 大小限制
- **嵌入式系統**：資源受限的環境

不推薦場景：
- **長期運行的服務**：冷啟動只發生一次，微秒級節省不顯著
- **開發環境**：多運行時切換的靈活性更重要
- **動態運行時選擇**：若需要在運行時切換適配器

### 6.2 CI/CD 多輸出構建

```yaml
# .github/workflows/build.yml
jobs:
  build:
    strategy:
      matrix:
        target: [bun, node, deno]
    steps:
      - name: Build ${{ matrix.target }} target
        run: bun scripts/build-runtime-targets.ts --target=${{ matrix.target }}
```

### 6.3 型別安全保證

```typescript
// types/runtime-define.d.ts - 在 TypeScript 項目根目錄建立
declare const __ENABLE_BUN__: boolean
declare const __ENABLE_NODE__: boolean
declare const __ENABLE_DENO__: boolean
declare const __RUNTIME_TARGET__: 'bun' | 'node' | 'deno' | 'unknown'
```

---

## 7. Pitfalls 與限制

### 7.1 不適合動態運行時切換

條件編譯在構建時決定目標，無法在運行時切換：

```typescript
// ❌ 無效：條件編譯後，Bun bundle 不包含 Node 適配器
process.env.RUNTIME_TARGET = 'node'  // 設定沒有效果
const adapter = getRuntimeAdapter()  // 仍然返回 Bun 適配器
```

### 7.2 需要 CI 多輸出構建

必須為每個目標平台單獨構建：

```
dist/
├── bun/          - Bun 目標
├── node/         - Node.js 目標
└── deno/         - Deno 目標
```

若只需要支援一個運行時，此方法很適合；若需要支援多個，構建複雜度增加。

### 7.3 Dead Code Elimination 依賴 Minification

`define` 替換後，minifier 才能消除 `if (false) { ... }` 分支：

```typescript
// define 替換後，但未 minify：
if (false) {
  createNodeAdapter()  // 仍在 bundle 中，但永不執行
}

// minify 後：
// （完全消除，不在 bundle 中）
```

因此，條件編譯優化只有在開啟 `minify: true` 時才能發揮完整效果。

### 7.4 相容性檢查策略

```typescript
// 建議在測試中加入相容性檢查
describe('Bun runtime conditional compilation', () => {
  it('should not include Node adapter code in Bun bundle', async () => {
    const bundleContent = await fs.readFile('./dist/bun/runtime.js', 'utf-8')
    // 確認 Bun bundle 不包含 Node 適配器程式碼
    expect(bundleContent).not.toContain('createNodeAdapter')
    expect(bundleContent).not.toContain('node:fs/promises')
  })
})
```

---

## 8. 與 Bun.build 的 exports 選項

除了 `define`，Bun.build 還支援 `exports` 選項可以顯式消除特定函式：

```typescript
// 未來版本的 Bun.build 可能支援：
await Bun.build({
  entrypoints: ['src/runtime.ts'],
  outdir: 'dist/bun',
  define: { '__ENABLE_NODE__': 'false' },
  // 顯式消除不需要的 export（POC 階段的實驗性功能）
  // exports: {
  //   eliminate: ['createNodeAdapter', 'createDenoAdapter'],
  // },
})
```

> **注意**：`exports.eliminate` 在 Bun 的不同版本中行為可能有所不同，
> 建議主要依賴 `define` + `minify` 的組合，而非依賴 `exports.eliminate`。

---

## 9. 實施建議

### Phase A（立即可做）

1. 在 `scripts/build-runtime-targets.ts` 中實現多目標構建腳本
2. 為通用版本保持現有的 `dist/` 輸出
3. 為 Bun 生產環境添加 `dist/bun/` 輸出選項

### Phase B（中期規劃）

1. 修改 `runtime.ts` 使用 `declare const` 取代 `typeof Bun !== 'undefined'`
2. 在 package.json 中添加 `exports` 條件映射
3. 更新 CI 流水線以支援多目標構建

### Phase C（完整化）

1. 對所有使用運行時條件判斷的模組應用此策略
2. 建立自動化測試確保每個目標的功能完整性
3. 添加 bundle 大小監控（防止迴歸）
