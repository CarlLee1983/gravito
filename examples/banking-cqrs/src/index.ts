import { defineConfig, PhotonAdapter, PlanetCore } from '@gravito/core'
import { bootstrapDatabase } from './bootstrap'

const core = new PlanetCore(
  defineConfig({
    adapter: new PhotonAdapter(),
  })
)

const port = parseInt(process.env.PORT || '3000')

core.boot(async () => {
  await bootstrapDatabase(core)
})

core.listen(port, () => {
  console.log(`🏦 CQRS 銀行應用已啟動: http://localhost:${port}`)
})
