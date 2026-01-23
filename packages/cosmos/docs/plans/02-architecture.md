# Phase 2: 架構改進計劃

> 優先級: P1 | 預估影響: 中高

## 現況分析

### 當前架構

```
OrbitCosmos
    │
    ├── I18nManager (單例)
    │       │
    │       └── translations: Record<locale, TranslationMap>
    │
    ├── I18nInstance (請求範圍)
    │       └── 包裝 manager + locale
    │
    └── localeMiddleware
            └── 語言檢測 → 注入 I18nInstance
```

### 識別問題

1. **型別定義不夠精確**
   - `TranslationMap` 過於寬鬆
   - 缺少嚴格的型別推斷

2. **缺少複數形式支援**
   - 無法處理 `1 item` vs `2 items`

3. **無 ICU MessageFormat 支援**
   - 複雜格式化需求無法滿足

4. **中間件耦合度高**
   - 語言檢測邏輯硬編碼

## 優化方案

### 2.1 強化型別系統

**目標**: 提供編譯時期的翻譯鍵檢查

```typescript
// 定義翻譯結構型別
type NestedKeyOf<T> = T extends object
  ? { [K in keyof T]: K extends string
      ? T[K] extends object
        ? `${K}.${NestedKeyOf<T[K]>}`
        : K
      : never
    }[keyof T]
  : never

// 使用範例
interface Translations {
  common: {
    welcome: string
    goodbye: string
  }
  auth: {
    login: string
    logout: string
  }
}

type TranslationKey = NestedKeyOf<Translations>
// 結果: "common.welcome" | "common.goodbye" | "auth.login" | "auth.logout"

// 型別安全的翻譯函數
function t<T extends Translations>(key: NestedKeyOf<T>): string
```

### 2.2 複數形式支援

**目標**: 支援根據數量選擇正確的翻譯形式

```typescript
interface PluralConfig {
  zero?: string
  one: string
  two?: string
  few?: string
  many?: string
  other: string
}

// 翻譯檔案格式
{
  "items": {
    "zero": "沒有項目",
    "one": "1 個項目",
    "other": ":count 個項目"
  }
}

// API 使用
i18n.t('items', { count: 0 })   // "沒有項目"
i18n.t('items', { count: 1 })   // "1 個項目"
i18n.t('items', { count: 5 })   // "5 個項目"
```

**實作方式**:

```typescript
class I18nManager {
  private pluralRules: Map<string, Intl.PluralRules> = new Map()

  private getPluralForm(locale: string, count: number): string {
    if (!this.pluralRules.has(locale)) {
      this.pluralRules.set(locale, new Intl.PluralRules(locale))
    }
    return this.pluralRules.get(locale)!.select(count)
  }

  translate(locale: string, key: string, replacements?: Record<string, unknown>) {
    const value = this.resolveKey(locale, key)

    // 檢查是否為複數形式
    if (typeof value === 'object' && replacements?.count !== undefined) {
      const form = this.getPluralForm(locale, Number(replacements.count))
      const pluralValue = value[form] ?? value.other
      return this.replaceParams(pluralValue, replacements)
    }

    return this.replaceParams(value, replacements)
  }
}
```

### 2.3 ICU MessageFormat 支援 (可選)

**目標**: 支援複雜的訊息格式化

```typescript
// ICU MessageFormat 範例
{
  "greeting": "Hello {name}, you have {count, plural, =0 {no messages} one {# message} other {# messages}}."
}

// 使用
i18n.t('greeting', { name: 'Carl', count: 5 })
// "Hello Carl, you have 5 messages."
```

**實作方式**: 整合 `@formatjs/intl-messageformat`

```typescript
import { IntlMessageFormat } from 'intl-messageformat'

class I18nManager {
  private messageCache = new Map<string, IntlMessageFormat>()

  translateICU(locale: string, key: string, values?: Record<string, unknown>) {
    const cacheKey = `${locale}:${key}`

    if (!this.messageCache.has(cacheKey)) {
      const message = this.resolveKey(locale, key)
      this.messageCache.set(cacheKey, new IntlMessageFormat(message, locale))
    }

    return this.messageCache.get(cacheKey)!.format(values)
  }
}
```

