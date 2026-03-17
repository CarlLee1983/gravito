import { describe, expect, it, mock, spyOn } from 'bun:test'
import { FileStorage } from '../src/storage/FileStorage'

describe('FileStorage', () => {
  it('should not keep phantom cache entries when append fails', async () => {
    const storage = new FileStorage({ directory: '/tmp/gravito-spectrum-test' })

    ;(storage as any).runtime = {
      exists: async () => true,
      appendFile: async () => {
        throw new Error('disk full')
      },
    }

    const errorSpy = spyOn(console, 'error').mockImplementation(() => {})

    try {
      await storage.storeRequest({ id: 'req-1' } as any)

      expect(await storage.getRequests()).toEqual([])
      expect(errorSpy).toHaveBeenCalled()
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('should update cache after successful appendFile persistence', async () => {
    const storage = new FileStorage({ directory: '/tmp/gravito-spectrum-test' })
    const appendFile = mock(async () => {})

    ;(storage as any).runtime = {
      exists: async () => true,
      appendFile,
    }

    await storage.storeLog({ id: 'log-1' } as any)

    expect(appendFile).toHaveBeenCalled()
    expect(await storage.getLogs()).toEqual([{ id: 'log-1' }])
  })
})
