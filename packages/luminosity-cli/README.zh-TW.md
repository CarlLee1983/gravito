# @gravito/luminosity-cli 🛠️

> Gravito SmartMap Engine 的命令列工具 (CLI)。

`@gravito/luminosity-cli` 是 `@gravito/luminosity` 的配套工具，讓您能夠直接在終端機中初始化 SEO 配置、手動產生 sitemap，以及管理增量日誌 (incremental logs)。

## 📦 安裝

```bash
bun add @gravito/luminosity-cli
```

或者使用 `bunx` 直接執行：

```bash
bunx gravito-seo --help
```

## 🚀 指令說明

### `init`
在專案中初始化新的 Gravito SEO 配置檔案。

```bash
gravito-seo init
```
此指令會啟動引導程式，協助您建立 `gravito.seo.config.ts` 檔案。

### `generate`
根據您的配置手動產生 `sitemap.xml` 檔案。

```bash
# 基本產生指令
gravito-seo generate

# 指定自定義配置檔案與輸出路徑
gravito-seo generate --config ./configs/seo.ts --out ./dist/sitemap.xml
```

**選項：**
- `-c, --config <path>`: 配置檔案的路徑。
- `-o, --out <path>`: 輸出路徑 (例如：`./public/sitemap.xml`)。

### `compact`
強制執行增量日誌的壓縮 (Compaction)。當使用 `incremental` 模式時，此指令能將分散的日誌紀錄合併，提升效能。

```bash
gravito-seo compact
```

**選項：**
- `-c, --config <path>`: 配置檔案的路徑。

## 🔧 全域選項

- `-v, --version`: 顯示目前版本。
- `-h, --help`: 顯示指令說明。

## 📄 開源授權

MIT © Carl Lee
