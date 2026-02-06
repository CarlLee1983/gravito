import { describe, expect, it, mock } from 'bun:test'
import { MjmlRenderer } from '../src/renderers/MjmlRenderer'

describe('MjmlRenderer', () => {
  const mjmlContent =
    '<mjml><mj-body><mj-section><mj-column><mj-text>Hello</mj-text></mj-column></mj-section></mj-body></mjml>'

  it('should render MJML to HTML', async () => {
    // Mock mjml dependency
    const mockMjml2Html = mock((content) => ({
      html: `<html><body>${content}</body></html>`,
      errors: [],
    }))

    const renderer = new MjmlRenderer(mjmlContent, {}, { mjml2html: mockMjml2Html })
    const result = await renderer.render()

    expect(result.html).toContain('<html><body>')
    expect(result.html).toContain(mjmlContent)
    expect(mockMjml2Html).toHaveBeenCalled()
  })

  it('should throw error if MJML has errors and validationLevel is strict', async () => {
    const mockMjmlWithErrors = mock(() => ({
      html: '',
      errors: [{ formattedMessage: 'Line 1: Error' }],
    }))

    const renderer = new MjmlRenderer(
      mjmlContent,
      { validationLevel: 'strict' },
      { mjml2html: mockMjmlWithErrors }
    )

    expect(renderer.render()).rejects.toThrow('MJML rendering failed')
  })

  it('should not throw error if MJML has errors and validationLevel is soft', async () => {
    const mockMjmlWithErrors = mock(() => ({
      html: 'partial html',
      errors: [{ formattedMessage: 'Soft error' }],
    }))

    const renderer = new MjmlRenderer(
      mjmlContent,
      { validationLevel: 'soft' },
      { mjml2html: mockMjmlWithErrors }
    )

    const result = await renderer.render()
    expect(result.html).toBe('partial html')
  })
})
