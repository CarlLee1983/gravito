# @gravito/cosmos

> Gravito 的輕量 i18n 模組，提供 JSON 檔案式在地化。

## 安裝

```bash
bun add @gravito/cosmos
```

## 快速開始

```typescript
import { PlanetCore } from '@gravito/core'
import { OrbitI18n } from '@gravito/cosmos'

const core = new PlanetCore()

core.boot({
  orbits: [OrbitI18n],
  config: {
    i18n: {
      defaultLocale: 'en',
      fallbackLocale: 'en',
      path: './lang'
    }
  }
})
```

建立 `./lang/en.json`:

```json
{
  "welcome": "Welcome, {name}!"
}
```

在路由中使用：

```typescript
app.get('/', (c) => {
  const t = c.get('t')
  return c.text(t('welcome', { name: 'Carl' }))
})
```
