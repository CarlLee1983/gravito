import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { DevMailbox } from '../src/dev/DevMailbox'
import { FileMailboxStorage } from '../src/dev/storage/FileMailboxStorage'
import type { Message } from '../src/types'

describe('FileMailboxStorage Persistence', () => {
  const testDir = join(import.meta.dir, 'tmp-mailbox')
  const mockMessage: Message = {
    from: { address: 'from@example.com' },
    to: [{ address: 'to@example.com' }],
    subject: 'Persistent Subject',
    html: '<h1>Hello</h1>',
  }

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  it('should persist messages to disk and survive re-instantiation', async () => {
    const storage1 = new FileMailboxStorage(testDir)
    const mailbox1 = new DevMailbox(10, storage1)

    await mailbox1.add({ ...mockMessage, subject: 'First Message' })
    await mailbox1.add({ ...mockMessage, subject: 'Second Message' })

    const list1 = await mailbox1.list()
    expect(list1.length).toBe(2)

    // Simulate server restart by creating new instance with same dir
    const storage2 = new FileMailboxStorage(testDir)
    const mailbox2 = new DevMailbox(10, storage2)

    const list2 = await mailbox2.list()
    expect(list2.length).toBe(2)
    expect(list2[0].envelope.subject).toBe('Second Message')
  })

  it('should trim files according to max entries', async () => {
    const storage = new FileMailboxStorage(testDir)
    const mailbox = new DevMailbox(3, storage)

    for (let i = 0; i < 5; i++) {
      await mailbox.add({ ...mockMessage, subject: `Msg ${i}` })
    }

    const list = await mailbox.list()
    expect(list.length).toBe(3)
    expect(list[0].envelope.subject).toBe('Msg 4')
  })
})
