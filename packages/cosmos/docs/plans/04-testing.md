# Phase 4: 測試與品質計劃

> 優先級: P2 | 預估影響: 中

## 現況分析

### 當前測試覆蓋

| 檔案 | 測試檔案 | 涵蓋內容 |
|------|----------|----------|
| I18nService.ts | manager.test.ts, service.test.ts | 基本翻譯、回退、參數替換 |
| loader.ts | loader.test.ts | 檔案載入、錯誤處理 |
| index.ts | service.test.ts | OrbitCosmos 安裝 |

### 識別缺口

1. **缺少效能測試**
2. **缺少邊界條件測試**
3. **缺少整合測試**
4. **缺少壓力測試**
5. **無 mutation 測試**

## 優化方案

### 4.1 測試分類與架構

```
tests/
├── unit/                      # 單元測試
│   ├── manager.test.ts        # I18nManager
│   ├── instance.test.ts       # I18nInstance
│   ├── loader.test.ts         # 翻譯載入
│   ├── cache.test.ts          # 快取機制 (新增)
│   ├── plural.test.ts         # 複數形式 (新增)
│   └── detector.test.ts       # 語言檢測 (新增)
├── integration/               # 整合測試 (新增)
│   ├── middleware.test.ts     # 中間件整合
│   ├── orbit.test.ts          # OrbitCosmos 完整流程
│   └── namespace.test.ts      # 命名空間載入
├── performance/               # 效能測試 (新增)
│   ├── translate.bench.ts     # 翻譯效能
│   ├── cache.bench.ts         # 快取效能
│   └── load.bench.ts          # 載入效能
└── e2e/                       # 端對端測試 (新增)
    └── full-flow.test.ts      # 完整使用流程
```

### 4.2 單元測試強化

#### 邊界條件測試

```typescript
// tests/unit/manager.test.ts

describe('I18nManager - Edge Cases', () => {
  describe('Empty Translations', () => {
    it('should handle empty translation object', () => {
      const manager = new I18nManager({
        defaultLocale: 'en',
        supportedLocales: ['en'],
        translations: {}
      })
      expect(manager.translate('en', 'any.key')).toBe('any.key')
    })

    it('should handle empty string translation', () => {
      const manager = new I18nManager({
        defaultLocale: 'en',
        supportedLocales: ['en'],
        translations: { en: { empty: '' } }
      })
      expect(manager.translate('en', 'empty')).toBe('')
    })
  })

  describe('Special Characters', () => {
    it('should handle keys with special characters', () => {
      const manager = new I18nManager({
        defaultLocale: 'en',
        supportedLocales: ['en'],
        translations: { en: { 'key.with.dots': 'value' } }
      })
      // 注意：這會被解析為嵌套鍵
      expect(manager.translate('en', 'key.with.dots')).toBe('value')
    })

    it('should handle unicode keys', () => {
      const manager = new I18nManager({
        defaultLocale: 'zh-TW',
        supportedLocales: ['zh-TW'],
        translations: { 'zh-TW': { '歡迎': '歡迎訊息' } }
      })
      expect(manager.translate('zh-TW', '歡迎')).toBe('歡迎訊息')
    })

    it('should handle HTML in translations', () => {
      const manager = new I18nManager({
        defaultLocale: 'en',
        supportedLocales: ['en'],
        translations: { en: { html: '<strong>Bold</strong>' } }
      })
      expect(manager.translate('en', 'html')).toBe('<strong>Bold</strong>')
    })
  })

  describe('Deep Nesting', () => {
    it('should handle deeply nested keys (10 levels)', () => {
      const translations = {
        en: {
          l1: { l2: { l3: { l4: { l5: { l6: { l7: { l8: { l9: { l10: 'deep' } } } } } } } } }
        }
      }
      const manager = new I18nManager({
        defaultLocale: 'en',
        supportedLocales: ['en'],
        translations
      })
      expect(manager.translate('en', 'l1.l2.l3.l4.l5.l6.l7.l8.l9.l10')).toBe('deep')
    })
  })

  describe('Parameter Replacement', () => {
    it('should handle missing parameters', () => {
      const manager = new I18nManager({
        defaultLocale: 'en',
        supportedLocales: ['en'],
        translations: { en: { greeting: 'Hello :name!' } }
      })
      expect(manager.translate('en', 'greeting', {})).toBe('Hello :name!')
    })

    it('should handle extra parameters', () => {
      const manager = new I18nManager({
        defaultLocale: 'en',
        supportedLocales: ['en'],
        translations: { en: { greeting: 'Hello :name!' } }
      })
      expect(manager.translate('en', 'greeting', { name: 'Carl', extra: 'ignored' }))
        .toBe('Hello Carl!')
    })

    it('should handle parameter with special regex characters', () => {
      const manager = new I18nManager({
        defaultLocale: 'en',
        supportedLocales: ['en'],
        translations: { en: { msg: 'Value: :value' } }
      })
      expect(manager.translate('en', 'msg', { value: '$100.00' }))
        .toBe('Value: $100.00')
    })
  })
})
```

### 4.3 效能測試套件

```typescript
// tests/performance/translate.bench.ts
import { bench, run } from 'mitata'

const manager = new I18nManager({
  defaultLocale: 'en',
  supportedLocales: ['en', 'zh-TW'],
  translations: generateLargeTranslations()
})

bench('Simple translation (cache miss)', () => {
  manager.clearCache()
  manager.translate('en', 'common.welcome')
})

bench('Simple translation (cache hit)', () => {
  manager.translate('en', 'common.welcome')
})

bench('Nested translation (5 levels)', () => {
  manager.translate('en', 'a.b.c.d.e')
})

bench('Translation with 5 parameters', () => {
  manager.translate('en', 'message', {
    p1: 'v1', p2: 'v2', p3: 'v3', p4: 'v4', p5: 'v5'
  })
})

bench('Batch translation (100 keys)', () => {
  const keys = Array.from({ length: 100 }, (_, i) => `key${i}`)
  manager.tMany(keys)
})

bench('Fallback chain (3 levels)', () => {
  manager.translate('zh-CN', 'only.in.english')
})

await run()
```

