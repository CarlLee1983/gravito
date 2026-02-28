import { UseCase } from '@gravito/enterprise'
import type { IDataPointRepository } from '../../Domain/Contracts/IAnalyticsRepository'
import {
  DataIngestionContext,
  type IngestEventInput,
} from '../../Domain/DCI/Contexts/DataIngestionContext'

export interface IngestDataInput {
  events: IngestEventInput[]
}

export interface IngestDataOutput {
  success: boolean
  count: number
}

export class IngestData extends UseCase<IngestDataInput, IngestDataOutput> {
  constructor(private readonly dataPointRepo: IDataPointRepository) {
    super()
  }

  async execute(input: IngestDataInput): Promise<IngestDataOutput> {
    const ctx = new DataIngestionContext(this.dataPointRepo)
    await ctx.ingestBatch(input.events)
    return {
      success: true,
      count: input.events.length,
    }
  }
}
