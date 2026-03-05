import { bootstrap } from './bootstrap'

const port = Number.parseInt(process.env.PORT ?? '3000', 10)
const { core } = await bootstrap(port)

const { port: finalPort, fetch } = core.liftoff(port)
const server = Bun.serve({ port: finalPort, fetch })

console.log(`🚀 station-ddd running at http://localhost:${server.port}`)

export default { core, server }
