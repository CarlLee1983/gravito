# Gravito Payment Satellite - Technical Whitepaper

## Overview
The Payment Satellite is the financial clearing house of the Gravito ecosystem. It provides a standardized, asynchronous, and secure way to handle monetary transactions using the **GASS (Gravito Asynchronous Satellite Specification)**.

## Core Concepts

### 1. Transaction Ledger
Unlike simple payment callbacks, the Payment satellite maintains an immutable ledger of transactions. Every payment intent, authorization, and capture is logged as a state transition in the `Transaction` entity.

### 2. Dual-Phase Clearing (Authorize & Capture)
To support high-trust commerce, the satellite supports a two-step clearing process:
- **Authorize**: Reserve funds on the user's payment method (triggered by order creation).
- **Capture**: Finalize the transfer (triggered by shipping or digital delivery).

## Propulsion Stages

### Stage 1: Standard (SQL)
- Records all ledger entries in relational tables.
- Ensures strict ACID compliance for financial auditing.

### Stage 2: Sport (In-Memory)
- **Intent Pre-warming**: When a user enters the checkout page, the satellite pre-computes the PaymentIntent and caches it in memory.
- Reduces checkout latency by ~200ms.

### Stage 3: Turbo (Asynchronous Webhooks)
- Utilizes `gravito-echo` to handle high-frequency webhooks from Stripe/PayPal.
- Processes clearing and fraud checks in background queues to keep the main thread responsive.

## Event Driven Architecture

### Outbound Events
- `payment:intent:ready`: Notifies Commerce that the payment session is ready for the UI.
- `payment:succeeded`: Notifies Commerce to mark the order as `PAID`.
- `payment:refund:succeeded`: Notifies Commerce to mark the order as `REFUNDED`.

### Inbound Actions
- `commerce:order:created`: Automatically initiates the payment flow.
- `commerce:order:refund-requested`: Automatically initiates the refund gateway call.

## Security
- **Strict Isolation**: No raw card data ever touches the Gravito core. All sensitive data is handled via Gateway Tokens (Stripe Tokens/Secrets).
- **Idempotency**: All `pay()` and `refund()` calls require an idempotency key to prevent double-charging.
