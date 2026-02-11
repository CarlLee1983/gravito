/**
 * Rollback Manager
 * 回滾管理器
 *
 * 職責：
 * 1. 管理回滾計劃和流程
 * 2. 支持多層級回滾
 * 3. 驗證回滾成功性
 * 4. 記錄和審計
 */

export interface RollbackPoint {
  id: string
  timestamp: Date
  version: string
  description: string
  dataSnapshot?: Map<string, any>
  configSnapshot?: Record<string, any>
}

export interface RollbackPlan {
  planId: string
  createdAt: Date
  rollbackPoints: RollbackPoint[]
  estimatedDuration: number // 秒
  riskLevel: 'low' | 'medium' | 'high'
  steps: RollbackStep[]
}

export interface RollbackStep {
  stepId: string
  order: number
  name: string
  action: 'switch-traffic' | 'restore-config' | 'restore-data' | 'verify'
  target: string
  estimatedDuration: number // 秒
  retries: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  error?: string
}

export interface RollbackResult {
  planId: string
  status: 'success' | 'partial' | 'failed'
  startTime: Date
  endTime: Date
  duration: number // 毫秒
  completedSteps: number
  failedSteps: number
  details: string[]
  recoveryNeeded?: string[]
}

/**
 * 回滾管理器
 */
export class RollbackManager {
  private rollbackPoints: Map<string, RollbackPoint> = new Map()
  private rollbackPlans: Map<string, RollbackPlan> = new Map()
  private executionHistory: RollbackResult[] = []
  private eventListeners: Map<string, Function[]> = new Map()

