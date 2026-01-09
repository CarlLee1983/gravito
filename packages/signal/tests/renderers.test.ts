import { describe, expect, it } from 'bun:test'
import { Mailable } from '../src/Mailable'
import { LogTransport } from '../src/transports/LogTransport'

// Mock Config for Mailable
const mockConfig = {
  from: { address: 'test@example.com' },
  transport: new LogTransport(),
}

// React Component
const ReactTestComponent = ({ name }: { name: string }) => `<h1>Hello ${name}</h1>`

const reactDeps = {
  createElement: (component: (props: any) => string, props: any) => component(props),
  renderToStaticMarkup: (element: string) => element,
}

// Vue Component
const VueTestComponent = ({ name }: { name: string }) => `<h1>Hello ${name}</h1>`

const vueDeps = {
  createSSRApp: ({ render }: { render: () => string }) => ({ render }),
  h: (component: (props: any) => string, props: any) => component(props),
  renderToString: async (app: { render: () => string }) => app.render(),
}

class TestReactMail extends Mailable {
  build() {
    return this.react(ReactTestComponent, { name: 'World' }, reactDeps).subject('React Test')
  }
}

class TestVueMail extends Mailable {
  build() {
    return this.vue(VueTestComponent, { name: 'World' }, vueDeps).subject('Vue Test')
  }
}

describe('Renderers', () => {
  it('should render React component to HTML', async () => {
    const mail = new TestReactMail()
    const _envelope = await mail.buildEnvelope(mockConfig)
    const { html } = await mail.renderContent()

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<h1>Hello World</h1>')
  })

  it('should render Vue component to HTML', async () => {
    const mail = new TestVueMail()
    const _envelope = await mail.buildEnvelope(mockConfig)
    const { html } = await mail.renderContent()

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<h1>Hello World</h1>')
  })
})
