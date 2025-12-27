import { appendFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { BroadcastDriver } from '@gravito/radiance'

const STORAGE_PATH = join(process.cwd(), 'storage/broadcast_log.jsonl')

export class FileSystemDriver implements BroadcastDriver {
  async broadcast(
    channel: { name: string; type: string },
    event: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const payload = JSON.stringify({
      channel: channel.name,
      type: channel.type,
      event,
      data,
      timestamp: Date.now(),
    })

    await appendFile(STORAGE_PATH, `${payload}\n`)
  }

  async authorizeChannel(
    _channel: string,
    _socketId: string,
    _userId?: string | number
  ): Promise<{ auth: string; channel_data?: string }> {
    return { auth: 'mock-auth-token' }
  }
}
