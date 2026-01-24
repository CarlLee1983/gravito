# FileStore 穩定性強化

> 優先級：中
> 影響範圍：FileStore
> 預估工作量：2-3 天

---

## 問題描述

### 1. 缺少過期清理機制

FileStore 沒有主動清理過期檔案的機制，導致磁碟空間持續增長。

### 2. 錯誤處理不完整

檔案寫入失敗可能導致資料不一致。

### 3. 鎖檔案殭屍問題

程序意外終止時，鎖檔案可能成為殭屍。

---

## 優化方案

### 1. 過期清理守護程序

```typescript
class FileStore implements CacheStore {
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor(options: FileStoreOptions) {
    if (options.enableCleanup !== false) {
      this.startCleanupDaemon(options.cleanupInterval ?? 60_000)
    }
  }

  private startCleanupDaemon(interval: number): void {
    this.cleanupInterval = setInterval(async () => {
      await this.cleanExpiredFiles()
    }, interval)
    this.cleanupInterval.unref?.()
  }

  async cleanExpiredFiles(): Promise<number> {
    const files = await readdir(this.directory)
    let cleaned = 0

    for (const file of files) {
      if (file.endsWith('.lock')) continue
      try {
        const content = await Bun.file(join(this.directory, file)).json()
        if (isExpired(content.expiresAt)) {
          await unlink(join(this.directory, file))
          cleaned++
        }
      } catch { /* 忽略錯誤 */ }
    }
    return cleaned
  }
}
```

### 2. 原子寫入

```typescript
async put<T>(key: string, value: T, ttl?: CacheTtl): Promise<boolean> {
  const filePath = this.getFilePath(key)
  const tempPath = `${filePath}.tmp.${Date.now()}`

  try {
    await Bun.write(tempPath, JSON.stringify({ value, expiresAt: ttlToExpiresAt(ttl) }))
    await rename(tempPath, filePath)  // 原子操作
    return true
  } catch {
    await unlink(tempPath).catch(() => {})
    return false
  }
}
```

### 3. 鎖檔案殭屍處理

```typescript
interface LockFileContent {
  owner: string
  expiresAt: number
  pid: number
}

private async tryAcquireStale(): Promise<boolean> {
  const existing = await Bun.file(this.lockPath).json()

  // 檢查過期或程序是否存活
  if (existing.expiresAt < Date.now() || !this.isProcessAlive(existing.pid)) {
    await unlink(this.lockPath)
    return this.acquire()
  }
  return false
}

private isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}
```

---

## 配置選項擴展

```typescript
interface FileStoreOptions {
  directory: string
  enableCleanup?: boolean      // 預設: true
  cleanupInterval?: number     // 毫秒，預設: 60000
  maxFiles?: number            // 最大檔案數
  useSubdirectories?: boolean  // 子目錄結構
  lockStaleTimeout?: number    // 殭屍鎖超時
}
```

---

## 實作步驟

1. [x] 實作原子寫入（臨時檔案 + 重命名）
2. [x] 實作定時清理守護程序
3. [x] 實作基於檔案數量的 LRU 驅逐策略
4. [x] 改進鎖檔案格式和殭屍檢測 (PID 檢查)
5. [x] 可選：實作子目錄結構 (Hashed Directory)

---

## 實作總結 (已完成核心功能)

已強化 FileStore 的穩定性：
- **原子寫入**：確保在高並發或崩潰情況下，快取檔案不會損壞。
- **自動清理**：新增背景守護程序，定期掃描並清理過期的快取檔案。
- **穩定鎖機制**：檔案鎖支援 PID 偵測，能自動識別並回收已結束程序的殭屍鎖。
- **資源管理**：新增 `destroy()` 方法，用於釋放計時器資源。
