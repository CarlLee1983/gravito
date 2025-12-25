# @gravito/mass

> Gravito 的 TypeBox 驗證模組，提供高效能且完整的 TypeScript 支援。

## 安裝

```bash
bun add @gravito/mass
```

## 快速開始

```typescript
import { Photon } from '@gravito/photon'
import { Schema, validate } from '@gravito/mass'

const app = new Photon()

app.post('/login',
  validate('json', Schema.Object({
    username: Schema.String(),
    password: Schema.String()
  })),
  (c) => {
    const { username } = c.req.valid('json')
    return c.json({ success: true, message: `Welcome ${username}` })
  }
)
```
