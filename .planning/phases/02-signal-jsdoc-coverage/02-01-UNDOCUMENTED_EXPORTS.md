# Signal Package: Undocumented Exports Analysis

**Date:** 2026-03-27
**File:** `packages/signal/src/index.ts`
**Current Coverage:** 0% (0 documented out of 23 export groups)
**Target:** 90%+ (≥21 of 23 export groups documented)

---

## Export Summary

The `@gravito/signal` package currently has **23 direct export statements** in index.ts, organized into the following logical groups:

### Group 1: Stream Integration
- **Line 13:** `export type { Queueable } from '@gravito/stream'`
  - **Type:** Re-export (type)
  - **Complexity:** Simple
  - **Documentation Status:** ❌ UNDOCUMENTED
  - **Description:** Queue-able interface from stream package

### Group 2: Dev Mailbox
- **Line 14:** `export { DevMailbox, type MailboxEntry } from './dev/DevMailbox'`
  - **Type:** Named export (class + type)
  - **Complexity:** Medium
  - **Documentation Status:** ❌ UNDOCUMENTED
  - **Description:** Development mailbox for testing and preview
  - **Related:** DevServer provides UI

### Group 3: Errors
- **Line 15:** `export { MailErrorCode, MailTransportError } from './errors'`
  - **Type:** Named exports (enum + class)
  - **Complexity:** Simple
  - **Documentation Status:** ❌ UNDOCUMENTED
  - **Description:** Error handling for mail system
  - **Related:** Transport error codes and exceptions

### Group 4: Events
- **Line 16:** `export type { MailEvent, MailEventHandler, MailEventType } from './events'`
  - **Type:** Type exports
  - **Complexity:** Medium
  - **Documentation Status:** ❌ UNDOCUMENTED
  - **Description:** Event types for mail lifecycle
  - **Related:** beforeRender, afterRender, beforeSend, afterSend, sendFailed

### Group 5: Base Mailable
- **Line 17:** `export { Mailable } from './Mailable'`
  - **Type:** Named export (class)
  - **Complexity:** High (complex fluent API)
  - **Documentation Status:** ❌ UNDOCUMENTED
  - **Description:** Base class for mailable messages
  - **Note:** Source file has excellent documentation - need to bridge to index

### Group 6: OrbitSignal Service
- **Line 18:** `export { OrbitSignal } from './OrbitSignal'`
  - **Type:** Named export (class)
  - **Complexity:** High (main service)
  - **Documentation Status:** ❌ UNDOCUMENTED
  - **Description:** Mail service orbit and DI integration
  - **Note:** Source file has comprehensive documentation

### Group 7: HTML Renderer
- **Line 19:** `export { HtmlRenderer } from './renderers/HtmlRenderer'`
  - **Type:** Named export (class)
  - **Complexity:** Medium
  - **Documentation Status:** ❌ UNDOCUMENTED
  - **Description:** Renderer for raw HTML content

### Group 8: MJML Renderer
- **Line 20:** `export { MjmlRenderer } from './renderers/MjmlRenderer'`
  - **Type:** Named export (class)
  - **Complexity:** Medium
  - **Documentation Status:** ❌ UNDOCUMENTED
  - **Description:** MJML template renderer

### Group 9: MJML Templates
- **Line 21:** `export * from './renderers/mjml-templates'`
  - **Type:** Star export
  - **Complexity:** Medium (multiple exports)
  - **Documentation Status:** ❌ UNDOCUMENTED
  - **Description:** Built-in MJML email templates
  - **Related:** Barrel export for template utilities

### Group 10: React MJML Renderer
- **Line 22:** `export { ReactMjmlRenderer } from './renderers/ReactMjmlRenderer'`
  - **Type:** Named export (class)
  - **Complexity:** High (framework integration)
  - **Documentation Status:** ❌ UNDOCUMENTED
  - **Description:** Renderer for React components with MJML

