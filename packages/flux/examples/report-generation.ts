/**
 * @fileoverview 報表產生工作流程 (長時間任務)
 *
 * 展示資料聚合、PDF 產生、上傳、通知流程。
 *
 * @example
 * ```bash
 * bun run examples/report-generation.ts
 * ```
 */

import { FluxEngine, createWorkflow, MemoryStorage } from '../src'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface ReportInput {
    reportType: 'monthly' | 'quarterly'
    dateRange: { start: Date; end: Date }
    requestedBy: string
}

interface SalesData {
    orderId: string
    total: number
    date: Date
}

// ─────────────────────────────────────────────────────────────
// Mock Services
// ─────────────────────────────────────────────────────────────

const db = {
    orders: {
        async aggregate(_params: { dateRange: { start: Date; end: Date } }): Promise<SalesData[]> {
            console.log('  📊 Aggregating sales data...')
            await new Promise((r) => setTimeout(r, 500)) // Simulate slow query

            // Generate mock data
            return Array.from({ length: 150 }, (_, i) => ({
                orderId: `ORD-${1000 + i}`,
                total: Math.floor(Math.random() * 500) + 50,
                date: new Date(),
            }))
        },
    },
    users: {
        async getMetrics(_range: { start: Date; end: Date }): Promise<{ new: number; active: number }> {
            console.log('  👥 Fetching user metrics...')
            await new Promise((r) => setTimeout(r, 300))
            return { new: 234, active: 1567 }
        },
    },
}

const pdfGenerator = {
    async create(options: { template: string; data: Record<string, unknown> }): Promise<Uint8Array> {
        console.log(`  📄 Generating ${options.template} PDF...`)
        console.log('     Metrics:', options.data)
        await new Promise((r) => setTimeout(r, 400))

        // Return mock PDF buffer
        return new Uint8Array([0x25, 0x50, 0x44, 0x46]) // %PDF magic bytes
    },
}

const s3 = {
    async upload(key: string, _buffer: Uint8Array): Promise<string> {
        console.log(`  ☁️ Uploading to s3://${key}`)
        await new Promise((r) => setTimeout(r, 200))
        return `https://reports.example.com/${key}`
    },
}

const email = {
    async send(to: string, template: string, data: Record<string, unknown>): Promise<void> {
        console.log(`  📧 Sending ${template} to ${to}`)
        console.log('     Download URL:', data.url)
    },
}

// ─────────────────────────────────────────────────────────────
// Workflow Definition
// ─────────────────────────────────────────────────────────────

const reportWorkflow = createWorkflow('generate-report')
    .input<ReportInput>()
    .step('fetch-sales', async (ctx) => {
        console.log('\n📊 Step: fetch-sales')

        ctx.data.sales = await db.orders.aggregate({
            dateRange: ctx.input.dateRange,
        })

        console.log(`  Found ${(ctx.data.sales as SalesData[]).length} orders`)
    }, { timeout: 60000 })
    .step('fetch-users', async (ctx) => {
        console.log('\n👥 Step: fetch-users')

        ctx.data.users = await db.users.getMetrics(ctx.input.dateRange)
    })
    .step('calculate', async (ctx) => {
        console.log('\n🧮 Step: calculate')

        const sales = ctx.data.sales as SalesData[]

        ctx.data.metrics = {
            revenue: sales.reduce((sum, s) => sum + s.total, 0),
            orders: sales.length,
            averageOrderValue: sales.length > 0
                ? Math.round(sales.reduce((sum, s) => sum + s.total, 0) / sales.length)
                : 0,
            newUsers: (ctx.data.users as { new: number }).new,
            activeUsers: (ctx.data.users as { active: number }).active,
        }

        console.log('  Metrics:', ctx.data.metrics)
    })
    .step('generate-pdf', async (ctx) => {
        console.log('\n📄 Step: generate-pdf')

        ctx.data.pdfBuffer = await pdfGenerator.create({
            template: ctx.input.reportType,
            data: ctx.data.metrics as Record<string, unknown>,
        })
    })
    .commit('upload', async (ctx) => {
        console.log('\n☁️ Step: upload (commit)')

        const fileName = `${ctx.input.reportType}-${ctx.id}.pdf`
        ctx.data.downloadUrl = await s3.upload(
            `reports/${fileName}`,
            ctx.data.pdfBuffer as Uint8Array
        )
    })
    .commit('notify', async (ctx) => {
        console.log('\n📧 Step: notify (commit)')

        await email.send(ctx.input.requestedBy, 'report-ready', {
            reportType: ctx.input.reportType,
            url: ctx.data.downloadUrl,
            metrics: ctx.data.metrics,
        })
    })

// ─────────────────────────────────────────────────────────────
// Execute
// ─────────────────────────────────────────────────────────────

async function main() {
    console.log('═══════════════════════════════════════════════════════')
    console.log('   📈 Report Generation Workflow Example')
    console.log('═══════════════════════════════════════════════════════')

    const engine = new FluxEngine({
        storage: new MemoryStorage(),
    })

    const result = await engine.execute(reportWorkflow, {
        reportType: 'monthly',
        dateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-31'),
        },
        requestedBy: 'manager@example.com',
    })

    console.log('\n═══════════════════════════════════════════════════════')
    console.log('   📊 Result')
    console.log('═══════════════════════════════════════════════════════')
    console.log('Status:', result.status)
    console.log('Duration:', result.duration, 'ms')
    console.log('Download URL:', result.data.downloadUrl)
    console.log('Metrics:', result.data.metrics)
}

main().catch(console.error)
