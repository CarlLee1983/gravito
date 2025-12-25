# Orbit Inertia

> Gravito 的 Inertia.js 轉接器，可用 React/Vue 建立現代化單體應用。

## 安裝

```bash
bun add @gravito/ion
```

## 快速開始

```typescript
import { OrbitIon } from '@gravito/ion'
import { OrbitPrism } from '@gravito/prism'

const config = defineConfig({
  orbits: [OrbitPrism, OrbitIon],
})
```

```typescript
import { Context } from '@gravito/photon'
import { InertiaService } from '@gravito/ion'

export class HomeController {
  index = async (c: Context) => {
    const inertia = c.get('inertia') as InertiaService

    return inertia.render('Home', {
      user: 'Carl',
      stats: { visits: 100 }
    })
  }
}
```
