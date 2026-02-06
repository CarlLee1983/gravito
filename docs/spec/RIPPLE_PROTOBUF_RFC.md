---
title: Ripple Protocol Buffers Support (RFC)
status: Draft
target_version: 5.0.0
author: Antigravity
created: 2026-02-05
---

# Ripple Protocol Buffers Support (RFC)

## 1. 摘要

本文件描述將 **Protocol Buffers (Protobuf)** 整合至 Ripple WebSocket 協議的技術規格。目標是提供比 JSON 更高效的二進位序列化選項，以減少網路頻寬消耗並提升行動端設備的解析效能。

## 2. 動機

目前的 Ripple 使用 JSON 作為唯一的序列化格式。雖然 JSON 易於除錯且通用性高，但在高頻寬、低延遲的場景（如即時遊戲、金融報價）下存在以下劣勢：
1.  **Payload 體積大**：JSON 的純文字特性導致欄位名稱重複傳輸，且數值類型需轉為字串。
2.  **解析成本高**：尤其在行動端 (React Native / Flutter)，頻繁的 `JSON.parse` / `JSON.stringify` 會消耗顯著的 CPU 資源。

導入 Protobuf 預期可減少 **30-60%** 的 Payload 體積，並提升序列化/反序列化速度。

## 3. 協議定义 (ripple.proto)

我們將定義 `RippleMessage` 作為頂層容器，利用 `oneof` 區分不同類型的訊息。

```protobuf
syntax = "proto3";

package ripple;

// -------------------------------------------------------------------
// Client -> Server Messages
// -------------------------------------------------------------------

message ClientMessage {
  string req_id = 1; // Optional request ID for troubleshooting

  oneof payload {
    SubscribeRequest subscribe = 10;
    UnsubscribeRequest unsubscribe = 11;
    WhisperRequest whisper = 12;
    PingRequest ping = 13;
    BinaryRequest binary = 14;
    AckRequest ack = 15;
  }
}

message SubscribeRequest {
  string channel = 1;
  optional AuthData auth = 2;
}

message UnsubscribeRequest {
  string channel = 1;
}

message WhisperRequest {
  string channel = 1;
  string event = 2;
  // Payload is generic bytes, application needs to decode based on event
  bytes data = 3; 
}

message PingRequest {}

message BinaryRequest {
  string channel = 1;
  string event = 2;
  bytes data = 3;
}

message AckRequest {
  int32 seq = 1;
}

message AuthData {
  string socket_id = 1;
  string signature = 2;
}

// -------------------------------------------------------------------
// Server -> Client Messages
// -------------------------------------------------------------------

message ServerMessage {
  oneof payload {
    ConnectedResponse connected = 10;
    SubscribedResponse subscribed = 11;
    UnsubscribedResponse unsubscribed = 12;
    ErrorResponse error = 13;
    EventMessage event = 14;
    PresenceMessage presence = 15;
    PongResponse pong = 16;
    BinaryMessage binary = 17;
    AckReceivedResponse ack_received = 18;
    ReconnectionTokenMessage reconnection_token = 19;
  }
}

message ConnectedResponse {
  string socket_id = 1;
}

message SubscribedResponse {
  string channel = 1;
}

message UnsubscribedResponse {
  string channel = 1;
}

message ErrorResponse {
  string code = 1;
  string message = 2;
  optional string channel = 3;
}

message EventMessage {
  string channel = 1;
  string event = 2;
  bytes data = 3; // JSON encoded string or raw bytes
  optional int32 seq = 4;
  optional bool need_ack = 5;
}

message PresenceMessage {
  string channel = 1;
  string event = 2; // "join", "leave", "members"
  bytes data = 3;   // JSON encoded user info
}

message PongResponse {}

message BinaryMessage {
  string channel = 1;
  string event = 2;
  bytes data = 3;
}

message AckReceivedResponse {
  int32 seq = 1;
}

message ReconnectionTokenMessage {
  string token = 1;
}
```

## 4. 架構設計

### 4.1. 序列化介面抽象化

目前 `MessageSerializer` 僅支援 JSON。我們將定義一個通用介面：

```typescript
export interface ISerializer {
  contentType: 'json' | 'protobuf';
  serialize(message: ServerMessage): string | Buffer | Uint8Array;
  deserialize(data: string | Buffer | Uint8Array): ClientMessage;
  
  // For broadcasting optimizations
  serializeForBroadcast(message: ServerMessage): string | Buffer | Uint8Array;
  clearBroadcastCache(): void;
}
```

### 4.2. 協商機制 (Content Negotiation)

為了保持向後相容，我們使用 WebSocket 子協議 (Subprotocol) 進行協商。

*   **JSON (Default)**:
    *   Client: `new WebSocket('ws://...', [])` (無 subprotocol)
    *   Server: 預設使用 JSON。
*   **Protobuf**:
    *   Client: `new WebSocket('ws://...', ['ripple-protobuf'])`
    *   Server: 在 `upgrade` 階段檢查 `sec-websocket-protocol` header。若包含 `ripple-protobuf`，則將該 socket 標記為 protobuf 模式。

### 4.3. 混合模式廣播 (Hybrid Broadcasting)

這是最複雜的部分。一個 Channel 可能同時包含 JSON 客戶端和 Protobuf 客戶端。
`RippleServer.broadcast` 必須能夠同時處理兩種格式：

```typescript
class RippleServer {
  private serializers = {
    json: new JsonSerializer(),
    proto: new ProtobufSerializer()
  };

  private broadcastToChannel(channel: string, event: string, data: unknown) {
    // 1. Prepare Data
    const message = { type: 'event', channel, event, data };
    
    // 2. Serialize Once per Format
    const jsonPayload = this.serializers.json.serializeForBroadcast(message);
    const protoPayload = this.serializers.proto.serializeForBroadcast(message);
    
    // 3. Send to Clients based on their preference
    for (const ws of subscribers) {
      if (ws.protocol === 'ripple-protobuf') {
        ws.send(protoPayload);
      } else {
        ws.send(jsonPayload);
      }
    }
  }
}
```

## 5. 實作計劃

### Phase 1: 基礎建設 (v4.1)
1.  引入 `protobufjs` 或類似的高效能庫。
2.  建立 `packages/ripple/src/serializers/` 目錄。
3.  實作 `ISerializer`, `JsonSerializer`。
4.  將 `RippleServer` 重構為依賴 `ISerializer`。

### Phase 2: Protobuf 整合 (v5.0-alpha)
1.  生成 TS definitions from `.proto`。
2.  實作 `ProtobufSerializer`。
3.  更新 `RippleServer` 握手邏輯 (`upgrade`) 以支援子協議協商。
4.  更新廣播邏輯以支援混合模式。

### Phase 3: Client SDK 支援 (v5.0-beta)
1.  更新 `ripple-client` 支援 Protobuf (Optionally)。
2.  提供 `.proto` 檔案供非 JS 客戶端 (iOS/Android) 使用。

## 6. 風險評估

*   **Data Payload**: `EventMessage.data` 定義為 `bytes`。如果原始資料是物件，在 Protobuf 模式下，我們可能仍需將其 `JSON.stringify` 後放入 `bytes` 欄位，或者需要更嚴格的 Typed Event 定義。**初期建議 `data` 欄位仍存放 JSON String 的 bytes，僅對外層信封 (Envelope) 進行 Protobuf 壓縮**，這樣能獲得 80% 的效能紅利且不需要強制所有業務資料都定義 proto schema。
