# Turborepo 整合指南

本指南展示如何將 Turborepo 整合到 Gravito monorepo 中以加速構建和測試。

## 安裝

```bash
bun add -D turbo
```

## ⚙ 初始化

```bash
bunx turbo init
```

這會創建 `turbo.json` 配置檔案。

## 配置

編輯 `turbo.json`：

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [
    "tsconfig.json",
    "package.json"
  ],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**配置說明**：
- `dependsOn: ["^build"]`：依賴上游套件的構建
- `outputs`：指定構建產物目錄
- `cache: false`：dev 任務不緩存（持續運行）

## 使用

### 基本命令

```bash
# 構建所有套件（並行 + 快取）
bunx turbo build

# 只構建變更的套件
bunx turbo build --filter=...[origin/main]

# 構建特定套件及其依賴
bunx turbo build --filter=@gravito/ion...

# 測試所有套件
bunx turbo test

# 執行多個任務
bunx turbo build test lint
```

### 過濾套件

```bash
# 只構建 core 套件
bunx turbo build --filter=gravito-core

# 構建 core 和所有依賴它的套件
bunx turbo build --filter=...gravito-core

# 構建 core 和所有它依賴的套件
bunx turbo build --filter=gravito-core...

# 排除特定套件
bunx turbo build --filter='!@gravito/site'
```

## 更新 package.json Scripts

更新根目錄的 `package.json`：

```json
{
  "scripts": {
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "dev": "turbo dev"
  }
}
```

## 整合到 CI/CD

### GitHub Actions Workflow

更新 `.github/workflows/ci.yml`：

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # 需要完整歷史來計算變更

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Build
        run: bunx turbo build

      - name: Test
        run: bunx turbo test

      - name: Lint
        run: bunx turbo lint
```

## 遠端快取（可選）

### 使用 Vercel Remote Cache（免費）

1. 安裝 Vercel CLI：
   ```bash
   bun add -D vercel
   ```

2. 登入 Vercel：
   ```bash
   bunx vercel login
   ```

3. 連結專案：
   ```bash
   bunx vercel link
   ```

4. 更新 `turbo.json`：
   ```json
   {
     "remoteCache": {
       "enabled": true
     }
   }
   ```

### 使用自建 Remote Cache

```bash
# 設定環境變數
export TURBO_TOKEN=your-token
export TURBO_TEAM=your-team
export TURBO_REMOTE_CACHE_SIGNATURE_KEY=your-key

# 構建時會自動使用遠端快取
bunx turbo build
```

## 效能監控

### 分析構建時間

```bash
# 生成構建報告
bunx turbo build --summarize

# 視覺化構建流程
bunx turbo build --graph
```

### 查看快取命中率

```bash
# 顯示快取統計
bunx turbo build --summarize

# 輸出範例：
# Tasks:    10 successful, 5 cached, 0 failed
# Time:     2.345s (2.123s cached)
```

## 實際範例

### 場景：只修改了 `orbit-inertia`

**沒有 Turborepo**：
- 構建所有 30+ 個套件
- 時間：~5 分鐘

**使用 Turborepo**：
- 只構建 `orbit-inertia` 和依賴它的套件
- 其他套件使用快取
- 時間：~30 秒

### 場景：修改了 `gravito-core`

**沒有 Turborepo**：
- 構建所有套件（因為 core 是基礎依賴）
- 時間：~5 分鐘

**使用 Turborepo**：
- 構建 `gravito-core`
- 構建所有依賴它的套件（並行）
- 時間：~2 分鐘（並行加速）

## 進階配置

### 任務管道

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "dependsOn": [],
      "outputs": []
    },
    "publish": {
      "dependsOn": ["build", "test"],
      "outputs": []
    }
  }
}
```

### 環境變數

```json
{
  "pipeline": {
    "build": {
      "env": [
        "NODE_ENV",
        "CI"
      ]
    }
  }
}
```

### 條件執行

```json
{
  "pipeline": {
    "test": {
      "dependsOn": ["build"],
      "outputs": [],
      "outputMode": "new-only"  // 只顯示新輸出
    }
  }
}
```

## 注意事項

1. **首次構建**：
   - 第一次使用 Turborepo 不會有快取
   - 需要完整構建一次來建立快取

2. **快取失效**：
   - 修改 `turbo.json` 會使所有快取失效
   - 修改依賴會使下游套件快取失效

3. **並行限制**：
   - 預設無限制並行
   - 可以設定 `concurrency` 限制

## 與 Changesets 整合

Turborepo 和 Changesets 可以完美並用：

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "version": {
      "dependsOn": ["build", "test"],
      "outputs": []
    },
    "publish": {
      "dependsOn": ["version"],
      "outputs": []
    }
  }
}
```

然後在 `package.json`：

```json
{
  "scripts": {
    "version": "bunx changeset version",
    "publish": "bunx turbo publish"
  }
}
```

## 參考資源

- [Turborepo 官方文檔](https://turbo.build/repo/docs)
- [Turborepo 範例](https://github.com/vercel/turbo/tree/main/examples)
- [遠端快取設定](https://turbo.build/repo/docs/core-concepts/remote-caching)

