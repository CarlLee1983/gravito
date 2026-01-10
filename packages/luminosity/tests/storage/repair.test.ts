import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { appendFile, mkdir, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { JsonlLogger } from '../../src/storage/JsonlLogger'

describe('JsonlLogger Repair', () => {
  const testLogPath = join(process.cwd(), 'test-data', 'corrupted.jsonl')

  beforeEach(async () => {
    await mkdir(dirname(testLogPath), { recursive: true })
  })

  afterEach(async () => {
    try {
      await unlink(testLogPath)
    } catch {}
  })

  it('should remove corrupted JSON lines and keep valid ones', async () => {
    const validEntry = { op: 'add', timestamp: 123, url: '/ok' }
    const corruptedLine = '{ "op": "add", "timestamp": 456, "url": "/corrupted" ' // Missing closing brace
    const anotherValid = { op: 'remove', timestamp: 789, url: '/ok' }

    await appendFile(
      testLogPath,
      `${JSON.stringify(validEntry)}
`
    )
    await appendFile(
      testLogPath,
      `${corruptedLine}
`
    )
    await appendFile(
      testLogPath,
      `${JSON.stringify(anotherValid)}
`
    )

    const logger = new JsonlLogger(testLogPath)
    const removedCount = await logger.repairWAL()

    expect(removedCount).toBe(1)

    const remaining = await logger.readAll()
    expect(remaining.length).toBe(2)
    expect(remaining[0].url).toBe('/ok')
    expect(remaining[1].op).toBe('remove')
  })

  it('should return 0 when no corruption is found', async () => {
    const logger = new JsonlLogger(testLogPath)
    await logger.append({ op: 'add', timestamp: 1, url: '/1' })
    await logger.append({ op: 'add', timestamp: 2, url: '/2' })

    const removedCount = await logger.repairWAL()
    expect(removedCount).toBe(0)

    const remaining = await logger.readAll()
    expect(remaining.length).toBe(2)
  })
})
