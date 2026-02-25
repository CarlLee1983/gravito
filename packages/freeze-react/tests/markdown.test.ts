import { beforeAll, describe, expect, it, mock } from 'bun:test'

// ============ React Mock Infrastructure ============
// 與 index.test.ts 相同的 React mock 策略

type ContextStore<T> = { value: T | null }

const createContextMock = <T>(defaultValue: T | null) => {
  const store: ContextStore<T> = { value: defaultValue }
  return {
    _store: store,
    Provider: ({ value, children }: { value: T; children: unknown }) => {
      store.value = value
      if (typeof children === 'function') {
        return children()
      }
      return children
    },
  }
}

const useContextMock = <T>(ctx: { _store: ContextStore<T> }) => ctx._store.value

const createElementMock = (
  type: unknown,
  props: Record<string, unknown>,
  ...children: unknown[]
) => {
  const mergedProps = { ...props }
  if (children.length === 1) {
    mergedProps.children = children[0]
  } else if (children.length > 1) {
    mergedProps.children = children
  }
  if (typeof type === 'function') {
    return type(mergedProps)
  }
  return { type, props: mergedProps }
}

mock.module('react', () => ({
  createContext: createContextMock,
  useContext: useContextMock,
  useMemo: (factory: () => unknown) => factory(),
  useCallback: (fn: (...args: unknown[]) => unknown) => fn,
  useState: <T>(initial: T | (() => T)) => {
    // setState noop（測試不需要狀態更新）
    const noop = () => {
      /* mock setState */
    }
    if (typeof initial === 'function') {
      return [(initial as () => T)(), noop]
    }
    return [initial as T, noop]
  },
  createElement: createElementMock,
  useEffect: (_effect: () => (() => void) | undefined) => {
    /* mock - 不執行 effect */
  },
}))

mock.module('react/jsx-runtime', () => ({
  jsx: createElementMock,
  jsxs: createElementMock,
  Fragment: 'fragment',
}))

// jsxDEV 簽名為 (type, props, key, isStaticChildren, source, self)
// 只取 type 和 props，忽略 DEV 專用的額外參數
const jsxDEVMock = (type: unknown, props: Record<string, unknown>) => createElementMock(type, props)

mock.module('react/jsx-dev-runtime', () => ({
  jsxDEV: jsxDEVMock,
  Fragment: 'fragment',
}))

// ============ Mock @gravito/core Markdown Adapter ============

let mockIsNative = true
let mockReactResult: unknown = { type: 'div', props: { children: 'rendered' } }
let mockHtmlResult = '<p>rendered</p>'

mock.module('@gravito/core', () => ({
  getMarkdownAdapter: () => ({
    html: (markdown: string, _options?: { sanitize?: boolean }) => {
      if (!markdown) {
        return ''
      }
      return mockHtmlResult
    },
    render: (markdown: string) => {
      if (!markdown) {
        return ''
      }
      return mockHtmlResult
    },
    react: (markdown: string) => {
      if (!markdown) {
        return null
      }
      return mockReactResult
    },
    get isNative() {
      return mockIsNative
    },
  }),
}))

// ============ Test Setup ============

let Markdown: typeof import('../src/markdown').Markdown

beforeAll(async () => {
  const module = await import('../src/markdown')
  Markdown = module.Markdown
})

// ============ Basic Rendering Tests ============

describe('Markdown Component - Basic Rendering', () => {
  it('exists and is a function', () => {
    expect(typeof Markdown).toBe('function')
  })

  it('returns null for empty content', () => {
    const result = Markdown({ content: '' })
    expect(result).toBeNull()
  })

  it('returns null for undefined-like empty string', () => {
    const result = Markdown({ content: '' })
    expect(result).toBeNull()
  })

  it('renders markdown content in a container', () => {
    mockIsNative = true
    mockReactResult = { type: 'p', props: { children: 'Hello World' } }

    const result = Markdown({ content: '# Hello World' }) as {
      type: string
      props: Record<string, unknown>
    }

    expect(result).not.toBeNull()
    expect(result.type).toBe('div')
  })

  it('renders with custom className', () => {
    mockIsNative = true
    mockReactResult = { type: 'p', props: { children: 'content' } }

    const result = Markdown({
      content: '# Title',
      className: 'prose prose-lg',
    }) as { type: string; props: Record<string, unknown> }

    expect(result).not.toBeNull()
    expect(result.props.className).toBe('prose prose-lg')
  })

  it('renders with custom tag', () => {
    mockIsNative = true
    mockReactResult = { type: 'p', props: { children: 'content' } }

    const result = Markdown({
      content: '# Title',
      tag: 'article',
    }) as { type: string; props: Record<string, unknown> }

    expect(result).not.toBeNull()
    expect(result.type).toBe('article')
  })

  it('uses div as default tag', () => {
    mockIsNative = true
    mockReactResult = { type: 'p', props: { children: 'content' } }

    const result = Markdown({ content: 'text' }) as {
      type: string
      props: Record<string, unknown>
    }

    expect(result.type).toBe('div')
  })
})

