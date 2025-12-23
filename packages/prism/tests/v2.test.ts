import { describe, expect, it } from 'bun:test'
import { join } from 'path'
import { TemplateEngine } from '../src/TemplateEngine'

describe('Orbit Prism V2', () => {
  const viewsDir = join(__dirname, 'fixtures/v2')
  const engine = new TemplateEngine(viewsDir)

  it('should render a page with layout, sections, and components', () => {
    const output = engine.render('home', {
      user: 'Carl',
    })

    // Check Inheritance & Sections
    expect(output).toContain('<title>Home Page</title>') // @yield('title') overwritten
    expect(output).toContain('<nav>Header</nav>') // @include
    expect(output).toContain('<h1>Welcome Carl</h1>') // Variable interpolation

    // Check Stacks
    expect(output).toContain("<script>console.log('Home Script')</script>") // @push -> @stack

    // Check Component Rendering
    expect(output).toContain('<div class="alert alert-success">') // <x-alert type="success">
    expect(output).toContain('<strong>Success!</strong>') // <x-slot:title>
    expect(output).toContain('<p>Operation completed.</p>') // Default slot
  })

  it('should handle missing stacks gracefully', () => {
    // layout has @stack('styles'), but home doesn't push to it. Should be empty.
    const output = engine.render('home', { user: 'Test' })
    expect(output).not.toContain('@stack')
  })
})
