import type { GravitoContext } from '@gravito/core'
import type { DemoUser } from '../services/AuthService'
import { SettingsService } from '../services/SettingsService'

const settingsService = new SettingsService()

export class SettingsController {
  index = async (ctx: GravitoContext) => {
    const user = ctx.get('user') as DemoUser
    const settings = await settingsService.get(user.id)
    return ctx.json({ settings })
  }

  update = async (ctx: GravitoContext) => {
    const payload = await ctx.req.json()
    const user = ctx.get('user') as DemoUser
    const settings = await settingsService.update(user.id, payload)
    return ctx.json({ settings })
  }
}
