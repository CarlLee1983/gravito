---
title: Config Contract
description: 規範 config/env 命名、錯誤碼與日誌欄位，讓 Gravito orbit 與 Preset 一致可維護。
---

# Config Contract

要贏 Laravel，就靠一致性。Gravito 的 Config Contract 規範了設定鍵、環境變數、錯誤碼與日誌欄位，讓每個 orbit、每個 Preset 都遵循同一套語彙。

## Config 與環境變數命名

| 分層 | 命名規則 | 範例 |
|------|---------|------|
| 核心設定 | 全大寫、使用底線，必要時加 `GRAVITO_` 前綴 | `PORT`、`APP_NAME`、`GRAVITO_DEBUG` |
| Orbit 設定 | 加上 orbit 名稱（全大寫）作為前綴 | `ATLAS_MAX_POOL`、`RIPPLE_BROKER_URL`、`SPECTRUM_ENABLED` |
| 環境變數 | 與 config 鍵名一致，保持大寫 | `DATABASE_URL`、`REDIS_URL`、`MAIL_DRIVER` |

一致的命名讓 `gravito doctor` 可以直接尋找 `DATABASE_URL`、`PORT` 等必要 key，也讓 `gravito.config.ts` 搭配起來一目了然。

## 錯誤碼

錯誤碼採 `GRAVITO-<MODULE>-####` 的格式，`MODULE` 與 orbit 或功能相對應，後方的數字為四位序號。

| 模組 | 說明 | 範例 |
|------|------|------|
| CORE | PlanetCore 生命週期 | `GRAVITO-CORE-1001`（啟動失敗） |
| AUTH | Sentinel/Fortify | `GRAVITO-AUTH-2002`（認證失敗） |
| STREAM | 背景任務 | `GRAVITO-STREAM-3003`（Job 超過重試） |
| RIPPLE | 實時廣播 | `GRAVITO-RIPPLE-4004`（頻道缺失） |

錯誤處理機制將這些碼轉成標準 HTTP 回應與日誌，讓跨 Preset 的追蹤更一致。

## 日誌欄位

所有 log 都應包含：

- `timestamp`（ISO 格式）  
- `level`（`info`、`warn`、`error`）  
- `orbit`（例如 `core`、`atlas`、`ripple`）  
- `event`（簡短且 kebab-case）  
- `traceId` / `requestId`（可用的時候）  
- `userId`（若代表使用者）  
- `message`（人類可讀說明）  

例如：

```json
{
  "timestamp": "2025-12-28T08:42:13.123Z",
  "level": "error",
  "orbit": "core",
  "event": "core.liftoff.failed",
  "traceId": "de305d54-75b4-431b-adb2-eb6b9e546014",
  "userId": null,
  "code": "GRAVITO-CORE-1001",
  "message": "無法綁定 3000 port"
}
```

## Orbit 合規

要進入官方 Preset，orbit 必須說明自己如何遵守 Contract：

1. 提供 `configContract` 描述預期的 config/env key 與預設值。  
2. 文件化可能發出的錯誤碼（符合 `GRAVITO-<MODULE>-####` 命名）。  
3. 使用 Gravito 共用的 Logger helper，確保每筆 log 都有標準欄位。

若 orbit 違反 contract（缺少 env key、錯誤碼不對、日誌里少欄位），`gravito doctor` 會報告問題，且該 orbit 無法出現在官方 Preset 內。

更多細節可參考 [預設模板](./presets.md) 中的 config wiring，以及 [Golden Path](./golden-path.md) 中的 feature slice + 測試驗收流程。
