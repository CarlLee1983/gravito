# @gravito/cosmos 🌌

> 為 Gravito 框架設計的輕量級、高效能國際化 (i18n) 擴展。

`@gravito/cosmos` 為您的 Gravito 應用程式提供無縫的在地化支援。具備請求級別的 i18n 實例、翻譯檔案懶加載、參數替換以及靈活的語言偵測功能。

## ✨ 特性

- **🚀 效能優先**：高度優化的翻譯查找與內部快取機制。
- **🛡️ 類型安全**：支援 TypeScript 泛型，提供類型安全的翻譯鍵值。
- **🔄 請求級別實例**：為每個請求克隆輕量實例，保持語言狀態而不重複佔用資源。
- **📂 懶加載**：僅在需要時從檔案系統載入翻譯檔案。
- **🔗 靈活的回退機制**：可自定義回退鏈與缺失鍵值的處理策略。
- **🌍 複數支援**：整合 `Intl.PluralRules` 的複數處理。
- **📡 自動偵測**：支援從路由參數、查詢字串或 `Accept-Language` 標頭偵測語言。

## 📦 安裝

```bash
bun add @gravito/cosmos
```

## 🚀 快速開始

### 1. 註冊 Orbit

將 `OrbitCosmos` 加入您的 PlanetCore 配置中：

```typescript
import { PlanetCore } from '@gravito/core';
import { OrbitCosmos } from '@gravito/cosmos';

const core = new PlanetCore({
  config: {
    // 可選的靜態翻譯
    translations: {
      en: { welcome: 'Welcome, :name!' },
      'zh-TW': { welcome: '歡迎，:name！' }
    }
  }
});

core.addOrbit(new OrbitCosmos({
  defaultLocale: 'en',
  supportedLocales: ['en', 'zh-TW'],
  // 可選：配置語言檔案目錄
  lazyLoad: {
    baseDir: './lang'
  }
}));

await core.bootstrap();
```

### 2. 建立語言檔案 (若使用懶加載)

建立 `./lang/en.json`:
```json
{
  "auth": {
    "login_success": "Welcome back!",
    "failed": "Invalid credentials."
  },
  "items": {
    "count": {
      "zero": "No items found",
      "one": "Found :count item",
      "other": "Found :count items"
    }
  }
}
```

### 3. 在路由中使用

`i18n` 服務會自動注入到上下文 (Context) 中：

```typescript
app.get('/hello', (c) => {
  const t = c.get('i18n').t;
  return c.text(t('welcome', { name: 'Carl' }));
});

// 複數處理
app.get('/items', (c) => {
  const i18n = c.get('i18n');
  return c.text(i18n.t('items.count', { count: 5 })); // "Found 5 items"
});
```

## 📚 核心概念

### I18nManager
核心管理中心，持有共享配置與翻譯資源。負責載入檔案、處理翻譯邏輯、回退策略與快取。

### I18nInstance
輕量級的請求範圍物件，持有當前的語言狀態。實際翻譯邏輯委託給 `I18nManager` 執行。

### 語言偵測器 (Locale Detectors)
內建多種偵測器：
- `RouteParamDetector`：從路由參數 `:locale` 獲取。
- `QueryDetector`：從 URL 查詢字串 `?lang=` 獲取。
- `HeaderDetector`：從 `Accept-Language` HTTP 標頭獲取。

## 🛠️ 配置選項

```typescript
export interface I18nConfig {
  defaultLocale: string;
  supportedLocales: string[];
  translations?: Record<string, TranslationMap>;
  lazyLoad?: {
    baseDir: string;
    preload?: string[];
  };
  fallback?: {
    fallbackChain?: Record<string, string[]>;
    onMissingKey?: 'key' | 'empty' | 'throw' | ((key: string, locale: string) => string);
    warnOnMissing?: boolean;
  };
}
```

## License

MIT © Carl Lee
