# Phase 4：測試與文件完善

> 狀態：📋 規劃中
> 優先級：高
> 預估工作量：中等
> 前置條件：Phase 1 完成

## 目標

提升測試覆蓋率至 80% 以上，完善文件與範例程式。

## 4.1 測試覆蓋率提升

### 現況分析

目前測試檔案：
- `BullMQProbe.test.ts`
- `BullMQBridge.test.ts`
- `CommandListener.test.ts`
- `DeleteJobExecutor.test.ts`
- `RetryJobExecutor.test.ts`
- `BeeQueueProbe.test.ts`

缺少的測試：
- `QuasarAgent` 整合測試
- `NodeProbe` 單元測試
- `LaravelProbe`、`BullProbe`、`RedisListProbe` 測試
- `BeeQueueBridge` 測試
- 端對端測試

### 改進項目

#### 4.1.1 QuasarAgent 測試

- [ ] 建構與配置測試
- [ ] 生命週期測試（start/stop）
- [ ] 佇列監控註冊測試
- [ ] Bridge 附加測試
- [ ] 遠端控制啟用測試

```typescript
// __tests__/QuasarAgent.test.ts
describe('QuasarAgent', () => {
  describe('constructor', () => {
    it('should use default redis url when not provided', () => {})
    it('should use provided transport client', () => {})
    it('should setup monitor redis when provided', () => {})
  })

  describe('start/stop', () => {
    it('should connect to redis on start', async () => {})
    it('should start heartbeat timer', async () => {})
    it('should cleanup on stop', async () => {})
  })

  describe('monitorQueue', () => {
    it('should register bullmq probe', () => {})
    it('should register laravel probe', () => {})
    it('should warn when monitor not configured', () => {})
  })

  describe('attachBridge', () => {
    it('should attach bullmq bridge to worker', () => {})
    it('should attach bee-queue bridge to queue', () => {})
  })

  describe('enableRemoteControl', () => {
    it('should fail before start', async () => {})
    it('should setup command listener', async () => {})
  })
})
```

#### 4.1.2 Probe 測試補全

- [ ] NodeProbe 單元測試
- [ ] LaravelProbe 測試
- [ ] BullProbe 測試
- [ ] RedisListProbe 測試

```typescript
// __tests__/NodeProbe.test.ts
describe('NodeProbe', () => {
  it('should return valid system metrics', () => {
    const probe = new NodeProbe()
    const metrics = probe.getMetrics()

    expect(metrics.cpu.system).toBeGreaterThanOrEqual(0)
    expect(metrics.cpu.system).toBeLessThanOrEqual(100)
    expect(metrics.memory.system.total).toBeGreaterThan(0)
    expect(metrics.pid).toBe(process.pid)
  })

  it('should detect runtime correctly', () => {
    const probe = new NodeProbe()
    const metrics = probe.getMetrics()

    expect(['node', 'bun', 'deno']).toContain(metrics.language)
  })

  it('should calculate cpu delta correctly', () => {
    const probe = new NodeProbe()
    probe.getMetrics() // 第一次呼叫初始化

    // 模擬一些 CPU 活動
    const start = Date.now()
    while (Date.now() - start < 100) {
      Math.random() * Math.random()
    }

    const metrics = probe.getMetrics()
    expect(metrics.cpu.process).toBeGreaterThan(0)
  })
})
```

#### 4.1.3 整合測試

- [ ] 完整流程測試（Agent → Probe → Redis）
- [ ] Bridge 事件流測試
- [ ] 遠端控制命令執行測試

```typescript
// __tests__/integration/full-flow.test.ts
describe('Integration: Full Monitoring Flow', () => {
  let agent: QuasarAgent
  let redis: Redis

  beforeEach(async () => {
    redis = new Redis('redis://localhost:6379')
    agent = new QuasarAgent({
      service: 'test-service',
      transport: { client: redis },
      monitor: { client: redis },
    })
  })

  it('should publish heartbeat to redis', async () => {
    await agent.start()

    // 等待心跳
    await new Promise(resolve => setTimeout(resolve, 100))

    const keys = await redis.keys('gravito:quasar:node:test-service:*')
    expect(keys.length).toBeGreaterThan(0)

    await agent.stop()
  })

  it('should include queue metrics in heartbeat', async () => {
    agent.monitorQueue('test-queue', 'bullmq')
    await agent.start()

    await new Promise(resolve => setTimeout(resolve, 100))

    const keys = await redis.keys('gravito:quasar:node:test-service:*')
    const data = await redis.get(keys[0])
    const payload = JSON.parse(data!)

    expect(payload.queues).toBeDefined()
    expect(payload.queues[0].name).toBe('test-queue')

    await agent.stop()
  })
})
```

