import { bootstrap } from './bootstrap'

const { core } = await bootstrap({
  port: parseInt(process.env.PORT || '3000'),
  name: process.env.APP_NAME || 'MVC Application',
  version: process.env.APP_VERSION || '1.0.0',
})

const server = core.listen(core.config.PORT)

console.log(`🚀 Server running at http://localhost:${core.config.PORT}`)

export default { core, server }
