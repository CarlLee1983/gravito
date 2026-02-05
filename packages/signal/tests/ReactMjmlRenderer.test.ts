import { describe, expect, it, mock } from 'bun:test'
import { ReactMjmlRenderer } from '../src/renderers/ReactMjmlRenderer'

describe('ReactMjmlRenderer', () => {
  it('should render React component to MJML then to HTML', async () => {
    const mockComponent = {}
    const mockElement = { type: 'mjml' }
    const mockMjml = '<mjml><mj-body>Hello</mj-body></mjml>'
    const mockHtml = '<html><body>Hello</body></html>'

    const createElement = mock(() => mockElement)
    const renderToStaticMarkup = mock(() => mockMjml)
    const mjml2html = mock(() => ({ html: mockHtml, errors: [] }))

    const renderer = new ReactMjmlRenderer(
      mockComponent,
      { name: 'World' },
      {},
      {
        createElement,
        renderToStaticMarkup,
        mjml2html,
      }
    )

    const result = await renderer.render({ extra: 'data' })

    expect(createElement).toHaveBeenCalledWith(mockComponent, { name: 'World', extra: 'data' })
    expect(renderToStaticMarkup).toHaveBeenCalledWith(mockElement)
    expect(mjml2html).toHaveBeenCalledWith(mockMjml, expect.any(Object))
    expect(result.html).toBe(mockHtml)
  })
})