### 2.4 可插拔的語言檢測策略

**目標**: 解耦語言檢測邏輯

```typescript
interface LocaleDetector {
  name: string
  priority: number
  detect(c: Context): string | undefined
}

// 內建檢測器
const routeParamDetector: LocaleDetector = {
  name: 'routeParam',
  priority: 100,
  detect: (c) => c.req.param('locale')
}

const queryDetector: LocaleDetector = {
  name: 'query',
  priority: 90,
  detect: (c) => c.req.query('lang')
}

const headerDetector: LocaleDetector = {
  name: 'acceptLanguage',
  priority: 80,
  detect: (c) => parseAcceptLanguage(c.req.header('Accept-Language'))
}

const cookieDetector: LocaleDetector = {
  name: 'cookie',
  priority: 85,
  detect: (c) => c.req.cookie('locale')
}

// 配置
const cosmos = new OrbitCosmos({
  detectors: [
    routeParamDetector,
    cookieDetector,
    headerDetector
  ]
})
```

### 2.5 命名空間支援

**目標**: 支援大型專案的翻譯組織

```typescript
interface NamespaceConfig {
  defaultNamespace: string
  namespaces: string[]
  loadNamespace?: (locale: string, ns: string) => Promise<TranslationMap>
}

// 使用
i18n.t('common:welcome')      // 從 common 命名空間
i18n.t('auth:login.title')    // 從 auth 命名空間
i18n.t('welcome')             // 從預設命名空間
```

## 架構演進圖

```
現況:
┌─────────────────┐
│   OrbitCosmos   │
│  (硬編碼邏輯)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   I18nManager   │
│  (單一職責)     │
└─────────────────┘

優化後:
┌─────────────────┐
│   OrbitCosmos   │
│   (協調者)      │
└────────┬────────┘
         │
    ┌────┴────┬────────────┐
    ▼         ▼            ▼
┌────────┐ ┌────────┐ ┌──────────┐
│Detector│ │Formatter│ │ Manager │
│Pipeline│ │  ICU    │ │  Core   │
└────────┘ └────────┘ └──────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
               ┌────────┐   ┌─────────┐
               │ Cache  │   │Namespace│
               │Manager │   │ Loader  │
               └────────┘   └─────────┘
```

## 實施步驟

### Step 1: 型別強化
- [ ] 定義 `NestedKeyOf` 工具型別
- [ ] 建立型別安全的 API
- [ ] 更新 JSDoc 文件

### Step 2: 複數形式
- [ ] 實作 `PluralConfig` 介面
- [ ] 整合 `Intl.PluralRules`
- [ ] 建立測試案例

### Step 3: 可插拔檢測器
- [ ] 定義 `LocaleDetector` 介面
- [ ] 實作內建檢測器
- [ ] 重構 `localeMiddleware`

### Step 4: ICU 支援 (可選)
- [ ] 評估 `intl-messageformat` 套件
- [ ] 實作 `translateICU()` 方法
- [ ] 效能測試

### Step 5: 命名空間
- [ ] 設計命名空間載入機制
- [ ] 實作命名空間解析
- [ ] 文件更新

## 向後相容性

| 變更 | 相容性 | 遷移方式 |
|------|--------|----------|
| 型別強化 | ✅ 完全相容 | 無需遷移 |
| 複數形式 | ✅ 完全相容 | 漸進採用 |
| 可插拔檢測 | ✅ 完全相容 | 預設行為不變 |
| ICU 支援 | ✅ 完全相容 | 可選功能 |
| 命名空間 | ⚠️ 需配置 | 提供遷移指南 |

## 成功標準

- [ ] 型別推斷覆蓋主要 API
- [ ] 複數形式支援主要語言
- [ ] 檢測器可自由組合
- [ ] 向後相容性 100%
- [ ] 文件完整更新
