import { AppServiceProvider } from './AppServiceProvider'
import { DatabaseProvider } from './DatabaseProvider'
import { HandleInertiaRequests } from './InertiaServiceProvider'
import { RouteProvider } from './RouteProvider'

export const providers = [
  DatabaseProvider,
  AppServiceProvider,
  HandleInertiaRequests,
  RouteProvider,
]

export { DatabaseProvider, AppServiceProvider, RouteProvider, HandleInertiaRequests }
