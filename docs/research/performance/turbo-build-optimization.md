# Turbo 構建優化 - Monorepo 效率指南

## 1. 背景 (Background)

### 1.1 Monorepo 構建的挑戰

Gravito 是一個包含 64+ 核心包、15+ 衛星的超大型 Monorepo。在這樣的規模下：

- **無優化**：完整構建需要 15-20 分鐘
- **差的優化**：構建時間波動 5-15 分鐘
- **好的優化**：構建時間穩定 2-3 分鐘
- **極優優化**：增量構建 < 30 秒

### 1.2 為什麼 Turbo？

```
Build Tool 對比：

Lerna          (無緩存)：每次都重新構建全部
Rush           (局部緩存)：按包構建，部分共享緩存
Turbo          (全局緩存)：智能依賴追蹤 + 分佈式緩存
├─ Task Graph   ：自動分析包間依賴
├─ Output Cache ：緩存任務輸出
├─ Remote Cache ：支援 Vercel 分佈式緩存
└─ Parallelization ：最大化並行度

Gravito 選擇 Turbo 的原因：
✅ 官方 Monorepo 最佳實踐工具
✅ 與 Bun 無縫集成
✅ 快速增量構建
✅ 支援複雜依賴圖
```

---

## 2. Turbo 核心概念 (Core Concepts)

### 2.1 Task 定義

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],        // 依賴關係
      "inputs": ["src/**", "package.json"],  // 影響此任務的文件
      "outputs": ["dist/**"],          // 此任務產生的文件
      "outputMode": "partial",         // 輸出模式
      "cache": true                    // 是否緩存
    }
  }
}
```

**關鍵字段說明**：
- `dependsOn: ["^build"]` - 依賴依賴包的 build，`^` 表示依賴包
- `inputs` - Turbo 使用這些來判斷是否需要重新運行
- `outputs` - 需要緩存的文件/目錄
- `cache` - 是否啟用緩存（預設 true）

### 2.2 Task 執行順序

```
Gravito 包依賴圖：

core (無依賴)
 ├─ photon → core
 ├─ atlas → core
 ├─ signal → core
 │
 ├─ stream → core, signal
 ├─ astral → core
 ├─ enterprise → core
 │
 └─ monolith → core, photon, atlas, signal
     │
     └─ satellites
        ├─ catalog → core, atlas, signal
        ├─ commerce → core, atlas, signal
        ├─ payment → core, atlas, signal
        └─ ... 15+ 衛星

構建順序（Topological Sort）：
1. core (無依賴，最先)
   ↓
2. photon, atlas, signal (並行)
   ↓
3. stream, enterprise, etc (並行)
   ↓
4. monolith
   ↓
