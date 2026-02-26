# Local Insights & Debugging Guide

`@gravito/spectrum` is your primary tool for understanding the runtime behavior of your **Gravito Galaxy** during development.

## 1. Request Correlation (Trace Grouping)

Spectrum doesn't just show a list of events; it groups them by the "Originating Action".

- **Web Request**: The entry point.
- **Linked Logs**: Every `core.logger` call within that request context is linked.
- **Linked Queries**: Every SQL query executed by `atlas` during the request is linked.

This allows you to see the "Timeline" of a single transaction across the Galaxy.

## 2. Real-time Observation (SSE)

The dashboard uses Server-Sent Events to push updates. This minimizes the performance impact on the main application compared to polling.

```typescript
// Dashboard is accessible via:
http://localhost:3000/gravito/spectrum
```

## 3. Secure Production Usage

If you enable Spectrum in production (e.g., for a "Staging" environment), always use a **Gate**.

```typescript
new SpectrumOrbit({
  gate: async (c) => {
    // Only allow specific users or IPs
    return c.get('user')?.isAdmin === true;
  }
})
```

## 4. Replaying Requests

Caught a 500 error? Click "Replay" in the Spectrum UI. It will re-dispatch the exact same request (headers, body, query) to your `Photon` server, allowing you to debug with breakpoints in real-time.

## 5. Capturing Distributed Events

When one Satellite fires an event into `@gravito/stream`, Spectrum can be configured to capture the "Job Dispatch" and the subsequent "Job Execution" if both occur on nodes where Spectrum is enabled.

## 6. Performance Tuning

In high-traffic development environments, you may want to limit the memory usage:

```typescript
new SpectrumOrbit({
  maxItems: 100, // Prune data after 100 items
  storage: 'memory'
})
```
