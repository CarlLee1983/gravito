import { orderWorkflow } from './order'
import { sagaTravelWorkflow } from './saga-travel'
import { supplyChainWorkflow } from './supply-chain'

export const workflows: Record<string, any> = {
  'flux-enterprise-order': orderWorkflow,
  'saga-travel-reservation': sagaTravelWorkflow,
  'global-supply-chain': supplyChainWorkflow,
}
