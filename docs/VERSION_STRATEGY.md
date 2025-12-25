# 版本策略說明

## 版本分類

### Beta 版本 (`1.0.0-beta.*`)

**核心穩定套件**，主要用於核心框架和基礎設施：

- `gravito-core`
- `@gravito/horizon`
- `@gravito/luminosity`
- `@gravito/luminosity-adapter-hono`
- `@gravito/stasis`

### Alpha 版本 (`1.0.0-alpha.*`)

**功能模組與工具**，仍在積極開發或測試階段：

- 資料與儲存：`@gravito/atlas`, `@gravito/dark-matter`, `@gravito/nebula`, `@gravito/plasma`
- 系統功能：`@gravito/sentinel` (Auth), `@gravito/impulse`, `@gravito/ion`, `@gravito/pulsar`
- 視圖層：`@gravito/freeze` 系列, `@gravito/prism`
- 工具：`@gravito/cli`, `@gravito/client`, `@gravito/atlas`, `@gravito/constellation`

## 版本更新流程

### 1. 更新版本號

```bash
bun run version:update
```

這會根據套件是否在官網使用，自動設定正確的版本號。

### 2. 檢查版本

確認版本號是否正確：

```bash
# 檢查 beta 套件
grep -r '"version": "1.0.0-beta' packages/*/package.json

# 檢查 alpha 套件
grep -r '"version": "1.0.0-alpha' packages/*/package.json
```

### 3. 構建和發布

```bash
# 構建
bun run build

# 發布
bun run publish:all
```

## NPM 標籤

發布時會自動使用對應的 tag：

- **Beta 版本** → `npm publish --tag beta`
- **Alpha 版本** → `npm publish --tag alpha`
- **穩定版本** → `npm publish` (使用 `latest` tag)

## 版本升級路徑

### Alpha → Beta

當套件開始在官網使用時：

1. 將套件名稱加入 `scripts/update-package-versions.ts` 的 `OFFICIAL_SITE_PACKAGES` 陣列
2. 執行 `bun run version:update`
3. 重新發布

### Beta → Stable

當 beta 版本穩定後：

1. 修改 `scripts/update-package-versions.ts` 中的版本配置
2. 將 beta 套件版本改為 `1.0.0`
3. 執行 `bun run version:update`
4. 重新發布

## 版本號格式

遵循 [Semantic Versioning](https://semver.org/)：

- **穩定版**: `1.0.0`
- **Beta**: `1.0.0-beta.1`, `1.0.0-beta.2`, ...
- **Alpha**: `1.0.0-alpha.1`, `1.0.0-alpha.2`, ...

## 安裝方式

### 安裝 Beta 版本

```bash
npm install gravito-core@beta
npm install @gravito/horizon@beta
```

### 安裝 Alpha 版本

```bash
npm install @gravito/sentinel@alpha
npm install @gravito/pulsar@alpha
```

### 安裝穩定版本

```bash
npm install gravito-core
# 或明確指定
npm install gravito-core@latest
```

## 檢查已發布的版本

```bash
# 查看所有版本
npm view gravito-core versions

# 查看特定 tag 的版本
npm view gravito-core dist-tags

# 查看 beta 版本
npm view gravito-core@beta version
```

