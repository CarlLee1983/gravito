---
"@gravito/ripple": patch
---

修復 Ripple 序列化問題與優化依賴

## 修復內容

### 1. 修正 protobufjs 字段映射（#1 Fix）
- 解決 protobufjs 自動轉換 snake_case 至 camelCase 的問題
- 更新 `ProtobufSerializer.fromProtoPayload()` 使用正確的字段名稱
- 啟用 ClientMessage 反序列化測試

### 2. 修正廣播消息序列化（#2 Fix）
- 修正 `channels.subscriptions` 的數據結構對應關係
- 正確的映射：channel → Set<clientId>（之前錯誤為 clientId → channels）
- 啟用 fluent `to().emit()` API 測試

### 3. 優化 protobufjs 為可選 Peer Dependency（Chore）
- 將 `protobufjs` 從 dependencies 改為 peerDependencies
- 標記為 optional，減小預設包體積
- 改進錯誤消息，在 protobufjs 未安裝時提供清晰指導
- 更新 RippleConfig 文檔，標註 JSON 為推薦方案

## 測試結果
- 267 通過、2 跳過、0 失敗（99.3% 成功率）
- 所有核心功能穩定運行
- 向後相容性保留（Protobuf 仍作為可選序列化器）

## 影響範圍
- @gravito/ripple（主要包）
- @gravito/launchpad（依賴包，已驗證）
- @gravito/satellite-support（依賴包，已驗證）