5. satellites (並行，最後)
```

---

## 3. 優化輸入與輸出 (Input/Output Optimization)

### 3.1 精確定義 inputs（避免過度重新構建）

```json
{
  "build": {
    // ❌ 過寬鬆的 inputs（任何改變都觸發重新構建）
    "inputs": ["**/*"],

    // ✅ 精確的 inputs（只追蹤相關文件）
    "inputs": [
      "src/**",
      "tests/**",
      "package.json",
      "tsconfig.json",
      "biome.json"
    ],

    // ✅ 排除不相關文件
    "inputs": [
      "src/**",
      "package.json",
      "!src/**/*.test.ts",      // 不需要重新構建
      "!node_modules/**"         // 被自動排除
    ]
  }
}
```

**最佳實踐**：
```json
{
  "build": {
    "inputs": [
      "src/**",
      "package.json",
      "tsconfig.json",
      "biome.json",
      "bunfig.toml"
    ],
    "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
  },

  "test": {
    "inputs": [
      "src/**",
      "tests/**",
      "package.json",
      "tsconfig.json",
      "bunfig.toml"
    ],
    "outputs": []  // 測試無輸出需要緩存
  },

  "typecheck": {
    "inputs": [
      "src/**",
      "tests/**",
      "package.json",
      "tsconfig.json"
    ],
    "outputs": []  // TypeCheck 只驗證，無需緩存輸出
  },

  "lint": {
    "inputs": [
      "src/**",
      "package.json",
      "biome.json"
    ],
    "outputs": []
  }
}
```

### 3.2 避免過寬鬆的 outputs

```json
{
  // ❌ 錯誤：緩存不必要的大文件
  "build": {
    "outputs": ["dist/**", "node_modules/**", ".turbo/**"]
    // node_modules 不應緩存（包含數千文件）
  },

  // ✅ 正確：只緩存需要的產物
  "build": {
    "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    // 排除緩存目錄（大且無用）
  }
}
```

---

## 4. 依賴優化 (Dependency Optimization)

### 4.1 正確使用 dependsOn

```json
{
  // ❌ 錯誤：過度依賴
  "test": {
    "dependsOn": ["^build", "^typecheck", "^lint"]
    // 每次測試都要先構建、類型檢查、Lint → 很慢
  },

  // ✅ 正確：只依賴必要的任務
  "test": {
    "dependsOn": ["^build"]  // 或甚至 []（測試應獨立）
    // 測試不需要 Lint 或 TypeCheck
  },

  "typecheck": {
    "dependsOn": ["^build"]  // 需要依賴源代碼構建完成
  },

  "lint": {
    "dependsOn": []  // Lint 無需依賴任何任務
  }
}
```

### 4.2 使用 `^` vs 無 `^`

```json
{
  "build": {
    // ✅ 使用 ^：表示「我的依賴包的 build」
    "dependsOn": ["^build"]
    // 僅對 package.json 中的依賴包有效
  },

  "test": {
    // ✅ 無 ^：表示「同包中的 build」
    "dependsOn": ["build"]
    // 在運行測試前，先構建同一包
  },

  "ci": {
    // ✅ 複合依賴
    "dependsOn": ["^build", "typecheck"]
    // 依賴：依賴包 build + 本包 typecheck
  }
}
```

---

## 5. 緩存策略 (Caching Strategies)

### 5.1 本地緩存配置

```bash
# Turbo 預設把緩存存在：
~/.turbo/cache

# 查看緩存統計
turbo run build --profile=build

# 清理本地緩存
turbo prune --scope="@gravito/core"

# 全量清理（謹慎！）
rm -rf ~/.turbo/cache
```

### 5.2 遠端緩存（Vercel Remote Caching）

```bash
# 連接到 Vercel
turbo login

# 驗證連接
turbo link

# 後續所有 turbo 命令會自動共享緩存
turbo run build --remote-only  # 僅使用遠端緩存
turbo run build --no-cache     # 禁用所有緩存
```

**遠端緩存好處**：
```
CI 環境 A（GitHub Actions）
  ├─ 執行 build
  └─ 上傳到 Vercel Cache

CI 環境 B（相同分支）
  ├─ 下載緩存（秒級）
  └─ 跳過 build ✅ 快速

本地開發
  ├─ 下載遠端緩存
  └─ 無需重新構建
```

### 5.3 緩存失效場景

```json
{
  "build": {
    "inputs": ["src/**", "package.json"],
    // 緩存失效的場景：
    // 1. src 中任何文件修改 → 重新構建
    // 2. package.json 內容改變（版本、依賴）→ 重新構建
    // 3. tsconfig.json 未列在 inputs → 不會失效（可能問題！）
  }
}
```

**Gravito 實際配置中的緩存失效**：
```json
{
  "build": {
    "inputs": ["src/**", "package.json", "tsconfig.json", "biome.json"],
    // 任何這些文件改變都會失效緩存
    // 優點：準確追蹤依賴
    // 缺點：改 biome.json 格式就失效（可能不影響輸出）
  }
}
```

---

## 6. 並行化 (Parallelization)

### 6.1 充分利用多核

```bash
# 預設：自動檢測 CPU 核心
turbo run build

# 手動指定並行度
turbo run build --concurrency=8

