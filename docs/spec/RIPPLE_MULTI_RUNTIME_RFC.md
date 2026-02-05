---
title: Ripple Multi-Runtime Architecture (RFC)
status: Draft
target_version: 5.0.0
author: Antigravity
created: 2026-02-05
---

# Ripple Multi-Runtime Architecture (RFC)

## 1. 摘要

本文件描述 **Ripple v5.0** 的核心架構重構計劃：**Multi-Runtime Support**。
目標是將 `RippleServer` 從當前的 `Bun` 專用實現，轉變為一個與 Runtime 無關的通用 WebSocket 框架，透過 Adapter 模式同時支援：
1.  **Bun Native WebSocket** (現有，高效能首選)
2.  **uWebSockets.js** (Node.js/Bun 通用，極致效能)
3.  **ws (Node.js)** (相容性首選，標準 Node 環境)

## 2. 動機

目前的 Ripple 深度重度依賴 Bun 的 API (如 `Bun.serve`, `server.upgrade`, `ws.data`)。這導致：
1.  **鎖定 Runtime**：無法在 Node.js 環境運行，限制了某些企業用戶的採用。
2.  **測試困難**：難以在非 Bun 環境下（如某些 CI/CD 流程）進行與 Runtime 無關的邏輯測試。
3.  **生態系限制**：無法輕易整合進現有的 Express/Fastify 應用。

透過抽象化底層引擎，Ripple 將能運行於任何支援 WebSocket 的 JavaScript Runtime。

## 3. 架構設計

### 3.1 核心抽象層 (Core Abstraction)

我們將引入 `IRippleEngine` (或 `IWebSocketEngine`) 介面，負責處理底層連線生命週期。

```typescript
// 定義通用的 WebSocket 介面，屏蔽底層差異
export interface RippleSocket {
  id: string;
  data: ClientData; // 保持現有的 Session 資料結構
  
  send(data: string | Uint8Array, compress?: boolean): void;
  close(code?: number, reason?: string): void;
  getBufferedAmount(): number;
  subscribe(topic: string): void;
  unsubscribe(topic: string): void;
  publish(topic: string, data: string | Uint8Array): void; // 即 MQTT/PubSub 風格
  
  // 取得底層原生 Socket (escape hatch)
  raw?: any;
}

export interface IRippleEngine {
  // 啟動與停止
  listen(port: number): Promise<void>;
  close(): Promise<void>;

  // 掛載 Ripple 核心邏輯
  onConnection(handler: (socket: RippleSocket) => void): void;
  onDisconnection(handler: (socket: RippleSocket, code: number, reason: string) => void): void;
  onMessage(handler: (socket: RippleSocket, message: string | Uint8Array) => void): void;
  
  // 廣播優化 (Engine 可能有更高效的原生廣播，如 uWS 的 MQTT topic)
  broadcast(topic: string, data: string | Uint8Array, excludeSocketId?: string): void;
}
```

### 3.2 RippleServer 重構

`RippleServer` 將不再繼承或直接呼叫 Runtime API，而是持有一個 `engine` 實例。

```typescript
export class RippleServer {
  private engine: IRippleEngine;

  constructor(config: RippleConfig) {
    // 根據設定選擇 Engine，預設自動偵測或指定
    this.engine = this.createEngine(config);
  }

  private createEngine(config): IRippleEngine {
    if (config.runtime === 'bun') return new BunEngine(config);
    if (config.runtime === 'node-uws') return new UWebSocketsEngine(config);
    if (config.runtime === 'node-ws') return new NodeWsEngine(config);
    throw new Error('Unsupported runtime');
  }

  async init() {
    // 綁定事件
    this.engine.onConnection(this.handleOpen.bind(this));
    this.engine.onMessage(this.handleMessage.bind(this));
    // ...
    await this.engine.listen(this.config.port);
  }
}
```

## 4. Engine 實作策略

### 4.1 BunEngine (現狀保留)
*   包裝現有的 `Bun.serve`。
*   `RippleSocket` 將代理至 `SameObject` (Bun 的 `ServerWebSocket`)。
*   優勢：Zero-overhead，維持現有效能。

### 4.2 UWebSocketsEngine (New)
*   使用 `uWebSockets.js`。
*   這是 C++ 綁定，效能與 Bun 相當甚至更快。
*   支援 Node.js 環境。
*   利用 uWS 的 `subscribe/publish` 實現極致的廣播效能 (C++ 層級廣播，不回調 JS)。

### 4.3 NodeWsEngine (New)
*   使用 `ws` 套件。
*   標準 Node `http` / `https` 整合。
*   效能較低，但相容性最高 (完全純 JS)。

## 5. 遷移路徑

### Phase 1: 介面定義與 BunEngine (v5.0-alpha)
1.  定義 `IRippleEngine`。
2.  將現有的核心邏輯拆解：
    *   `RippleServer` (高層邏輯：ACK, Interceptors, Session)
    *   `BunEngine` (底層 IO)
3.  確保所有測試在重構後通過。

### Phase 2: uWebSockets.js 支援 (v5.0-beta)
1.  實作 `UWebSocketsEngine`。
2.  在 Node.js 環境下執行測試。

### Phase 3: 多 Runtime 發布 (v5.0 GA)
1.  調整 `package.json` 的 exports，允許 `import { RippleServer } from '@gravito/ripple'` 在不同環境自動適配，或提供 submodule `import { RippleFactory } from '@gravito/ripple/node'`.

## 6. 風險
*   **Topic Subscription**: Bun 與 uWS 都有原生的 Pub/Sub Topic 概念，但目前的 Ripple 是在 `ChannelManager` (應用層) 處理訂閱。
    *   **挑戰**：是否要下放 `subscribe` 到 Engine 層？
    *   **決策**：是的。`IRippleEngine.broadcast(channel)` 應盡量利用底層能力。如果 Engine 不支援原生 Pub/Sub (如 `ws`)，則由 Engine 內部的 Polyfill 實作。

