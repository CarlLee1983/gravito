# gravito-core

> Galaxy 架構的微核心，基於 Photon 與 Bun 的輕量可擴充框架核心。

## 安裝

```bash
bun add gravito-core
```

## 快速開始

```typescript
import { PlanetCore } from 'gravito-core'

const core = new PlanetCore({
  config: {
    PORT: 4000,
    DEBUG: true
  }
})

export default core.liftoff()
```
