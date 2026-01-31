# Dark Matter 範例專案

這個目錄包含 Dark Matter 的範例程式碼，展示如何使用各種功能。

## 範例列表

### v1.1.0-features.ts

完整展示 Dark Matter v1.1.0 的所有新功能：

- **Soft Deletes（軟刪除）** - 自動過濾、恢復與永久刪除
- **Schema Builder API** - 型別安全的 Schema 定義
- **GridFS 串流** - 大檔案上傳下載與進度追蹤
- **效能優化** - 索引、投影、批次操作、Aggregation Pipeline

## 執行範例

### 前置要求

1. 安裝 Bun：
```bash
curl -fsSL https://bun.sh/install | bash
```

2. 啟動 MongoDB：
```bash
# 使用 Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# 或使用本地 MongoDB
mongod
```

### 執行

```bash
# 設定 MongoDB URI（可選）
export MONGODB_URI="mongodb://localhost:27017"

# 執行範例
bun run examples/v1.1.0-features.ts
```

## 範例輸出

執行範例後，你會看到：

1. **Soft Deletes 範例**
   - 插入 3 個使用者
   - 軟刪除 Bob
   - 查詢活躍使用者（自動排除已刪除）
   - 包含已刪除記錄的查詢
   - 恢復 Bob
   - 永久刪除 Charlie

2. **Schema Builder 範例**
   - 建立使用者 Schema
   - 建立帶有驗證的 Collection
   - 插入符合 Schema 的文檔
   - 嘗試插入不符合 Schema 的文檔（會失敗）

3. **GridFS 範例**
   - 基本上傳下載
   - 串流上傳（帶進度）
   - 串流下載
   - 大檔案分片上傳（1MB，顯示進度）
   - 查詢檔案中繼資料

4. **效能優化範例**
   - 建立索引
   - 使用投影優化查詢
   - 批次操作
   - Aggregation Pipeline 統計

## 學習資源

- [Dark Matter README](../README.md)
- [效能分析文檔](../docs/performance-analysis.md)
- [CHANGELOG](../CHANGELOG.md)
- [v1.2.0 規劃](../docs/v1.2.0-planning.md)

## 建立自己的範例

歡迎貢獻新的範例！請確保：

1. 程式碼清晰且有註解
2. 包含錯誤處理
3. 在 README 中加入說明
4. 遵循專案的程式碼風格

## 疑難排解

### MongoDB 連線失敗

確保 MongoDB 正在執行：

```bash
# 檢查 MongoDB 狀態
docker ps | grep mongodb

# 或
ps aux | grep mongod
```

### 權限錯誤

確保有建立 Collection 的權限：

```javascript
// 使用管理員帳號連線
Mongo.configure({
  default: 'main',
  connections: {
    main: {
      uri: 'mongodb://admin:password@localhost:27017',
      database: 'dark_matter_examples',
      authSource: 'admin'
    }
  }
})
```

## 回饋

如有問題或建議，請在 GitHub 建立 Issue：
https://github.com/gravito-framework/gravito/issues
