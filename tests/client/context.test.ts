import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  contextToPrompt,
  copyContextForAI,
  getElementContext,
  toProjectPath,
} from '../../src/client/context/context.js'
import { buildElementPath } from '../../src/client/context/element-path.js'
import { compactElementHtml } from '../../src/client/context/element-snapshot.js'

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('toProjectPath', () => {
  it('strips the project root prefix', () => {
    expect(
      toProjectPath(
        '/Users/amirbenshimol/UI-Locator/playground/src/Card.tsx',
        '/Users/amirbenshimol/UI-Locator',
      ),
    ).toBe('playground/src/Card.tsx')
  })

  it('leaves paths outside the root unchanged', () => {
    expect(toProjectPath('/other/file.tsx', '/Users/amir/proj')).toBe('/other/file.tsx')
  })
})

describe('buildElementPath', () => {
  it('stops at #root mount id', () => {
    const root = document.createElement('div')
    root.id = 'root'
    const main = document.createElement('main')
    main.className = 'page'
    const target = document.createElement('button')
    target.className = 'btn'
    main.appendChild(target)
    root.appendChild(main)
    document.body.appendChild(root)

    expect(buildElementPath(target)).toBe('div#root > main.page > button.btn')
  })

  it('stops at #app mount id', () => {
    const app = document.createElement('div')
    app.id = 'app'
    const child = document.createElement('span')
    child.className = 'label'
    app.appendChild(child)
    document.body.appendChild(app)

    expect(buildElementPath(child)).toBe('div#app > span.label')
  })

  it('uses nth-of-type for same-tag siblings without class', () => {
    const wrap = document.createElement('div')
    const first = document.createElement('span')
    const second = document.createElement('span')
    wrap.append(first, second)
    document.body.appendChild(wrap)

    expect(buildElementPath(second)).toContain('span:nth-of-type(2)')
  })
})

describe('compactElementHtml', () => {
  it('escapes quotes, ampersands, and angle brackets in values', () => {
    expect(compactElementHtml('div', { title: 'a "b" & c' }, 'x < y')).toBe(
      '<div title="a &quot;b&quot; &amp; c">x &lt; y</div>',
    )
  })
})

describe('getElementContext', () => {
  it('builds compact context from data-source and DOM', () => {
    const button = document.createElement('button')
    button.className = 'danger'
    button.textContent = 'Delete'
    button.setAttribute('data-source', '/app/src/UserCard.tsx:42:7')
    document.body.appendChild(button)

    const context = getElementContext(button, { root: '/app' })

    expect(context).toEqual({
      source: {
        file: 'src/UserCard.tsx',
        line: 42,
        column: 7,
      },
      element: {
        tag: 'button',
        text: 'Delete',
        html: '<button class="danger">Delete</button>',
        attributes: {
          class: 'danger',
        },
      },
      page: {
        url: window.location.href,
        pathname: window.location.pathname,
      },
    })
  })

  it('omits nested text and children from container elements', () => {
    const article = document.createElement('article')
    article.className = 'card'
    article.setAttribute('data-source', '/proj/src/Card.tsx:11:5')
    const heading = document.createElement('h2')
    heading.textContent = 'Dialog test'
    article.appendChild(heading)
    document.body.appendChild(article)

    const context = getElementContext(article, { root: '/proj' })
    expect(context?.element.html).toBe('<article class="card">')
    expect(context?.element.text).toBeUndefined()
    expect(context?.source.file).toBe('src/Card.tsx')
  })

  it('resolves the closest ancestor with the source attribute', () => {
    const wrapper = document.createElement('div')
    wrapper.setAttribute('data-source', 'src/Card.tsx:10:1')
    const child = document.createElement('span')
    child.textContent = 'inner'
    wrapper.appendChild(child)
    document.body.appendChild(wrapper)

    const context = getElementContext(child)
    expect(context?.source.file).toBe('src/Card.tsx')
    expect(context?.element.tag).toBe('div')
  })

  it('returns null when source attribute is missing', () => {
    const el = document.createElement('div')
    expect(getElementContext(el)).toBeNull()
  })

  it('omits text when element has no inner text', () => {
    const el = document.createElement('img')
    el.setAttribute('data-source', 'src/Icon.tsx:1:1')
    el.setAttribute('alt', '')
    document.body.appendChild(el)

    const context = getElementContext(el)
    expect(context?.element.text).toBeUndefined()
    expect(context?.element.html).toBe('<img alt="">')
  })

  it('collects path, styles, box, and text when detail is expanded', () => {
    const main = document.createElement('main')
    main.className = 'page'
    const section = document.createElement('section')
    section.className = 'grid'
    const nest = document.createElement('div')
    nest.className = 'nest'
    nest.textContent = 'Inner target'
    nest.setAttribute('data-source', '/proj/src/App.tsx:35:11')
    Object.defineProperty(nest, 'getBoundingClientRect', {
      value: () => ({ top: 302.6, left: 564.1, width: 209.5, height: 52.4 }),
    })
    section.appendChild(nest)
    main.appendChild(section)
    document.body.appendChild(main)

    const context = getElementContext(nest, { root: '/proj', detail: 'expanded' })

    expect(context?.source.file).toBe('src/App.tsx')
    expect(context?.element.html).toBe('<div class="nest">')
    expect(context?.element.text).toBe('Inner target')
    expect(context?.path).toContain('main.page')
    expect(context?.path).toContain('div.nest')
    expect(context?.styles).toMatchObject({
      display: expect.any(String),
      position: expect.any(String),
      fontSize: expect.any(String),
    })
    expect(context?.box).toEqual({
      top: 303,
      left: 564,
      width: 210,
      height: 52,
    })
  })
})

