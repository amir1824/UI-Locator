import type { NodePath } from '@babel/traverse'
import type * as BabelTypes from '@babel/types'

type Babel = { types: typeof BabelTypes }

type BabelOptions = { attribute: string }

type BabelState = { file: { opts: { filename?: string } } }

const COLUMN_OFFSET = 1

function hasSourceAttr(
  t: typeof BabelTypes,
  attributes: BabelTypes.JSXOpeningElement['attributes'],
  attribute: string,
): boolean {
  return attributes.some(
    (attr) => t.isJSXAttribute(attr) && attr.name.name === attribute,
  )
}

function createSourceAttr(
  t: typeof BabelTypes,
  attribute: string,
  value: string,
): BabelTypes.JSXAttribute {
  return t.jsxAttribute(t.jsxIdentifier(attribute), t.stringLiteral(value))
}

export function babelPluginAddSourceAttr({ types: t }: Babel, opts: BabelOptions) {
  const attribute = opts.attribute
  return {
    name: 'add-source-attr',
    visitor: {
      JSXOpeningElement(path: NodePath<BabelTypes.JSXOpeningElement>, state: BabelState) {
        const loc = path.node.loc
        const filename = state.file.opts.filename
        if (!loc || !filename) return
        if (hasSourceAttr(t, path.node.attributes, attribute)) return

        // Babel columns are 0-indexed; editors expect 1-indexed columns.
        const value = `${filename}:${loc.start.line}:${loc.start.column + COLUMN_OFFSET}`
        path.node.attributes.push(createSourceAttr(t, attribute, value))
      },
    },
  }
}