  /**
   * 創建回滾點
   */
  createRollbackPoint(
    version: string,
    description: string,
    dataSnapshot?: Map<string, any>,
    configSnapshot?: Record<string, any>
  ): RollbackPoint {
    const point: RollbackPoint = {
      id: `rollback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      version,
      description,
      dataSnapshot,
      configSnapshot,
    }

    this.rollbackPoints.set(point.id, point)
    this.emit('rollback-point:created', point)

    return point
  }

  /**
   * 生成回滾計劃
   */
  generateRollbackPlan(fromVersion: string, toVersion: string, reason: string): RollbackPlan {
    const targetPoint = Array.from(this.rollbackPoints.values()).find(
      (p) => p.version === toVersion
    )

    if (!targetPoint) {
      throw new Error(`回滾點不存在: ${toVersion}`)
    }

    const steps: RollbackStep[] = [
      {
        stepId: 'step-1',
        order: 1,
        name: '停止接受新請求',
        action: 'switch-traffic',
        target: 'load-balancer',
        estimatedDuration: 10,
        retries: 2,
        status: 'pending',
      },
      {
        stepId: 'step-2',
        order: 2,
        name: '等待運行中請求完成',
        action: 'switch-traffic',
        target: 'in-flight-requests',
        estimatedDuration: 30,
        retries: 1,
        status: 'pending',
      },
      {
        stepId: 'step-3',
        order: 3,
        name: '恢復配置',
        action: 'restore-config',
        target: 'application-config',
        estimatedDuration: 20,
        retries: 2,
        status: 'pending',
      },
      {
        stepId: 'step-4',
        order: 4,
        name: '恢復數據',
        action: 'restore-data',
        target: 'database',
        estimatedDuration: 60,
        retries: 2,
        status: 'pending',
      },
      {
        stepId: 'step-5',
        order: 5,
        name: '驗證恢復',
        action: 'verify',
        target: 'all-services',
        estimatedDuration: 30,
        retries: 1,
        status: 'pending',
      },
      {
        stepId: 'step-6',
        order: 6,
        name: '恢復接受請求',
        action: 'switch-traffic',
        target: 'load-balancer',
        estimatedDuration: 10,
        retries: 1,
        status: 'pending',
      },
    ]

    const totalDuration = steps.reduce((sum, step) => sum + step.estimatedDuration, 0)

    const plan: RollbackPlan = {
      planId: `plan-${Date.now()}`,
      createdAt: new Date(),
      rollbackPoints: [targetPoint],
      estimatedDuration: totalDuration,
      riskLevel: this.assessRiskLevel(fromVersion, toVersion),
      steps,
    }

    this.rollbackPlans.set(plan.planId, plan)
    this.emit('rollback-plan:generated', {
      planId: plan.planId,
      reason,
      estimatedDuration: totalDuration,
    })

    return plan
  }

  /**
   * 執行回滾
   */
  async executeRollback(planId: string): Promise<RollbackResult> {
    const plan = this.rollbackPlans.get(planId)

    if (!plan) {
      throw new Error(`回滾計劃不存在: ${planId}`)
    }

    const startTime = new Date()
    const details: string[] = []
    const recoveryNeeded: string[] = []

    this.emit('rollback:start', { planId, estimatedDuration: plan.estimatedDuration })

    let completedSteps = 0
    let failedSteps = 0

    for (const step of plan.steps) {
      step.status = 'running'
      this.emit('rollback:step:start', { stepId: step.stepId, name: step.name })

      try {
        const success = await this.executeStep(step)

        if (success) {
          step.status = 'completed'
          completedSteps++
          details.push(`✓ ${step.name}`)
        } else {
          step.status = 'failed'
          failedSteps++
          details.push(`✗ ${step.name} (需要手動介入)`)
          recoveryNeeded.push(step.name)
        }
      } catch (error) {
        step.status = 'failed'
        step.error = String(error)
        failedSteps++
        details.push(`✗ ${step.name}: ${String(error)}`)
        recoveryNeeded.push(step.name)
      }

      this.emit('rollback:step:completed', {
        stepId: step.stepId,
        status: step.status,
        error: step.error,
      })

      // 遇到失敗但不是最後一步，暫停並詢問是否繼續
      if (failedSteps > 0 && step.order < plan.steps.length) {
        this.emit('rollback:paused', {
          stepId: step.stepId,
          reason: '步驟失敗，需要人工決定是否繼續',
        })
      }
    }

    const endTime = new Date()

    const result: RollbackResult = {
      planId,
      status: failedSteps === 0 ? 'success' : failedSteps < completedSteps ? 'partial' : 'failed',
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      completedSteps,
      failedSteps,
      details,
      recoveryNeeded: recoveryNeeded.length > 0 ? recoveryNeeded : undefined,
    }

    this.executionHistory.push(result)
    this.emit('rollback:completed', result)

    return result
  }

  /**
   * 執行單個回滾步驟
   */
  private async executeStep(step: RollbackStep): Promise<boolean> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < step.retries; attempt++) {
      try {
        // 模擬步驟執行
        await this.performAction(step.action, step.target)

        // 驗證
        const verified = await this.verifyStep(step)
        if (verified) {
          return true
        }
      } catch (error) {
        lastError = error as Error
        console.error(`步驟 ${step.stepId} 執行失敗 (嘗試 ${attempt + 1}):`, error)

        if (attempt < step.retries - 1) {
          // 等待後重試（更短的延遲）
          await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)))
        }
      }
    }

    if (lastError) {
      throw lastError
    }

    return false
  }

  /**
   * 執行操作
   */
  private async performAction(action: string, target: string): Promise<void> {
    console.log(`執行操作: ${action} on ${target}`)

    // 模擬操作執行時間（更短）
    const duration = Math.random() * 100 + 50

    await new Promise((resolve) => setTimeout(resolve, duration))
  }

  /**
   * 驗證步驟
   */
  private async verifyStep(step: RollbackStep): Promise<boolean> {
    // 驗證邏輯
    if (step.action === 'switch-traffic') {
      return true // 假設流量切換成功
    }

    if (step.action === 'restore-config') {
      return true // 假設配置恢復成功
    }

    if (step.action === 'restore-data') {
      return true // 假設數據恢復成功
    }

    if (step.action === 'verify') {
      // 驗證所有服務
      return Math.random() > 0.1 // 90% 成功率
    }

    return true
  }

  /**
   * 評估風險等級
   */
  private assessRiskLevel(fromVersion: string, toVersion: string): 'low' | 'medium' | 'high' {
    // 簡單的風險評估: 根據版本差異計算
    const fromNum = parseInt(fromVersion.split('.').join(''), 10)
    const toNum = parseInt(toVersion.split('.').join(''), 10)
    const diff = Math.abs(fromNum - toNum)

    if (diff === 1) {
      return 'low'
    } else if (diff <= 3) {
      return 'medium'
    } else {
      return 'high'
    }
  }

  /**
   * 獲取回滾計劃
   */
  getRollbackPlan(planId: string): RollbackPlan | undefined {
    return this.rollbackPlans.get(planId)
  }

  /**
   * 獲取執行歷史
   */
  getExecutionHistory(): RollbackResult[] {
    return [...this.executionHistory]
  }

  /**
   * 生成回滾報告
   */
  generateRollbackReport(result: RollbackResult): string {
    const lines = [
      '='.repeat(70),
      'ROLLBACK EXECUTION REPORT',
      '='.repeat(70),
      '',
      `Plan ID: ${result.planId}`,
      `Status: ${result.status.toUpperCase()}`,
      `Duration: ${result.duration}ms`,
      `Start Time: ${result.startTime.toISOString()}`,
      `End Time: ${result.endTime.toISOString()}`,
      '',
      `Completed Steps: ${result.completedSteps}`,
      `Failed Steps: ${result.failedSteps}`,
      '',
      '--- DETAILS ---',
    ]

    for (const detail of result.details) {
      lines.push(detail)
    }

    if (result.recoveryNeeded && result.recoveryNeeded.length > 0) {
      lines.push('', '--- RECOVERY NEEDED ---')
      for (const item of result.recoveryNeeded) {
        lines.push(`⚠️ ${item}`)
      }
    }

    lines.push('', '='.repeat(70))
    return lines.join('\n')
  }

  /**
   * 事件監聽
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  /**
   * 觸發事件
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(data)
        } catch (error) {
          console.error(`[RollbackManager] Event listener error for ${event}:`, error)
        }
      }
    }
  }
}