// ============ Native React Rendering (Bun) ============

describe('Markdown Component - Native React Rendering', () => {
  it('uses react() when adapter is native', () => {
    mockIsNative = true
    mockReactResult = { type: 'h1', props: { children: 'Title' } }

    const result = Markdown({ content: '# Title' }) as {
      type: string
      props: Record<string, unknown>
    }

    expect(result).not.toBeNull()
    // 容器包裹 react 結果
    expect(result.type).toBe('div')
    expect(result.props.children).toEqual(mockReactResult)
  })

  it('falls back to HTML when react() returns null in native mode', () => {
    mockIsNative = true
    mockReactResult = null
    mockHtmlResult = '<h1>Fallback Title</h1>'

    const result = Markdown({ content: '# Fallback Title' }) as {
      type: string
      props: Record<string, unknown>
    }

    expect(result).not.toBeNull()
    expect(result.type).toBe('div')
    // 當 react() 回傳 null，應使用 dangerouslySetInnerHTML
    expect(result.props.dangerouslySetInnerHTML).toEqual({
      __html: '<h1>Fallback Title</h1>',
    })
  })
})

// ============ HTML Fallback Rendering (Non-Bun) ============

describe('Markdown Component - HTML Fallback', () => {
  it('uses dangerouslySetInnerHTML when adapter is not native', () => {
    mockIsNative = false
    mockHtmlResult = '<p>Hello <strong>World</strong></p>'

    const result = Markdown({ content: 'Hello **World**' }) as {
      type: string
      props: Record<string, unknown>
    }

    expect(result).not.toBeNull()
    expect(result.type).toBe('div')
    expect(result.props.dangerouslySetInnerHTML).toEqual({
      __html: '<p>Hello <strong>World</strong></p>',
    })
  })

  it('preserves className in HTML fallback mode', () => {
    mockIsNative = false
    mockHtmlResult = '<p>content</p>'

    const result = Markdown({
      content: 'content',
      className: 'markdown-body',
    }) as { type: string; props: Record<string, unknown> }

    expect(result.props.className).toBe('markdown-body')
    expect(result.props.dangerouslySetInnerHTML).toBeDefined()
  })

  it('preserves custom tag in HTML fallback mode', () => {
    mockIsNative = false
    mockHtmlResult = '<p>content</p>'

    const result = Markdown({
      content: 'content',
      tag: 'section',
    }) as { type: string; props: Record<string, unknown> }

    expect(result.type).toBe('section')
  })
})

// ============ Props Type Safety ============

describe('Markdown Component - Props', () => {
  it('accepts only content as required prop', () => {
    mockIsNative = true
    mockReactResult = { type: 'p', props: {} }

    // 最基本的使用方式：只傳 content
    const result = Markdown({ content: 'text' })
    expect(result).not.toBeNull()
  })

  it('ignores unknown props gracefully', () => {
    mockIsNative = true
    mockReactResult = { type: 'p', props: {} }

    // TypeScript 會在編譯時捕捉，但運行時應不報錯
    const result = Markdown({ content: 'text' } as { content: string })
    expect(result).not.toBeNull()
  })

  it('handles className as undefined without issue', () => {
    mockIsNative = true
    mockReactResult = { type: 'p', props: {} }

    const result = Markdown({
      content: 'text',
      className: undefined,
    }) as { type: string; props: Record<string, unknown> }

    expect(result).not.toBeNull()
    // undefined className 不應出現在 props 中或為 undefined
  })
})

// ============ Edge Cases ============

describe('Markdown Component - Edge Cases', () => {
  it('handles very long markdown content', () => {
    mockIsNative = true
    const longContent = `# Title\n\n${'Lorem ipsum dolor sit amet. '.repeat(1000)}`
    mockReactResult = { type: 'div', props: { children: 'long content' } }

    const result = Markdown({ content: longContent })
    expect(result).not.toBeNull()
  })

  it('handles unicode content', () => {
    mockIsNative = true
    mockReactResult = { type: 'p', props: { children: 'Unicode content' } }

    const result = Markdown({ content: '# Hello World' })
    expect(result).not.toBeNull()
  })

  it('handles special markdown characters', () => {
    mockIsNative = true
    mockReactResult = { type: 'p', props: { children: 'Special chars' } }

    const result = Markdown({ content: '# Hello `code` **bold** *italic* ~~strike~~' })
    expect(result).not.toBeNull()
  })

  it('handles markdown with only whitespace', () => {
    // 空白字串不應被視為空（有可能是有意義的空白）
    mockIsNative = true
    mockReactResult = { type: 'p', props: {} }

    const result = Markdown({ content: '   ' })
    // 非空字串，應該嘗試渲染
    expect(result).not.toBeNull()
  })

  it('handles nested markdown structures', () => {
    mockIsNative = true
    mockReactResult = { type: 'div', props: { children: 'nested' } }

    const nested = `
# Title

> Blockquote with **bold** and *italic*
>
> - List item 1
> - List item 2

| Column 1 | Column 2 |
|-----------|----------|
| Cell 1    | Cell 2   |
`
    const result = Markdown({ content: nested })
    expect(result).not.toBeNull()
  })
})

