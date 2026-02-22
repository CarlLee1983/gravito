import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test'
import { join } from 'node:path'
import { rmSync, existsSync, readFileSync } from 'node:fs'
import { generateStaticSite, type StaticExportConfig } from '../src/export-static'
import { astral } from '../src'

describe('generateStaticSite', () => {
    const outputDir = join(__dirname, 'test-dist-docs')

    beforeEach(() => {
        if (existsSync(outputDir)) {
            rmSync(outputDir, { recursive: true, force: true })
        }
    })

    afterEach(() => {
        if (existsSync(outputDir)) {
            rmSync(outputDir, { recursive: true, force: true })
        }
    })

    it('generates openapi.json and index.html correctly', async () => {
        // Mock the core behavior
        const mockCore = {
            router: {
                compile: mock(() => [])
            }
        } as any

        const config: StaticExportConfig = {
            core: mockCore,
            outputDir,
            astralConfig: {
                title: 'Test Docs',
                version: '1.0.0'
            }
        }

        await generateStaticSite(config)

        // Verify files
        expect(existsSync(join(outputDir, 'openapi.json'))).toBe(true)
        expect(existsSync(join(outputDir, 'index.html'))).toBe(true)

        const htmlContent = readFileSync(join(outputDir, 'index.html'), 'utf-8')
        expect(htmlContent).toContain('<title>Test Docs</title>')
        expect(htmlContent).toContain('unpkg.com/swagger-ui-dist') // default CDN URLs
    })

    it('handles offline asset bundling when configured', async () => {
        const mockCore = {
            router: { compile: mock(() => []) }
        } as any

        const config: StaticExportConfig = {
            core: mockCore,
            outputDir,
            astralConfig: {
                title: 'Offline Docs',
                version: '1.0.0',
                bundleOfflineAssets: true
            }
        }

        // Mock fetch to simulate successful download
        const originalFetch = globalThis.fetch
        globalThis.fetch = mock(async () => ({
            ok: true,
            text: async () => 'mock-content'
        })) as any

        await generateStaticSite(config)

        // Restore fetch
        globalThis.fetch = originalFetch

        // Verify offline files were created
        expect(existsSync(join(outputDir, 'swagger-ui.css'))).toBe(true)
        expect(existsSync(join(outputDir, 'swagger-ui-bundle.js'))).toBe(true)
        expect(existsSync(join(outputDir, 'swagger-ui-standalone-preset.js'))).toBe(true)

        const htmlContent = readFileSync(join(outputDir, 'index.html'), 'utf-8')
        expect(htmlContent).toContain('<title>Offline Docs</title>')
        expect(htmlContent).toContain('href="./swagger-ui.css"')
        expect(htmlContent).toContain('src="./swagger-ui-bundle.js"')
    })
})
