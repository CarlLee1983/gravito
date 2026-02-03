---
title: 任務排程 (Horizon)
description: 了解如何使用 Gravito Horizon 安排週期性任務。
---

# 任務排程 (Horizon)

> `@gravito/horizon` 是一個分散式任務排程器，靈感來自 Laravel Schedule，支援 Cron 語法與分散式鎖定。

## 定義任務

在您的服務提供者或設定檔中定義排程任務。

```typescript
import { OrbitHorizon } from '@gravito/horizon'

export default {
  orbits: [
    OrbitHorizon.configure({
      schedule: (s) => {
        // 每分鐘執行一次
        s.command('cache:clear').everyMinute()
        
        // 每天凌晨 1 點執行
        s.job(new BackupDatabase()).dailyAt('01:00')
        
        // 使用 Cron 語法
        s.call(() => console.log('Ping!')).cron('*/5 * * * *')
      }
    })
  ]
}
```

## 分散式鎖定 (Distributed Locking)

如果您運行多個節點，Horizon 會自動使用 Redis 進行鎖定，確保同一個任務不會在多個伺服器上重複執行。

```typescript
s.job(new MonthlyReport()).monthly().onOneServer()
```

## 執行排程器

在生產環境中，您需要啟動排程器進程：

```bash
bun run gravito schedule:work
```

---

## 下一步
了解如何使用 [佇列系統](./queues.md) 處理非同步任務。
