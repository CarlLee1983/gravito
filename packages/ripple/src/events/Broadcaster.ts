/**
 * @fileoverview Broadcaster for sending events to channels
 *
 * @module @gravito/ripple/events
 */

import type { RippleServer } from '../RippleServer'
import type { BroadcastEvent } from './BroadcastEvent'
import { BroadcastManager } from './BroadcastManager'

let globalRippleServer: RippleServer | null = null

/**
 * @deprecated Use BroadcastManager instead. Will be removed in v4.0.
 */
export function setRippleServer(server: RippleServer): void {
  globalRippleServer = server
}

/**
 * @deprecated Use BroadcastManager instead. Will be removed in v4.0.
 */
export function getRippleServer(): RippleServer | null {
  return globalRippleServer
}

/**
 * @deprecated Use BroadcastManager.broadcast() instead. Will be removed in v4.0.
 *
 * @example
 * ```typescript
 * const manager = container.make<BroadcastManager>('broadcast')
 * manager.broadcast(new OrderShipped(order))
 * ```
 */
export function broadcast(event: BroadcastEvent): void {
  if (!globalRippleServer) {
    console.warn('[Ripple] No server configured. Use BroadcastManager instead.')
    return
  }

  const manager = new BroadcastManager(globalRippleServer)
  manager.broadcast(event)
}

/**
 * @deprecated Use BroadcastManager instead. Will be removed in v4.0.
 *
 * @example
 * ```typescript
 * const manager = container.make<BroadcastManager>('broadcast')
 * manager.to('orders.123').emit('OrderUpdated', { status: 'shipped' })
 * ```
 */
export class Broadcaster {
  private _channel: string
  private _except: string[] = []

  private constructor(channel: string) {
    this._channel = channel
  }

  static to(channel: string): Broadcaster {
    return new Broadcaster(channel)
  }

  static toPrivate(channel: string): Broadcaster {
    return new Broadcaster(`private-${channel}`)
  }

  static toPresence(channel: string): Broadcaster {
    return new Broadcaster(`presence-${channel}`)
  }

  except(socketIds: string | string[]): this {
    const ids = Array.isArray(socketIds) ? socketIds : [socketIds]
    this._except.push(...ids)
    return this
  }

  emit(event: string, data: unknown): void {
    if (!globalRippleServer) {
      console.warn('[Ripple] No server configured. Use BroadcastManager instead.')
      return
    }

    globalRippleServer.broadcast(this._channel, event, data)
  }
}