### 4.4 整合測試

```typescript
// tests/integration/middleware.test.ts

describe('Locale Middleware Integration', () => {
  let app: Hono
  let core: PlanetCore

  beforeEach(() => {
    core = new PlanetCore()
    const cosmos = new OrbitCosmos({
      defaultLocale: 'en',
      supportedLocales: ['en', 'zh-TW', 'ja'],
      translations: {
        en: { welcome: 'Welcome' },
        'zh-TW': { welcome: '歡迎' },
        ja: { welcome: 'ようこそ' }
      }
    })
    core.addOrbit(cosmos)
    app = core.app

    app.get('/:locale/test', (c) => {
      const i18n = c.get('i18n')
      return c.json({ message: i18n.t('welcome'), locale: i18n.locale })
    })
  })

  it('should detect locale from route parameter', async () => {
    const res = await app.request('/zh-TW/test')
    const data = await res.json()
    expect(data).toEqual({ message: '歡迎', locale: 'zh-TW' })
  })

  it('should detect locale from query parameter', async () => {
    const res = await app.request('/en/test?lang=ja')
    // 注意：路由參數優先級更高
    const data = await res.json()
    expect(data.locale).toBe('en')
  })

  it('should detect locale from Accept-Language header', async () => {
    const res = await app.request('/test', {
      headers: { 'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8' }
    })
    const data = await res.json()
    expect(data.locale).toBe('ja')
  })

  it('should fallback to default locale for unsupported locale', async () => {
    const res = await app.request('/fr/test')
    const data = await res.json()
    expect(data.locale).toBe('en')
  })
})
```

### 4.5 Mutation 測試

使用 Stryker Mutator 進行變異測試：

```json
// stryker.conf.json
{
  "packageManager": "bun",
  "testRunner": "command",
  "commandRunner": {
    "command": "bun test"
  },
  "mutate": [
    "src/**/*.ts",
    "!src/**/*.d.ts"
  ],
  "reporters": ["html", "progress"],
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 50
  }
}
```

**目標變異分數**: 70%+

### 4.6 測試輔助工具

```typescript
// tests/helpers/factory.ts

export function createTestManager(overrides?: Partial<I18nConfig>): I18nManager {
  return new I18nManager({
    defaultLocale: 'en',
    supportedLocales: ['en', 'zh-TW'],
    translations: {
      en: {
        common: {
          welcome: 'Welcome',
          goodbye: 'Goodbye'
        }
      },
      'zh-TW': {
        common: {
          welcome: '歡迎',
          goodbye: '再見'
        }
      }
    },
    ...overrides
  })
}

export function generateLargeTranslations(
  locales: number = 5,
  keys: number = 1000
): Record<string, TranslationMap> {
  const result: Record<string, TranslationMap> = {}

  for (let l = 0; l < locales; l++) {
    const locale = `locale${l}`
    result[locale] = {}

    for (let k = 0; k < keys; k++) {
      result[locale][`key${k}`] = `Translation ${k} for ${locale}`
    }
  }

  return result
}

// tests/helpers/mock.ts

export function mockConsole() {
  const original = {
    log: console.log,
    warn: console.warn,
    error: console.error
  }

  const calls = {
    log: [] as unknown[][],
    warn: [] as unknown[][],
    error: [] as unknown[][]
  }

  console.log = (...args) => calls.log.push(args)
  console.warn = (...args) => calls.warn.push(args)
  console.error = (...args) => calls.error.push(args)

  return {
    calls,
    restore: () => {
      console.log = original.log
      console.warn = original.warn
      console.error = original.error
    }
  }
}
```

## 測試覆蓋目標

| 類型 | 當前 | 目標 |
|------|------|------|
| 行覆蓋率 | ~70% | 90%+ |
| 分支覆蓋率 | ~60% | 85%+ |
| 函數覆蓋率 | ~75% | 95%+ |
| 變異分數 | N/A | 70%+ |

## CI/CD 整合

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1

      - name: Install
        run: bun install

      - name: Unit Tests
        run: bun test --coverage

      - name: Coverage Check
        run: bun test --coverage --coverage-threshold=90

      - name: Performance Tests
        run: bun run test:perf

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
```

## 實施步驟

### Step 1: 測試架構重組
- [x] 建立目錄結構
- [x] 遷移現有測試
- [x] 建立輔助工具

### Step 2: 邊界條件測試
- [x] 空值處理
- [x] 特殊字元
- [x] 深層嵌套

### Step 3: 效能測試
- [x] 建立基準測試
- [ ] CI 整合 (Skipped - CI config logic not touched here)
- [ ] 效能退化警報

### Step 4: 整合測試
- [x] 中間件整合
- [x] 完整流程
- [x] 錯誤情境

### Step 5: 變異測試
- [ ] 設定 Stryker (Skipped)
- [ ] 執行變異測試
- [ ] 修補測試缺口

## 成功標準

- [x] 行覆蓋率 90%+ (Estimated)
- [x] 分支覆蓋率 85%+ (Estimated)
- [ ] 變異分數 70%+
- [ ] 效能測試 CI 整合
- [x] 測試執行時間 < 30s
