# Resumability & Hydration Guide

`@gravito/freeze` is the Gravito engine for achieving **Instant Load Times**. It implements the **Freeze & Thaw** (Resumability) pattern, allowing your frontend to pick up exactly where the server left off.

## 1. How Freeze Works

Unlike traditional hydration which re-runs all components on the client, Freeze:
1. **Serializes State**: Captures the exact state of the component tree on the server.
2. **Freezes Interaction**: Injects a lightweight listener that captures early user events.
3. **Thaws on Demand**: Only hydrator/re-renders components when the user actually interacts with them.

## 2. Supported Frameworks

- **`@gravito/freeze-react`**: Integration for React 18+ and Next.js.
- **`@gravito/freeze-vue`**: Integration for Vue 3 and Nuxt.

## 3. Integration with Prism

When using `@gravito/prism` for SSG/SSR, you can enable Freeze to eliminate "Hydration Mismatch" and "Time to Interactive" bottlenecks.
