import { onShareAppMessage as wxOnShareAppMessage } from '@dcloudio/uni-app'
import { getCurrentPage } from './wx'
import { ref } from 'vue'

type OnShareAppMessageHook = (
  options: Page.ShareAppMessageOption,
) => Page.CustomShareContent | Promise<Omit<Page.CustomShareContent, 'promise'>>

function makeRegisterOnShareMessage() {
  const registeredHooks = ref<Map<string | undefined, OnShareAppMessageHook[]>>(
    new Map(),
  )

  function unregisterShareAppMessageOfRoute(
    hook: OnShareAppMessageHook,
    route?: string,
  ) {
    const hooks = registeredHooks.value.get(route)
    if (hooks) {
      const newHooks = hooks.filter(t => t !== hook)
      if (!newHooks.length) {
        registeredHooks.value.delete(route)
      }
      else {
        registeredHooks.value.set(route, newHooks)
      }
    }
  }

  function getRoute() {
    const pages = getCurrentPages()
    return pages.map(t => t.route ?? '').join('|')
  }

  function unregisterShareAppMessage(hook: OnShareAppMessageHook) {
    const route = getRoute()
    unregisterShareAppMessageOfRoute(hook, route)
  }

  function getCurrentHooks() {
    const route = getRoute()
    const hooks = registeredHooks.value.get(route)
    return hooks
  }

  function getCurrentHook() {
    const hooks = getCurrentHooks()
    return hooks ? hooks[hooks.length - 1] : undefined
  }

  async function revokeHook(res: Page.ShareAppMessageOption) {
    const hook = getCurrentHook()
    const result = await hook?.(res)
    return result || {}
  }

  function onShareAppMessage(hook?: OnShareAppMessageHook) {
    const route = getRoute()
    const hooks = registeredHooks.value.get(route)

    if (!hooks?.length) {
      wxOnShareAppMessage((res) => {
        const promise = revokeHook(res)
        return { promise }
      })
    }

    if (hook) {
      if (hooks) {
        hooks.push(hook)
      }
      registeredHooks.value.set(route, (hooks ?? []).concat([hook]))
      const page = getCurrentPage()
      const onUnload = page.onUnload
      page.onUnload = () => {
        onUnload?.()
        const hks = registeredHooks.value.get(route)
        hks?.forEach((h) => {
          unregisterShareAppMessageOfRoute(h, route)
        })
      }
    }
  }

  return {
    unregisterShareAppMessage,
    onShareAppMessage,
  }
}

export const { unregisterShareAppMessage, onShareAppMessage }
  = makeRegisterOnShareMessage()
