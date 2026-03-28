/**
 * OrbitSignal - The central Event Bus and Mail Service for Gravito.
 *
 * This module provides the core infrastructure for sending emails and managing
 * cross-module signals within the Gravito ecosystem. It supports multiple
 * transport drivers, template rendering, and a robust development environment.
 *
 * @packageDocumentation
 */

// import './augmentation'

// ─────────────────────────────────────────────────────────────────────────────
// Stream Integration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Queue-able interface from the stream package.
 *
 * Defines the contract for messages that can be queued for asynchronous processing,
 * enabling email mailables to be dispatched to background workers.
 *
 * @see {@link Mailable} For messages that implement this interface
 * @public
 */
export type { Queueable } from '@gravito/stream'

// ─────────────────────────────────────────────────────────────────────────────
// Development Tooling
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Development mailbox for capturing and previewing sent emails.
 *
 * Provides an in-memory storage mechanism for intercepting emails during development.
 * Works with DevServer to display a preview UI at a configured endpoint (default: /__mail).
 *
 * @see {@link OrbitSignal} For development mode configuration
 * @see {@link MailboxEntry} For mailbox data structure
 * @public
 */
export { DevMailbox, type MailboxEntry } from './dev/DevMailbox'

// ─────────────────────────────────────────────────────────────────────────────
// Error Handling
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mail error codes and transport error class.
 *
 * Provides structured error information for mail delivery failures, including
 * categorized error codes (CONNECTION_FAILED, AUTH_FAILED, RATE_LIMIT, etc.)
 * and the MailTransportError exception class for programmatic error handling.
 *
 * @example
 * ```typescript
 * import { MailTransportError, MailErrorCode } from '@gravito/signal'
 *
 * try {
 *   await transport.send(message)
 * } catch (error) {
 *   if (error instanceof MailTransportError) {
 *     if (error.code === MailErrorCode.RATE_LIMIT) {
 *       // Implement exponential backoff
 *     }
 *   }
 * }
 * ```
 *
 * @see {@link Transport} For implementations that throw these errors
 * @public
 */
export { MailErrorCode, MailTransportError } from './errors'
export { MailErrorCodes } from './errors/codes'

// ─────────────────────────────────────────────────────────────────────────────
// Mail Lifecycle Events
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mail lifecycle event types and handlers.
 *
 * Provides event types and interfaces for subscribing to key moments in the
 * email delivery process: beforeRender, afterRender, beforeSend, afterSend,
 * sendFailed, and webhookReceived. Enables logging, analytics, and custom
 * processing during mail service operations.
 *
 * @example
 * ```typescript
 * import { OrbitSignal, type MailEvent } from '@gravito/signal'
 *
 * mail.on('afterSend', (event: MailEvent) => {
 *   console.log('Sent to:', event.message?.to[0].address)
 * })
 *
 * mail.on('sendFailed', (event: MailEvent) => {
 *   console.error('Failed:', event.error?.message)
 * })
 * ```
 *
 * @see {@link OrbitSignal} For event subscription API
 * @public
 */
export type { MailEvent, MailEventHandler, MailEventType } from './events'

// ─────────────────────────────────────────────────────────────────────────────
// Base Mailable Classes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base class for all mailable messages.
 *
 * Provides a fluent API to build email envelopes and render content using
 * multiple rendering engines (HTML, Prism templates, React, Vue). Supports
 * background queuing via the Queueable interface and integration with the
 * OrbitSignal service for sending.
 *
 * @example
 * ```typescript
 * import { Mailable } from '@gravito/signal'
 *
 * class WelcomeEmail extends Mailable {
 *   constructor(private user: User) {
 *     super()
 *   }
 *
 *   build() {
 *     return this
 *       .to(this.user.email)
 *       .subject('Welcome!')
 *       .view('emails/welcome', { name: this.user.name })
 *   }
 * }
 *
 * await mail.send(new WelcomeEmail(user))
 * ```
 *
 * @see {@link TypedMailable} For type-safe data passing
 * @see {@link OrbitSignal} For sending integration
 * @public
 */
export { Mailable } from './Mailable'

/**
 * Type-safe mailable base class with compile-time data validation.
 *
 * Extends Mailable to provide generic type parameters for email data,
 * ensuring template variables and component props are correctly typed
 * and validated at build time. Improves developer experience and reduces
 * runtime errors in complex email workflows.
 *
 * @example
 * ```typescript
 * import { TypedMailable } from '@gravito/signal'
 *
 * interface WelcomeData {
 *   name: string
 *   activationUrl: string
 * }
 *
 * class WelcomeEmail extends TypedMailable<WelcomeData> {
 *   protected data: WelcomeData
 *
 *   build() {
 *     return this
 *       .to(this.data.email)
 *       .view('emails/welcome', this.data)
 *   }
 * }
 * ```
 *
 * @see {@link Mailable} For base functionality
 * @see {@link Renderer} For rendering engines
 * @public
 */
