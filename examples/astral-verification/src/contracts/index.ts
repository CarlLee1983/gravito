// Re-export contracts from the packages/astral/examples directory
// This proves that our examples are actually importable and valid

import { AuthContract } from '../../../../packages/astral/examples/authentication/contract'
import { UserContract } from '../../../../packages/astral/examples/basic-crud/contracts'
import { RiskyResourceContract } from '../../../../packages/astral/examples/custom-errors/contract'

export { UserContract, AuthContract, RiskyResourceContract }
