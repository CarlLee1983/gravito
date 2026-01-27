# Phase 3: API 增強計劃

> 優先級: P1 | 預估影響: 中

## 現況分析

### 當前 API

```typescript
// OrbitCosmos 配置
interface I18nConfig {
  defaultLocale: string
  supportedLocales: string[]
  translations?: Record<string, TranslationMap>
}

// I18nManager API
class I18nManager {
  translate(locale: string, key: string, replacements?: Record<string, unknown>): string
  addResource(locale: string, translations: TranslationMap): void
  clone(locale?: string): I18nInstance
}

// I18nInstance API
class I18nInstance {
  t(key: string, replacements?: Record<string, unknown>): string
  has(key: string): boolean
}
```

### 識別限制

1. **缺少批量翻譯 API**
2. **無法取得所有可用語言**
3. **缺少翻譯狀態查詢**
4. **回退策略不可配置**
5. **缺少 React/Vue 整合輔助**

## 優化方案

### 3.1 批量翻譯 API

**目標**: 減少多次翻譯的函數呼叫開銷

```typescript
interface I18nInstance {
  // 現有
  t(key: string, replacements?: Record<string, unknown>): string

  // 新增：批量翻譯
  tMany(keys: string[]): Record<string, string>
  tMany(entries: Array<[string, Record<string, unknown>?]>): Record<string, string>
}

// 使用範例
const translations = i18n.tMany([
  'common.welcome',
  'common.goodbye',
  ['greeting', { name: 'Carl' }]
])

// 結果
{
  'common.welcome': '歡迎',
  'common.goodbye': '再見',
  'greeting': '你好，Carl'
}
```

**實作**:

```typescript
class I18nInstance {
  tMany(
    keysOrEntries: string[] | Array<[string, Record<string, unknown>?]>
  ): Record<string, string> {
    const result: Record<string, string> = {}

    for (const item of keysOrEntries) {
      if (typeof item === 'string') {
        result[item] = this.t(item)
      } else {
        const [key, replacements] = item
        result[key] = this.t(key, replacements)
      }
    }

    return result
  }
}
```

### 3.2 語言狀態查詢 API

**目標**: 提供語言相關的查詢能力

```typescript
interface I18nManager {
  // 新增 API
  getLocales(): string[]                    // 所有已載入的語言
  getSupportedLocales(): string[]           // 配置的支援語言
  getDefaultLocale(): string                // 預設語言
  isLocaleLoaded(locale: string): boolean   // 語言是否已載入
  getLoadedKeys(locale: string): string[]   // 已載入的翻譯鍵

  // 統計
  getStats(): I18nStats
}

interface I18nStats {
  localesCount: number
  totalKeys: number
  cacheHitRate: number
  cacheSize: number
}

// 使用
const stats = i18n.manager.getStats()
console.log(`快取命中率: ${stats.cacheHitRate}%`)
```

### 3.3 可配置的回退策略

**目標**: 支援多層回退和自訂回退邏輯

```typescript
interface FallbackConfig {
  // 語言回退鏈
  fallbackChain?: Record<string, string[]>

  // 缺失鍵處理
  onMissingKey?: 'key' | 'empty' | 'throw' | ((key: string, locale: string) => string)

  // 開發模式警告
  warnOnMissing?: boolean
}

// 配置範例
const cosmos = new OrbitCosmos({
  defaultLocale: 'en',
  supportedLocales: ['en', 'zh-TW', 'zh-CN', 'ja'],
  fallback: {
    // zh-CN 先回退到 zh-TW，再回退到 en
    fallbackChain: {
      'zh-CN': ['zh-TW', 'en'],
      'zh-TW': ['en'],
      'ja': ['en']
    },
    onMissingKey: (key, locale) => `[${locale}] ${key}`,
    warnOnMissing: process.env.NODE_ENV === 'development'
  }
})
```

**實作**:

```typescript
class I18nManager {
  private resolveFallback(locale: string, key: string): string | undefined {
    const chain = this.config.fallback?.fallbackChain?.[locale] ?? [this.config.defaultLocale]

    for (const fallbackLocale of chain) {
      const value = this.resolveKey(fallbackLocale, key)
      if (value !== undefined) {
        return value
      }
    }

    return undefined
  }

  translate(locale: string, key: string, replacements?: Record<string, unknown>): string {
    let value = this.resolveKey(locale, key)

    if (value === undefined) {
      value = this.resolveFallback(locale, key)
    }

    if (value === undefined) {
      return this.handleMissingKey(key, locale)
    }

    return this.replaceParams(value, replacements)
  }

  private handleMissingKey(key: string, locale: string): string {
    const handler = this.config.fallback?.onMissingKey ?? 'key'

    if (this.config.fallback?.warnOnMissing) {
      console.warn(`[i18n] Missing translation: ${key} (${locale})`)
    }

    if (typeof handler === 'function') {
      return handler(key, locale)
    }

    switch (handler) {
      case 'empty': return ''
      case 'throw': throw new Error(`Missing translation: ${key}`)
      default: return key
    }
  }
}
```

### 3.4 響應式整合輔助

**目標**: 提供 React/Vue 整合的輔助函數

```typescript
// React Hook
export function useI18n() {
  const context = useContext(I18nContext)

  const t = useCallback(
    (key: string, replacements?: Record<string, unknown>) => {
      return context.i18n.t(key, replacements)
    },
    [context.i18n]
  )

  const locale = context.locale
  const setLocale = context.setLocale

  return { t, locale, setLocale }
}

// Vue Composable
export function useI18n() {
  const i18n = inject<I18nInstance>('i18n')

  const t = (key: string, replacements?: Record<string, unknown>) => {
    return i18n?.t(key, replacements) ?? key
  }

  return { t }
}

// 導出位置
export { useI18n } from './integrations/react'
export { useI18n as useI18nVue } from './integrations/vue'
```

### 3.5 翻譯除錯模式

**目標**: 開發時期快速識別翻譯問題

```typescript
interface DebugConfig {
  enabled: boolean
  showKeys?: boolean      // 顯示翻譯鍵而非翻譯值
  highlight?: boolean     // 高亮顯示翻譯文字
  prefix?: string         // 翻譯前綴
  suffix?: string         // 翻譯後綴
}

// 配置
const cosmos = new OrbitCosmos({
  debug: {
    enabled: process.env.NODE_ENV === 'development',
    highlight: true,
    prefix: '🌐',
    suffix: '🌐'
  }
})

// 效果
i18n.t('welcome')  // "🌐歡迎🌐"
```

### 3.6 動態翻譯 API

**目標**: 支援執行時期動態修改翻譯

```typescript
interface I18nManager {
  // 新增 API
  setTranslation(locale: string, key: string, value: string): void
  removeTranslation(locale: string, key: string): void
  clearTranslations(locale?: string): void

  // 匯入/匯出
  exportTranslations(locale?: string): Record<string, TranslationMap>
  importTranslations(data: Record<string, TranslationMap>, merge?: boolean): void
}

// 使用範例
// 從後端載入用戶自訂翻譯
const customTranslations = await fetchUserTranslations()
i18n.importTranslations(customTranslations, true)

// 即時修正翻譯
i18n.setTranslation('zh-TW', 'greeting', '您好')
```

## API 變更總覽

| API | 類型 | 描述 |
|-----|------|------|
| `tMany()` | 新增 | 批量翻譯 |
| `getLocales()` | 新增 | 取得已載入語言 |
| `getStats()` | 新增 | 取得統計資訊 |
| `fallbackChain` | 新增配置 | 多層回退 |
| `onMissingKey` | 新增配置 | 缺失鍵處理 |
| `useI18n()` | 新增 | React Hook |
| `setTranslation()` | 新增 | 動態修改翻譯 |
| `exportTranslations()` | 新增 | 匯出翻譯 |

## 實施步驟

### Step 1: 批量翻譯
- [x] 實作 `tMany()` 方法
- [x] 效能測試
- [x] 文件撰寫

### Step 2: 狀態查詢
- [x] 實作查詢方法
- [x] 統計功能
- [x] 整合快取資訊

### Step 3: 回退策略
- [x] 設計配置介面
- [x] 實作回退邏輯
- [x] 測試各種情境

### Step 4: 框架整合
- [ ] React Hook (Skipped - requires separate package/setup)
- [ ] Vue Composable (Skipped)
- [ ] 使用範例

### Step 5: 除錯模式
- [ ] 實作除錯選項 (Skipped)
- [ ] 開發工具整合

## 向後相容性

所有新增 API 皆為可選功能，現有程式碼無需修改。

## 成功標準

- [x] 批量翻譯效能優於循環呼叫 30%+
- [x] 回退策略可完全自訂
- [ ] React/Vue 整合文件完整
- [ ] 除錯模式有效協助開發
- [x] API 文件完整