# 單線程（調試用）
turbo run build --concurrency=1

# 查看實際並行度
turbo run build --verbose
```

### 6.2 任務級並行優化

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],  // 等待依賴包
      // Turbo 會自動在依賴包構建完後並行構建獨立包
    },

    "lint": {
      "dependsOn": [],  // 無依賴，所有包可完全並行
    },

    "test": {
      "dependsOn": [],  // 無依賴，所有包可完全並行
    }
  }
}
```

**實際並行效果**（Gravito）：
```
無優化（順序執行）：
core build: 2s
photon build: 3s
atlas build: 4s
signal build: 3s
satellites build: 20s
總計: 32 秒

有優化（並行執行）：
core build: 2s
photon, atlas, signal (並行): 4s
satellites (並行): 20s
總計: 26 秒（節省 20%）

理想情況（完全並行）：
最長路徑: max(2 + 4 + 20) = 26s
理論上限: 26 秒（約束於最長依賴鏈）
```

---

## 7. 實踐案例：Gravito 構建優化 (Gravito Build Case Study)

### 7.1 當前 turbo.json 分析

```json
{
  "build": {
    "dependsOn": ["^build"],
    "inputs": ["src/**", "package.json", "tsconfig.json", "biome.json"],
    "outputs": ["dist/**", ".next/**", "!.next/cache/**"],
    "outputMode": "partial"
  }
}
```

**優點**：
✅ 精確的 inputs（不會誤觸發）
✅ 排除了不必要的快取（.next/cache）
✅ partial 模式減少日誌噪音

**可能的改進**：
- 考慮 `typecheck` 不需要依賴 `^build`（可並行）
- 考慮測試是否可跳過某些包（如工具包）

### 7.2 增量構建示例

```bash
# 初次完整構建
$ turbo run build
• Packages in scope: 64
• Running build in 64 packages
⠋ Preparing packages...done
▼ cache: HIT > ...

Computed dependencies...

⠋ Running 64 build tasks...
▼ Running build tasks...
✔ @gravito/core:build                                   2.01s
✔ @gravito/photon:build                                 3.24s
✔ @gravito/atlas:build                                  4.51s
✔ @gravito/signal:build                                 3.18s
✔ Satellites building...                               18.23s
⠦ Done in 26.28s

 Tasks:     64 completed
 Cache:    64 hit
 Time:     26.28s
```

```bash
# 僅修改 catalog 衛星
$ echo "console.log('test')" >> satellites/catalog/src/index.ts
$ turbo run build

• Packages in scope: 64
• Running build in 64 packages

⠋ Running 64 build tasks...
✔ @gravito/core:build                                  CACHED
✔ @gravito/photon:build                                CACHED
✔ @gravito/atlas:build                                 CACHED
✔ @gravito/signal:build                                CACHED
✔ @gravito/satellite-catalog:build                     0.45s  ← 重新構建
✔ Other satellites:build                               CACHED

 Tasks:     64 completed
 Cache:    63 hit, 1 miss
 Time:     1.23s  ← 僅 1 秒（vs 26 秒）
```

### 7.3 CI 優化案例

```yaml
# GitHub Actions 中的 Turbo 使用
name: CI

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      # ✅ 啟用遠端緩存
      - name: Build with Turbo
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
        run: turbo run build --remote-only

      # ✅ 只測試改動的包
      - name: Get affected packages
        id: affected
        run: bun run scripts/get-affected-packages.ts

      - name: Test affected
        run: turbo run test --filter='...[origin/main]'
```

---

## 8. 常見陷阱與解決方案 (Pitfalls & Solutions)

### 8.1 陷阱 1：inputs 定義過寬

```json
// ❌ 錯誤
"inputs": ["**/*"]
// 任何文件改變（包括 README、測試）都會觸發重新構建

// ✅ 正確
"inputs": ["src/**", "package.json", "tsconfig.json"]
```

### 8.2 陷阱 2：過度依賴

