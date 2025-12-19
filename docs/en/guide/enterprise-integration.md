---
title: Enterprise Integration
description: Building large-scale systems with Gravito's enterprise DNA.
---

# Enterprise Integration

Gravito is designed with "Enterprise DNA" at its core. Beyond simple scripting, it provides the architectural foundation needed to build, scale, and maintain complex enterprise systems.

---

## 🏗️ Architectural Foundations

### Native System Sovereignty
Unlike lightweight frameworks that rely on a fragmented ecosystem of community packages, Gravito provides a unified, native system for core enterprise needs:
- **Scheduling**: Native cron-based job scheduling.
- **Queuing**: Multi-driver background processing.
- **Microservices**: Decoupled component architecture for independent scaling.

### Microservice Extraction
As your application grows, Gravito allows you to decouple logic into independent microservices without a complete rewrite.
1. **Identify**: Isolate a high-load service (e.g., Image Processing).
2. **Decouple**: Use Gravito's Plugin system to extract the logic.
3. **Deploy**: Move the plugin to a separate Gravito core instance on a different cluster.

---

## 📡 Universal Orbit Queue

The Universal Orbit Queue is Gravito's solution for infrastructure-agnostic background processing.

### Multi-Driver Support
Gravito aims to support all major message queue drivers out of the box:
- **Redis & BullMQ**: For high-speed, local processing.
- **Amazon SQS**: For cloud-native scalability.
- **RabbitMQ**: For complex routing and enterprise messaging.
- **Apache Kafka**: For massive data streams.

### Switch Without Friction
Your business logic remains pure. You interact with the `Queue` interface, and the driver becomes a configuration detail.

```typescript
// Sending a job to the queue
import { Queue } from '@gravito/orbit-queue'

await Queue.push(new SendWelcomeEmail(user))
```

Changing from Redis to SQS is as simple as updating your `.env` file.

---

## 🔌 Plugin Sovereignty

Gravito plugins are not just "extensions"; they are sovereign entities that can act as independent mini-Gravito instances.

### Dual-Mode Deployment
1. **Monolithic Mode**: The plugin runs inside your main application.
2. **Standalone Mode**: The plugin runs as an independent service, communicating via RPC or Message Bus.

### Recursive Overrides
Plugins can recursively override routes, logic, and UI layers, allowing for powerful white-labeling and multi-tenant customization.

---

## 🤖 AI-Optimized Types

For enterprise teams, code consistency is paramount. Gravito leverages TypeScript to create rock-solid contracts that AI agents (Cursor, Copilot) can understand with zero ambiguity.

- **Strict Schema Definitions**: No more guessing payloads.
- **Automated Documentation**: Open API specs generated from your types.
- **Reduced Hallucinations**: AI reads your types and generates correct logic, first time.
