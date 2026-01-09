# @gravito/prism (Orbit View)

> Gravito 的視圖 Orbit，提供伺服器端模板與圖片最佳化。

## 安裝

```bash
bun add @gravito/prism
```

## 快速開始

```typescript
import { defineConfig, PlanetCore } from '@gravito/core'
import { OrbitPrism } from '@gravito/prism'

const config = defineConfig({
  config: {
    VIEW_DIR: 'src/views',
  },
  orbits: [OrbitPrism],
})

const core = await PlanetCore.boot(config)
```

```typescript
export class HomeController {
  index = async (c: Context) => {
    const view = c.get('view')

    return c.html(
      view.render('home', {
        title: 'Welcome',
        visitors: 1000,
        version: '1.0.0'
      })
    )
  }
}
```
