import { AppServiceProvider } from './AppServiceProvider'
import { DatabaseProvider } from './DatabaseProvider'
import { InertiaServiceProvider } from './InertiaServiceProvider'
import { RouteProvider } from './RouteProvider'

export const providers = [
  DatabaseProvider,
  AppServiceProvider,
  InertiaServiceProvider,
  RouteProvider,
]

export { DatabaseProvider, AppServiceProvider, RouteProvider, InertiaServiceProvider }
