import { describe, expect, it } from 'bun:test'

import { ConnectionState, FrameProtocol, LineProtocol } from '../src/index'

describe('@gravito/quark', () => {
  it('exports frame protocol primitives that round-trip messages', () => {
    const protocol = new FrameProtocol({ headerSize: 4 })
    const encoded = protocol.encode('hello')
    const parsed = protocol.parse(encoded)

    expect(parsed).not.toBeNull()
    expect(protocol.decodeString(parsed!.message)).toBe('hello')
    expect(parsed!.remaining).toHaveLength(0)
  })

  it('exports line protocol and connection state', () => {
    const protocol = new LineProtocol()
    const encoded = protocol.encode('ping')
    const parsed = protocol.parse(encoded)

    expect(parsed?.message).toBe('ping')
    expect(ConnectionState.CONNECTED).toBeDefined()
  })
})
