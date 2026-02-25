import { bootstrap } from './bootstrap'

const { core } = await bootstrap(parseInt(process.env.PORT || '3000', 10))
const server = core.listen(core.config.PORT)

console.log(`🚀 DDD Application running at http://localhost:${core.config.PORT}`)

export default { core, server }