export { TypedMailable } from './TypedMailable'

// ─────────────────────────────────────────────────────────────────────────────
// Core Mail Service
// ─────────────────────────────────────────────────────────────────────────────

/**
 * OrbitSignal - The central email service orbit for Gravito.
 *
 * A production-ready email service providing multi-transport support, automatic
 * retry with exponential backoff, event-driven lifecycle hooks, and development
 * tooling. Integrates seamlessly with Gravito's orbit system and queue infrastructure.
 *
 * Supports multiple transports (SMTP, AWS SES, Log, Memory) and rendering engines
 * (HTML, Prism templates, React, Vue). In development mode, captures emails in an
 * in-memory mailbox and displays a preview UI.
 *
 * @example
 * ```typescript
 * import { OrbitSignal, SmtpTransport } from '@gravito/signal'
 *
 * const mail = new OrbitSignal({
 *   transport: new SmtpTransport({
 *     host: 'smtp.mailtrap.io',
 *     port: 2525,
 *     auth: { user: 'username', pass: 'password' }
 *   }),
 *   from: { name: 'My App', address: 'noreply@myapp.com' },
 *   devMode: process.env.NODE_ENV === 'development'
 * })
 *
 * mail.install(core)
 * ```
 *
 * @example
 * ```typescript
 * // Sending with events
 * mail.on('beforeSend', async (event) => {
 *   console.log('Sending to:', event.message?.to[0].address)
 * })
 *
 * await mail.send(new WelcomeEmail(user))
 * ```
 *
 * @see {@link Mailable} For creating email messages
 * @see {@link Transport} For custom transport implementations
 * @see {@link MailEvent} For lifecycle event types
 * @public
 */
export { OrbitSignal } from './OrbitSignal'

// ─────────────────────────────────────────────────────────────────────────────
// Content Rendering Engines
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Raw HTML content renderer.
 *
 * Renders plain HTML strings as email content. Suitable for pre-rendered
 * HTML or when using other templating libraries. Performs minimal processing.
 *
 * @example
 * ```typescript
 * import { Mailable, HtmlRenderer } from '@gravito/signal'
 *
 * class RawHtmlEmail extends Mailable {
 *   build() {
 *     return this
 *       .to('user@example.com')
 *       .html('<h1>Hello</h1><p>This is HTML</p>')
 *   }
 * }
 * ```
 *
 * @see {@link Renderer} For the renderer interface
 * @public
 */
export { HtmlRenderer } from './renderers/HtmlRenderer'
/**
 * MJML (Responsive Email Markup Language) template renderer.
 *
 * Renders MJML template syntax and converts it to optimized, responsive HTML
 * suitable for all email clients. MJML abstracts away CSS and media queries
 * complexity while ensuring broad compatibility.
 *
 * @example
 * ```typescript
 * import { Mailable, MjmlRenderer } from '@gravito/signal'
 *
 * class MjmlEmail extends Mailable {
 *   build() {
 *     return this
 *       .to('user@example.com')
 *       .view('emails/welcome.mjml', { name: 'Alice' })
 *   }
 * }
 * ```
 *
 * @see {@link ReactMjmlRenderer} For React components
 * @see {@link VueMjmlRenderer} For Vue components
 * @see {@link Renderer} For the renderer interface
 * @public
 */
export { MjmlRenderer } from './renderers/MjmlRenderer'
/**
 * Built-in MJML email templates and utilities.
 *
 * Pre-built responsive email template components and helpers for common
 * use cases, reducing boilerplate when creating MJML-based emails.
 *
 * @see {@link MjmlRenderer} For MJML rendering
 * @see {@link ReactMjmlRenderer} For React + MJML
 * @public
 */
