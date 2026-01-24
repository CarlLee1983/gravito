/**
 * @fileoverview Broadcast manager for Ripple
 *
 * @module @gravito/ripple/events
 */

import type { RippleServer } from '../RippleServer'
import type { BroadcastEvent } from './BroadcastEvent'

export class BroadcastManager {
  constructor(private readonly server: RippleServer) {}

  broadcast(event: BroadcastEvent): void {
    const channels = event.broadcastOn()
    const eventName = event.broadcastAs()
    const data = event.broadcastWith()

    const channelList = Array.isArray(channels) ? channels : [channels]

    for (const channel of channelList) {
      this.server.broadcast(channel.fullName, eventName, data)
    }
  }

  to(channel: string): ChannelBroadcaster {
    return new ChannelBroadcaster(this.server, channel)
  }

  toPrivate(channel: string): ChannelBroadcaster {
    return new ChannelBroadcaster(this.server, `private-${channel}`)
  }

  toPresence(channel: string): ChannelBroadcaster {
    return new ChannelBroadcaster(this.server, `presence-${channel}`)
  }
}

export class ChannelBroadcaster {
  private _except: string[] = []

  constructor(
    private readonly server: RippleServer,
    private readonly channel: string
  ) {}

  except(socketIds: string | string[]): this {
    const ids = Array.isArray(socketIds) ? socketIds : [socketIds]
    this._except.push(...ids)
    return this
  }

  emit(event: string, data: unknown): void {
    this.server.broadcast(this.channel, event, data)
  }
}
