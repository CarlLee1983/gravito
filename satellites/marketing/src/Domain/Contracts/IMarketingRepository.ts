import type { Repository } from '@gravito/enterprise'
import type { Marketing } from '../Entities/Marketing'

export interface IMarketingRepository extends Repository<Marketing, string> {
  // Add custom methods here
}
