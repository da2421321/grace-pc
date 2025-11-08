import { getUserStorageAsync } from './user_storage'

type Fn = (...args: any) => void

export interface SelectorOptions {
  autoNavigateBack?: boolean
  navigationType?: 'navigate' | 'redirect'
  query?: { [k: string]: any }
}

function getCurrentPage() {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  return current
}

export function makePageSelector() {
  const resolvers = new Map<string, Array<{ resolve: Fn, reject: Fn }>>()

  function getCallback(key: string) {
    const stack = resolvers.get(key)
    return stack ? stack[stack.length - 1] : stack
  }

  function setCallback(key: string, item: { resolve: Fn, reject: Fn }) {
    const stack = resolvers.get(key) || []
    stack.push(item)
    resolvers.set(key, stack)
  }

  function removeCallback(key: string) {
    const stack = resolvers.get(key) || []
    const item = stack.pop()
    if (!stack.length)
      resolvers.delete(key)
    return item
  }

  function getSelectorResolver<Result>() {
    const current = getCurrentPage()
    const route = `/${current.route}`
    const onUnload = current.onUnload
    let resolved = false
    current.onUnload = () => {
      const callback = getCallback(route)
      if (callback)
        removeCallback(route)
      if (!resolved)
        callback?.reject('selection canceled.')
      onUnload?.()
    }

    return function resolver(value: Result) {
      resolved = true
      const callback = getCallback(route)
      callback?.resolve(value)
    }
  }

  function getRealUrl(url: string, query: { [k: string]: any }) {
    const queryStr = Object.keys(query)
      .filter(k => query[k] != null && query[k] !== '')
      .map(k => `${k}=${query[k]}`)
      .join('&')
    return `${url}?${queryStr}`
  }

  function makeSelectorOfUrl<Result>(url: string) {
    const defaultOptions: SelectorOptions = {
      autoNavigateBack: true,
      navigationType: 'navigate',
    }
    return async function selector(options = { ...defaultOptions }) {
      const opt = { ...defaultOptions, ...options }
      const realUrl = getRealUrl(url, opt.query || {})

      if (opt?.navigationType === 'redirect')
        uni.redirectTo({ url: realUrl })
      else uni.navigateTo({ url: realUrl })

      const result = await new Promise((resolve, reject) => {
        setCallback(url, { resolve, reject })
      })

      if (opt?.autoNavigateBack)
        uni.navigateBack()

      return result as Result
    }
  }

  return { getSelectorResolver, makeSelectorOfUrl }
}

export const { getSelectorResolver, makeSelectorOfUrl } = makePageSelector()

// 创建类型对应的 selector 和 selector 回调，限定不同类型的 selector 和 回调之间不能混用
// 比如在选择物流页面不能使用选择客户的回调
export function makeUnionTypePageSelector<Result>(url: string) {
  const selector = makeSelectorOfUrl<Result>(url)
  const getResolver = () => {
    const current = getCurrentPage()
    const route = `/${current.route}`
    if (url === route)
      return getSelectorResolver<Result>()
    return undefined
  }

  return [selector, getResolver] as [typeof selector, typeof getResolver]
}

export function wrapWithCache<Fn extends (...args: any[]) => Promise<any>>(
  fn: Fn,
  cacheKey: string,
) {
  return async function cachedFn(...args: Parameters<Fn>) {
    let data: Awaited<ReturnType<Fn>> | null = null

    if (cacheKey) {
      try {
        const res = await getUserStorageAsync<Awaited<ReturnType<Fn>>>({
          key: cacheKey,
        })
        if (res.data !== null && res.data !== undefined)
          data = res.data
      }
      catch (e) {}
    }

    if (data === null || data === undefined)
      data = await fn(...args)

    return data
  }
}
