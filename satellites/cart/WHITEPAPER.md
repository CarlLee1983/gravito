# Whitepaper: Gravito Cart Satellite (Persistent Desire Architecture)
**Version:** 1.0.0 | **Author:** Gravito Engineering Team

## 1. Abstract
The Cart Satellite is designed to manage the "Transient Intent" of a user. In traditional systems, shopping carts are either volatile (lost on session end) or heavy on database resources. Gravito Cart introduces a **Polymorphic Storage Strategy** that balances persistence reliability with extreme read/write performance.

## 2. Identity Transition & Merge Algorithm
The most critical challenge in cart management is the transition from **Anonymous Browsing** to **Authenticated Purchase**. 

### 2.1 Transition Logic
We implement a "Zero-Friction Transition" policy:
- **Guest State**: Cart is keyed by a client-generated `X-Guest-ID` (UUID).
- **Merge Trigger**: Upon successful authentication, the `member:logged-in` action is emitted.
- **Conflict Resolution**: The engine performs an additive merge. If SKU-A exists in both carts, quantities are summed. If not, items are appended. The Guest record is then purged to ensure privacy and data hygiene.

## 3. Storage Hierarchy (The Three Stages)

### Stage 1: Standard (SQL Persistence)
- **Engine**: `Atlas SQL`.
- **Target**: Cross-device synchronization where the user expects their cart to be present across mobile and desktop.
- **Guarantee**: Full ACID compliance for item quantities.

### Stage 2: Sport (Session Hybrid)
- **Engine**: Local Memory / Cookie.
- **Optimization**: Bypasses the database entirely for high-speed "Add-to-Cart" interactions. Persistence is limited to the session lifespan.

### Stage 3: Turbo (Distributed In-Memory)
- **Engine**: Redis Cluster.
- **Scalability**: Designed for global-scale flash sales. Uses sub-millisecond TTL-based storage to handle millions of simultaneous cart updates without touching the primary SQL database.

## 4. Operational Excellence
- **Stateless Controllers**: Cart identification is moved to the request context, allowing any API Pod to serve any cart.
- **Metadata Sniffing**: Uses Hook-driven validation to ensure that items in the persistent cart are still active and correctly priced in the `Catalog` before checkout.

---
*Gravito Framework: Precision in Persistence, Fluidity in Experience.*
