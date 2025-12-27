import { startConsumer } from './consumer'
import { startProvider } from './provider'

const role = process.env.NODE_ROLE
const port = parseInt(process.env.PORT || '3000', 10)
const providerPort = parseInt(process.env.PROVIDER_PORT || '3004', 10)

if (role === 'provider') {
  await startProvider(port)
} else if (role === 'consumer') {
  await startConsumer(port, providerPort)
} else {
  console.error('Unknown role. Set NODE_ROLE=provider|consumer')
  process.exit(1)
}