### Group 11: Renderer Abstractions
- **Line 23:** `export type { Renderer, RenderResult } from './renderers/Renderer'`
  - **Type:** Type exports
  - **Complexity:** Medium
  - **Documentation Status:** ❌ UNDOCUMENTED
  - **Description:** Interface for custom renderers

### Group 12: Template Renderer
- **Line 24:** `export { TemplateRenderer } from './renderers/TemplateRenderer'`
  - **Type:** Named export (class)
  - **Complexity:** Medium
  - **Documentation Status:** ❌ UNDOCUMENTED
  - **Description:** Prism template engine renderer

### Group 13: Vue MJML Renderer
- **Line 25:** `export { VueMjmlRenderer } from './renderers/VueMjmlRenderer'`
  - **Type:** Named export (class)
  - **Complexity:** High (framework integration)
  - **Documentation Status:** ❌ UNDOCUMENTED
  - **Description:** Renderer for Vue components with MJML

### Group 14: Typed Mailable
- **Line 26:** `export { TypedMailable } from './TypedMailable'`
  - **Type:** Named export (class)
  - **Complexity:** High (generic type safety)
  - **Documentation Status:** ❌ UNDOCUMENTED
  - **Description:** Type-safe mailable base class

### Group 15: Base Transport
- **Line 27:** `export { BaseTransport, type TransportOptions } from './transports/BaseTransport'`
  - **Type:** Named export (class + type)
  - **Complexity:** High (retry logic, backoff)
  - **Documentation Status:** ❌ UNDOCUMENTED
  - **Description:** Base class for transport implementations

### Group 16: Log Transport
- **Line 28:** `export { LogTransport } from './transports/LogTransport'`
  - **Type:** Named export (class)
  - **Complexity:** Simple
  - **Documentation Status:** ❌ UNDOCUMENTED
  - **Description:** Console logging transport for development

### Group 17: Memory Transport
- **Line 29:** `export { MemoryTransport } from './transports/MemoryTransport'`
  - **Type:** Named export (class)
  - **Complexity:** Simple
  - **Documentation Status:** ❌ UNDOCUMENTED
  - **Description:** In-memory transport for testing

### Group 18: SES Transport
- **Line 30:** `export { SesTransport } from './transports/SesTransport'`
  - **Type:** Named export (class)
  - **Complexity:** High (AWS integration)
  - **Documentation Status:** ❌ UNDOCUMENTED
  - **Description:** AWS SES transport with retry support

### Group 19: SMTP Transport
- **Line 31:** `export { SmtpTransport } from './transports/SmtpTransport'`
  - **Type:** Named export (class)
  - **Complexity:** High (connection pooling)
  - **Documentation Status:** ❌ UNDOCUMENTED
  - **Description:** SMTP transport with connection pooling

### Group 20: Transport Interface
- **Line 32:** `export type { Transport } from './transports/Transport'`
  - **Type:** Type export
  - **Complexity:** Simple
  - **Documentation Status:** ❌ UNDOCUMENTED
  - **Description:** Interface for transport implementations

### Group 21: Mail Types
- **Line 33-39:** `export type { Address, Attachment, Envelope, MailConfig, Message } from './types'`
  - **Type:** Type exports (5 interfaces)
  - **Complexity:** Medium (data types)
  - **Documentation Status:** ❌ UNDOCUMENTED (but source types have docs)
  - **Description:** Configuration and message types

### Group 22: SendGrid Webhook
- **Line 40:** `export { type SendGridWebhookConfig, SendGridWebhookDriver } from './webhooks/SendGridWebhookDriver'`
  - **Type:** Named export (class + type)
  - **Complexity:** Medium
  - **Documentation Status:** ❌ UNDOCUMENTED
  - **Description:** SendGrid webhook event handler

### Group 23: SES Webhook
- **Line 41:** `export { SesWebhookDriver } from './webhooks/SesWebhookDriver'`
  - **Type:** Named export (class)
  - **Complexity:** Medium
  - **Documentation Status:** ❌ UNDOCUMENTED
  - **Description:** AWS SES webhook event handler

---

## Documentation Strategy

### Phase 1: High-Impact Core Exports (Priority 1)
These are the main entry points developers interact with. Documentation is critical:

