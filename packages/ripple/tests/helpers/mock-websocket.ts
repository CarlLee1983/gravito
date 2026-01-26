import { vi } from 'bun:test'
import type { RippleWebSocket } from '../../src/types'

export function createMockWebSocket(onSend?: (data: string) => void): RippleWebSocket {
  return {
    data: {
      id: crypto.randomUUID(),
      channels: new Set<string>(),
    },
    send: vi.fn((data: string) => {
      onSend?.(data)
    }),
    close: vi.fn(),
    readyState: 1,
    remoteAddress: '127.0.0.1',
  } as unknown as RippleWebSocket
}
