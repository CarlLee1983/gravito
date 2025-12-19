---
title: 企業級整合
description: 利用 Gravito 的企業級 DNA 構建大型系統。
---

# 企業級整合

Gravito 的核心設計理念是「企業級 DNA」。除了簡單的腳本開發，它還提供了構建、擴展和維護複雜企業系統所需的架構基礎。

---

## 🏗️ 架構基礎

### 原生系統主權 (System Sovereignty)
與依賴碎片化社群套件的輕量級框架不同，Gravito 為核心企業需求提供了統一的原生系統：
- **排程管理**：原生的 Cron 任務排程。
- **消息隊列**：多驅動後台處理。
- **微服務架構**：用於獨立擴展的解耦組件架構。

### 微服務抽離 (Microservice Extraction)
隨著應用的增長，Gravito 允許你在不重寫代碼的情況下，將邏輯解耦為獨立的微服務。
1. **識別**：隔離高負載服務（例如：影像處理）。
2. **解耦**：利用 Gravito 的外掛 (Plugin) 系統提取邏輯。
3. **部署**：將外掛移動到不同集群上的另一個 Gravito Core 實例中執行。

---

## 📡 萬向 Orbit Queue (Universal Queue)

Universal Orbit Queue 是 Gravito 對基礎設施無關的後台處理方案。

### 多驅動支援 (Multi-Driver)
Gravito 旨在開箱即用地支援所有主流消息隊列驅動：
- **Redis & BullMQ**：用於高速、本地處理。
- **Amazon SQS**：用於雲端原生擴展。
- **RabbitMQ**：用於複雜路由與企業級消息傳遞。
- **Apache Kafka**：用於海量數據流。

### 無縫切換
你的業務邏輯保持純淨。你只需與 `Queue` 介面互動，換驅動程式僅僅是配置文件的改動。

```typescript
// 將任務推入隊列
import { Queue } from '@gravito/orbit-queue'

await Queue.push(new SendWelcomeEmail(user))
```

從 Redis 切換到 SQS 就像更新 `.env` 檔案一樣簡單。

---

## 🔌 外掛主權 (Plugin Sovereignty)

Gravito 的外掛不僅僅是「擴展」；它們是獨立的主權實體，可以作為獨立的微型 Gravito 實例運作。

### 雙模式部署
1. **單體模式**：外掛在主應用程序中運行。
2. **獨立模式**：外掛作為獨立服務運行，透過 RPC 或消息總線通訊。

### 遞歸覆蓋 (Recursive Overrides)
外掛可以遞歸地覆蓋路由、邏輯和 UI 層，從而實現強大的白牌化 (White-labeling) 和多租戶定制。

---

## 🤖 AI 優化的型別系統

對於企業團隊來說，代碼的一致性至關重要。Gravito 利用 TypeScript 創建了堅若磐石的契約，AI 代理（如 Cursor, Copilot）可以零歧義地理解這些契約。

- **嚴格的 Schema 定義**：不再需要猜測數據 Payload。
- **自動化文檔**：從你的型別定義自動生成 OpenAPI 規範。
- **減少幻覺**：AI 讀取你的型別，一次性生成正確的邏輯。
