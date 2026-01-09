import { describe, expect, it } from 'bun:test'
import { PresenceChannel, PrivateChannel, PublicChannel } from '../src/channels/Channel'

describe('Channels', () => {
  it('creates channel types', () => {
    const publicChannel = new PublicChannel('public-room')
    const privateChannel = new PrivateChannel('private-room')
    const presenceChannel = new PresenceChannel('presence-room')

    expect(publicChannel.type).toBe('public')
    expect(privateChannel.type).toBe('private')
    expect(presenceChannel.type).toBe('presence')
  })
})