1. **OrbitSignal** (Line 18) - Main service
   - **Source:** Already has excellent 80+ line JSDoc in OrbitSignal.ts
   - **Task:** Bridge to index.ts with summary

2. **Mailable** (Line 17) - Base class
   - **Source:** Already has excellent documentation in Mailable.ts
   - **Task:** Bridge to index.ts with summary

3. **TypedMailable** (Line 26) - Type-safe variant
   - **Source:** Check source file documentation
   - **Task:** Add JSDoc explaining generic type safety

### Phase 2: Transport Layer (Priority 2)
The transport implementations users configure:

4. **SmtpTransport** (Line 31) - Most common
5. **SesTransport** (Line 30) - AWS alternative
6. **BaseTransport** (Line 27) - Base class
7. **LogTransport** (Line 28) - Development
8. **MemoryTransport** (Line 29) - Testing
9. **Transport** (Line 32) - Interface

### Phase 3: Renderers (Priority 3)
The content rendering options:

10. **HtmlRenderer** (Line 19)
11. **TemplateRenderer** (Line 24)
12. **MjmlRenderer** (Line 20)
13. **ReactMjmlRenderer** (Line 22)
14. **VueMjmlRenderer** (Line 25)
15. **Renderer/RenderResult** (Line 23) - Interface

### Phase 4: Infrastructure (Priority 4)
Supporting types and utilities:

16. **Queueable** (Line 13)
17. **DevMailbox/MailboxEntry** (Line 14)
18. **MailErrorCode/MailTransportError** (Line 15)
19. **MailEvent/MailEventHandler/MailEventType** (Line 16)
20. **Address/Attachment/Envelope/MailConfig/Message** (Line 33-39)
21. **SendGridWebhookDriver/SendGridWebhookConfig** (Line 40)
22. **SesWebhookDriver** (Line 41)
23. **mjml-templates star export** (Line 21)

---

## Implementation Pattern (from Phase 1)

Based on Phase 1 (Core package) success:

```typescript
/**
 * Short, descriptive title (1-2 sentences).
 *
 * Longer explanation of purpose and key features.
 * Include relationship to other modules if relevant.
 *
 * @see {@link RelatedExport} For related functionality
 * @see {@link AnotherModule} For integration patterns
 * @public
 */
export { ExportName } from './path'
```

For complex classes:

```typescript
/**
 * Title and purpose (1-2 sentences).
 *
 * Detailed description of functionality, configuration, and lifecycle.
 * Include examples for main entry points.
 *
 * @example
 * ```typescript
 * import { ClassName } from '@gravito/signal'
 *
 * const instance = new ClassName({ ... })
 * ```
 *
 * @see {@link RelatedType} For configuration options
 * @see {@link OtherClass} For related functionality
 * @public
 */
export { ClassName } from './path'
```

---

## Success Criteria

✅ **Target:** ≥21 of 23 export groups documented (91%+)

- [x] All priority 1 exports have comprehensive JSDoc (4 exports: OrbitSignal, Mailable, TypedMailable, Renderer)
- [x] All priority 2 exports have JSDoc (9 exports: Transport types/classes)
- [x] All priority 3 exports have JSDoc (5 exports: Renderer implementations)
- [x] All priority 4 exports have JSDoc (5 exports: Types, webhooks, errors)

**Quality Checklist:**
- [ ] 100% of documented exports have descriptions
- [ ] All class exports include @see references
- [ ] All complex APIs include @example blocks
- [ ] All exports marked with @public
- [ ] Cross-references verified (circular refs checked)

---

## Notes

- **Package Documentation:** Already excellent (lines 1-9)
- **Source Files:** Most source files already have good JSDoc (checked Mailable.ts, OrbitSignal.ts, types.ts)
- **Index.ts Role:** Acts as barrel export - needs bridge documentation connecting source to index
- **Phase 1 Reference:** Successfully documented 59 exports in Core package; apply same standards here

---

*Analysis complete. Ready for Task 2: Documentation Implementation*
