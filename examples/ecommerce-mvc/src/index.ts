/**
 * Application Entry Point
 *
 * Bootstraps and launches the Gravito E-Commerce application.
 */

import { bootstrap } from './bootstrap'

const core = await bootstrap()

export default core.liftoff(3070)
