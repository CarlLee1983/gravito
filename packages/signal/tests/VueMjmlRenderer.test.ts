import { describe, expect, it, mock } from 'bun:test'
import { VueMjmlRenderer } from '../src/renderers/VueMjmlRenderer'

describe('VueMjmlRenderer', () => {
  it('should render Vue component to MJML then to HTML', async () => {
    const mockComponent = { name: 'Test' }
    const mockApp = { _context: {} }
    const mockMjml = '<mjml><mj-body>Vue MJML</mj-body></mjml>'
    const mockHtml = '<html><body>Vue MJML</body></html>'

    const createSSRApp = mock(() => mockApp)
    const h = mock(() => ({}))
    const renderToString = mock(async () => mockMjml)
    const mjml2html = mock(() => ({ html: mockHtml, errors: [] }))

    const renderer = new VueMjmlRenderer(
      mockComponent,
      { name: 'World' },
      {},
      {
        createSSRApp,
        h,
        renderToString,
        mjml2html,
      }
    )

    const result = await renderer.render({ extra: 'data' })

    expect(createSSRApp).toHaveBeenCalled()
    expect(renderToString).toHaveBeenCalledWith(mockApp)
    expect(mjml2html).toHaveBeenCalledWith(mockMjml, expect.any(Object))
    expect(result.html).toBe(mockHtml)
  })
})