### 預期效益

- 測試覆蓋率達 80% 以上
- 降低迴歸風險
- 提升程式碼信心度

---

## 4.2 測試基礎設施改進

### 現況分析

目前使用 Bun test，但缺乏：
- Mock Redis 的標準化
- 測試工具函式庫
- CI 整合配置

### 改進項目

- [ ] 建立 `__tests__/helpers/` 目錄
- [ ] 實作 `createMockRedis()` 工廠函式
- [ ] 實作 `createMockWorker()` 工廠函式
- [ ] 新增 `vitest.config.ts` 配置

```typescript
// __tests__/helpers/mocks.ts
import { EventEmitter } from 'events'

export function createMockRedis() {
  const store = new Map<string, string>()
  const lists = new Map<string, string[]>()

  return {
    status: 'ready',
    async connect() {},
    async quit() {},
    async set(key: string, value: string) {
      store.set(key, value)
      return 'OK'
    },
    async get(key: string) {
      return store.get(key) || null
    },
    async lpush(key: string, value: string) {
      const list = lists.get(key) || []
      list.unshift(value)
      lists.set(key, list)
      return list.length
    },
    async ltrim(key: string, start: number, stop: number) {
      const list = lists.get(key) || []
      lists.set(key, list.slice(start, stop + 1))
      return 'OK'
    },
    async publish(channel: string, message: string) {
      return 0
    },
    pipeline() {
      const commands: Array<{ cmd: string; args: any[] }> = []
      const pipeline = {
        llen: (key: string) => { commands.push({ cmd: 'llen', args: [key] }); return pipeline },
        zcard: (key: string) => { commands.push({ cmd: 'zcard', args: [key] }); return pipeline },
        scard: (key: string) => { commands.push({ cmd: 'scard', args: [key] }); return pipeline },
        lpush: (key: string, value: string) => { commands.push({ cmd: 'lpush', args: [key, value] }); return pipeline },
        ltrim: (key: string, start: number, stop: number) => { commands.push({ cmd: 'ltrim', args: [key, start, stop] }); return pipeline },
        async exec() {
          return commands.map(({ cmd }) => [null, cmd === 'llen' ? 0 : cmd === 'zcard' ? 0 : cmd === 'scard' ? 0 : 'OK'])
        }
      }
      return pipeline
    }
  }
}

export function createMockWorker(queueName = 'test-queue') {
  const emitter = new EventEmitter()
  return {
    name: queueName,
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    emit: emitter.emit.bind(emitter),
  }
}
```

### 預期效益

- 簡化測試撰寫
- 統一 Mock 行為
- 提升測試可維護性

---

## 4.3 文件更新

### 現況分析

目前文件：
- `README.md` - 基本使用說明
- `BRIDGES.md` - Bridge 說明（如果存在）
- `CHANGELOG.md` - 變更記錄

### 改進項目

- [ ] 更新 README 架構圖
- [ ] 新增進階使用指南
- [ ] 新增故障排除指南
- [ ] 新增 API 參考文件
- [ ] 新增貢獻指南

#### 4.3.1 進階使用指南

```markdown
# docs/advanced-usage.md

## 自訂 Probe

如何實作自訂的 Probe 來監控自定義資料源...

## 自訂 Bridge

如何實作自訂的 Bridge 來追蹤自定義事件...

## 多服務監控

如何在微服務架構中部署多個 Quasar Agent...

## 高可用性配置

如何配置 Redis Sentinel 或 Cluster...
```

#### 4.3.2 故障排除指南

```markdown
# docs/troubleshooting.md

## 常見問題

### Agent 無法連線到 Redis

檢查項目：
1. Redis URL 是否正確
2. 網路連線是否正常
3. Redis 伺服器是否啟動

### 佇列指標顯示為 0

可能原因：
1. 佇列名稱不正確
2. Redis prefix 不匹配
3. Monitor Redis 配置錯誤
```

