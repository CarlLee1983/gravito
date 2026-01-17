# 回歸測試清單

本清單可直接轉換為測試用例。

## Core Model

- [ ] Model create/save/update/delete 基本 CRUD
- [ ] DirtyTracker: primitive 變更會標記 dirty
- [ ] DirtyTracker: nested 變更需重設才會標記 dirty
- [ ] Attribute casting: int/float/string/bool/json/date 行為一致
- [ ] Accessor/Mutator: getter/setter 正確被呼叫

## QueryBuilder

- [ ] where/orWhere/whereIn/whereNull 組合查詢正確
- [ ] orderBy/limit/offset 結果正確
- [ ] clone + 後續修改不影響原查詢
- [ ] paginate: total 與 data 正確
- [ ] cache/with/whereHas/onlyTrashed 等 API 正確

## Relationships & Eager Loading

- [ ] hasOne/hasMany/morphOne/morphMany eager load 正確
- [ ] belongsTo eager load 正確
- [ ] chunking 開啟時結果與非 chunking 一致
- [ ] chunking 關閉時行為與舊版本一致

## Grammar & Caching

- [ ] Grammar cache 命中後 SQL 相同
- [ ] cacheScope=instance 不共享快取
- [ ] cacheScope=global 共享快取
- [ ] clearCache 可清除快取

## Connection & Transactions

- [ ] 連線閒置回收後可重新連線
- [ ] nested transaction savepoint 正確 rollback

## Error & Debug

- [ ] ColumnNotFoundError 顯示 Did you mean 與 Available columns
- [ ] DB.debug/pretend/logQuery 正常運作