describe('contextToPrompt', () => {
  it('formats a compact AI prompt', () => {
    const prompt = contextToPrompt({
      source: { file: 'src/UserCard.tsx', line: 42, column: 7 },
      element: {
        tag: 'button',
        text: 'Delete',
        html: '<button class="danger">Delete</button>',
        attributes: { class: 'danger' },
      },
      page: {
        url: 'http://localhost:5173/users/123',
        pathname: '/users/123',
      },
    })

    expect(prompt).toBe(
      [
        'Source: src/UserCard.tsx:42:7',
        'Element: <button class="danger">Delete</button>',
      ].join('\n'),
    )
  })

  it('formats an expanded AI prompt', () => {
    const prompt = contextToPrompt({
      source: { file: 'src/App.tsx', line: 35, column: 11 },
      element: {
        tag: 'div',
        text: 'Inner target',
        html: '<div class="nest">',
        attributes: { class: 'nest' },
      },
      page: { url: 'http://localhost/', pathname: '/' },
      path: 'main.page > section.grid > div.nest',
      styles: {
        color: 'rgb(20, 33, 43)',
        backgroundColor: 'rgb(248, 250, 249)',
        fontSize: '16px',
        fontFamily: '"IBM Plex Sans"',
        display: 'block',
        position: 'static',
      },
      box: { top: 303, left: 564, width: 210, height: 52 },
    })

    expect(prompt).toBe(
      [
        'Source: src/App.tsx:35:11',
        'Element: <div class="nest">',
        'Path: main.page > section.grid > div.nest',
        'Text: Inner target',
        'Styles: color=rgb(20, 33, 43); backgroundColor=rgb(248, 250, 249); fontSize=16px; fontFamily="IBM Plex Sans"; display=block; position=static',
        'Box: 210x52 @ (564, 303)',
      ].join('\n'),
    )
  })
})

describe('copyContextForAI', () => {
  it('writes the prompt to the clipboard', async () => {
    const button = document.createElement('button')
    button.textContent = 'Save'
    button.setAttribute('data-source', 'src/Form.tsx:3:1')
    document.body.appendChild(button)

    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    const context = await copyContextForAI(button)
    expect(context?.source.file).toBe('src/Form.tsx')
    expect(writeText).toHaveBeenCalledOnce()
    expect(String(writeText.mock.calls[0][0])).toContain('src/Form.tsx:3:1')
  })

  it('returns null when the element has no source', async () => {
    const writeText = vi.fn()
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    await expect(copyContextForAI(document.createElement('div'))).resolves.toBeNull()
    expect(writeText).not.toHaveBeenCalled()
  })

  it('propagates clipboard failures', async () => {
    const button = document.createElement('button')
    button.setAttribute('data-source', 'src/Form.tsx:3:1')
    document.body.appendChild(button)

    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })

    await expect(copyContextForAI(button)).rejects.toThrow('denied')
  })

  it('throws when Clipboard API is unavailable', async () => {
    const button = document.createElement('button')
    button.setAttribute('data-source', 'src/Form.tsx:3:1')
    document.body.appendChild(button)

    vi.stubGlobal('navigator', { clipboard: undefined })

    await expect(copyContextForAI(button)).rejects.toThrow('Clipboard API unavailable')
  })
})
