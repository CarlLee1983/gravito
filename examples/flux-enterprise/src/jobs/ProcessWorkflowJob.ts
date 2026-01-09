import { FluxEngine } from '@gravito/flux'
import { Job } from '@gravito/stream'

export interface WorkflowJobPayload {
  workflowName: string
  input: any
}

export class ProcessWorkflowJob extends Job {
  constructor(public payload: WorkflowJobPayload) {
    super()
  }

  async handle(): Promise<void> {
    console.log(`[Job] Processing workflow: ${this.payload.workflowName}`, this.payload.input)
    const { workflows } = await import('../workflows') // Dynamic import to avoid circular dep
    const workflow = workflows[this.payload.workflowName]
    if (!workflow) {
      throw new Error(`Workflow not found: ${this.payload.workflowName}`)
    }

    const { engine } = await import('../flux')
    await engine.execute(workflow as any, this.payload.input)
  }
}
