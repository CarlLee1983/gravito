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

export type { Queueable } from '@gravito/stream'
export { DevMailbox, type MailboxEntry } from './dev/DevMailbox'
export { MailErrorCode, MailTransportError } from './errors'
export type { MailEvent, MailEventHandler, MailEventType } from './events'
export { Mailable } from './Mailable'
export { OrbitSignal } from './OrbitSignal'
export { HtmlRenderer } from './renderers/HtmlRenderer'
export type { Renderer, RenderResult } from './renderers/Renderer'
export { TemplateRenderer } from './renderers/TemplateRenderer'
export { TypedMailable } from './TypedMailable'
export { BaseTransport, type TransportOptions } from './transports/BaseTransport'
export { LogTransport } from './transports/LogTransport'
export { MemoryTransport } from './transports/MemoryTransport'
export { SesTransport } from './transports/SesTransport'
export { SmtpTransport } from './transports/SmtpTransport'

export type { Transport } from './transports/Transport'
export type {
  Address,
  Attachment,
  Envelope,
  MailConfig,
  Message,
} from './types'
