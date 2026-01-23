# Phase 1: 效能優化計劃

> 優先級: P0 | 預估影響: 高

## 現況分析

### 當前瓶頸

1. **翻譯查找無快取**
   - 每次 `translate()` 都重新遍歷嵌套鍵
   - 點號分割 (`key.split('.')`) 在熱路徑重複執行

2. **參數替換效率**
   - 正則表達式每次重新編譯
   - 多次字串替換操作

3. **檔案加載同步阻塞**
   - `loadTranslations()` 同步讀取所有檔案
   - 大型翻譯檔案影響啟動時間

## 優化方案

### 1.1 翻譯查找快取

**目標**: 將重複查找的翻譯結果快取

```typescript
// 現況
translate(locale: string, key: string) {
  const keys = key.split('.')
  let value = this.translations[locale]
  for (const k of keys) {
    value = value?.[k]
  }
  return value
}

// 優化後
private cache = new Map<string, string>()

translate(locale: string, key: string) {
  const cacheKey = `${locale}:${key}`

  if (this.cache.has(cacheKey)) {
    return this.cache.get(cacheKey)
  }

  const result = this.resolveKey(locale, key)
  this.cache.set(cacheKey, result)
  return result
}
```

**評估指標**:
- [ ] 快取命中率 > 80%
- [ ] 熱路徑查找時間減少 50%+

### 1.2 預編譯正則表達式

**目標**: 避免重複編譯正則

```typescript
// 現況 - 每次呼叫都編譯
for (const [param, val] of Object.entries(replacements)) {
  result = result.replace(new RegExp(`:${param}`, 'g'), String(val))
}

// 優化後 - 預編譯快取
private regexCache = new Map<string, RegExp>()

private getParamRegex(param: string): RegExp {
  if (!this.regexCache.has(param)) {
    this.regexCache.set(param, new RegExp(`:${param}`, 'g'))
  }
  return this.regexCache.get(param)!
}
```

### 1.3 懶加載翻譯資源

**目標**: 按需加載語言包，減少初始載入時間

```typescript
interface LazyLoadConfig {
  baseDir: string
  preload?: string[]  // 預載入的語言
}

class I18nManager {
  private loadedLocales = new Set<string>()

  async ensureLocale(locale: string): Promise<void> {
    if (this.loadedLocales.has(locale)) return

    const translations = await this.loadLocale(locale)
    this.addResource(locale, translations)
    this.loadedLocales.add(locale)
  }

  private async loadLocale(locale: string): Promise<TranslationMap> {
    const path = `${this.config.baseDir}/${locale}.json`
    return Bun.file(path).json()
  }
}
```

**評估指標**:
- [ ] 初始載入時間減少 40%+
- [ ] 記憶體佔用按需增長

### 1.4 快取失效策略

**目標**: 確保快取正確性

```typescript
class I18nManager {
  addResource(locale: string, translations: TranslationMap) {
    this.translations[locale] = {
      ...this.translations[locale],
      ...translations
    }
    this.invalidateCache(locale)
  }

  private invalidateCache(locale?: string) {
    if (locale) {
      // 精確失效
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${locale}:`)) {
          this.cache.delete(key)
        }
      }
    } else {
      // 全部失效
      this.cache.clear()
    }
  }
}
```

## 實施步驟

### Step 1: 基準測試建立
```bash
# 建立效能測試套件
bun test:perf
```

- [x] 建立翻譯查找基準測試
- [x] 建立參數替換基準測試
- [x] 建立檔案加載基準測試

### Step 2: 實施快取機制
- [x] 實作 `TranslationCache` 類別 (Implemented as Map in I18nManager)
- [x] 整合至 `I18nManager`
- [x] 單元測試覆蓋

### Step 3: 正則預編譯
- [x] 實作 `RegexCache` (Implemented as constant REPLACEMENT_REGEX)
- [x] 替換現有實作
- [x] 效能驗證

### Step 4: 懶加載機制
- [x] 設計 `LazyLoadConfig` 介面
- [x] 實作 `ensureLocale()` 方法
- [x] 整合至中間件

### Step 5: 效能驗證
- [x] 執行基準測試比對
- [x] 記憶體使用分析
- [x] 真實場景壓測

## 風險評估

| 風險 | 機率 | 影響 | 緩解措施 |
|------|------|------|----------|
| 快取記憶體爆增 | 中 | 中 | 設定快取上限，使用 LRU |
| 快取失效遺漏 | 低 | 高 | 完善單元測試 |
| 懶加載競態條件 | 中 | 中 | 使用 Promise 鎖 |

## 成功標準

- [x] 翻譯查找效能提升 50%+
- [x] 初始載入時間減少 40%+
- [x] 無記憶體洩漏
- [x] 所有現有測試通過
- [x] 新增效能測試套件
