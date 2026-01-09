# 🎓 Gravito Skills: Usage Guide

Welcome to the Gravito Skills ecosystem. These are specialized "onboarding modules" designed to help AI agents (like Antigravity or Claude) and developers build high-quality software using Gravito's best practices.

## 🧠 The Concept: Skill Summoning

A "Skill" is a set of rules, blueprints, and SOPs. You don't just "read" them; you **summon** them to perform a task.

### How to use with AI Agents
When you are working with an AI agent, you can explicitly tell it which skills to apply.

**Example Prompts:**
- *"Antigravity, use `mvc-master` and `commerce-blueprint` to implement a shopping cart."*
- *"Use `adr-scaffold` and `identity-hub` to build a new user registration flow."*
- *"Follow `clean-architect` to refactor my domain logic."*

## 🏗️ Skill Composition: Horizontal + Vertical

To handle complexity, we use a modular composition strategy:

| Skill Type | Purpose | Example |
| :--- | :--- | :--- |
| **Horizontal (Architecture)** | Defines **where** the code goes (Structure). | `mvc-master`, `adr-scaffold`, `clean-architect` |
| **Vertical (Domain)** | Defines **what** the code does (Business Logic). | `commerce-blueprint`, `identity-hub`, `cms-engine` |

### 🚀 Standard Workflow
If you have just scaffolded an MVC project and want to develop a shopping cart:

1.  **Architecture Initialization**: You already have the MVC structure.
2.  **Summon Domain Skill**: Ask the agent to apply `commerce-blueprint`.
3.  **Cross-Reference**: The agent will look at `mvc-master` for file locations (Controllers in `src/Http/Controllers`) and `commerce-blueprint` for business rules (Price snapshots, State machines).

## 🛠️ List of Available Skills

### Architecture (Horizontal)
- `mvc-master`: Enterprise Model-View-Controller.
- `adr-scaffold`: Action-Domain-Responder pattern.
- `clean-architect`: Pure Domain & Use Case isolation.
- `ddd-domain-expert`: Aggregate Roots & Bounded Contexts.
- `freeze-static`: Static Site Generation (SSG).

### Domain (Vertical)
- `commerce-blueprint`: Cart, Checkout, SKU management.
- `identity-hub`: Auth, RBAC, Multi-tenancy.
- `cms-engine`: Publishing workflows, Blogs, Media.

### Operations & Quality
- `fortify-security`: CSP, Security Headers, Auth middleware.
- `test-guardian`: Testing strategies (Unit, E2E).
- `ops-commander`: Docker, CI/CD, Fly.io.
- `performance-tuner`: Caching, DB indexing, Optimization.

---
Created by Antigravity for the Gravito Framework.
