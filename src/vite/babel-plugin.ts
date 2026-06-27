import type { NodePath } from '@babel/traverse'
import * as t from '@babel/types'

type BabelOptions = { attribute: string }

function hasSourceAttr(attributes: t.JSXOpeningElement['attributes'], attribute: string): boolean {
  return attributes.some(
    (attr) => t.isJSXAttribute(attr) && attr.name.name === attribute,
  )
}

function createSourceAttr(attribute: string, value: string): t.JSXAttribute {
  return t.jsxAttribute(t.jsxIdentifier(attribute), t.stringLiteral(value))
}

export function babelPluginAddSourceAttr(_: unknown, opts: BabelOptions) {
  const attribute = opts.attribute
  return {
    name: 'add-source-attr',
    visitor: {
      JSXOpeningElement(path: NodePath<t.JSXOpeningElement>, state: { file: { opts: { filename?: string } } }) {
        const loc = path.node.loc
        const filename = state.file.opts.filename
        if (!loc || !filename) return
        if (hasSourceAttr(path.node.attributes, attribute)) return

        const value = `${filename}:${loc.start.line}:${loc.start.column + 1}`
        path.node.attributes.push(createSourceAttr(attribute, value))
      },
    },
  }
}
