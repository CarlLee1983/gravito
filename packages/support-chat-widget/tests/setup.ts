import { beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}

beforeEach(() => {
  // 重置所有 mocks
  vi.clearAllMocks()
  localStorageMock.getItem.mockReturnValue(null)
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

export { localStorageMock }