export * from './renderers/mjml-templates'
/**
 * React component renderer with MJML support.
 *
 * Renders React components as email content with MJML syntax support,
 * enabling you to build emails using familiar React patterns while maintaining
 * responsive email best practices.
 *
 * @example
 * ```typescript
 * import { Mailable, ReactMjmlRenderer } from '@gravito/signal'
 *
 * const WelcomeComponent = ({ name }: { name: string }) => (
 *   <mjml>
 *     <mj-body>
 *       <mj-section>
 *         <mj-column><mj-text>Welcome, {name}!</mj-text></mj-column>
 *       </mj-section>
 *     </mj-body>
 *   </mjml>
 * )
 *
 * class ReactEmail extends Mailable {
 *   build() {
 *     return this
 *       .to('user@example.com')
 *       .react(WelcomeComponent, { name: 'Alice' })
 *   }
 * }
 * ```
 *
 * @see {@link VueMjmlRenderer} For Vue component rendering
 * @see {@link Renderer} For the renderer interface
 * @public
 */
export { ReactMjmlRenderer } from './renderers/ReactMjmlRenderer'
/**
 * Renderer abstractions for email content generation.
 *
 * Defines the interface and return type for building custom content renderers,
 * enabling support for additional templating engines beyond the built-in
 * HTML, Prism, React, and Vue implementations.
 *
 * @see {@link HtmlRenderer} For raw HTML content
 * @see {@link TemplateRenderer} For Prism template rendering
 * @see {@link ReactMjmlRenderer} For React component rendering
 * @see {@link VueMjmlRenderer} For Vue component rendering
 * @public
 */
export type { Renderer, RenderResult } from './renderers/Renderer'
/**
 * Prism templating engine renderer for email content.
 *
 * Renders Blade-style templates using the Prism template engine. Supports
 * variables, control structures, and template inheritance for complex
 * email layouts and components.
 *
 * @example
 * ```typescript
 * import { Mailable, TemplateRenderer } from '@gravito/signal'
 *
 * class TemplateEmail extends Mailable {
 *   build() {
 *     return this
 *       .to('user@example.com')
 *       .view('emails/welcome', { name: 'Alice' })
 *   }
 * }
 * ```
 *
 * @see {@link Renderer} For the renderer interface
 * @public
 */
export { TemplateRenderer } from './renderers/TemplateRenderer'
/**
 * Vue component renderer with MJML support.
 *
 * Renders Vue single-file components or templates as email content with MJML
 * syntax support, enabling Vue developers to build emails using familiar
 * patterns while maintaining responsive email best practices.
 *
 * @example
 * ```typescript
 * import { Mailable, VueMjmlRenderer } from '@gravito/signal'
 *
 * class VueEmail extends Mailable {
 *   build() {
 *     return this
 *       .to('user@example.com')
 *       .vue('emails/welcome.vue', { name: 'Alice' })
 *   }
 * }
 * ```
 *
 * @see {@link ReactMjmlRenderer} For React component rendering
 * @see {@link Renderer} For the renderer interface
 * @public
 */
export { VueMjmlRenderer } from './renderers/VueMjmlRenderer'

// ─────────────────────────────────────────────────────────────────────────────
// Transport Layer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base transport class with automatic retry and backoff logic.
 *
 * Provides common functionality for all transports, including exponential
 * backoff retry strategy, connection management, and error handling.
 * Extend this class to implement custom transport drivers.
 *
 * @example
 * ```typescript
 * import { BaseTransport, type TransportOptions } from '@gravito/signal'
 *
 * class CustomTransport extends BaseTransport {
 *   async send(message) {
 *     // Custom delivery logic
 *   }
 * }
 * ```
 *
 * @see {@link SmtpTransport} For production SMTP implementation
 * @see {@link Transport} For the interface
 * @public
 */
export { BaseTransport, type TransportOptions } from './transports/BaseTransport'
/**
 * Console logging transport for development environments.
 *
 * Logs all emails to the console instead of sending them. Useful for
 * local development and testing to avoid sending real emails to users.
 *
 * @example
 * ```typescript
 * import { LogTransport } from '@gravito/signal'
 *
 * const mail = new OrbitSignal({
 *   transport: new LogTransport(),
 *   from: { address: 'dev@localhost' }
 * })
 * ```
 *
 * @see {@link MemoryTransport} For in-memory testing
 * @public
 */
export { LogTransport } from './transports/LogTransport'
/**
 * In-memory transport for testing email workflows.
 *
 * Stores sent emails in memory without actual transmission. Perfect for
 * unit tests and integration tests where email sending needs to be verified
 * without external dependencies.
 *
 * @example
 * ```typescript
 * import { MemoryTransport } from '@gravito/signal'
 *
 * const transport = new MemoryTransport()
 * const mail = new OrbitSignal({
 *   transport,
 *   from: { address: 'test@example.com' }
 * })
 *
 * await mail.send(email)
 * assert.equal(transport.sentMessages.length, 1)
 * ```
 *
 * @see {@link LogTransport} For development logging
 * @public
 */
