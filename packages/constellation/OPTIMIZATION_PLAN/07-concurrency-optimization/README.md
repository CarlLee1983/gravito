# Phase 7: 並發優化

> **依賴**: 無  
> **優先級**: 🟡 中  
> **預估時間**: 1 天

[← 返回總覽](../README.md)

---

## 目標

為 ShadowProcessor 和其他關鍵組件添加並發保護。

---

## 狀態：已完成 (2026-01-19)

### 已實施優化
- **本地 Mutex 保護**: 實作了基於 Promise 鏈的輕量級 `Mutex` 工具（`src/utils/Mutex.ts`）。
- **ShadowProcessor 加鎖**: `addOperation` 與 `commit` 現在受 Mutex 保護，防止影子區域的操作交錯導致狀態混亂。
- **IncrementalGenerator 加鎖**: `generateFull` 與 `generateIncremental` 受 Mutex 保護，確保單一實例內的生成任務序列化執行。

---

## 驗證清單

- [x] Mutex 實現
- [x] 同一 sitemap 只允許單一增量流程執行
- [x] 更新順序固定且受鎖保護
- [x] 鎖失敗時能安全拒絕或排隊
- [x] 所有現有測試通過
