import { bootstrap } from './bootstrap'

const corePromise = bootstrap()

corePromise.then((core) => {
  const { port, fetch } = core.liftoff()
  Bun.serve({
    port,
    fetch,
  })
})

corePromise.catch((err) => {
  console.error('Failed to bootstrap Workflow Demo:', err)
  process.exit(1)
})
