import { startAllConsumers } from './consumers'

startAllConsumers().catch((error) => {
  console.error('Consumer crashed', error)
  process.exit(1)
})
