import { excludeKeys } from './object'

type NodeReducer<T, Node> = (
  acc: T,
  treeNode: Node,
  level: number,
  parent?: Node,
  childrenKey?: string,
) => T

interface MakeTreeOperatorOptions {
  childrenKey?: string[] | string
}

type WalkDirection = 'down' | 'up'

interface WalkOptions {
  direction: WalkDirection
}

interface TreeNode {
  [key: string]: any
}
type Tree<T> = T | Array<T>

function makeTreeOperator(options: MakeTreeOperatorOptions = {}) {
  const { childrenKey = 'children' } = options
  const WALK_OPTS: WalkOptions = {
    direction: 'down',
  }

  function getInitChildrenKeyList(key: string[] | string) {
    if (typeof key === 'undefined')
      return []
    return Array.isArray(childrenKey) ? childrenKey : [childrenKey]
  }

  const childrenKeyList = getInitChildrenKeyList(childrenKey)

  function isPlainObject<Node extends TreeNode>(t: Node) {
    return !!(t && typeof t === 'object')
  }

  function safeGetChildren<Node extends TreeNode>(t: Node, key: any): Array<Node> {
    if (!isPlainObject(t))
      return []
    const children = t[key]
    if (!Array.isArray(children))
      return []
    return children
  }

  function getArrayKeys<Node extends TreeNode>(t: Node) {
    if (!isPlainObject(t))
      return []
    return Object.keys(t).filter(k => Array.isArray(t[k]))
  }

  function getChildrenKeys<Node extends TreeNode>(t: Node) {
    return childrenKeyList.length ? childrenKeyList : getArrayKeys(t)
  }

  function walkChildren<Node extends TreeNode>(
    t: Node,
    fn: (treeNode: Node, children: Array<Node>, key: string) => Array<Node>,
  ): Node {
    if (!isPlainObject(t))
      return t
    return getChildrenKeys(t).reduce(
      (r, k) => {
        const children = r[k]
        if (Array.isArray(children)) {
          const nextChildren = fn(r, children, k)
          if (nextChildren && nextChildren.length)
            return { ...r, [k]: nextChildren }
          return excludeKeys(r, k) as Node
        }
        return r
      },
      { ...t },
    )
  }

  /**
   * 更新节点
   */
  function updateNode<Node extends TreeNode>(
    value: Tree<Node>,
    updater: (
      treeNode: Node,
      level: number,
      parent?: Node,
      childrenKey?: string,
    ) => Node,
    opts = WALK_OPTS,
  ) {
    const { direction } = opts
    const update = (
      v: Tree<Node>,
      level: number,
      parent?: Node,
      ck?: string,
    ): Tree<Node> => {
      if (Array.isArray(v))
        return v.map(t => update(t, level + 1, parent, ck) as Node)

      if (direction === 'down') {
        const nextV = walkChildren(v, (t, children, k) =>
          Array.isArray(children)
            ? (update(children, level + 1, t, k) as Array<Node>)
            : children,
        )
        return updater(nextV, level, parent, ck)
      }
      else {
        const nextV = updater(v, level, parent, ck)
        return walkChildren(nextV, (t, children, k) =>
          Array.isArray(children)
            ? (update(children, level + 1, t, k) as Array<Node>)
            : children,
        )
      }
    }
    return update(value, 0)
  }

  /**
   * reduce节点
   */
  function reduceNode<T, Node extends TreeNode>(
    value: Tree<Node>,
    reducer: NodeReducer<T, Node>,
    init: T,
    diver: (
      v: Tree<Node>,
      level: number,
      parent?: Node,
      ck?: string,
    ) => boolean = () => true,
    opts = WALK_OPTS,
  ): T {
    const { direction } = opts

    function reduceChildren<T, Node extends TreeNode>(
      t: Node,
      fn: (result: T, treeNode: Node, children: Array<Node>, key: string) => T,
      init: T,
    ): T {
      if (!isPlainObject(t))
        return init
      return getChildrenKeys(t).reduce(
        (r, k) => fn(r, t, safeGetChildren(t, k), k),
        init,
      )
    }

    const reduce = (
      acc: T,
      v: Tree<Node>,
      level: number,
      parent?: Node,
      ck?: string,
    ): T => {
      if (Array.isArray(v))
        return v.reduce((r: T, t) => reduce(r, t, level + 1, parent, ck), acc)

      const childrenReducer = (
        r: T,
        t: Node,
        children?: Array<Node>,
        k?: string,
      ) => (children?.length ? reduce(r, children, level + 1, t, k) : r)

      if (!diver(v, level, parent, ck))
        return acc

      if (direction === 'down') {
        const nextAcc = reduceChildren(v, childrenReducer, acc)
        return reducer(nextAcc, v, level, parent, ck)
      }
      else {
        const nextAcc = reducer(acc, v, level, parent, ck)
        return reduceChildren(v, childrenReducer, nextAcc)
      }
    }
    return reduce(init, value, 0)
  }

  /**
   * 删除节点
   */
  function removeNode<Node extends TreeNode>(
    value: Tree<Node>,
    predictor: (
      treeNode: Node,
      level: number,
      parent?: Node,
      childrenKey?: string,
    ) => boolean,
    opts = WALK_OPTS,
  ) {
    const { direction } = opts

    function removeChildren(
      v: Array<Node>,
      level: number,
      parent?: Node,
      ck?: string,
    ): Array<Node> {
      return v
        .filter(t => !predictor(t, level + 1, parent, ck))
        .map(t => remove(t, level + 1, parent, ck))
        .filter(t => t) as Array<Node>
    }

    function remove(
      v: Tree<Node>,
      level: number,
      parent?: Node,
      ck?: string,
    ): Tree<Node> | undefined {
      if (Array.isArray(v))
        return removeChildren(v, level, parent, ck)

      if (predictor(v, level, parent, ck))
        return undefined

      if (direction === 'down') {
        const nextV = walkChildren(v, (parent, children, k) =>
          Array.isArray(children)
            ? removeChildren(children, level + 1, parent, k)
            : children,
        )
        if (predictor(nextV, level, parent, ck))
          return undefined
        return nextV
      }
      else {
        if (predictor(v, level, parent, ck))
          return undefined

        const nextV = walkChildren(v, (parent, children, k) =>
          Array.isArray(children)
            ? removeChildren(children, level + 1, parent, k)
            : children,
        )
        return nextV
      }
    }
    return remove(value, 0)
  }

  /**
   * 查找节点
   */
  function findNode<Node extends TreeNode>(
    value: Tree<Node>,
    predictor: (
      treeNode: Node,
      level: number,
      parent?: Node,
      childrenKey?: string,
    ) => boolean,
  ) {
    function findChildren(
      v: Array<Node>,
      level: number,
      parent?: Node,
      ck?: string,
    ): Node | undefined {
      const t = v.find(t => predictor(t, level + 1, parent, ck))
      if (t !== undefined)
        return t
      for (let i = 0; i < v.length; i++) {
        const child = find(v[i], level + 1, parent, `${i}`)
        if (child !== undefined)
          return child
      }
    }

    function find(
      v: Tree<Node>,
      level: number,
      parent?: Node,
      ck?: string,
    ): Node | undefined {
      if (Array.isArray(v))
        return findChildren(v, level, parent, ck)

      if (predictor(v, level, parent, ck))
        return v

      return findChildren(
        getChildrenKeys(v).reduce(
          (l, k) => l.concat(safeGetChildren(v, k)),
          [] as Array<Node>,
        ),
        level + 1,
        parent,
        ck,
      )
    }
    return find(value, 0)
  }

  /**
   * 展开节点
   */
  function flatNode<Node extends TreeNode>(
    value: Tree<Node>,
    predictor: (
      treeNode: Node,
      level: number,
      parent?: Node,
      childrenKey?: string,
    ) => boolean,
  ): Array<Node> {
    function flat(
      v: Tree<Node>,
      level: number,
      parent?: Node,
      ck?: string,
    ): Array<Node> {
      if (Array.isArray(v)) {
        return v.reduce(
          (r: Array<Node>, t) => r.concat(flat(t, level + 1, parent, ck)),
          [] as Array<Node>,
        )
      }

      if (predictor(v, level, parent, ck)) {
        const children = getChildrenKeys(v).reduce(
          (l, k) => l.concat(safeGetChildren(v, k)),
          [] as Array<Node>,
        )
        return children.reduce(
          (r: Array<Node>, t) => r.concat(flat(t, level + 1, parent, ck)),
          [] as Array<Node>,
        )
      }
      else {
        return [v]
      }
    }

    return flat(value, 0)
  }

  /*
   * interface
   */
  return Object.freeze({
    findNode,
    updateNode,
    removeNode,
    reduceNode,
    flatNode,
  })
}

export { makeTreeOperator }
