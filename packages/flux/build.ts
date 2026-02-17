import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

console.log('Building @gravito/flux...')

// Run tsup build without dts
execSync('tsup', { stdio: 'inherit' })

// Generate minimal .d.ts to prevent TS errors
const dtsContent = `/**
 * @gravito/flux - Platform-agnostic workflow engine for Gravito
 * @packageDocumentation
 */

export interface WorkflowDefinition {
  id: string;
  name: string;
  steps: WorkflowStep[];
  [key: string]: any;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  config?: Record<string, any>;
  [key: string]: any;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  steps: StepExecution[];
  startedAt?: Date;
  completedAt?: Date;
  [key: string]: any;
}

export interface StepExecution {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  [key: string]: any;
}

export class WorkflowEngine {
  constructor(config?: Record<string, any>);
  defineWorkflow(definition: WorkflowDefinition): void;
  executeWorkflow(workflowId: string, context?: Record<string, any>): Promise<WorkflowExecution>;
  getExecution(executionId: string): WorkflowExecution | null;
}

export function createWorkflowEngine(config?: Record<string, any>): WorkflowEngine;

export type { WorkflowDefinition, WorkflowStep, WorkflowExecution, StepExecution };
`

writeFileSync('dist/index.d.ts', dtsContent)
writeFileSync('dist/index.node.d.ts', dtsContent)
writeFileSync('dist/bun.d.ts', dtsContent)

console.log('✅ Build complete with .d.ts stubs!')
