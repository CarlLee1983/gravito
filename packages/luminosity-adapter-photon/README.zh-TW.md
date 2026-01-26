# @gravito/luminosity-adapter-photon

> Gravito SmartMap (Luminosity) 引擎的 Photon 適配器。

為您的 Photon 應用程式輕鬆整合自動化網站地圖 (Sitemap) 與 Robots.txt 生成功能。此適配器提供了一個輕量級的中間件 (Middleware)，利用強大的 Luminosity 引擎來處理 SEO 相關請求。

## ✨ 特性

- 🪐 **無縫整合** - 適用於任何 Photon 應用程式的簡單中間件。
- 🤖 **自動化 Robots.txt** - 根據您的配置動態生成 robots.txt。
- 🗺️ **智能網站地圖引擎** - 全面支援 `sitemap.xml`，包括索引檔案與分頁地圖 (例如 `sitemap_page_1.xml`)。
- ⚡ **延遲初始化** - SEO 引擎僅在收到第一個相關請求時才進行初始化，節省啟動時的資源。
- 🛡️ **I/O 優化** - 自動設置正確的 `Content-Type` 標頭 (`application/xml` 或 `text/plain`)。
- 🧪 **易於測試** - 內建依賴注入支援，方便進行單元測試。

## 📦 安裝

```bash
bun add @gravito/luminosity-adapter-photon @gravito/luminosity
```

## 🚀 快速上手

```typescript
import { Photon } from '@gravito/photon';
import { gravitoSeo } from '@gravito/luminosity-adapter-photon';

const app = new Photon();

// 中間件整合
app.use('*', gravitoSeo({
  hostname: 'https://example.com',
  // 請參閱 @gravito/luminosity 以獲取完整配置選項
  sitemap: true,
  robots: true
}));

app.get('/', (c) => c.text('Hello Galaxy!'));

export default app;
```

## 📖 API 參考

### `gravitoSeo(config, deps?)`

建立一個 Photon 中間件處理器。

- **`config`**: 來自 `@gravito/luminosity` 的 `SeoConfig` 物件。
- **`deps`**: (選填) `GravitoSeoDeps` 用於覆蓋內部實作 (主要用於測試)。
    - `SeoEngine`: 自定義的 `SeoEngine` 類別實作。

### 處理的路徑

此中間件會自動攔截並處理以下路徑：
- `/robots.txt`
- `/sitemap.xml`
- `/sitemap_page_{n}.xml`
- 任何包含 `sitemap` 且以 `.xml` 結尾的路徑。

它會明確忽略 `/docs/` 下的任何路徑，以避免與文件路由產生衝突。

## 🤝 貢獻

歡迎提交貢獻、問題與功能請求！
請隨時查看 [Issues 頁面](https://github.com/gravito-framework/gravito/issues)。

## 📝 授權

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)
