/**
 * Reporting Controller
 *
 * 暴露報表系統的 HTTP 接口
 */

import type { GravitoContext, PlanetCore } from '@gravito/core'
import { ReportQueueManager } from './ReportQueueManager'
import { ReportStorageManager } from './ReportStorageManager'
import { ReportUIManager } from './ReportUIManager'

export class ReportingController {
  private uiManager: ReportUIManager
  private queueManager: ReportQueueManager
  private storageManager: ReportStorageManager

  constructor(private core: PlanetCore) {
    this.uiManager = new ReportUIManager()
    // 這些管理器在實際應用中應該從容器取得，這裡為了演示直接實例化
    this.queueManager = new ReportQueueManager()
    this.storageManager = new ReportStorageManager()

    // 註冊示例處理器
    this.registerSampleProcessors()
  }

  /**
   * 註冊示例報表處理器
   */
  private registerSampleProcessors(): void {
    // 銷售報表處理器
    this.queueManager.registerProcessor('sales', async (job) => {
      this.core.logger.info(`[Reporting] Generating sales report for job: ${job.jobId}`)
      // 模擬生成延遲
      await new Promise((resolve) => setTimeout(resolve, 500))
      return {
        type: 'sales',
        generatedAt: new Date().toISOString(),
        records: 150,
        totalAmount: 45000,
      }
    })

    // 庫存報表處理器
    this.queueManager.registerProcessor('inventory', async (job) => {
      this.core.logger.info(`[Reporting] Generating inventory report for job: ${job.jobId}`)
      await new Promise((resolve) => setTimeout(resolve, 300))
      return {
        type: 'inventory',
        generatedAt: new Date().toISOString(),
        itemsCount: 1200,
        lowStockItems: 15,
      }
    })
  }

  /**
   * GET /api/reports
   * 獲取報表列表
   */
  async index(ctx: GravitoContext): Promise<void> {
    try {
      const reports = await this.uiManager.getReportList()
      ctx.json({
        success: true,
        data: reports,
      })
    } catch (error) {
      ctx.status(500)
      ctx.json({ success: false, error: String(error) })
    }
  }

  /**
   * GET /api/reports/:id
   * 獲取報表詳情
   */
  async show(ctx: GravitoContext): Promise<void> {
    try {
      const id = ctx.req.param('id')
      const report = await this.uiManager.getReportDetails(id)
      if (!report) {
        ctx.status(404)
        ctx.json({ success: false, error: 'Report not found' })
        return
      }
      ctx.json({
        success: true,
        data: report,
      })
    } catch (error) {
      ctx.status(500)
      ctx.json({ success: false, error: String(error) })
    }
  }

  /**
   * POST /api/reports/generate
   * 提交報表生成任務
   */
  async generate(ctx: GravitoContext): Promise<void> {
    try {
      const body = (await ctx.req.json()) as any
      const jobId = this.queueManager.submitJob(
        body.reportType || 'sales',
        body.data || {},
        body.priority || 'medium'
      )
      ctx.status(202)
      ctx.json({
        success: true,
        data: { jobId },
      })
    } catch (error) {
      ctx.status(500)
      ctx.json({ success: false, error: String(error) })
    }
  }

  /**
   * GET /api/reports/status/:jobId
   * 查詢任務狀態
   */
  async jobStatus(ctx: GravitoContext): Promise<void> {
    try {
      const jobId = ctx.req.param('jobId')
      const job = this.queueManager.getJobStatus(jobId)
      if (!job) {
        ctx.status(404)
        ctx.json({ success: false, error: 'Job not found' })
        return
      }
      ctx.json({
        success: true,
        data: job,
      })
    } catch (error) {
      ctx.status(500)
      ctx.json({ success: false, error: String(error) })
    }
  }

  /**
   * GET /api/reports/stats
   * 獲取報表統計
   */
  async stats(ctx: GravitoContext): Promise<void> {
    try {
      const stats = this.storageManager.getStats()
      ctx.json({
        success: true,
        data: stats,
      })
    } catch (error) {
      ctx.status(500)
      ctx.json({ success: false, error: String(error) })
    }
  }
}