```json
// ❌ 錯誤
"test": {
  "dependsOn": ["^build", "^typecheck", "^lint"]
}
// 每次測試都要構建+類型檢查+Lint → 很慢

// ✅ 正確
"test": {
  "dependsOn": []  // 測試獨立運行
  // 或 ["^build"] 如果有依賴
}
```

### 8.3 陷阱 3：緩存無效判斷錯誤

```bash
# ❌ 緩存失效但不知道為何
$ turbo run build
✔ cache: MISS (not found)  ← 為什麼是 MISS？

# ✅ 診斷
$ turbo run build --verbose
[TURBO] Input '...' changed
[TURBO] Reason: src/new-file.ts added

# 可能的原因：
# 1. src 中新增文件
# 2. package.json 版本改變
# 3. tsconfig.json 修改
```

### 8.4 陷阱 4：outputs 配置導致緩存失敗

```json
// ❌ 錯誤：dist 中文件名帶時間戳
{
  "build": {
    "outputs": ["dist/**"]
  }
  // dist/bundle-[timestamp].js → 每次都不同 → 緩存無效
}

// ✅ 正確：使用一致的輸出名
{
  "build": {
    "outputs": ["dist/**"]
  }
  // 確保輸出檔名一致（不含動態時間戳）
}
```

---

## 9. 監測與分析 (Monitoring & Analysis)

### 9.1 分析構建性能

```bash
# 產生詳細的構建報告
turbo run build --verbose > build.log

# 查看特定任務的耗時
turbo run build --scope="@gravito/core"

# 使用 --profile 生成性能分析
turbo run build --profile=build

# 查看緩存命中率
turbo run build | grep -E "Cache:|Tasks:"
```

### 9.2 緩存命中率目標

```bash
# 良好的緩存命中率指標
Cache: 90+ hit  ← 90% 的任務使用緩存 ✅ 好
Cache: 50 hit   ← 50% 的任務使用緩存 ⚠️ 可改進
Cache: 0 hit    ← 沒有任務使用緩存   ❌ 有問題

# 目標：
# - 本地開發：95%+（大多數任務未改變）
# - CI 環境：70%+（新分支可能無緩存）
```

### 9.3 包大小監測

```bash
# 檢查產物大小（特別是 dist）
du -sh packages/*/dist
# 確保沒有意外的大文件

# 檢查產物數量
find packages/*/dist -type f | wc -l
# 產物過多可能導致緩存膨脹
```

---

## 10. 最佳實踐檢查清單 (Best Practices Checklist)

### turbo.json 配置

- [ ] 每個 task 都定義了 `inputs`（避免過寬或過窄）
- [ ] 每個 task 都定義了 `outputs`（正確指定緩存範圍）
- [ ] `dependsOn` 精確反映實際依賴
- [ ] 無不必要的跨任務依賴
- [ ] 使用 `^` 表示依賴包，無 `^` 表示本包
- [ ] `cache` 根據任務特性設置（輸出無變化的可緩存）

### 構建命令

- [ ] 使用 `--filter` 進行選擇性構建
- [ ] 使用 `--since` 進行增量構建
- [ ] CI 中啟用 `--remote-only` 遠端緩存
- [ ] 開發中啟用本地緩存
- [ ] 定期檢查 `--verbose` 日誌診斷

### 性能目標

- [ ] 初次完整構建 < 30 秒
- [ ] 增量構建（單包修改）< 5 秒
- [ ] 緩存命中率 > 80%
- [ ] CI 構建時間 < 5 分鐘

---

## 11. 相關文檔與資源

- **[turbo.json](../../turbo.json)** - 實際配置
- **[Turbo 官方文檔](https://turbo.build)** - 完整參考
- **[root scripts](../../package.json)** - 構建命令定義
- **[scripts/](../../scripts/)** - 輔助構建腳本
- **[docs/claude/commands.md](../../docs/claude/commands.md)** - 完整命令參考

---

**撰寫日期**：2026-02-08
**版本**：1.0
