import { useUserStore } from '@/store/user'

const LOGIN_PAGE = '/pages/login'
const WHITE_LIST = [
  '/pages/login',
  '/pages/register',
  '/pages/common/webview/index',
]

function isWhiteListed(url: string) {
  const path = url.split('?')[0]
  return WHITE_LIST.includes(path)
}

type InterceptorAction = 'navigateTo' | 'redirectTo' | 'reLaunch' | 'switchTab'

const actions: InterceptorAction[] = [
  'navigateTo',
  'redirectTo',
  'reLaunch',
  'switchTab',
]

actions.forEach((action) => {
  uni.addInterceptor(action, {
    invoke(to: UniApp.NavigateToOptions) {
      const userStore = useUserStore()
      const hasToken = Boolean(userStore.token)
      if (hasToken) {
        if (to.url === LOGIN_PAGE) {
          uni.reLaunch({ url: '/pages/index' })
        }
        return true
      }
      if (to.url && isWhiteListed(String(to.url))) {
        return true
      }
      uni.reLaunch({ url: LOGIN_PAGE })
      return false
    },
    fail(err) {
      console.error(err)
    },
  })
})
