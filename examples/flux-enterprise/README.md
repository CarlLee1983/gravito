# Flux Enterprise Demo

This example proves out the RabbitMQ → Flux workflow outlined in the DX plan. It shows how a queue-based producer, Gravito consumer, and `JsonFileTraceSink` collaborate to deliver retries, traceability, and observability for complex business flows.

## Features
- **Native RabbitMQ Integration**: Uses `@gravito/stream`'s native `RabbitMQDriver`. The `RabbitBroker` acts as a facade over `QueueManager`, ensuring connection reuse and architectural consistency.
- **Multi-Model Workflows**:
  - **Order Enrollment**: Rocket launch visualization (`src/workflows/order.ts`).
  - **Travel Saga**: Distributed transaction with compensation/rollback (`src/workflows/saga-travel.ts`).
  - **Global Supply Chain**: Parallel processing and complex logistics (`src/workflows/supply-chain.ts`).
- **Mission Control Dashboard**: A unified UI to launch different mission types, simulate anomalies (failures/stockouts), and visualize execution via Rocket (Order) or Network Graph (Saga/Supply Chain) views.
- **Enterprise Traceability**: Integrated `JsonFileTraceSink` writes trace events in `.flux-enterprise/trace.ndjson`, providing deep observability into the queue-to-workflow lifecycle.

## Quick start
1. Copy the environment template: `cp examples/flux-enterprise/.env.example examples/flux-enterprise/.env`.
2. Start RabbitMQ: `docker compose -f docker-compose.flux.yml up -d rabbitmq`.
3. Start the Flux consumer: `cd examples/flux-enterprise && bun run src/consumer.ts`.
4. Start the HTTP Mission Control (in another shell): `cd examples/flux-enterprise && bun run src/server.ts`.
5. Open `http://localhost:4002/` in your browser.
   - Select a Mission Profile (Order, Saga, or Supply Chain).
   - Click "INITIALIZE EVENT" to launch.
   - Toggle "SIMULATE ANOMALY" to test retries, failures, and Saga compensations.

## Automation & verification
- `bun run examples/flux-enterprise/flux-enterprise.ts`: mimics the DX workflow (install, build CLI, run migrations, doctor, tests).
- `bun test` from the example root executes `tests/order.test.ts`.

## Observability
- `JsonFileTraceSink` writes step events to the trace path defined in `.env` (`.flux-enterprise/trace.ndjson`). Each event includes status, duration, and error information for rapid diagnosis.
- `GET /trace` serves the NDJSON trace stream so you can follow each step and retry count.

## Cleanup
- Tear down RabbitMQ with `docker compose -f docker-compose.flux.yml down`.
- Remove the local SQLite file `flux-enterprise.db` and trace file when you want a clean slate.
