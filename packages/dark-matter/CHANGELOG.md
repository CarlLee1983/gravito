# Changelog

All notable changes to @gravito/dark-matter will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-01-31

### Added

#### Soft Deletes
- `withTrashed()` - 包含已軟刪除的記錄
- `onlyTrashed()` - 只查詢已軟刪除的記錄
- `softDelete()` - 軟刪除單一記錄
- `softDeleteMany()` - 批次軟刪除
- `restore()` - 恢復軟刪除的記錄
- `restoreMany()` - 批次恢復
- `forceDelete()` - 永久刪除記錄
- `forceDeleteMany()` - 批次永久刪除
- `SoftDeletableDocument` 型別介面

#### Schema Builder API
- `MongoSchemaBuilder` 類別 - 型別安全的 Schema 定義 API
- `schema()` 工廠函數 - 快速建立 Schema Builder 實例
- `createCollectionWithSchema()` - 便利方法建立帶 Schema 的 Collection
- 支援 7 種欄位類型：string, number, integer, boolean, date, array, object
- 驗證選項支援（validationLevel, validationAction）

#### GridFS 完善
- `uploadStream()` - 串流上傳（支援進度回調）
- `downloadStream()` - 串流下載（返回 ReadableStream）
- `uploadLargeFile()` - 大檔案分片上傳（支援進度追蹤）
- `findById()` - 查詢檔案中繼資料
- `GridFSUploadProgress` 介面

#### 效能與文檔
- 完整的效能分析文檔
- Builder 物件池評估與決策文檔
- 基準測試框架
- 效能調優最佳實踐指南

### Changed
- README 更新，加入所有新功能的使用範例

### Testing
- 新增 50 個測試案例
- 總測試覆蓋率 85% 以上

## [1.0.0] - Previous Release

Initial release with core MongoDB functionality.
