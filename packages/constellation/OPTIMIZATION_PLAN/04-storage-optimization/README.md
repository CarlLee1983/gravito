# Phase 4: 存儲層優化

> **依賴**: 無  
> **優先級**: 🟡 中  
> **預估時間**: 1-2 天  
> **狀態**: ⚠️ **建議併入 Phase 3**

[← 返回總覽](../README.md)

---

## ⚠️ 可行性評估校正

**原問題描述**:
> "`read()` 方法讀取整個文件到記憶體"

**實際情況分析**:

```typescript
// src/storage/S3SitemapStorage.ts:105-134
async read(filename: string): Promise<string | null> {
  // ...
  // 將 stream 轉換為 string
  const chunks: Uint8Array[] = []
  for await (const chunk of response.Body as any) {  // ← 已經是 chunk 讀取
    chunks.push(chunk)
  }
  const buffer = Buffer.concat(chunks)
  return buffer.toString('utf-8')
}
```

**校正結論**:
- ✅ S3 讀取**已經是 chunk 方式**
- ⚠️ 問題是最後合併成字串，內存峰值仍然存在
- 💡 優化方向：提供**流式解析接口**，與 Phase 3 的 SitemapParser 配合

---

## 建議：併入 Phase 3

此階段的優化目標與 Phase 3 高度重疊：

| 原 Phase 4 任務 | 併入 Phase 3 的位置 |
|----------------|-------------------|
| 流式讀取接口 | 子任務 3.1 SitemapParser 的輸入源 |
| 減少內存使用 | SitemapParser 逐步解析而非全量載入 |

---

## 如仍需獨立實施

如果決定獨立實施，優化方案：

```typescript
// 新增流式讀取接口
interface SitemapStorage {
  // 現有方法
  read(filename: string): Promise<string | null>
  
  // 新增：流式讀取
  readStream?(filename: string): Promise<ReadableStream<Uint8Array> | null>
}

// S3 實現
async readStream(filename: string): Promise<ReadableStream<Uint8Array> | null> {
  const response = await s3.client.send(
    new s3.GetObjectCommand({
      Bucket: this.bucket,
      Key: this.getKey(filename),
    })
  )
  return response.Body as ReadableStream<Uint8Array>
}
```

---

## 驗證清單

- [ ] **決定**：獨立實施或併入 Phase 3
- [ ] 如獨立實施：流式讀取接口設計
- [ ] 如併入 Phase 3：確保 SitemapParser 支援流式輸入
- [ ] 性能測試顯示預期提升
- [ ] 所有現有測試通過

---

## 下一步

- **建議**：將此階段併入 Phase 3，作為 SitemapParser 的基礎設施
- 如獨立實施，完成後繼續其他優化階段
