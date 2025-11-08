import * as htmlparser2 from 'htmlparser2'

interface GetTextOfHtmlOptions {
  max?: number
  batch?: number
}

interface TagNode {
  type: 'node'
  name: string
  attrs: { [k: string]: any }
  children: Node[]
}

interface TextNode {
  type: 'text'
  text: string
}

type Node = TagNode | TextNode
type Nodes = Node[]

export function getTextOfHtml(s?: string, options?: GetTextOfHtmlOptions) {
  const max = options?.max ?? Infinity
  const batch = Math.max(options?.batch ?? 50, max)
  let result = ''

  if (!s)
    return result

  const parser = new htmlparser2.Parser({ ontext: t => (result += t) })

  for (let i = 0; i < s.length && result.length < max; i += batch) {
    parser.write(s.slice(i, i + batch))
  }

  parser.end()
  return result
}

interface GetNodesOfHtmlOptions {
  onAttrs?: (name: string, attrs: { [k: string]: any }) => { [k: string]: any }
}

export function getNodesOfHtml(
  s?: string,
  options?: GetNodesOfHtmlOptions,
): Nodes {
  if (!s)
    return []

  const onAttrs = options?.onAttrs ?? ((_: any, attrs: any) => attrs)

  const nodes: Nodes = []

  const nodeStack: TagNode[] = []

  const parser = new htmlparser2.Parser({
    onopentag(name, attrs) {
      if (attrs) {
        delete attrs.class
        delete attrs.style
      }

      const node: TagNode = {
        type: 'node',
        name,
        attrs: onAttrs(name, { ...(attrs ?? {}) }),
        children: [],
      }
      if (nodeStack.length) {
        const last = nodeStack[nodeStack.length - 1]
        last.children.push(node)
      }
      else {
        nodes.push(node)
      }
      nodeStack.push(node)
    },
    ontext(data) {
      if (nodeStack.length) {
        const last = nodeStack[nodeStack.length - 1]
        last.children.push({ type: 'text', text: data })
      }
      else {
        nodes.push({ type: 'text', text: data })
      }
    },
    onclosetag() {
      if (nodeStack.length)
        nodeStack.pop()
    },
  })

  parser.write(s)
  parser.end()

  return nodes
}
