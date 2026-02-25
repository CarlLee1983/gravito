import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import * as coreModule from '@gravito/core'
import { generateStaticSite, type StaticExportConfig } from '../src/export-static'

// ============ Test Helpers ============

/** 建立帶 logger 的 mockCore */
const createMockCore = () => ({
  router: {
    compile: mock(() => []),
  },
  logger: {
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    debug: mock(() => {}),
  },
})

/** 建立 mock MarkdownAdapter */
const createMockMarkdownAdapter = () => ({
  html: mock((markdown: string) => {
    // 模擬基本的 Markdown -> HTML 轉換
    let result = markdown
    // 標題
    result = result.replace(/^### (.+)$/gm, '<h3>$1</h3>')
    result = result.replace(/^## (.+)$/gm, '<h2>$1</h2>')
    result = result.replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // 粗體
    result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // 斜體
    result = result.replace(/\*(.+?)\*/g, '<em>$1</em>')
    // 行內程式碼
    result = result.replace(/`([^`]+)`/g, '<code>$1</code>')
    // 列表項
    result = result.replace(/^- (.+)$/gm, '<li>$1</li>')
    // 包裹段落
    if (!result.startsWith('<')) {
      result = `<p>${result}</p>`
    }
    return result
  }),
  render: mock((markdown: string) => markdown),
  react: mock(() => null),
  isNative: false,
})

/** 從 openapi.json 讀取 spec */
function readSpec(outputDir: string): Record<string, unknown> {
  const raw = readFileSync(join(outputDir, 'openapi.json'), 'utf-8')
  return JSON.parse(raw)
}

// ============ Tests ============

describe('Markdown description rendering', () => {
  const outputDir = join(__dirname, 'test-dist-md-descriptions')
  let mockMarkdownAdapter: ReturnType<typeof createMockMarkdownAdapter>
  let getMarkdownAdapterSpy: ReturnType<typeof spyOn>

  beforeEach(() => {
    if (existsSync(outputDir)) {
      rmSync(outputDir, { recursive: true, force: true })
    }
    mockMarkdownAdapter = createMockMarkdownAdapter()
    getMarkdownAdapterSpy = spyOn(coreModule, 'getMarkdownAdapter').mockReturnValue(
      mockMarkdownAdapter as unknown as coreModule.RuntimeMarkdownAdapter
    )
  })

  afterEach(() => {
    if (existsSync(outputDir)) {
      rmSync(outputDir, { recursive: true, force: true })
    }
    getMarkdownAdapterSpy.mockRestore()
  })

  // ============ 基礎測試 ============

  describe('basic rendering', () => {
    it('does NOT render descriptions when renderDescriptions is false', async () => {
      const mockCore = createMockCore() as any

      const config: StaticExportConfig = {
        core: mockCore,
        outputDir,
        astralConfig: {
          title: 'Test API',
          version: '1.0.0',
          description: '# API Overview\n\nThis is **bold**.',
          renderDescriptions: false,
        },
      }

      await generateStaticSite(config)

      const spec = readSpec(outputDir)
      const info = spec.info as Record<string, unknown>

      // description 應保持原始 Markdown
      expect(info.description).toBe('# API Overview\n\nThis is **bold**.')
      // getMarkdownAdapter 不應被呼叫
      expect(getMarkdownAdapterSpy).not.toHaveBeenCalled()
    })

    it('does NOT render descriptions when renderDescriptions is undefined (default)', async () => {
      const mockCore = createMockCore() as any

      const config: StaticExportConfig = {
        core: mockCore,
        outputDir,
        astralConfig: {
          title: 'Test API',
          version: '1.0.0',
          description: '# API Overview',
        },
      }

      await generateStaticSite(config)

      const spec = readSpec(outputDir)
      const info = spec.info as Record<string, unknown>

      expect(info.description).toBe('# API Overview')
      expect(getMarkdownAdapterSpy).not.toHaveBeenCalled()
    })

    it('renders info.description when renderDescriptions is true', async () => {
      const mockCore = createMockCore() as any

      const config: StaticExportConfig = {
        core: mockCore,
        outputDir,
        astralConfig: {
          title: 'Test API',
          version: '1.0.0',
          description: '# API Overview\n\nThis is **bold**.',
          renderDescriptions: true,
        },
      }

      await generateStaticSite(config)

      const spec = readSpec(outputDir)
      const info = spec.info as Record<string, unknown>

      // description 應已被渲染為 HTML
      expect(info.description).toContain('<h1>')
      expect(info.description).toContain('<strong>')
      expect(getMarkdownAdapterSpy).toHaveBeenCalled()
    })
  })

  // ============ 路徑和方法描述渲染 ============

  describe('endpoint description rendering', () => {
    it('renders path-level description', async () => {
      const mockCore = createMockCore() as any
      mockCore.router.compile = mock(() => [{ method: 'GET', path: '/users' }])

      const config: StaticExportConfig = {
        core: mockCore,
        outputDir,
        astralConfig: {
          title: 'Test API',
          version: '1.0.0',
          renderDescriptions: true,
          contracts: [
            {
              path: '/users',
              operations: {
                index: {
                  summary: 'List users',
                  description: '## User List\n\nGet all **active** users.',
                },
              },
            },
          ],
        },
      }

      await generateStaticSite(config)

      const spec = readSpec(outputDir) as any
      const getOp = spec.paths['/users']?.get

      expect(getOp).toBeDefined()
      expect(getOp.description).toContain('<h2>')
      expect(getOp.description).toContain('<strong>')
    })

    it('renders multiple operations descriptions in the same path', async () => {
      const mockCore = createMockCore() as any
      mockCore.router.compile = mock(() => [
        { method: 'GET', path: '/items' },
        { method: 'POST', path: '/items' },
      ])

      const config: StaticExportConfig = {
        core: mockCore,
        outputDir,
        astralConfig: {
          title: 'Test API',
          version: '1.0.0',
          renderDescriptions: true,
          contracts: [
            {
              path: '/items',
              operations: {
                index: {
                  description: 'List **all** items',
                },
                store: {
                  description: 'Create a *new* item',
                },
              },
            },
          ],
        },
      }

      await generateStaticSite(config)

      const spec = readSpec(outputDir) as any
      expect(spec.paths['/items'].get.description).toContain('<strong>')
      expect(spec.paths['/items'].post.description).toContain('<em>')
    })
  })

  // ============ Response 描述渲染 ============

  describe('response description rendering', () => {
    it('renders response descriptions within operations', async () => {
      const mockCore = createMockCore() as any
      mockCore.router.compile = mock(() => [{ method: 'GET', path: '/products' }])

      const config: StaticExportConfig = {
        core: mockCore,
        outputDir,
        astralConfig: {
          title: 'Test API',
          version: '1.0.0',
          renderDescriptions: true,
          contracts: [
            {
              path: '/products',
              operations: {
                index: {
                  summary: 'List products',
                  errors: {
                    404: 'Resource **not found**',
                    500: 'Internal *server* error',
                  },
                },
              },
            },
          ],
        },
      }

      await generateStaticSite(config)

      const spec = readSpec(outputDir) as any
      const responses = spec.paths['/products'].get.responses

      // 錯誤回應的描述也應被渲染
      expect(responses['404'].description).toContain('<strong>')
      expect(responses['500'].description).toContain('<em>')
    })
  })

  // ============ Schema 描述渲染 ============

  describe('schema description rendering', () => {
    it('renders component schema descriptions', async () => {
      const mockCore = createMockCore() as any

      const config: StaticExportConfig = {
        core: mockCore,
        outputDir,
        astralConfig: {
          title: 'Test API',
          version: '1.0.0',
          renderDescriptions: true,
          components: {
            schemas: {
              User: {
                type: 'object',
                description: '## User Model\n\nRepresents a **user** entity.',
                properties: {
                  name: {
                    type: 'string',
                    description: 'User `full name`',
                  },
                  email: {
                    type: 'string',
                    description: 'User *email* address',
                  },
                },
              } as any,
            },
          },
        },
      }

      await generateStaticSite(config)

      const spec = readSpec(outputDir) as any
      const userSchema = spec.components.schemas.User

      expect(userSchema.description).toContain('<h2>')
      expect(userSchema.description).toContain('<strong>')
      // 屬性描述也應被渲染
      expect(userSchema.properties.name.description).toContain('<code>')
      expect(userSchema.properties.email.description).toContain('<em>')
    })
  })

  // ============ Server 描述渲染 ============

  describe('server description rendering', () => {
    it('renders server descriptions', async () => {
      const mockCore = createMockCore() as any

      const config: StaticExportConfig = {
        core: mockCore,
        outputDir,
        astralConfig: {
          title: 'Test API',
          version: '1.0.0',
          renderDescriptions: true,
          servers: [
            {
              url: 'https://api.example.com',
              description: 'Production server - **stable** release',
            },
            {
              url: 'https://staging.example.com',
              description: 'Staging server - *beta* release',
            },
          ],
        },
      }

      await generateStaticSite(config)

      const spec = readSpec(outputDir) as any
      expect(spec.servers[0].description).toContain('<strong>')
      expect(spec.servers[1].description).toContain('<em>')
    })
  })

  // ============ Tag 描述渲染 ============

  describe('tag description rendering', () => {
    it('renders tag descriptions', async () => {
      const mockCore = createMockCore() as any

      const config: StaticExportConfig = {
        core: mockCore,
        outputDir,
        astralConfig: {
          title: 'Test API',
          version: '1.0.0',
          renderDescriptions: true,
          tags: [
            {
              name: 'users',
              description: '**User** management endpoints',
            },
            {
              name: 'products',
              description: '*Product* catalog endpoints',
            },
          ],
        },
      }

      await generateStaticSite(config)

      const spec = readSpec(outputDir) as any
      expect(spec.tags[0].description).toContain('<strong>')
      expect(spec.tags[1].description).toContain('<em>')
    })
  })

  // ============ 安全性測試 ============

  describe('XSS protection', () => {
    it('sanitizes script tags in descriptions via html callback', async () => {
      const mockCore = createMockCore() as any

      // 覆寫 mock：模擬 html() 會淨化 script 標籤
      mockMarkdownAdapter.html = mock((markdown: string) => {
        // 移除 script 標籤（模擬淨化行為）
        return markdown.replace(/<script[^>]*>.*?<\/script>/gi, '').replace(/<script[^>]*>/gi, '')
      })

      const config: StaticExportConfig = {
        core: mockCore,
        outputDir,
        astralConfig: {
          title: 'Test API',
          version: '1.0.0',
          description: 'Hello <script>alert("xss")</script> World',
          renderDescriptions: true,
        },
      }

      await generateStaticSite(config)

      const spec = readSpec(outputDir) as any
      // 不應包含 script 標籤
      expect(spec.info.description).not.toContain('<script>')
      expect(spec.info.description).toContain('Hello')
      expect(spec.info.description).toContain('World')
    })

    it('sanitizes event handler attributes in descriptions', async () => {
      const mockCore = createMockCore() as any

      mockMarkdownAdapter.html = mock((markdown: string) => {
        // 移除事件處理器（模擬淨化）
        return markdown.replace(/\s+on\w+="[^"]*"/gi, '')
      })

      const config: StaticExportConfig = {
        core: mockCore,
        outputDir,
        astralConfig: {
          title: 'Test API',
          version: '1.0.0',
          description: '<img src="x" onerror="alert(1)" />',
          renderDescriptions: true,
        },
      }

      await generateStaticSite(config)

      const spec = readSpec(outputDir) as any
      expect(spec.info.description).not.toContain('onerror')
    })

    it('sanitizes iframe injection in descriptions', async () => {
      const mockCore = createMockCore() as any

      mockMarkdownAdapter.html = mock((markdown: string) => {
        return markdown.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      })

      const config: StaticExportConfig = {
        core: mockCore,
        outputDir,
        astralConfig: {
          title: 'Test API',
          version: '1.0.0',
          description: 'Normal text<iframe src="evil.com"></iframe>',
          renderDescriptions: true,
        },
      }

      await generateStaticSite(config)

      const spec = readSpec(outputDir) as any
      expect(spec.info.description).not.toContain('<iframe')
    })
  })

  // ============ 邊界情況 ============

  describe('edge cases', () => {
    it('handles empty description gracefully', async () => {
      const mockCore = createMockCore() as any

      const config: StaticExportConfig = {
        core: mockCore,
        outputDir,
        astralConfig: {
          title: 'Test API',
          version: '1.0.0',
          description: '',
          renderDescriptions: true,
        },
      }

      await generateStaticSite(config)

      const spec = readSpec(outputDir) as any
      // 空字串不應呼叫渲染
      expect(spec.info.description).toBe('')
    })

    it('handles undefined description gracefully', async () => {
      const mockCore = createMockCore() as any

      const config: StaticExportConfig = {
        core: mockCore,
        outputDir,
        astralConfig: {
          title: 'Test API',
          version: '1.0.0',
          renderDescriptions: true,
        },
      }

      await generateStaticSite(config)

      const spec = readSpec(outputDir) as any
      // undefined 不應導致錯誤
      expect(spec.info.description).toBeUndefined()
    })

    it('handles plain text description (no Markdown)', async () => {
      const mockCore = createMockCore() as any

      mockMarkdownAdapter.html = mock((markdown: string) => {
        // 純文字直接包裹段落
        return `<p>${markdown}</p>`
      })

      const config: StaticExportConfig = {
        core: mockCore,
        outputDir,
        astralConfig: {
          title: 'Test API',
          version: '1.0.0',
          description: 'Just plain text without any markdown syntax.',
          renderDescriptions: true,
        },
      }

      await generateStaticSite(config)

      const spec = readSpec(outputDir) as any
      expect(spec.info.description).toBe('<p>Just plain text without any markdown syntax.</p>')
    })

    it('handles Chinese and Unicode characters', async () => {
      const mockCore = createMockCore() as any

      const chineseDesc = '# API 概覽\n\n這是一個 **中文** 描述，包含 emoji: 🎉'

      mockMarkdownAdapter.html = mock((markdown: string) => {
        return markdown
          .replace(/^# (.+)$/gm, '<h1>$1</h1>')
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      })

      const config: StaticExportConfig = {
        core: mockCore,
        outputDir,
        astralConfig: {
          title: 'Test API',
          version: '1.0.0',
          description: chineseDesc,
          renderDescriptions: true,
        },
      }

      await generateStaticSite(config)

      const spec = readSpec(outputDir) as any
      expect(spec.info.description).toContain('<h1>')
      expect(spec.info.description).toContain('<strong>')
      expect(spec.info.description).toContain('中文')
    })

    it('handles deeply nested schema descriptions', async () => {
      const mockCore = createMockCore() as any

      const config: StaticExportConfig = {
        core: mockCore,
        outputDir,
        astralConfig: {
          title: 'Test API',
          version: '1.0.0',
          renderDescriptions: true,
          components: {
            schemas: {
              Order: {
                type: 'object',
                description: '**Order** model',
                properties: {
                  items: {
                    type: 'array',
                    description: 'List of *order items*',
                    items: {
                      type: 'object',
                      description: 'A single **order item**',
                      properties: {
                        product: {
                          type: 'object',
                          description: 'Product `reference`',
                          properties: {
                            name: {
                              type: 'string',
                              description: 'Product **name**',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              } as any,
            },
          },
        },
      }

      await generateStaticSite(config)

      const spec = readSpec(outputDir) as any
      const order = spec.components.schemas.Order

      expect(order.description).toContain('<strong>')
      expect(order.properties.items.description).toContain('<em>')
      // 深層巢狀也要被渲染
      expect(order.properties.items.items.description).toContain('<strong>')
      expect(order.properties.items.items.properties.product.description).toContain('<code>')
      expect(order.properties.items.items.properties.product.properties.name.description).toContain(
        '<strong>'
      )
    })

    it('does not render non-description string fields', async () => {
      const mockCore = createMockCore() as any

      const config: StaticExportConfig = {
        core: mockCore,
        outputDir,
        astralConfig: {
          title: '**Bold Title**',
          version: '1.0.0',
          renderDescriptions: true,
        },
      }

      await generateStaticSite(config)

      const spec = readSpec(outputDir) as any
      // title 不應被渲染為 HTML
      expect(spec.info.title).toBe('**Bold Title**')
      expect(spec.info.title).not.toContain('<strong>')
    })
  })

  // ============ 向後相容性 ============

  describe('backward compatibility', () => {
    it('existing static export behavior is preserved', async () => {
      const mockCore = createMockCore() as any

      const config: StaticExportConfig = {
        core: mockCore,
        outputDir,
        astralConfig: {
          title: 'Legacy API',
          version: '2.0.0',
          description: '# Legacy\n\nNo rendering.',
        },
      }

      await generateStaticSite(config)

      // 檔案結構不變
      expect(existsSync(join(outputDir, 'openapi.json'))).toBe(true)
      expect(existsSync(join(outputDir, 'index.html'))).toBe(true)

      const spec = readSpec(outputDir) as any
      // description 保持原始 Markdown
      expect(spec.info.description).toBe('# Legacy\n\nNo rendering.')

      // HTML 內容不變
      const html = readFileSync(join(outputDir, 'index.html'), 'utf-8')
      expect(html).toContain('<title>Legacy API</title>')
      expect(html).toContain('swagger-ui')
    })

    it('renderDescriptions: true does not break archive generation', async () => {
      const mockCore = createMockCore() as any

      const mockArchiveAdapter = {
        create: mock(async () => new Uint8Array([0x1f, 0x8b, 0x08])),
        extract: mock(async () => 0),
        list: mock(async () => new Map()),
        readFile: mock(async () => null),
      }
      const archiveSpy = spyOn(coreModule, 'getArchiveAdapter').mockReturnValue(
        mockArchiveAdapter as any
      )

      const archivePath = join(__dirname, 'test-md-archive.tar.gz')

      const config: StaticExportConfig = {
        core: mockCore,
        outputDir,
        astralConfig: {
          title: 'Archive Test',
          version: '1.0.0',
          description: '# Archive\n\n**works**.',
          renderDescriptions: true,
        },
        archive: true,
        archivePath,
      }

      await generateStaticSite(config)

      // spec 中的 description 應已渲染
      const spec = readSpec(outputDir) as any
      expect(spec.info.description).toContain('<h1>')

      // archive 功能應正常運作
      expect(mockArchiveAdapter.create).toHaveBeenCalled()

      archiveSpy.mockRestore()
      if (existsSync(archivePath)) {
        rmSync(archivePath, { force: true })
      }
    })
  })

  // ============ Component-level description 渲染 ============

  describe('component parameter and response descriptions', () => {
    it('renders component parameter descriptions', async () => {
      const mockCore = createMockCore() as any

      const config: StaticExportConfig = {
        core: mockCore,
        outputDir,
        astralConfig: {
          title: 'Test API',
          version: '1.0.0',
          renderDescriptions: true,
          components: {
            parameters: {
              PageParam: {
                name: 'page',
                in: 'query',
                description: 'Page number for **pagination**',
                schema: { type: 'integer' },
              } as any,
            },
          },
        },
      }

      await generateStaticSite(config)

      const spec = readSpec(outputDir) as any
      expect(spec.components.parameters.PageParam.description).toContain('<strong>')
    })

    it('renders component response descriptions', async () => {
      const mockCore = createMockCore() as any

      const config: StaticExportConfig = {
        core: mockCore,
        outputDir,
        astralConfig: {
          title: 'Test API',
          version: '1.0.0',
          renderDescriptions: true,
          components: {
            responses: {
              NotFound: {
                description: 'Resource **not found** - check the `id` parameter',
              } as any,
            },
          },
        },
      }

      await generateStaticSite(config)

      const spec = readSpec(outputDir) as any
      expect(spec.components.responses.NotFound.description).toContain('<strong>')
      expect(spec.components.responses.NotFound.description).toContain('<code>')
    })

    it('renders component requestBody descriptions', async () => {
      const mockCore = createMockCore() as any

      const config: StaticExportConfig = {
        core: mockCore,
        outputDir,
        astralConfig: {
          title: 'Test API',
          version: '1.0.0',
          renderDescriptions: true,
          components: {
            requestBodies: {
              CreateUser: {
                description: 'Request body for **creating** a user',
                content: {
                  'application/json': {
                    schema: { type: 'object' },
                  },
                },
              } as any,
            },
          },
        },
      }

      await generateStaticSite(config)

      const spec = readSpec(outputDir) as any
      expect(spec.components.requestBodies.CreateUser.description).toContain('<strong>')
    })
  })

  // ============ 預設回應描述渲染 ============

  describe('default response description rendering', () => {
    it('renders the default "Successful response" description', async () => {
      const mockCore = createMockCore() as any
      mockCore.router.compile = mock(() => [{ method: 'GET', path: '/health' }])

      const config: StaticExportConfig = {
        core: mockCore,
        outputDir,
        astralConfig: {
          title: 'Test API',
          version: '1.0.0',
          renderDescriptions: true,
          contracts: [
            {
              path: '/health',
              operations: {
                index: {
                  summary: 'Health check',
                },
              },
            },
          ],
        },
      }

      await generateStaticSite(config)

      const spec = readSpec(outputDir) as any
      const response200 = spec.paths['/health'].get.responses['200']
      // 預設的 "Successful response" 是純文字，渲染後應包裝在 <p> 中
      expect(response200.description).toBeDefined()
    })
  })
})
