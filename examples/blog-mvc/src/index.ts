import { bootstrap } from './bootstrap'

/**
 * 📝 Gravito Blog MVC Example
 */
const core = await bootstrap({
  port: Number(process.env.PORT) || 3001,
  name: process.env.APP_NAME || 'Gravito Blog MVC',
  version: '1.0.0',
})

export default core.liftoff()
