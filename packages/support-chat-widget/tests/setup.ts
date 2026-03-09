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

beforeEach(() => {
  // 清除存儲內容
  storage.clear()
  // 重置 mock 呼叫記錄
  vi.clearAllMocks()
})

// 確保 window 存在（jsdom 環境）
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  })
}

// 同時設置 globalThis.localStorage（兼容性）
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock global fetch to prevent real network requests during tests
const mockFetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({}),
  })
)
globalThis.fetch = mockFetch

// Mock WebSocket
class WebSocketMock {
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  send = vi.fn()
  close = vi.fn()
}

globalThis.WebSocket = WebSocketMock as unknown as typeof WebSocket

export { localStorageMock, mockFetch }
