import { startClient } from './client'
import { startServer } from './server'

const role = process.env.NODE_ROLE
const name = process.env.INSTANCE_NAME || 'Unknown'
const port = parseInt(process.env.PORT || '3000', 10)

console.log(`Starting ${name} as ${role} on port ${port}`)

if (role === 'server') {
  await startServer(port, name)
} else if (role === 'client') {
  await startClient(port, name)
} else {
  console.error('Unknown role. Set NODE_ROLE=server|client')
  process.exit(1)
}
