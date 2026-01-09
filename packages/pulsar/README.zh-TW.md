# Orbit Session

> Gravito 的 Session 與 CSRF 保護模組，風格類似 Laravel。

## 安裝

```bash
bun add @gravito/pulsar
```

## 快速開始

```ts
import { PlanetCore, defineConfig } from '@gravito/core'
import { OrbitCache } from '@gravito/stasis'
import { OrbitPulsar } from '@gravito/pulsar'

const config = defineConfig({
  config: {
    session: {
      driver: 'cache',
      cookie: { name: 'gravito_session' },
      idleTimeoutSeconds: 60 * 30,
      absoluteTimeoutSeconds: 60 * 60 * 24 * 7,
      touchIntervalSeconds: 60,
    },
  },
  orbits: [OrbitCache, new OrbitPulsar()],
})

const core = await PlanetCore.boot(config)
export default core.liftoff()
```
