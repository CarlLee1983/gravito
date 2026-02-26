---
title: Ether HTML Rewriter
description: High-performance streaming HTML transformation based on Bun's native HTMLRewriter.
---

# ☄️ Ether HTML Rewriter

`@gravito/ether` is a high-performance streaming HTML transformation engine built on top of Bun's native `HTMLRewriter`. It allows you to modify HTML responses on the fly with constant memory usage, regardless of document size.

---

## ✨ Features

- **Native Speed**: Leverages Bun's C++ SAX-like parser for maximum performance.
- **Streaming**: Processes HTML chunks as they arrive, maintaining a tiny memory footprint.
- **Zero Dependencies**: Pure TypeScript implementation with no external runtime dependencies.
- **Declarative Rules**: Transform elements, text, and comments using CSS selectors.
- **Photon Integration**: Direct support for Photon/Hono middleware.
- **Orbit Ready**: Seamlessly integrates into the Gravito Galaxy as an Orbit.

---

## 🚀 Quick Start

### Installation

```bash
bun add @gravito/ether
```

### Basic Transformation

```typescript
import { EtherRewriter, createSecurityRule } from '@gravito/ether'

const rewriter = new EtherRewriter()
  .addRule(createSecurityRule({ cspNonce: true }));

const html = '<script>alert("hi")</script>';
const transformed = await rewriter.transformHtml(html);
// Result: <script nonce="...">alert("hi")</script>
```

---

## 🛡️ Photon Middleware

The most common way to use Ether is as a middleware in your Photon application. This allows you to apply global transformations to all HTML responses.

### Automatic Script Injection

```typescript
import { etherMiddleware, createInjectRule } from '@gravito/ether'

app.use('*', etherMiddleware({
  rules: [
    ...createInjectRule({
      headEnd: '<link rel="stylesheet" href="/global.css">',
      bodyEnd: '<script src="/analytics.js"></script>'
    })
  ]
}));
```

### Content Security Policy (CSP)

Ether provides a dedicated middleware for managing CSP nonces automatically:

```typescript
import { cspMiddleware } from '@gravito/ether'

app.use('*', cspMiddleware({
  directives: {
    'script-src': "'self' 'nonce-{nonce}'",
    'style-src': "'self' 'nonce-{nonce}'"
  }
}));
```

---

## 🏗️ Core Components

### EtherRewriter
The core engine. It uses an immutable design where `addRule()` returns a new instance.

### EtherPipeline
A collection of rules that can be conditionally enabled based on the request URL or content type.

### TransformRules
Selectors and handlers for elements (`element`), text (`text`), and comments (`comments`).

---

## 🎨 Built-in Rules

| Rule | Description |
| :--- | :--- |
| `createSecurityRule` | Adds CSP nonces, `rel="noopener"`, and subresource integrity. |
| `createSeoRule` | Injects Meta tags, OpenGraph, and Twitter Card data. |
| `createSanitizeRule` | Removes dangerous scripts and event handlers (XSS protection). |
| `createLinkRule` | Rewrites URLs and adds attributes to links. |
| `createInjectRule` | Injects raw HTML at specific points (head end, body start/end). |

---

## 📈 Performance

Ether is designed for high-concurrency environments:

- **Memory**: Constant O(1) usage (~2MB overhead).
- **Latency**: Typically < 1ms for standard web pages.
- **Throughput**: Can process 10MB of HTML in ~850ms on standard hardware.

---

## 🔗 Further Reading

- 🛡️ [Security Best Practices](../security/security.md)
- 🚀 [Photon Engine](../architecture/photon-core.md)
- 📡 [Xenon Parallel Runtime](../architecture/xenon-architecture-deep-dive.md)
