import { startServer } from './server'

const port = parseInt(process.env.PORT || '3000', 10)
await startServer(port)
