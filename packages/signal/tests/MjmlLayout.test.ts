import { describe, expect, it } from 'bun:test'
import { Mailable } from '../src/Mailable'

class TestMailable extends Mailable {
  build() {
    return this
  }
}

describe('Mailable MJML Layout', () => {
  it('should wrap content with layout if provided', async () => {
    const mailable = new TestMailable()
    mailable.mjml('<mj-text>Hello</mj-text>', {
      layout: '<mjml><mj-body>{{content}}</mj-body></mjml>',
    })

    // Access private renderer via cast to check final content
    const content = await mailable.renderContent()
    // The mock renderer would contain the final wrapped string
    // Since we are using dynamic import in renderContent,
    // it will actually try to load MjmlRenderer.
    // We can verify the finalContent logic by checking the renderer state if possible
    // or just let it render (mjml is installed)

    expect(content.html).toContain('<div') // MJML rendered output
    expect(content.html).toContain('Hello')
  })
})
