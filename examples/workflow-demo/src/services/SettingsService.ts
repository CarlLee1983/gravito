import { randomUUID } from 'node:crypto'
import { DB } from '@gravito/atlas'

type Settings = {
  theme: 'light' | 'dark'
  notifications: boolean
}

export class SettingsService {
  async get(userId: string): Promise<Settings> {
    const record = await DB.table('settings').where('user_id', userId).first()
    if (record) {
      return {
        theme: record.theme as Settings['theme'],
        notifications: Boolean(record.notifications),
      }
    }
    const defaults: Settings = { theme: 'light', notifications: true }
    await DB.table('settings').insert({
      id: randomUUID(),
      user_id: userId,
      ...defaults,
    })
    return defaults
  }

  async update(userId: string, updates: Partial<Settings>): Promise<Settings> {
    const current = await this.get(userId)
    const next = { ...current, ...updates }
    await DB.table('settings').where('user_id', userId).update(next)
    return next
  }
}