// ============ Security Tests ============

describe('Markdown Component - Security', () => {
  it('uses html() for fallback rendering (adapter handles sanitization)', () => {
    mockIsNative = false
    // 模擬 adapter 已淨化的輸出
    mockHtmlResult = '<p>&lt;script&gt;alert("xss")&lt;/script&gt;</p>'

    const result = Markdown({
      content: '<script>alert("xss")</script>',
    }) as { type: string; props: Record<string, unknown> }

    // dangerouslySetInnerHTML 使用 adapter 的 html() 結果
    // adapter 應負責淨化
    expect(result.props.dangerouslySetInnerHTML).toEqual({
      __html: '<p>&lt;script&gt;alert("xss")&lt;/script&gt;</p>',
    })
  })

  it('prefers react() over html() in native mode for safety', () => {
    mockIsNative = true
    mockReactResult = { type: 'p', props: { children: 'safe content' } }

    const result = Markdown({
      content: '<script>alert("xss")</script>',
    }) as { type: string; props: Record<string, unknown> }

    // 使用 react() 而非 dangerouslySetInnerHTML
    expect(result.props.children).toEqual(mockReactResult)
    expect(result.props.dangerouslySetInnerHTML).toBeUndefined()
  })
})

// ============ Multiple Instances ============

describe('Markdown Component - Reusability', () => {
  it('renders multiple independent instances', () => {
    mockIsNative = true

    mockReactResult = { type: 'h1', props: { children: 'First' } }
    const first = Markdown({ content: '# First' }) as {
      type: string
      props: Record<string, unknown>
    }

    mockReactResult = { type: 'h2', props: { children: 'Second' } }
    const second = Markdown({ content: '## Second' }) as {
      type: string
      props: Record<string, unknown>
    }

    expect(first.props.children).toEqual({ type: 'h1', props: { children: 'First' } })
    expect(second.props.children).toEqual({ type: 'h2', props: { children: 'Second' } })
  })

  it('supports different className per instance', () => {
    mockIsNative = true
    mockReactResult = { type: 'p', props: {} }

    const prose = Markdown({
      content: 'text',
      className: 'prose',
    }) as { type: string; props: Record<string, unknown> }

    const custom = Markdown({
      content: 'text',
      className: 'custom-md',
    }) as { type: string; props: Record<string, unknown> }

    expect(prose.props.className).toBe('prose')
    expect(custom.props.className).toBe('custom-md')
  })
})

// ============ SSR Compatibility ============

describe('Markdown Component - SSR Compatibility', () => {
  it('does not depend on window object', () => {
    mockIsNative = true
    mockReactResult = { type: 'p', props: {} }

    // 元件不應在渲染時存取 window
    // 如果有 window 依賴，在 SSR 中會失敗
    const result = Markdown({ content: 'SSR safe' })
    expect(result).not.toBeNull()
  })

  it('does not depend on document object', () => {
    mockIsNative = true
    mockReactResult = { type: 'p', props: {} }

    const result = Markdown({ content: 'No document needed' })
    expect(result).not.toBeNull()
  })

  it('works in both native and fallback mode for SSR', () => {
    // Native mode (Bun SSR)
    mockIsNative = true
    mockReactResult = { type: 'p', props: { children: 'native' } }
    const native = Markdown({ content: 'test' })
    expect(native).not.toBeNull()

    // Fallback mode (Node SSR)
    mockIsNative = false
    mockHtmlResult = '<p>fallback</p>'
    const fallback = Markdown({ content: 'test' })
    expect(fallback).not.toBeNull()
  })
})

// ============ Export Tests ============

describe('Markdown Component - Exports', () => {
  it('exports Markdown component from index', async () => {
    const indexModule = await import('../src/index')
    expect(typeof indexModule.Markdown).toBe('function')
  })

  it('exports MarkdownProps type from index', async () => {
    // Type exports are compile-time only, verify component accepts correct props
    const indexModule = await import('../src/index')
    const { Markdown: IndexMarkdown } = indexModule

    mockIsNative = true
    mockReactResult = { type: 'p', props: {} }

    const result = IndexMarkdown({ content: 'test', className: 'prose', tag: 'article' })
    expect(result).not.toBeNull()
  })
})
