import { serveStatic } from '@gravito/photon/bun'
import { bootstrap } from './bootstrap'

const core = await bootstrap()
// biome-ignore lint/suspicious/noExplicitAny: Internal
const app = core.app as any

// Static assets
app.use('/static/*', serveStatic({ root: './' }))
app.get('/favicon.ico', serveStatic({ path: './static/favicon.ico' }))

export default core.liftoff()