export { MemoryTransport } from './transports/MemoryTransport'

/**
 * AWS SES email transport with automatic retry and rate limit handling.
 *
 * Delivers emails via Amazon Simple Email Service with built-in support
 * for authentication, rate limiting awareness, and automatic retry with
 * exponential backoff suitable for production AWS environments.
 *
 * @example
 * ```typescript
 * import { SesTransport } from '@gravito/signal'
 *
 * const mail = new OrbitSignal({
 *   transport: new SesTransport({
 *     region: 'us-east-1',
 *     retries: 3,
 *     retryDelay: 1000,
 *     retryMultiplier: 2
 *   }),
 *   from: { address: 'verified@example.com' }
 * })
 * ```
 *
 * @see {@link SmtpTransport} For SMTP alternative
 * @see {@link SesWebhookDriver} For bounce/complaint handling
 * @public
 */
export { SesTransport } from './transports/SesTransport'
/**
 * SMTP email transport with connection pooling and automatic retry.
 *
 * Delivers emails via standard SMTP protocol with support for TLS/SSL,
 * connection pooling, and automatic retry with exponential backoff.
 * Compatible with any SMTP server (Gmail, Mailtrap, AWS SES SMTP, etc.).
 *
 * @example
 * ```typescript
 * import { SmtpTransport } from '@gravito/signal'
 *
 * const mail = new OrbitSignal({
 *   transport: new SmtpTransport({
 *     host: 'smtp.mailtrap.io',
 *     port: 2525,
 *     auth: { user: 'username', pass: 'password' },
 *     poolSize: 10
 *   }),
 *   from: { address: 'noreply@example.com' }
 * })
 * ```
 *
 * @see {@link SesTransport} For AWS SES integration
 * @see {@link BaseTransport} For base retry logic
 * @public
 */
export { SmtpTransport } from './transports/SmtpTransport'
/**
 * Transport interface and implementations for email delivery.
 *
 * Defines the contract for email delivery mechanisms and provides built-in
 * transports: SmtpTransport (standard email servers), SesTransport (AWS SES),
 * LogTransport (console output), and MemoryTransport (testing).
 *
 * @see {@link SmtpTransport} For SMTP server integration
 * @see {@link SesTransport} For AWS SES integration
 * @see {@link LogTransport} For development logging
 * @see {@link MemoryTransport} For testing
 * @public
 */
export type { Transport } from './transports/Transport'

// ─────────────────────────────────────────────────────────────────────────────
// Mail Types and Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Email message types and configuration interfaces.
 *
 * Provides TypeScript interfaces for:
 * - Address: Email address with optional display name
 * - Attachment: File attachment configuration
 * - Envelope: Complete email envelope (from, to, cc, bcc, etc.)
 * - MailConfig: OrbitSignal configuration options
 * - Message: Finalized message ready for transport
 *
 * @example
 * ```typescript
 * import type { Address, Attachment, Message, MailConfig } from '@gravito/signal'
 *
 * const config: MailConfig = {
 *   transport: new SmtpTransport({ ... }),
 *   from: { name: 'App', address: 'noreply@app.com' }
 * }
 * ```
 *
 * @public
 */
export type {
  Address,
  Attachment,
  Envelope,
  MailConfig,
  Message,
} from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Drivers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SendGrid webhook driver for handling bounce and complaint events.
 *
 * Processes webhook notifications from SendGrid (bounces, complaints, etc.)
 * and converts them into standardized mail events for logging and analytics.
 *
 * @example
 * ```typescript
 * import { SendGridWebhookDriver } from '@gravito/signal'
 *
 * const driver = new SendGridWebhookDriver()
 * mail.registerWebhookDriver('sendgrid', driver)
 * ```
 *
 * @see {@link SesWebhookDriver} For AWS SES webhooks
 * @public
 */
export { type SendGridWebhookConfig, SendGridWebhookDriver } from './webhooks/SendGridWebhookDriver'

/**
 * AWS SES webhook driver for handling bounce and complaint events.
 *
 * Processes SNS notifications from AWS SES (bounces, complaints, etc.)
 * and converts them into standardized mail events for logging and analytics.
 *
 * @example
 * ```typescript
 * import { SesWebhookDriver } from '@gravito/signal'
 *
 * const driver = new SesWebhookDriver()
 * mail.registerWebhookDriver('ses', driver)
 * ```
 *
 * @see {@link SendGridWebhookDriver} For SendGrid webhooks
 * @public
 */
export { SesWebhookDriver } from './webhooks/SesWebhookDriver'
