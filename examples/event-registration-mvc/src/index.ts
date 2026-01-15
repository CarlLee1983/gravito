import appConfig from '@config/app'
import { bootstrap } from './bootstrap'

const core = await bootstrap()

export default core.liftoff(appConfig.port)