#### 4.3.3 API 參考文件

- [ ] 使用 TypeDoc 生成 API 文件
- [ ] 新增 `typedoc.json` 配置
- [ ] 設置 CI 自動生成文件

```json
// typedoc.json
{
  "entryPoints": ["src/index.ts"],
  "out": "docs/api",
  "plugin": ["typedoc-plugin-markdown"],
  "readme": "none"
}
```

### 預期效益

- 降低使用者學習成本
- 減少重複性問題詢問
- 提升專案專業度

---

## 4.4 範例程式

### 現況分析

目前 README 中有基本範例，但缺乏：
- 完整的專案範例
- 不同框架整合範例
- Docker Compose 範例

### 改進項目

- [ ] 建立 `examples/` 目錄
- [ ] 新增 BullMQ 完整範例
- [ ] 新增 Express + Quasar 範例
- [ ] 新增 NestJS 整合範例
- [ ] 新增 Docker Compose 範例

```
examples/
├── basic-monitoring/
│   ├── package.json
│   ├── src/
│   │   └── index.ts
│   └── README.md
├── bullmq-worker/
│   ├── package.json
│   ├── src/
│   │   ├── worker.ts
│   │   └── producer.ts
│   └── README.md
├── express-integration/
│   ├── package.json
│   ├── src/
│   │   ├── app.ts
│   │   ├── jobs/
│   │   └── quasar.ts
│   └── README.md
├── nestjs-integration/
│   ├── package.json
│   ├── src/
│   │   ├── app.module.ts
│   │   └── quasar.module.ts
│   └── README.md
└── docker-compose/
    ├── docker-compose.yml
    ├── app/
    │   └── Dockerfile
    └── README.md
```

#### 4.4.1 基本監控範例

```typescript
// examples/basic-monitoring/src/index.ts
import { QuasarAgent } from '@gravito/quasar'

const agent = new QuasarAgent({
  service: 'basic-example',
  transport: { url: process.env.ZENITH_REDIS_URL || 'redis://localhost:6379' },
})

async function main() {
  await agent.start()
  console.log('Quasar agent is running...')
  console.log('Press Ctrl+C to stop')

  process.on('SIGINT', async () => {
    await agent.stop()
    process.exit(0)
  })
}

main().catch(console.error)
```

#### 4.4.2 Docker Compose 範例

```yaml
# examples/docker-compose/docker-compose.yml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

  worker:
    build: ./app
    environment:
      - ZENITH_REDIS_URL=redis://redis:6379
      - QUEUE_REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  zenith:
    image: gravito/zenith:latest
    ports:
      - '3000:3000'
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
```

### 預期效益

- 加速使用者上手
- 提供最佳實踐參考
- 減少整合錯誤

---

## 4.5 CI/CD 改進

### 現況分析

目前 CI 配置：
- 基本測試執行
- 覆蓋率報告

### 改進項目

- [ ] 新增多 Node.js 版本測試
- [ ] 新增 Bun 版本測試
- [ ] 整合 CodeCov 覆蓋率報告
- [ ] 新增文件自動生成

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]

    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install
        working-directory: packages/quasar

      - name: Run tests
        run: bun test:coverage
        working-directory: packages/quasar

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: packages/quasar/coverage/lcov.info
```

### 預期效益

- 確保跨環境相容性
- 自動化品質檢查
- 提升發布信心

---

## 驗收標準

- [ ] 測試覆蓋率達 80% 以上
- [ ] 所有公開 API 具備 JSDoc 註解
- [ ] API 參考文件自動生成
- [ ] 至少 3 個完整範例專案
- [ ] CI 通過所有目標環境測試
- [ ] 故障排除指南涵蓋常見問題

## 相依性

- Phase 1 完成（錯誤處理改進後測試更完整）

## 風險評估

| 風險項目 | 等級 | 緩解措施 |
|---------|------|---------|
| 整合測試需要真實 Redis | 低 | 使用 Docker 或 Mock |
| 範例維護成本 | 中 | 設置 CI 驗證範例可執行 |
| 文件與程式碼不同步 | 中 | 使用 TypeDoc 自動生成 |
