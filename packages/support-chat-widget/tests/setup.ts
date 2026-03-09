import { beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Mock localStorage with actual storage behavior
const storage = new Map<string, string>()

const localStorageMock = {
  getItem: vi.fn((key: string) => storage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
  removeItem: vi.fn((key: string) => storage.delete(key)),
  clear: vi.fn(() => storage.clear()),
  get length() {
    return storage.size
  },
  key: vi.fn((index: number) => {
    const keys = Array.from(storage.keys())
    return keys[index] ?? null
  }),
}

// Mock global fetch to prevent real network requests during tests
const mockFetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({}),
  })
)

// Mock WebSocket
class WebSocketMock {
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  send = vi.fn()
  close = vi.fn()
}

beforeEach(() => {
  // Clear storage and mocks
  storage.clear()
  vi.clearAllMocks()

  // Reset mockFetch default implementation for each test
  mockFetch.mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: async () => ({}),
    })
  )

  // Use vi.stubGlobal for better environment isolation (works for globalThis and window)
  vi.stubGlobal('fetch', mockFetch)
  vi.stubGlobal('localStorage', localStorageMock)
  vi.stubGlobal('WebSocket', WebSocketMock)
})

export { localStorageMock, mockFetch }
