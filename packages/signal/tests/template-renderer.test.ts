import { describe, expect, it, mock } from 'bun:test'

mock.module('@gravito/prism', () => ({
  TemplateEngine: class {
    constructor(private dir: string) {
      this.dir = dir
    }
    render(template: string) {
      return `<div>${this.dir}:${template}</div>`
    }
  },
}))

const { TemplateRenderer } = await import('../src/renderers/TemplateRenderer')

describe('TemplateRenderer', () => {
  it('renders templates and strips html', async () => {
    const renderer = new TemplateRenderer('welcome', '/views')
    const result = await renderer.render({ name: 'Ada' })

    expect(result.html).toContain('/views:welcome')
    expect(result.text).toBe('/views:welcome')
  })
})
