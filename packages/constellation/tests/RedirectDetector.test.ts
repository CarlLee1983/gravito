import { describe, expect, it, mock } from 'bun:test'
import { RedirectDetector } from '../src/redirect/RedirectDetector'

describe('RedirectDetector', () => {
  it('rejects unsafe database identifiers', async () => {
    const connection = {
      query: mock(async () => []),
    }

    const detector = new RedirectDetector({
      baseUrl: 'https://example.com',
      database: {
        enabled: true,
        table: 'redirects; DROP TABLE users',
        columns: {
          from: 'from_path',
          to: 'to_path',
          type: 'status_code',
        },
        connection,
      },
    })

    await expect(detector.detect('/old')).resolves.toBeNull()
    expect(connection.query).not.toHaveBeenCalled()
  })

  it('uses validated identifiers for database redirect lookups', async () => {
    const connection = {
      query: mock(async () => [
        {
          from_path: '/old',
          to_path: '/new',
          status_code: '301',
        },
      ]),
    }

    const detector = new RedirectDetector({
      baseUrl: 'https://example.com',
      database: {
        enabled: true,
        table: 'redirects',
        columns: {
          from: 'from_path',
          to: 'to_path',
          type: 'status_code',
        },
        connection,
      },
    })

    await expect(detector.detect('/old')).resolves.toEqual({
      from: '/old',
      to: '/new',
      type: 301,
    })
    expect(connection.query).toHaveBeenCalledWith(
      'SELECT from_path, to_path, status_code FROM redirects WHERE from_path = ? LIMIT 1',
      ['/old']
    )
  })
})
